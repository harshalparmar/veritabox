import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox';

async function drop() {
  console.log(`Connecting to MongoDB at: ${mongoUri}...`);
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB. Dropping database...');
    await mongoose.connection.db.dropDatabase();
    console.log('Database dropped successfully!');
  } catch (error) {
    console.error('Error during database drop:', error);
  } finally {
    await mongoose.disconnect();
  }
}

drop();
