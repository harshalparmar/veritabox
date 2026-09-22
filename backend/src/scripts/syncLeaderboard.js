import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function syncScores() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox');
    
    const Team = mongoose.connection.collection('hackathonteams');
    const Hackathon = mongoose.connection.collection('hackathons');
    
    const h = await Hackathon.findOne({ title: 'ctf' });
    if (!h) {
      console.log('Mission "ctf" not found.');
      process.exit(1);
    }

    const teams = await Team.find({ hackathonId: h._id }).toArray();
    console.log(`Auditing ${teams.length} squadrons for mission "${h.title}"...`);

    for (const team of teams) {
      let totalScore = 0;
      const roundScores = {};

      // 1. Sum up correct MCQ submissions from the nested array
      if (team.submissions && Array.isArray(team.submissions)) {
        team.submissions.forEach(sub => {
          if (sub.isCorrect) {
            const points = sub.pointsAwarded || 0;
            totalScore += points;
            
            const roundNum = sub.roundNumber || 1;
            roundScores[roundNum] = (roundScores[roundNum] || 0) + points;
          }
        });
      }

      // 2. Sum up Judged Points (Awards)
      if (team.judgedPoints && Array.isArray(team.judgedPoints)) {
        team.judgedPoints.forEach(award => {
          totalScore += award.points;
          const roundNum = award.roundNumber || 1;
          roundScores[roundNum] = (roundScores[roundNum] || 0) + award.points;
        });
      }

      // Update the team record with the new totals
      await Team.updateOne(
        { _id: team._id },
        { 
          $set: { 
            score: totalScore,
            roundScores: roundScores
          } 
        }
      );
      
      console.log(`- ${team.teamName}: Synchronized Total ${totalScore} pts.`);
      console.log(`  Breakdown:`, roundScores);
    }

    console.log('Telemetry synchronization complete.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('Synchronization Failed:', err);
    process.exit(1);
  }
}

syncScores();
