/**
 * One-off script: copy existing users from users.json into Supabase.
 * Run after creating the users table and setting .env:
 *   node scripts/migrate-users-to-supabase.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const USERS_FILE = path.join(__dirname, '..', 'users.json');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function toRow(user) {
  return {
    type: user.type,
    first_name: user.firstName,
    surname: user.surname,
    dob: user.dob || null,
    mobile: user.mobile,
    landline: user.landline || null,
    email: user.email,
    bank_details: user.bankDetails || null,
    address: user.address,
    company_name: user.companyName || null,
    company_number: user.companyNumber || null,
    company_contact_number: user.companyContactNumber || null,
    company_principal_contact: user.companyPrincipalContact || null
    // id and created_at: let Supabase generate
  };
}

async function main() {
  if (!fs.existsSync(USERS_FILE)) {
    console.log('No users.json found. Nothing to migrate.');
    return;
  }
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  let users;
  try {
    users = JSON.parse(data);
  } catch (e) {
    console.error('Invalid JSON in users.json:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(users) || users.length === 0) {
    console.log('No users in users.json. Nothing to migrate.');
    return;
  }
  const rows = users.map(toRow);
  const { data: inserted, error } = await supabase.from('users').insert(rows).select('id');
  if (error) {
    console.error('Supabase insert error:', error);
    process.exit(1);
  }
  console.log(`Migrated ${inserted.length} user(s) to Supabase.`);
}

main();
