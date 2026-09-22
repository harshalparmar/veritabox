import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function audit() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox');
    
    const Submission = mongoose.connection.collection('questionsubmissions');
    const Team = mongoose.connection.collection('hackathonteams');
    
    const teamOne = await Team.findOne({ teamName: 'team one' });
    if (!teamOne) {
        console.log('Team "team one" not found.');
        process.exit(1);
    }
    
    console.log(`Auditing Team: ${teamOne.teamName} (ID: ${teamOne._id})`);
    
    // List all submissions for this team's members too
    const memberSubmissions = await Submission.find({ userId: { $in: teamOne.members } }).toArray();
    console.log(`Submissions by members: ${memberSubmissions.length}`);
    
    const teamSubmissions = await Submission.find({ teamId: teamOne._id }).toArray();
    console.log(`Submissions by teamId: ${teamSubmissions.length}`);
    
    // Sample one submission to see the schema
    const allSubs = await Submission.find({}).limit(5).toArray();
    console.log('--- Sample Submissions Schema ---');
    console.log(JSON.stringify(allSubs, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error('Audit Failed:', err);
    process.exit(1);
  }
}

audit();
