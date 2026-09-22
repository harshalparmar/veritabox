import mongoose from 'mongoose';
import SuperAdmin from './src/models/SuperAdmin.js';
import speakeasy from 'speakeasy';
import dotenv from 'dotenv';

dotenv.config();

const createSA = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox');
    console.log('Connected to VeritaBox Matrix...');

    const email = 'admin@veritabox.com';
    const password = 'shadow_protocol_init';

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
      totpSecret: secret.base32
    });

    await sa.save();

    console.log('\n==================================================');
    console.log('SHADOW LAYER: INITIALIZED');
    console.log('==================================================');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log(`TOTP Secret (Base32): ${secret.base32}`);
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
