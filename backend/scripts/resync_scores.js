/**
 * resync_scores.js — Tactical utility to fix legacy scoring anomalies.
 * Scans all teams, re-verifies submissions, and recalculates total scores.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import HackathonTeam from '../src/models/HackathonTeam.js';
import Question from '../src/models/Question.js';

dotenv.config();

async function resync() {
  console.log("--- INITIATING GLOBAL TACTICAL RESYNC ---");
  
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/veritabox';
    await mongoose.connect(mongoUri);
    console.log("Connected to Intelligence Bank.");

    const teams = await HackathonTeam.find({});
    const questions = await Question.find({});
    
    console.log(`Analyzing ${teams.length} squadrons...`);

    for (const team of teams) {
      let originalScore = team.score;
      let calculatedScore = 0;
      let correctionsMade = 0;

      for (const sub of team.submissions) {
        if (!sub.questionId) continue;
        
        const qData = questions.find(q => q._id.toString() === sub.questionId.toString());
        if (qData) {
          const normalizedUser = (sub.answer || "").toString().trim().toLowerCase();
          const normalizedCorrect = (qData.correctAnswer || "").toString().trim().toLowerCase();
          
          const wasCorrect = sub.isCorrect;
          const isCorrectNow = normalizedUser === normalizedCorrect;
          
          if (wasCorrect !== isCorrectNow) {
            sub.isCorrect = isCorrectNow;
            correctionsMade++;
          }

          if (isCorrectNow) {
            calculatedScore += (qData.points || 10);
          }
        }
      }

      if (team.score !== calculatedScore || correctionsMade > 0) {
        console.log(`[FIX] Team: ${team.teamName} | Score: ${originalScore} -> ${calculatedScore} | ${correctionsMade} corrections.`);
        team.score = calculatedScore;
        await team.save();
      }
    }

    console.log("--- MISSION COMPLETE: ALL SQUADRONS SYNCHRONIZED ---");
    process.exit(0);
  } catch (error) {
    console.error("CRITICAL ERROR DURING RESYNC:", error);
    process.exit(1);
  }
}

resync();
