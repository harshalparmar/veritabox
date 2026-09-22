import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function advanceTeams() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox');
    
    const Hackathon = mongoose.connection.collection('hackathons');
    const Team = mongoose.connection.collection('hackathonteams');
    
    const h = await Hackathon.findOne({ title: 'ctf' });
    if (!h) {
      console.log('Mission "ctf" not found.');
      process.exit(1);
    }

    const targetRound = 4;
    console.log(`Advancing all squadrons in "${h.title}" to Round ${targetRound}...`);
    
    const result = await Team.updateMany(
      { hackathonId: h._id },
      { $set: { currentRound: targetRound } }
    );
    
    console.log(`Success: Updated ${result.modifiedCount} squadrons.`);
    
    // Also check if there are any teams at all
    const teams = await Team.find({ hackathonId: h._id }).toArray();
    if (teams.length === 0) {
      console.log('WARNING: No squadrons found for this hackathon. Operatives must join a team first!');
    } else {
      teams.forEach(t => {
        console.log(`- Squadron: ${t.teamName} (Current Round: ${t.currentRound})`);
      });
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Operation Failed:', err);
    process.exit(1);
  }
}

advanceTeams();
