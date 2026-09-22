import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const hackathonSchema = new mongoose.Schema({
  title: String,
  rounds: [{
    roundNumber: Number,
    title: String
  }]
});

const Hackathon = mongoose.model('Hackathon', hackathonSchema);

async function listIds() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox');
    console.log('--- MISSION ID REGISTRY ---');
    
    const hackathons = await Hackathon.find({}, 'title rounds');
    
    hackathons.forEach(h => {
      console.log(`\nMissions: ${h.title}`);
      console.log(`Hackathon ID: ${h._id}`);
      console.log('Rounds:');
      h.rounds.forEach(r => {
        console.log(`  [Round ${r.roundNumber}] ${r.title}`);
        console.log(`  Round ID: ${r._id}`);
      });
    });
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Extraction Failed:', err);
    process.exit(1);
  }
}

listIds();
