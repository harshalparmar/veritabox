import mongoose from 'mongoose';
import dotenv from 'dotenv';
import speakeasy from 'speakeasy';
import Admin from './src/models/Admin.js';
import SuperAdmin from './src/models/SuperAdmin.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox';

async function createAccounts() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Connected to: ${MONGO_URI}\n`);

    // --- Admin 1 ---
    const admin1 = await upsertAdmin({
      name: 'Harshal Parmar',
      email: 'harshalparmar21@icloud.com',
      password: 'Admin@123',
      username: 'harshal_admin'
    });

    // --- Admin 2 ---
    const admin2 = await upsertAdmin({
      name: 'TechFest Admin',
      email: 'admin@veritabox.com',
      password: 'Admin@456',
      username: 'techfest_admin'
    });

    // --- Super Admin ---
    await upsertSuperAdmin({
      email: 'superadmin@veritabox.com',
      password: 'SuperAdmin@789'
    });

    console.log('\nAll accounts ready.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

async function upsertAdmin({ name, email, password, username }) {
  const existing = await Admin.findOne({ email });
  if (existing) {
    console.log(`[exists] Admin: ${email}`);
    existing.password = password;
    existing.name = name;
    if (username) existing.username = username;
    await existing.save();
    console.log(`  -> Password updated`);
    return existing;
  }

  const admin = await Admin.create({
    name,
    email,
    password,
    username,
    role: 'Admin',
    isActive: true
  });
  console.log(`[created] Admin: ${email} / ${password}`);
  return admin;
}

async function upsertSuperAdmin({ email, password }) {
  const existing = await SuperAdmin.findOne({ email });
  if (existing) {
    console.log(`[exists] SuperAdmin: ${email}`);
    existing.password = password;
    await existing.save();
    console.log(`  -> Password updated (TOTP secret unchanged)`);
    return existing;
  }

  const secret = speakeasy.generateSecret({
    name: `VeritaBox SA (${email})`
  });

  const sa = await SuperAdmin.create({
    email,
    password,
    totpSecret: secret.base32
  });

  console.log(`[created] SuperAdmin: ${email} / ${password}`);
  console.log(`\n  *** TOTP SETUP (save this!) ***`);
  console.log(`  Secret (Base32): ${secret.base32}`);
  console.log(`  OTP Auth URL:    ${secret.otpauth_url}`);
  console.log(`  Add to Google Authenticator or similar app.\n`);
  return sa;
}

createAccounts();
