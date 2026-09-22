import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function finalizeRounds() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox');
    
    const Hackathon = mongoose.connection.collection('hackathons');
    const Team = mongoose.connection.collection('hackathonteams');
    
    const h = await Hackathon.findOne({ title: 'ctf' });
    if (!h) {
      console.log('Mission "ctf" not found.');
      process.exit(1);
    }

    const currentRound = 4;
    const previousRounds = [1, 2, 3];
    
    console.log(`Finalizing previous rounds ${previousRounds} for all squadrons in "${h.title}"...`);
    
    const result = await Team.updateMany(
      { hackathonId: h._id },
      { 
        $set: { currentRound: currentRound },
        $addToSet: { finalizedRounds: { $each: previousRounds } }
      }
    );
    
    console.log(`Success: Synchronized records for ${result.modifiedCount} squadrons.`);
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Operation Failed:', err);
    process.exit(1);
  }
}

finalizeRounds();
