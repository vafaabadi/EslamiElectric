require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const CATEGORIES_FILE = path.join(__dirname, 'categories.json');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
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

    if (!firstName || !surname || !mobile || !email || !address) {
      return res.status(400).json({ error: 'Missing required personal fields' });
    }

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
    if (!validationPatterns.email.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    if (!validationPatterns.address.test(address)) {
      return res.status(400).json({ error: 'Address must be 10-200 characters' });
    }

    if (type === 'company' && (!companyName || !companyNumber)) {
      return res.status(400).json({ error: 'Missing required company fields' });
    }

    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        type,
        first_name: firstName,
        surname,
        dob: dob || null,
        mobile,
        landline: landline || null,
        email,
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
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Failed to create user account' });
    }

    res.status(201).json({ ok: true, userId: newUser.id });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

app.listen(PORT, () => {
  console.log(`Lighting products server running at http://localhost:${PORT}`);
});
