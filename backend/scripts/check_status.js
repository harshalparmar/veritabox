import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox';

async function check() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;
    
    // Check if user exists
    const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId('6a0541af79be6d5c8378da3a') });
    console.log('User 6a0541af79be6d5c8378da3a exists:', user ? 'Yes' : 'No');
    if (user) {
      console.log('User details:', { name: user.name, role: user.role, email: user.email });
    }

    const collections = await db.listCollections().toArray();
    console.log('\n--- Database Collection Counts ---');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      if (count > 0) {
        console.log(`${col.name}: ${count} documents`);
      }
    }
    console.log('---------------------------------\n');

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

check();
