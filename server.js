require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Stripe = require('stripe');
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

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || ('http://localhost:' + (process.env.PORT || 3000));
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

const validationPatterns = {
  name: /^[\u0600-\u06FFa-zA-Z\s]{2,50}$/,
  dob: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/,
  mobile: /^(\+98|0|0098)?9\d{9}$|^(\+|00)[1-9]\d{6,14}$/,
  landline: /^0[1-9]{2}\d{8}$|^(\+|00)[1-9]\d{6,14}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  address: /^[\u0600-\u06FFa-zA-Z0-9\s.,()/-]{10,200}$/
};

// Stripe webhook needs raw body for signature verification (must be before express.json())
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !stripeWebhookSecret) {
    return res.status(503).send('Webhook not configured');
  }
  const sig = req.headers['stripe-signature'];
  if (!sig) return res.status(400).send('Missing stripe-signature');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
  } catch (err) {
    return res.status(400).send('Webhook signature verification failed');
  }
  if (event.type !== 'checkout.session.completed') {
    return res.status(200).send('OK');
  }
  const session = event.data.object;
  const userId = session.client_reference_id || null;
  const stripeSessionId = session.id;
  const amountTotal = session.amount_total || 0;
  const currency = (session.currency || 'usd').toLowerCase();
  const customerEmail = session.customer_email || session.customer_details?.email || null;
  let lineItems = [];
  try {
    const fullSession = await stripe.checkout.sessions.retrieve(stripeSessionId, { expand: ['line_items.data.price.product'] });
    if (fullSession.line_items && fullSession.line_items.data) {
      lineItems = fullSession.line_items.data.map((li) => ({
        name: (li.price && li.price.product && typeof li.price.product === 'object' && li.price.product.name) ? li.price.product.name : (li.description || 'Item'),
        quantity: li.quantity || 1,
        unit_amount: li.price ? li.price.unit_amount : 0,
        amount_total: li.amount_total
      }));
    }
  } catch (e) {
    console.error('Stripe session retrieve error:', e);
  }
  try {
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', stripeSessionId)
      .single();

    if (existingOrder) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          amount_total: amountTotal,
          currency,
          line_items: lineItems,
          customer_email: customerEmail
        })
        .eq('stripe_session_id', stripeSessionId);
      if (updateError) {
        console.error('Orders update error:', updateError);
        return res.status(500).send('Error updating order');
      }
    } else {
      const { error } = await supabase.from('orders').insert({
        user_id: userId || null,
        stripe_session_id: stripeSessionId,
        amount_total: amountTotal,
        currency,
        status: 'paid',
        line_items: lineItems,
        customer_email: customerEmail
      });
      if (error) {
        if (error.code === '23505') return res.status(200).send('OK');
        console.error('Orders insert error:', error);
        return res.status(500).send('Error recording order');
      }
    }
  } catch (e) {
    console.error('Webhook order create error:', e);
    return res.status(500).send('Error recording order');
  }
  res.status(200).send('OK');
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
  res.json({ supabaseUrl, supabaseAnonKey, baseUrl: baseUrl.replace(/\/$/, '') });
});

// Exchange Supabase Auth access token for app JWT (for login/sign-up using Supabase Auth)
const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
app.post('/api/auth/token', async (req, res) => {
  if (!supabaseJwtSecret) {
    return res.status(503).json({ error: 'Auth not configured' });
  }
  try {
    const { accessToken } = req.body || {};
    if (!accessToken || typeof accessToken !== 'string') {
      return res.status(400).json({ error: 'accessToken required' });
    }
    const payload = jwt.verify(accessToken, supabaseJwtSecret, { algorithms: ['HS256'] });
    const userId = payload.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, surname')
      .eq('id', userId)
      .single();
    if (error || !user) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '7d' });
    res.json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, firstName: user.first_name, surname: user.surname }
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Auth token error:', err);
    res.status(500).json({ error: 'Failed to issue token' });
  }
});

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

// Stripe Checkout: create session (priceId, amount in cents, or lineItems from basket)
app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY in .env' });
  }
  try {
    let userId = null;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const payload = jwt.verify(token, jwtSecret);
        userId = payload.userId;
      } catch (_) { /* optional auth */ }
    }
    const { priceId, amount, lineItems: bodyLineItems } = req.body || {};
    const successUrl = baseUrl.replace(/\/$/, '') + '/checkout-success.html?session_id={CHECKOUT_SESSION_ID}';
    const cancelUrl = baseUrl.replace(/\/$/, '') + '/basket.html';

    let lineItems;
    if (priceId) {
      lineItems = [{ price: priceId, quantity: 1 }];
    } else if (Array.isArray(bodyLineItems) && bodyLineItems.length > 0) {
      lineItems = bodyLineItems.map((item) => ({
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(item.price) * 100),
          product_data: { name: item.name || 'Item' }
        },
        quantity: item.quantity || 1
      }));
    } else if (amount != null && Number(amount) > 0) {
      const amountCents = Math.round(Number(amount));
      lineItems = [{
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: { name: 'Order' }
        },
        quantity: 1
      }];
    } else {
      return res.status(400).json({ error: 'Provide priceId, amount (in cents), or lineItems' });
    }

    const sessionParams = {
      mode: 'payment',
      line_items: lineItems,
      success_url: successUrl,
      cancel_url: cancelUrl
    };
    if (userId) sessionParams.client_reference_id = String(userId);
    const session = await stripe.checkout.sessions.create(sessionParams);

    const amountTotal = session.amount_total || 0;
    const lineItemsForDb = Array.isArray(bodyLineItems) && bodyLineItems.length > 0
      ? bodyLineItems.map((item) => ({
          name: item.name || 'Item',
          quantity: item.quantity || 1,
          unit_amount: Math.round(Number(item.price) * 100),
          amount_total: Math.round(Number(item.price) * 100) * (item.quantity || 1)
        }))
      : [];
    await supabase.from('orders').insert({
      user_id: userId || null,
      stripe_session_id: session.id,
      amount_total: amountTotal,
      currency: 'usd',
      status: 'pending',
      line_items: lineItemsForDb
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message || 'Failed to create checkout session' });
  }
});

// Get current user's orders (requires auth)
app.get('/api/orders', authMiddleware, async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, stripe_session_id, amount_total, currency, status, line_items, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Orders fetch error:', error);
      return res.status(500).json({ error: 'Failed to load orders' });
    }
    res.json(orders || []);
  } catch (err) {
    console.error('Get orders error:', err);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// Get single order by Stripe session ID (for success page; no auth)
app.get('/api/orders/by-session/:sessionId', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, stripe_session_id, amount_total, currency, status, line_items, customer_email, created_at')
      .eq('stripe_session_id', sessionId)
      .single();

    if (error || !order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    console.error('Get order by session error:', err);
    res.status(500).json({ error: 'Failed to load order' });
  }
});

// Confirm payment and set order to paid using Stripe session (for success page; no auth)
// Use when webhook did not run (e.g. local testing). Idempotent.
app.post('/api/orders/confirm-by-session/:sessionId', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }
  try {
    const sessionId = req.params.sessionId;
    if (!sessionId || !sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items.data.price.product'] });
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Session not paid' });
    }
    const amountTotal = session.amount_total || 0;
    const currency = (session.currency || 'usd').toLowerCase();
    const customerEmail = session.customer_email || session.customer_details?.email || null;
    let lineItems = [];
    if (session.line_items && session.line_items.data) {
      lineItems = session.line_items.data.map((li) => ({
        name: (li.price && li.price.product && typeof li.price.product === 'object' && li.price.product.name) ? li.price.product.name : (li.description || 'Item'),
        quantity: li.quantity || 1,
        unit_amount: li.price ? li.price.unit_amount : 0,
        amount_total: li.amount_total
      }));
    }
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('stripe_session_id', sessionId)
      .single();
    if (findError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status === 'paid') {
      return res.json({ updated: false, status: 'paid' });
    }
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        amount_total: amountTotal,
        currency,
        line_items: lineItems,
        customer_email: customerEmail
      })
      .eq('stripe_session_id', sessionId);
    if (updateError) {
      console.error('Confirm order update error:', updateError);
      return res.status(500).json({ error: 'Failed to update order' });
    }
    res.json({ updated: true, status: 'paid' });
  } catch (err) {
    console.error('Confirm by session error:', err);
    res.status(500).json({ error: err.message || 'Failed to confirm order' });
  }
});

app.listen(PORT, () => {
  console.log(`Lighting products server running at http://localhost:${PORT}`);
});
