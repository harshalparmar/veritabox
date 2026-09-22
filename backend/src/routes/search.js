import express from 'express';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Bounty from '../models/Bounty.js';
import KnowledgeArticle from '../models/KnowledgeArticle.js';
import Hackathon from '../models/Hackathon.js';
import Workshop from '../models/Workshop.js';
import Chapter from '../models/Chapter.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Global platform search
// @route   GET /api/search?q=query
router.get('/', protect, async (req, res) => {
    try {
        const query = req.query.q;
        if (!query || query.length < 2) {
            return res.json({ users: [], projects: [], bounties: [], articles: [], hackathons: [], workshops: [], chapters: [] });
        }

        const regex = new RegExp(query, 'i');

        const [users, projects, bounties, articles, hackathons, workshops, chapters] = await Promise.all([
            User.find({ 
                $or: [{ name: regex }, { username: regex }, { universityId: regex }] 
            }).select('name username avatarUrl role').limit(5),
            
            Project.find({ 
                $or: [{ title: regex }, { description: regex }, { techStack: regex }] 
            }).populate('associatedTeam', 'teamName').limit(5),
            
            Bounty.find({ 
                $or: [{ title: regex }, { description: regex }, { type: regex }] 
            }).select('title difficulty reward status').limit(5),

            KnowledgeArticle.find({
                isPublished: true,
                $or: [{ title: regex }, { keywords: regex }]
            }).select('_id title slug').limit(5).then(docs => docs.map(d => ({ ...d.toObject(), type: 'article' }))),

            Hackathon.find({
                $or: [{ title: regex }, { description: regex }]
            }).select('_id title slug').limit(5).then(docs => docs.map(d => ({ ...d.toObject(), type: 'hackathon' }))),

            Workshop.find({
                $or: [{ title: regex }, { description: regex }, { tags: regex }]
            }).select('_id title slug').limit(5).then(docs => docs.map(d => ({ ...d.toObject(), type: 'workshop' }))),

            Chapter.find({
                $or: [{ name: regex }, { university: regex }]
            }).select('_id name slug').limit(5).then(docs => docs.map(d => ({ ...d.toObject(), type: 'chapter' }))),
        ]);

        res.json({
            users,
            projects,
            bounties,
            articles,
            hackathons,
            workshops,
            chapters
        });
    } catch (error) {
        res.status(500).json({ message: 'Search sequence failed: ' + error.message });
    }
});

export default router;
