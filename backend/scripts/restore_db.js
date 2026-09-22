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
const dumpDir = path.join(__dirname, '../../db_dump');

async function restore() {
  console.log(`Connecting to MongoDB at: ${mongoUri}...`);
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    if (!fs.existsSync(dumpDir)) {
      console.error(`Dump directory not found at: ${dumpDir}`);
      await mongoose.disconnect();
      return;
    }

    const files = fs.readdirSync(dumpDir).filter(file => file.endsWith('.json'));
    if (files.length === 0) {
      console.log('No database JSON dump files found to restore.');
      await mongoose.disconnect();
      return;
    }

    console.log(`Found ${files.length} collections to restore from ${dumpDir}...`);

    const db = mongoose.connection.db;

    for (const file of files) {
      const colName = path.basename(file, '.json');
      const filePath = path.join(dumpDir, file);
      
      console.log(`Restoring collection: ${colName}...`);
      const rawData = fs.readFileSync(filePath, 'utf-8');
      const documents = JSON.parse(rawData);

      if (documents.length === 0) {
        console.log(`Collection ${colName} is empty. Skipping.`);
        continue;
      }

      const collection = db.collection(colName);
      
      // Clear existing documents in this collection
      console.log(`Clearing existing documents in ${colName}...`);
      await collection.deleteMany({});

      // Convert serialized dates/ObjectIds back if needed (MongoDB handles standard objects well)
      // Node/Mongo driver handles standard JSON inserts, but let's insert them
      const result = await collection.insertMany(documents);
      console.log(`Successfully restored ${result.insertedCount} documents to ${colName}`);
    }

    console.log('Database restore completed successfully!');
  } catch (error) {
    console.error('Error during database restore:', error);
  } finally {
    await mongoose.disconnect();
  }
}

restore();
