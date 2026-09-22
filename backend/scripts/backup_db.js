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

async function backup() {
  console.log(`Connecting to MongoDB at: ${mongoUri}...`);
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('No collections found in database.');
      await mongoose.disconnect();
      return;
    }

    if (!fs.existsSync(dumpDir)) {
      fs.mkdirSync(dumpDir, { recursive: true });
    }

    console.log(`Dumping ${collections.length} collections to ${dumpDir}...`);

    for (const colInfo of collections) {
      const colName = colInfo.name;
      console.log(`Exporting collection: ${colName}...`);
      const collection = db.collection(colName);
      const data = await collection.find({}).toArray();
      
      const filePath = path.join(dumpDir, `${colName}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`Saved ${data.length} documents to ${colName}.json`);
    }

    console.log('Database backup completed successfully!');
  } catch (error) {
    console.error('Error during database backup:', error);
  } finally {
    await mongoose.disconnect();
  }
}

backup();
