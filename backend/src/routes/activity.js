import express from 'express';
import mongoose from 'mongoose';
import ProjectLog from '../models/ProjectLog.js';
import ChallengeSubmission from '../models/ChallengeSubmission.js';
import KnowledgeArticle from '../models/KnowledgeArticle.js';
import HackathonRegistration from '../models/HackathonRegistration.js';
import Workshop from '../models/Workshop.js';
import User from '../models/User.js';

const router = express.Router();

// GET /api/activity/:userId
router.get('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;

    let user;
    // Attempt to find by ID first, then by username
    if (userId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(userId);
    }
    
    if (!user) {
      user = await User.findOne({ username: userId.toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const objectId = user._id;

    // Fetch all activity sources in parallel
    const [logs, challengeSubmissions, articles, hackathonRegs, workshops] = await Promise.all([
      ProjectLog.find({ author: objectId }).select('createdAt'),
      ChallengeSubmission.find({ userId: objectId }).select('createdAt'),
      KnowledgeArticle.find({ author: objectId }).select('createdAt'),
      HackathonRegistration.find({ user: objectId }).select('createdAt'),
      Workshop.find({ attendees: objectId }).select('date'),
    ]);

    // Aggregate into days
    const activityMap = {};

    const incrementDate = (date) => {
      if (!date) return;
      const dayRaw = new Date(date);
      const day = `${dayRaw.getFullYear()}-${String(dayRaw.getMonth() + 1).padStart(2, '0')}-${String(dayRaw.getDate()).padStart(2, '0')}`;
      if (!activityMap[day]) activityMap[day] = 0;
      activityMap[day] += 1;
    };

    logs.forEach(log => incrementDate(log.createdAt));
    challengeSubmissions.forEach(sub => incrementDate(sub.createdAt));
    articles.forEach(article => incrementDate(article.createdAt));
    hackathonRegs.forEach(reg => incrementDate(reg.createdAt));
    workshops.forEach(ws => incrementDate(ws.date));

    // Convert map to calendar readable format
    const events = Object.entries(activityMap).map(([date, count]) => {
      // Scale count to intensity 1-4
      let level = 1;
      if (count > 2) level = 2;
      if (count > 5) level = 3;
      if (count > 10) level = 4;

      return {
        date,
        level, // mapping to react-contribution-calendar expected levels (0-4)
        count
      };
    });

    res.json({
      events,
      counts: {
        logs: logs.length,
        tasks: 0,
        challenges: challengeSubmissions.length,
        articles: articles.length,
        hackathons: hackathonRegs.length,
        workshops: workshops.length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching activity' });
  }
});

export default router;
