import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkRound() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox');
    
    // Use an empty schema to just get the raw JSON from Mongo
    const Hackathon = mongoose.connection.collection('hackathons');
    
    const h = await Hackathon.findOne({ title: 'ctf' });
    if (!h) {
      console.log('Mission "ctf" not found.');
      process.exit(1);
    }

    console.log(`Mission: ${h.title} (Status: ${h.status})`);
    if (!h.rounds || h.rounds.length === 0) {
      console.log('No rounds found in the array.');
    } else {
      h.rounds.forEach(r => {
        console.log(`--- [Round ${r.roundNumber}] ${r.title} ---`);
        console.log(`  ID: ${r._id}`);
        console.log(`  Type: ${r.type}`);
        console.log(`  Status: ${r.status}`);
        console.log(`  Start: ${r.startTime}`);
        console.log(`  End: ${r.endTime}`);
        
        const now = new Date();
        const start = new Date(r.startTime);
        const end = new Date(r.endTime);
        
        const isLive = r.status === 'Live';
        const isOnlineMCQ = r.type === 'Online MCQ';
        const inWindow = now >= start && now <= end;
        
        console.log(`  [LOGIC CHECK]`);
        console.log(`  isLive: ${isLive}`);
        console.log(`  isOnlineMCQ: ${isOnlineMCQ}`);
        console.log(`  inWindow: ${inWindow}`);
        console.log(`  Show Button? ${isLive && isOnlineMCQ}`);
      });
    }
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Diagnostic Failed:', err);
    process.exit(1);
  }
}

checkRound();
