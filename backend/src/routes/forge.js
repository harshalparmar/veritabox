import express from 'express';
import Challenge from '../models/Challenge.js';
import ChallengeSubmission from '../models/ChallengeSubmission.js';
import User from '../models/User.js';
import { protect, isAdmin, optionalProtect } from '../middleware/authMiddleware.js';
import { evaluateCode } from '../utils/codeExecution.js';

const router = express.Router();

router.get('/', optionalProtect, async (req, res) => {
    try {
        const showAll = req.query.all === 'true';
        const isAdminUser = req.user && (req.user.role === 'Admin');
        
        let query = {};
        if (!isAdminUser || !showAll) {
            query = {
                $or: [
                    { activeFrom: { $exists: false } },
                    { activeFrom: null },
                    { activeFrom: { $lte: new Date() } }
                ]
            };
        }
        const challenges = await Challenge.find(query).sort({ difficulty: 1 });
        
        if (req.user) {
            // Retrieve all submissions by this user to determine status
            const submissions = await ChallengeSubmission.find({ userId: req.user._id });
            const solvedIds = new Set(
                submissions
                    .filter(s => s.status === 'Accepted')
                    .map(s => s.challengeId.toString())
            );
            const attemptedIds = new Set(
                submissions
                    .map(s => s.challengeId.toString())
            );

            const challengesWithStatus = challenges.map(c => {
                const idStr = c._id.toString();
                let status = 'Unsolved';
                if (solvedIds.has(idStr)) {
                    status = 'Solved';
                } else if (attemptedIds.has(idStr)) {
                    status = 'Attempted';
                }
                const obj = c.toObject();
                obj.solvedStatus = status;
                return obj;
            });
            return res.json(challengesWithStatus);
        }
        res.json(challenges);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving forge catalog.' });
    }
});

// @desc    Get leaderboard (top solvers by aggregate count of solves)
// @route   GET /api/forge/leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await ChallengeSubmission.aggregate([
            { $match: { status: 'Accepted' } },
            { $group: { _id: '$userId', solvedCount: { $sum: 1 } } },
            { $sort: { solvedCount: -1 } },
            { $limit: 20 }
        ]);

        const populated = await Promise.all(leaderboard.map(async (item) => {
            const user = await User.findById(item._id).select('name username avatarUrl reputationPoints');
            if (!user) return null;
            return {
                user,
                solvedCount: item.solvedCount
            };
        }));

        res.json(populated.filter(Boolean));
    } catch (error) {
        res.status(500).json({ message: 'Leaderboard loading failed: ' + error.message });
    }
});

// @desc    Get challenge details
// @route   GET /api/forge/:id
router.get('/:id', optionalProtect, async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ message: 'Challenge depth not found.' });
        
        const isAdminUser = req.user && (req.user.role === 'Admin');
        if (challenge.activeFrom && new Date() < new Date(challenge.activeFrom) && !isAdminUser) {
            return res.status(403).json({ message: 'Access denied: Challenge has not started yet.' });
        }
        res.json(challenge);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving challenge briefing.' });
    }
});

// @desc    Run code on custom testcase
// @route   POST /api/forge/:id/run
router.post('/:id/run', protect, async (req, res) => {
    try {
        const { code, language, customInput } = req.body;
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ message: 'Target challenge redacted.' });

        const inputToRun = customInput !== undefined ? customInput : challenge.exampleInput;
        // Evaluate only on the custom input
        const evaluation = await evaluateCode(code, language, [], inputToRun, challenge.exampleOutput || "");
        
        res.json({
            status: evaluation.status,
            testCaseResults: evaluation.testCaseResults
        });
    } catch (error) {
        res.status(500).json({ message: 'Code run sequence failure: ' + error.message });
    }
});

// @desc    Submit code for evaluation
// @route   POST /api/forge/:id/submit
router.post('/:id/submit', protect, async (req, res) => {
    try {
        const { code, language } = req.body;
        const challenge = await Challenge.findById(req.params.id);

        if (!challenge) return res.status(404).json({ message: 'Target challenge redacted.' });

        const isAdminUser = req.user && (req.user.role === 'Admin');
        if (challenge.activeFrom && new Date() < new Date(challenge.activeFrom) && !isAdminUser) {
            return res.status(400).json({ message: 'Evaluation sequence rejected: Challenge has not started yet.' });
        }

        const evaluation = await evaluateCode(code, language, challenge.testCases || [], challenge.exampleInput, challenge.exampleOutput);

        let runtime = Math.floor(Math.random() * 50) + 5;
        let memory = Math.floor(Math.random() * 2000) + 1000;

        const submission = await ChallengeSubmission.create({
            challengeId: req.params.id,
            userId: req.user._id,
            code,
            language,
            status: evaluation.status,
            runtime,
            memory,
            testCaseResults: evaluation.testCaseResults
        });

        if (evaluation.status === 'Accepted') {
            // Reward reputation points if first successful solve
            const previousSolve = await ChallengeSubmission.findOne({ 
                challengeId: req.params.id, 
                userId: req.user._id, 
                status: 'Accepted',
                _id: { $ne: submission._id }
            });

            if (!previousSolve) {
                const user = await User.findById(req.user._id);
                const points = challenge.reputationReward || 50;
                user.reputationPoints += points;
                await user.save();

                // Log reputation points
                const ReputationLog = (await import('../models/ReputationLog.js')).default;
                await ReputationLog.create({
                    userId: req.user._id,
                    chapterId: user.chapterId || null,
                    points,
                    reason: `Solved challenge: ${challenge.title}`,
                    sourceModel: 'Challenge',
                    sourceId: challenge._id
                });
            }
        }

        // Dynamically compute global metrics for this challenge
        const totalSubmissionsCount = await ChallengeSubmission.countDocuments({ challengeId: req.params.id });
        const acceptedSubmissionsCount = await ChallengeSubmission.countDocuments({ challengeId: req.params.id, status: 'Accepted' });
        challenge.acceptanceRate = totalSubmissionsCount > 0 
            ? Math.round((acceptedSubmissionsCount / totalSubmissionsCount) * 100) 
            : 0;

        const uniqueSolvers = await ChallengeSubmission.distinct('userId', { challengeId: req.params.id, status: 'Accepted' });
        challenge.totalSolved = uniqueSolvers.length;
        
        await challenge.save();

        res.status(201).json(submission);
    } catch (error) {
        res.status(500).json({ message: 'Evaluation sequence failure: ' + error.message });
    }
});

// @desc    Get user submissions for a challenge
// @route   GET /api/forge/:id/submissions
router.get('/:id/submissions', protect, async (req, res) => {
    try {
        const submissions = await ChallengeSubmission.find({ 
            challengeId: req.params.id, 
            userId: req.user._id 
        }).sort({ createdAt: -1 });
        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving local submission history.' });
    }
});

// ─── ADMIN ENDPOINTS ─────────────────────────────────────────────────────────

// @desc    Create a new challenge
// @route   POST /api/forge
router.post('/', protect, isAdmin, async (req, res) => {
    try {
        const { title, difficulty, tags, problemStatement, constraints, exampleInput, exampleOutput, testCases, reputationReward, activeFrom } = req.body;
        
        const challenge = await Challenge.create({
            title,
            difficulty,
            tags,
            problemStatement,
            constraints,
            exampleInput,
            exampleOutput,
            testCases,
            reputationReward,
            activeFrom: activeFrom || null
        });

        res.status(201).json(challenge);
    } catch (error) {
        res.status(500).json({ message: 'Challenge creation failed: ' + error.message });
    }
});

// @desc    Update a challenge
// @route   PUT /api/forge/:id
router.put('/:id', protect, isAdmin, async (req, res) => {
    try {
        const challenge = await Challenge.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!challenge) return res.status(404).json({ message: 'Challenge not found.' });
        res.json(challenge);
    } catch (error) {
        res.status(500).json({ message: 'Challenge update failed: ' + error.message });
    }
});

// @desc    Delete a challenge
// @route   DELETE /api/forge/:id
router.delete('/:id', protect, isAdmin, async (req, res) => {
    try {
        const challenge = await Challenge.findByIdAndDelete(req.params.id);
        if (!challenge) return res.status(404).json({ message: 'Challenge not found.' });

        // Clean up submissions
        await ChallengeSubmission.deleteMany({ challengeId: req.params.id });

        res.json({ message: 'Challenge successfully purged.' });
    } catch (error) {
        res.status(500).json({ message: 'Challenge purge failed: ' + error.message });
    }
});

// @desc    Get analytics for a challenge
// @route   GET /api/forge/:id/analytics
router.get('/:id/analytics', protect, isAdmin, async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) return res.status(404).json({ message: 'Target challenge redacted.' });

        const submissions = await ChallengeSubmission.find({ challengeId: req.params.id }).sort({ createdAt: -1 });
        
        const acceptedSubmissions = submissions.filter(s => s.status === 'Accepted');
        
        const avgRuntime = acceptedSubmissions.length > 0
            ? Math.round(acceptedSubmissions.reduce((acc, curr) => acc + (curr.runtime || 0), 0) / acceptedSubmissions.length)
            : 0;
        const avgMemory = acceptedSubmissions.length > 0
            ? Math.round(acceptedSubmissions.reduce((acc, curr) => acc + (curr.memory || 0), 0) / acceptedSubmissions.length)
            : 0;

        const languages = {};
        const acceptedLanguages = {};
        submissions.forEach(sub => {
            languages[sub.language] = (languages[sub.language] || 0) + 1;
            if (sub.status === 'Accepted') {
                acceptedLanguages[sub.language] = (acceptedLanguages[sub.language] || 0) + 1;
            }
        });

        const submissionsWithUser = await Promise.all(
            submissions.map(async (sub) => {
                const userObj = await User.findById(sub.userId).select('name username avatarUrl');
                return {
                    _id: sub._id,
                    userId: sub.userId,
                    user: userObj,
                    code: sub.code,
                    language: sub.language,
                    status: sub.status,
                    runtime: sub.runtime,
                    memory: sub.memory,
                    createdAt: sub.createdAt
                };
            })
        );

        res.json({
            challenge,
            stats: {
                totalSubmissions: submissions.length,
                acceptedCount: acceptedSubmissions.length,
                acceptanceRate: submissions.length > 0 ? Math.round((acceptedSubmissions.length / submissions.length) * 100) : 0,
                avgRuntime,
                avgMemory,
                languages,
                acceptedLanguages
            },
            submissions: submissionsWithUser
        });
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving challenge metrics: ' + error.message });
    }
});

export default router;
