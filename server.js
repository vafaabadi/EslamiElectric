require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const CATEGORIES_FILE = path.join(__dirname, 'categories.json');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.JWT_SECRET;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!jwtSecret) {
  console.error('Missing JWT_SECRET in .env (use a long random string for signing tokens)');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const validationPatterns = {
  name: /^[\u0600-\u06FFa-zA-Z\s]{2,50}$/,
  dob: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
  mobile: /^(\+98|0|0098)?9\d{9}$|^(\+|00)[1-9]\d{6,14}$/,
  landline: /^0[1-9]{2}\d{8}$|^(\+|00)[1-9]\d{6,14}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  address: /^[\u0600-\u06FFa-zA-Z0-9\s.,()/-]{10,200}$/
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getCategories() {
  const data = fs.readFileSync(CATEGORIES_FILE, 'utf8');
  return JSON.parse(data).categories;
}

function getAllProducts() {
  const categories = getCategories();
  const products = [];
  for (const cat of categories) {
    for (const p of cat.products) {
      products.push({
        ...p,
        category: cat.name,
        category_fa: cat.name_fa,
        categoryId: cat.id
      });
    }
  }
  return products;
}

// GET all categories (with their products)
app.get('/api/categories', (req, res) => {
  try {
    const categories = getCategories();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// GET all products (flattened, for homepage)
app.get('/api/products', (req, res) => {
  try {
    const products = getAllProducts();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// Create user account
app.post('/api/users', async (req, res) => {
  try {
    const {
      type,
      firstName,
      surname,
      dob,
      mobile,
      landline,
      email,
      bankDetails,
      address,
      companyName,
      companyNumber,
      companyContactNumber,
      companyPrincipalContact
    } = req.body;

    if (!type || !['person', 'company'].includes(type)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }

    const password = req.body.password;
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!firstName || !surname || !mobile || !email || !address) {
      return res.status(400).json({ error: 'Missing required personal fields' });
    }

    const emailNormalized = email.trim().toLowerCase();

    if (!validationPatterns.name.test(firstName)) {
      return res.status(400).json({ error: 'First name must be 2-50 letters (English or Persian)' });
    }
    if (!validationPatterns.name.test(surname)) {
      return res.status(400).json({ error: 'Surname must be 2-50 letters (English or Persian)' });
    }
    if (dob && !validationPatterns.dob.test(dob)) {
      return res.status(400).json({ error: 'Invalid date format (YYYY-MM-DD)' });
    }
    if (!validationPatterns.mobile.test(mobile)) {
      return res.status(400).json({ error: 'Invalid mobile number format' });
    }
    if (landline && !validationPatterns.landline.test(landline)) {
      return res.status(400).json({ error: 'Invalid landline format' });
    }
    if (!validationPatterns.email.test(emailNormalized)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!validationPatterns.address.test(address)) {
      return res.status(400).json({ error: 'Address must be 10-200 characters' });
    }

    if (type === 'company' && (!companyName || !companyNumber)) {
      return res.status(400).json({ error: 'Missing required company fields' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        type,
        first_name: firstName,
        surname,
        dob: dob || null,
        mobile,
        landline: landline || null,
        email: emailNormalized,
        password_hash: passwordHash,
        bank_details: bankDetails || null,
        address,
        company_name: type === 'company' ? companyName : null,
        company_number: type === 'company' ? companyNumber : null,
        company_contact_number: type === 'company' ? companyContactNumber : null,
        company_principal_contact: type === 'company' ? companyPrincipalContact : null
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'This email is already registered' });
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    const token = jwt.sign({ userId: newUser.id }, jwtSecret, { expiresIn: '7d' });
    res.status(201).json({ ok: true, userId: newUser.id, token });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const emailNormalized = (email && typeof email === 'string') ? email.trim().toLowerCase() : '';
    if (!emailNormalized || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, surname, password_hash')
      .eq('email', emailNormalized)
      .single();

    if (error || !user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });
    res.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, firstName: user.first_name, surname: user.surname }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user (requires Authorization: Bearer <token>)
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = jwt.verify(token, jwtSecret);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Not authenticated' });
  }
}

app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, type, first_name, surname, dob, mobile, landline, email, address, company_name, company_number, company_contact_number, company_principal_contact, created_at')
      .eq('id', req.userId)
      .single();

    if (error || !user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      type: user.type,
      firstName: user.first_name,
      surname: user.surname,
      dob: user.dob,
      mobile: user.mobile,
      landline: user.landline,
      email: user.email,
      address: user.address,
      companyName: user.company_name,
      companyNumber: user.company_number,
      companyContactNumber: user.company_contact_number,
      companyPrincipalContact: user.company_principal_contact,
      createdAt: user.created_at
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// Forgot password: request a reset link
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    const emailNormalized = (email && typeof email === 'string') ? email.trim().toLowerCase() : '';
    if (!emailNormalized) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', emailNormalized)
      .single();

    if (!user) {
      return res.json({ ok: true, message: 'If that email is registered, you will receive a reset link.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const { error } = await supabase
      .from('users')
      .update({ reset_token: resetToken, reset_token_expires: expiresAt.toISOString() })
      .eq('id', user.id);

    if (error) {
      console.error('Forgot password update error:', error);
      return res.status(500).json({ error: 'Failed to request reset' });
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const resetLink = baseUrl + '/reset-password.html?token=' + resetToken;

    res.json({ ok: true, resetLink });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to request reset' });
  }
});

// Reset password: set new password using token
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body || {};
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, reset_token_expires')
      .eq('reset_token', token)
      .single();

    if (findError || !user) {
      return res.status(400).json({ error: 'Invalid or expired reset link' });
    }
    const expires = user.reset_token_expires ? new Date(user.reset_token_expires) : null;
    if (!expires || expires < new Date()) {
      return res.status(400).json({ error: 'Reset link has expired' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: passwordHash, reset_token: null, reset_token_expires: null })
      .eq('id', user.id);

    if (updateError) {
      console.error('Reset password update error:', updateError);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    res.json({ ok: true, message: 'Password has been reset. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

app.listen(PORT, () => {
  console.log(`Lighting products server running at http://localhost:${PORT}`);
});
