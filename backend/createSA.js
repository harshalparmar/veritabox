import mongoose from 'mongoose';
import SuperAdmin from './src/models/SuperAdmin.js';
import speakeasy from 'speakeasy';
import dotenv from 'dotenv';
import { encrypt } from './src/utils/security.js';

dotenv.config();

const createSA = async () => {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error('Usage: node createSA.js <email> <password>');
    process.exit(1);
  }

  if (password.length < 12) {
    console.error('Password must be at least 12 characters long.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox');
    console.log('Connected to VeritaBox Matrix...');

    // Check if exists
    const existing = await SuperAdmin.findOne({ email });
    if (existing) {
      console.log('SuperAdmin already exists. Protocol aborted.');
      process.exit();
    }

    // Generate TOTP Secret
    const secret = speakeasy.generateSecret({
      name: `VeritaBox Shadow (${email})`
    });

    const sa = new SuperAdmin({
      email,
      password,
      totpSecret: encrypt(secret.base32)
    });

    await sa.save();

    console.log('\n==================================================');
    console.log('SHADOW LAYER: INITIALIZED');
    console.log('==================================================');
    console.log(`Email:    ${email}`);
    console.log('\nIMPORTANT: Scan this QR code URL in Google Authenticator:');
    console.log(secret.otpauth_url);
    console.log('==================================================\n');

    process.exit();
  } catch (err) {
    console.error('Initialization failed:', err);
    process.exit(1);
  }
};

createSA();
