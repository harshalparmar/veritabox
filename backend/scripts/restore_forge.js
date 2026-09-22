import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox';
const dumpFile = path.join(__dirname, '../../db_dump/challenges.json');

async function restore() {
  console.log(`Connecting to MongoDB at: ${mongoUri}...`);
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    if (!fs.existsSync(dumpFile)) {
      console.error(`Dump file not found at: ${dumpFile}`);
      await mongoose.disconnect();
      return;
    }

    console.log(`Restoring challenges collection from ${dumpFile}...`);
    const rawData = fs.readFileSync(dumpFile, 'utf-8');
    
    function revive(key, value) {
      if (typeof value === 'string') {
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value);
        }
        if (/^[0-9a-fA-F]{24}$/.test(value)) {
          if (key === '_id' || key.endsWith('Id') || key.endsWith('By') || key.endsWith('To')) {
            return new mongoose.Types.ObjectId(value);
          }
        }
      }
      return value;
    }

    const documents = JSON.parse(rawData, revive);

    if (documents.length === 0) {
      console.log('No documents found in challenges dump. Skipping.');
      await mongoose.disconnect();
      return;
    }

    const db = mongoose.connection.db;
    const collection = db.collection('challenges');

    console.log('Clearing existing documents in challenges...');
    await collection.deleteMany({});

    const result = await collection.insertMany(documents);
    console.log(`Successfully restored ${result.insertedCount} documents to challenges`);

    console.log('Database restore of challenges completed successfully!');
  } catch (error) {
    console.error('Error during database restore:', error);
  } finally {
    await mongoose.disconnect();
  }
}

restore();
