import express from 'express';
import mongoose from 'mongoose';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import Hackathon from '../models/Hackathon.js';
import Question from '../models/Question.js';
import HackathonTeam from '../models/HackathonTeam.js';
import HackathonSubmission from '../models/HackathonSubmission.js';
import ProctorSnapshot from '../models/ProctorSnapshot.js';
import ProctorViolation from '../models/ProctorViolation.js';
import UserProgress from '../models/UserProgress.js';
import SAAuditLog from '../models/SAAuditLog.js';
import User from '../models/User.js';
import slugify from 'slugify';
import { entropyAudit } from '../middleware/antiCheat.js';
import { roundGuard } from '../middleware/roundGuard.js';

function getRoleCategory(role) {
  if (['Professional', 'Industry'].includes(role)) return 'Professional';
  if (['Teacher', 'Faculty'].includes(role)) return 'Teacher';
  return 'Student';
}
import { saveProctorSnapshot } from '../utils/hackathonUtils.js';
import { getRedis } from '../utils/redis.js';

const router = express.Router();

const SNAPSHOT_WINDOW_SEC = Math.ceil(parseInt(process.env.SNAPSHOT_INTERVAL_MS || '10000', 10) / 1000);
async function snapshotRateLimit(req, res, next) {
    const key = req.user?._id?.toString();
    if (!key) return next();
    const redisKey = `snapshot:rate:${key}`;
    const redis = getRedis();
    const exists = await redis.exists(redisKey);
    if (exists) {
        return res.status(429).json({ message: 'Snapshot rate limit exceeded. Please wait before sending another.' });
    }
    await redis.set(redisKey, '1', 'EX', SNAPSHOT_WINDOW_SEC);
    next();
}

// Deterministic Fisher-Yates shuffle seeded by a string (userId+roundId)
function seededShuffle(arr, seed) {
  let h = seed.split('').reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) | 0, 0) >>> 0;
  const next = () => { h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) >>> 0; return h / 0xffffffff; };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

import { resolveHackathonId } from '../utils/hackathonUtils.js';
import RoundSubmission from '../models/RoundSubmission.js';
import Challenge from '../models/Challenge.js';
import ChallengeSubmission from '../models/ChallengeSubmission.js';
import { evaluateCode } from '../utils/codeExecution.js';

/**
 * PHASE 1 & 2: ADMIN ORCHESTRATOR
 */

// @desc    Create a new Hackathon (Draft)
// @route   POST /api/hackathons
// @access  Admin
router.post('/', protect, isAdmin, async (req, res) => {
  try {
    const { title, description, shortDescription, type, subCategory } = req.body;
    const slug = slugify(title, { lower: true });
    
    const hackathon = await Hackathon.create({
      title,
      slug,
      description,
      shortDescription,
      type: type || 'Hackathon',
      subCategory: subCategory || 'General',
      status: 'Draft',
      organizer: req.user._id
    });

    res.status(201).json(hackathon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update Hackathon Details
// @route   PATCH /api/hackathons/:id
// @access  Admin
router.patch('/:id', protect, isAdmin, async (req, res) => {
  try {
    const allowed = ['title', 'description', 'shortDescription', 'bannerImage', 'startDate',
      'endDate', 'registrationDeadline', 'mode', 'venue', 'maxTeamSize', 'minTeamSize',
      'maxParticipants', 'prizes', 'rules', 'themes', 'judgingCriteria', 'schedule',
      'resources', 'sponsors', 'faqs', 'isPublished', 'tags', 'type', 'subCategory',
      'status', 'slug', 'chapterScope', 'maxTeams'];
    const updateData = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updateData[k] = req.body[k]; });

    const hackathon = await Hackathon.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });
    res.json(hackathon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Update Hackathon Rounds (Timeline Builder)
// @route   PUT /api/hackathons/:id/rounds
// @access  Admin
router.put('/:id/rounds', protect, isAdmin, async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });

    if (!Array.isArray(req.body.rounds)) {
      return res.status(400).json({ message: 'Invalid payload: rounds must be an array' });
    }

    hackathon.rounds = req.body.rounds; // Expects array of {roundNumber, title, startTime, endTime}
    await hackathon.save();

    res.json(hackathon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Bulk Add Questions
// @route   POST /api/hackathons/:id/questions
// @access  Admin
router.post('/:id/questions', protect, isAdmin, async (req, res) => {
  try {
    const { questions } = req.body; // Array of Questions
    const hackathon = await Hackathon.findById(req.params.id);
    if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });

    const formattedQuestions = questions.map(q => {
        let finalAnswer = q.correctAnswer;
        
        // Priority 1: Map numeric index to text if available
        if (typeof q.correctOption === 'number' && q.options && q.options[q.correctOption]) {
            finalAnswer = q.options[q.correctOption];
        }

        // Priority 2: Standardize case across all fields for bit-perfect matching
        const standardizedOptions = q.options ? q.options.map(o => o.toString().trim()) : [];
        const standardizedAnswer = finalAnswer ? finalAnswer.toString().trim() : '';

        return {
            ...q,
            hackathonId: hackathon._id,
            options: standardizedOptions,
            correctAnswer: standardizedAnswer.toLowerCase() // Backend standard is lowercase
        };
    });

    const docs = await Question.insertMany(formattedQuestions);

    // 4A — Emit QUESTIONS_UPDATED so arena participants can refetch
    const io = req.app.get('io');
    if (io) io.to(`hackathon_${req.params.id}`).emit('QUESTIONS_UPDATED');

    res.status(201).json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Announce Hackathon
// @route   POST /api/hackathons/:id/announce
// @access  Admin
router.post('/:id/announce', protect, isAdmin, async (req, res) => {
    try {
      const hackathon = await Hackathon.findById(req.params.id);
      if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });
  
      const questionCount = await Question.countDocuments({ hackathonId: hackathon._id });
      
      // Validation: Must have rounds and at least some questions
      if (!hackathon.rounds || hackathon.rounds.length === 0) {
          return res.status(400).json({ message: 'Cannot announce without rounds defined.' });
      }
      if (questionCount === 0) {
          return res.status(400).json({ message: 'Cannot announce without questions in the bank.' });
      }
  
      hackathon.status = 'Announced';
      await hackathon.save();
  
      res.json({ message: 'Hackathon Announced!', hackathon });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
});

// @desc    Update Hackathon Settings
// @route   PUT /api/hackathons/:id/settings
router.put('/:id/settings', protect, isAdmin, async (req, res) => {
    try {
        const { prizes, rules, description, chapterScope, maxTeams } = req.body;
        const hackathon = await Hackathon.findByIdAndUpdate(
            req.params.id,
            { prizes, rules, description, chapterScope, maxTeams },
            { new: true }
        );
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });
        res.json(hackathon);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete Question
// @route   DELETE /api/hackathons/:id/questions/:questionId
router.delete('/:id/questions/:questionId', protect, isAdmin, async (req, res) => {
    try {
        const question = await Question.findOneAndDelete({ _id: req.params.questionId, hackathonId: req.params.id });
        if (!question) return res.status(404).json({ message: 'Question not found in this hackathon.' });

        // 4A — Emit QUESTIONS_UPDATED so arena participants can refetch
        const io = req.app.get('io');
        if (io) io.to(`hackathon_${req.params.id}`).emit('QUESTIONS_UPDATED');

        res.json({ message: 'Intelligence artifact purged from mission bank.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update Question
// @route   PUT /api/hackathons/:id/questions/:questionId
router.put('/:id/questions/:questionId', protect, isAdmin, async (req, res) => {
    try {
        const { questionText, options, correctAnswer, explanation, points, roundId } = req.body;
        
        const question = await Question.findByIdAndUpdate(
            req.params.questionId,
            { questionText, options, correctAnswer, explanation, points, roundId },
            { new: true }
        );
        
        if (!question) return res.status(404).json({ message: 'Question not found' });

        // Emit QUESTIONS_UPDATED so arena participants can refetch
        const io = req.app.get('io');
        if (io) io.to(`hackathon_${req.params.id}`).emit('QUESTIONS_UPDATED');

        res.json({ message: 'Intelligence artifact updated successfully.', question });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update Team Status (Qualify/Disqualify)
// @route   PATCH /api/hackathons/:id/teams/:teamId/status
router.patch('/:id/teams/:teamId/status', protect, isAdmin, async (req, res) => {
    try {
        const { isDisqualified, reason, currentRound } = req.body;
        const updateData = {};
        if (isDisqualified !== undefined) updateData.isDisqualified = isDisqualified;
        if (reason !== undefined) updateData.disqualificationReason = reason;
        if (currentRound !== undefined) updateData.currentRound = currentRound;

        const team = await HackathonTeam.findByIdAndUpdate(
            req.params.teamId,
            updateData,
            { new: true }
        );
        if (!team) return res.status(404).json({ message: 'Squadron not found' });

        await SAAuditLog.create({
            saId: req.user._id,
            action: isDisqualified ? 'TEAM_DISQUALIFIED' : 'TEAM_STATUS_UPDATED',
            payload: { teamId: req.params.teamId, hackathonId: req.params.id, ...updateData },
            endpoint: req.originalUrl,
            method: req.method,
            ipAddress: req.ip,
        }).catch(() => {});

        res.json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Reset a team's strike count (Admin) — logs to audit trail
// @route   PATCH /api/hackathons/:id/teams/:teamId/pardon-mission-breach
router.patch('/:id/teams/:teamId/pardon-mission-breach', protect, isAdmin, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const team = await HackathonTeam.findOne({ _id: req.params.teamId, hackathonId: hId });
        if (!team) return res.status(404).json({ message: 'Squadron not found' });

        const previousWarnings = team.warnings;
        team.warnings = 0;
        team.arenaEntries = 0;
        team.abortCount = 0;
        team.isFlagged = false;
        if (req.body.reinstateIfDisqualified) {
            team.isDisqualified = false;
            team.disqualificationReason = null;
        }
        await team.save();
        
        await ProctorViolation.deleteMany({ hackathonId: hId, teamId: team._id });

        await SAAuditLog.create({
            saId: req.user._id,
            action: 'TEAM_STRIKES_RESET',
            payload: { teamId: team._id, teamName: team.teamName, hackathonId: req.params.id, previousWarnings },
            endpoint: req.originalUrl,
            method: req.method,
            ipAddress: req.ip,
        }).catch(() => {});

        res.json({ message: `Strikes reset. Previous count: ${previousWarnings}`, team });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get All Questions (Admin)
// @route   GET /api/hackathons/:id/questions-admin
router.get('/:id/questions-admin', protect, isAdmin, async (req, res) => {
    try {
        const questions = await Question.find({ hackathonId: req.params.id })
            .sort({ roundId: 1, createdAt: 1 });
        res.json(questions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * PHASE 3: TEAM FORMATION
 */

// @desc    Get all hackathons (Admin/Founder only)
// @route   GET /api/hackathons/admin/all
// @access  Admin
router.get('/admin/all', protect, isAdmin, async (req, res) => {
    try {
        const type = req.query.type || 'Hackathon';
        const hackathons = await Hackathon.find({ type }).sort({ createdAt: -1 });
        res.json(hackathons);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all announced/live hackathons
// @route   GET /api/hackathons
// @access  Public
router.get('/', async (req, res) => {
  try {
    const type = req.query.type || 'Hackathon';
    const subCategory = req.query.subCategory;

    const query = { status: { $ne: 'Draft' }, type };
    if (subCategory && subCategory !== 'All') {
        query.subCategory = subCategory;
    }

    const hackathons = await Hackathon.find(query).sort({ createdAt: -1 }).lean();
    const ids = hackathons.map(h => h._id);
    const counts = await HackathonTeam.aggregate([
      { $match: { hackathonId: { $in: ids } } },
      { $group: { _id: '$hackathonId', count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(counts.map(c => [c._id.toString(), c.count]));
    const result = hackathons.map(h => ({ ...h, teamCount: countMap[h._id.toString()] ?? 0 }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Parametric routes moved downstream to prevent shadowing static paths

// @desc    Register Team
// @route   POST /api/hackathons/:id/register
router.post('/:id/register', protect, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const hackathon = await Hackathon.findById(hId);
        if (!hackathon) return res.status(404).json({ message: 'Mission context not found.' });

        const existing = await HackathonTeam.findOne({ hackathonId: hId, members: req.user._id });
        if (existing) return res.status(400).json({ message: 'You are already established in a squadron for this engagement.' });

        const teamCount = await HackathonTeam.countDocuments({ hackathonId: hId });
        if (teamCount >= (hackathon.maxTeams || 100)) {
            return res.status(400).json({ message: 'This mission has reached maximum team capacity.' });
        }

        const minSize = hackathon.minTeamSize || 1;
        const maxSize = hackathon.maxTeamSize || 5;

        let teamName = req.body.teamName;

        // Solo mode: auto-generate team name from user's display name
        if (minSize === 1 && maxSize === 1) {
            teamName = teamName || req.user.name || req.user.username || 'Solo';
        }

        if (!teamName || typeof teamName !== 'string' || teamName.trim().length < 2 || teamName.trim().length > 50) {
            return res.status(400).json({ message: 'Team name must be between 2 and 50 characters.' });
        }

        let inviteCode, isUnique = false;
        while (!isUnique) {
            inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const dup = await HackathonTeam.findOne({ inviteCode });
            if (!dup) isUnique = true;
        }

        const team = await HackathonTeam.create({
            hackathonId: hId,
            teamName,
            leader: req.user._id,
            members: [req.user._id],
            inviteCode,
            maxMembers: maxSize,
            roleCategory: getRoleCategory(req.user.role)
        });

        res.status(201).json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Register Standalone Squadron (No Hackathon)
// @route   POST /api/hackathons/teams/standalone
router.post('/teams/standalone', protect, async (req, res) => {
    try {
        const { teamName, maxMembers, isPublic } = req.body;
        if (!teamName || typeof teamName !== 'string' || teamName.trim().length < 2 || teamName.trim().length > 50) {
            return res.status(400).json({ message: 'Team name must be between 2 and 50 characters.' });
        }

        let inviteCode;
        let isUnique = false;
        
        // Ensure invite code uniqueness across all units
        while (!isUnique) {
            inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            const existing = await HackathonTeam.findOne({ inviteCode });
            if (!existing) isUnique = true;
        }

        const team = await HackathonTeam.create({
            teamName,
            leader: req.user._id,
            members: [req.user._id],
            inviteCode,
            maxMembers: maxMembers !== undefined ? Number(maxMembers) : 5,
            isPublic: isPublic !== undefined ? Boolean(isPublic) : false,
            roleCategory: getRoleCategory(req.user.role)
        });

        res.status(201).json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all teams for the logged-in user
// @route   GET /api/hackathons/teams/me
router.get('/teams/me', protect, async (req, res) => {
    try {
        const teams = await HackathonTeam.find({
            members: req.user._id
        }).populate('hackathonId', 'title slug status rounds type');
        
        const responseData = teams.map(team => {
            const teamObj = team.toObject({ flattenMaps: true });
            if (!teamObj.hackathonId) {
                delete teamObj.score;
                delete teamObj.roundScores;
            }
            return teamObj;
        });
        
        res.json(responseData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Join Team via Invite Code
router.post('/join', protect, async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const team = await HackathonTeam.findOne({ inviteCode });
        if (!team) return res.status(404).json({ message: 'Invalid Invite Code' });

        const joinerCategory = getRoleCategory(req.user.role);
        if (team.roleCategory && team.roleCategory !== joinerCategory) {
            return res.status(403).json({ message: `This squadron is for ${team.roleCategory}s only. You cannot join as a ${joinerCategory}.` });
        }

        // Constraint: Only enforce one-squadron-per-engagement for hackathons.
        if (team.hackathonId) {
            const existing = await HackathonTeam.findOne({ hackathonId: team.hackathonId, members: req.user._id });
            if (existing) return res.status(400).json({ message: 'You are already established in a squadron for this tactical engagement.' });
        }

        const memberCap = team.maxMembers || 5;
        if (team.members.length >= memberCap) {
            return res.status(400).json({ message: `Team is full (max ${memberCap} members)` });
        }

        if (team.members.some(m => m.toString() === req.user._id.toString())) {
            return res.status(400).json({ message: 'Already a member' });
        }

        team.members.push(req.user._id);
        await team.save();

        res.json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get Team Status for a Hackathon
// @route   GET /api/hackathons/:id/team-status
router.get('/:id/team-status', protect, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const team = await HackathonTeam.findOne({
            hackathonId: hId,
            $or: [
                { members: req.user._id },
                { leader: req.user._id }
            ]
        })
        .populate('members', 'name role')
        .populate('leader', 'name')
        .populate('activeSolver', 'name')
        .populate('hackathonId', 'slug');

        if (!team) {
            return res.status(404).json({
                message: 'No squadron registration found for this mission context.'
            });
        }

        // Calculate if current round is complete
        const hackathon = await Hackathon.findById(hId);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon mission not found' });

        const now = new Date();
        const chronologicallyActiveRound = hackathon.rounds.find(r => {
            const start = new Date(r.startTime);
            const end = new Date(r.endTime);
            return now >= start && now <= end && r.status === 'Live';
        });

        // 1A — Auto-advance team if they are behind a live round and qualified
        if (chronologicallyActiveRound && team.currentRound < chronologicallyActiveRound.roundNumber) {
            let qualified = true;
            // Check qualification for all rounds between current and live
            for (const r of hackathon.rounds) {
                if (r.roundNumber >= team.currentRound && r.roundNumber < chronologicallyActiveRound.roundNumber) {
                    const prevScore = team.roundScores?.get ? team.roundScores.get(r.roundNumber.toString()) : (team.roundScores[r.roundNumber.toString()] || 0);
                    const threshold = r.qualifyingThreshold || 0;
                    if ((prevScore || 0) < threshold) {
                        qualified = false;
                        break;
                    }
                }
            }

            if (qualified) {
                team.currentRound = chronologicallyActiveRound.roundNumber;
                await team.save();
            }
        }

        const activeRound = hackathon.rounds.find(r => r.roundNumber === team.currentRound);
        
        let isRoundComplete = false;
        if (activeRound) {
            const questionCount = await Question.countDocuments({ 
                hackathonId: hId, 
                roundId: activeRound._id 
            });
            
            // Submissions filter: check if team has submitted for all questions in this round
            const roundQuestions = await Question.find({ hackathonId: hId, roundId: activeRound._id }).select('_id');
            const roundQuestionIds = roundQuestions.map(q => q._id.toString());
            
            const teamSubmissionsForRound = team.submissions.filter(s => 
                s.questionId && roundQuestionIds.includes(s.questionId.toString())
            );
            
            // 1B — Use unique questionId count to prevent double-submission inflating total
            const answeredUniqueIds = new Set(teamSubmissionsForRound.map(s => s.questionId.toString()));
            if (answeredUniqueIds.size >= questionCount && questionCount > 0) {
                isRoundComplete = true;
            }
        }

        const submission = await HackathonSubmission.findOne({ hackathon: hId, team: team._id });
        const teamObj = team.toObject();
        teamObj.isRoundComplete = isRoundComplete;
        teamObj.projectSubmission = submission;

        res.json(teamObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Take Control (Set Active Solver)
// @route   POST /api/hackathons/:id/take-control
router.post('/:id/take-control', protect, async (req, res) => {
    try {
        const team = await HackathonTeam.findOne({
            hackathonId: req.params.id,
            members: req.user._id
        });

        if (!team) return res.status(404).json({ message: 'Squadron not found.' });
        if (team.activeSolver && team.activeSolver.toString() !== req.user._id.toString()) {
            return res.status(400).json({ message: 'Another member is already in control.' });
        }

        team.activeSolver = req.user._id;
        await team.save();

        if (req.io) {
            req.io.to(`hackathon_${req.params.id}`).emit('solver_updated', {
                teamId: team._id,
                activeSolver: req.user.name
            });
        }

        res.json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Log Arena Entry (Increment counter & enforce limit)
// @route   POST /api/hackathons/:id/log-entry
router.post('/:id/log-entry', protect, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const team = await HackathonTeam.findOne({
            hackathonId: hId,
            members: req.user._id
        });

        if (!team) return res.status(404).json({ message: 'Squadron not found.' });
        if (team.isDisqualified) return res.json(team);

        const currentEntries = team.arenaEntries || 0;
        if (currentEntries >= 3) {
            team.isDisqualified = true;
            team.disqualificationReason = "Maximum arena entry threshold exceeded (3/3).";
            await team.save();
            return res.status(403).json({ message: 'Maximum arena entries reached. Squadron disqualified.', team });
        }

        team.arenaEntries = currentEntries + 1;

        await team.save();
        res.json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Log Mission Abort (Increment abort count)
// @route   POST /api/hackathons/:id/log-abort
router.post('/:id/log-abort', protect, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const team = await HackathonTeam.findOne({
            hackathonId: hId,
            members: req.user._id
        });

        if (!team) return res.status(404).json({ message: 'Squadron not found.' });
        
        team.abortCount = (team.abortCount || 0) + 1;
        await team.save();
        
        res.json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Leave Team
// @route   POST /api/hackathons/:id/leave
router.post('/:id/leave', protect, async (req, res) => {
    try {
        const team = await HackathonTeam.findOne({ hackathonId: req.params.id, members: req.user._id });
        if (!team) return res.status(404).json({ message: 'Squadron not found.' });

        if (team.leader.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Leaders cannot leave. Disband the squadron instead.' });
        }

        team.members = team.members.filter(m => m.toString() !== req.user._id.toString());
        if (team.activeSolver?.toString() === req.user._id.toString()) team.activeSolver = null;
        
        await team.save();
        res.json({ message: 'Successfully detached from squadron.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * UNIFIED SQUADRON MANAGEMENT PROTOCOL (v2)
 * Targets TeamID directly for both Standalone and Hackathon units.
 */

// @desc    Get Team by ID (Populated)
router.get('/teams/:id', protect, async (req, res) => {
    try {
        const team = await HackathonTeam.findById(req.params.id)
            .populate('members', 'name role avatarUrl reputationPoints')
            .populate('leader', 'name avatarUrl');
        
        if (!team) return res.status(404).json({ message: 'Squadron not found' });
        
        const teamObj = team.toObject({ flattenMaps: true });
        if (!teamObj.hackathonId) {
            delete teamObj.score;
            delete teamObj.roundScores;
        }
        res.json(teamObj);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Remove Member (Leader Only)
router.delete('/teams/:id/members/:userId', protect, async (req, res) => {
    try {
        const team = await HackathonTeam.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Squadron not found' });
        
        if (team.leader.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized. Only leaders can purge members.' });
        }

        const removedUserId = req.params.userId;
        team.members = team.members.filter(m => m.toString() !== removedUserId);
        if (team.activeSolver?.toString() === removedUserId) team.activeSolver = null;
        await team.save();

        // Notify removed member
        const io = req.app.get('io');
        if (io) {
            io.to(`workspace_${removedUserId}`).emit('MEMBER_REMOVED', {
                teamId: team._id,
                teamName: team.teamName,
                message: 'You have been removed from the squadron.'
            });
        }

        res.json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Leave Squadron (Member Only)
router.delete('/teams/:id/leave', protect, async (req, res) => {
    try {
        const team = await HackathonTeam.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Squadron not found' });

        if (team.leader.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Leaders cannot abandon their squad. Dissolve the unit instead.' });
        }

        team.members = team.members.filter(m => m.toString() !== req.user._id.toString());
        await team.save();
        res.json({ message: 'Successfully abandoned squadron.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Dissolve Squadron (Leader Only)
router.delete('/teams/:id/dissolve', protect, async (req, res) => {
    try {
        const team = await HackathonTeam.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Squadron not found' });

        if (team.leader.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized. Only leaders can dissolve the unit.' });
        }

        await HackathonTeam.findByIdAndDelete(req.params.id);
        res.json({ message: 'Squadron successfully dissolved.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// NOTE: /:id/kick and /:id/disband removed — use /teams/:id/members/:userId and /teams/:id/dissolve instead

// @desc    Report a proctoring violation (Phase 4)
// @route   POST /api/hackathons/violation/:id
router.post('/violation/:id', protect, async (req, res) => {
    try {
      const VALID_VIOLATION_TYPES = ['TAB_SWITCH', 'FULLSCREEN_EXIT', 'DEV_TOOLS', 'FOCUS_LOST'];
      const violationType = req.body.type || 'TAB_SWITCH';
      if (!VALID_VIOLATION_TYPES.includes(violationType)) {
          return res.status(400).json({ message: 'Invalid violation type.' });
      }

      const team = await HackathonTeam.findOne({
          hackathonId: req.params.id,
          members: req.user._id
      });

      if (!team) return res.status(404).json({ message: 'Squadron not found' });
      if (team.isDisqualified) return res.json(team);

      const recentViolation = await ProctorViolation.findOne({
          hackathonId: req.params.id,
          userId: req.user._id,
          timestamp: { $gte: new Date(Date.now() - 3000) }
      });
      if (recentViolation) return res.json(team);

      team.warnings += 1;

      await ProctorViolation.create({
          hackathonId: req.params.id,
          teamId: team._id,
          userId: req.user._id,
          type: violationType,
          details: `${violationType} reported at ${new Date().toISOString()}`
      });
      
      if (team.warnings >= 6) {
          team.isDisqualified = true;
          team.activeSolver = null; // Purge control
          
          if (req.io) {
              // Instant broadcast to all team members and leaderboard
              req.io.to(`hackathon_${req.params.id}`).emit('team_eliminated', team._id);
          }
      }
  
      await team.save();
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
});

/**
 * PHASE 4 & 5: TERMINAL & LEADERBOARD
 */

// @desc    Get questions for active round (Randomized, Sanitized, & Persistent)
router.get('/:id/questions-active', protect, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const team = await HackathonTeam.findOne({ 
            hackathonId: hId, 
            members: req.user._id 
        });
        if (!team) return res.status(404).json({ message: 'Squadron not found' });
        
        const hackathon = await Hackathon.findById(hId);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });

        const now = new Date();
        
        // Find chronologically active round
        const activeRound = hackathon.rounds.find(r => {
            const start = new Date(r.startTime);
            const end = new Date(r.endTime);
            return now >= start && now <= end && r.status === 'Live';
        });

        if (!activeRound) {
            // Check if there's a scheduled round coming up
            const nextRound = hackathon.rounds.find(r => new Date(r.startTime) > now);
            if (nextRound) {
                return res.status(403).json({ 
                    message: `Mission Window Locked. Next phase [${nextRound.title}] opens at ${new Date(nextRound.startTime).toLocaleString()}.`,
                    isWaiting: true 
                });
            }
            return res.status(403).json({ message: 'The digital arena is currently in lockdown. No active mission windows detected.' });
        }

        // Qualification Check: Team must have passed all previous rounds
        const teamScores = team.roundScores;
        for (const r of hackathon.rounds) {
            if (r.roundNumber < activeRound.roundNumber) {
                const prevScore = teamScores?.get ? teamScores.get(r.roundNumber.toString()) : (teamScores[r.roundNumber.toString()] || 0);
                const threshold = r.qualifyingThreshold || 0;
                if ((prevScore || 0) < threshold) {
                    return res.status(403).json({ 
                        message: `SQUADRON_DISQUALIFIED: Failed to meet intelligence threshold for Round ${r.roundNumber} (${prevScore || 0}/${threshold}).`,
                        isDisqualified: true
                    });
                }
            }
        }

        // Auto-advance team currentRound if it's behind
        if (team.currentRound < activeRound.roundNumber) {
            team.currentRound = activeRound.roundNumber;
            await team.save();
        }

        const sampleSize = activeRound.maxQuestions || 50;
        const sessionSeed = `${req.user._id}:${activeRound._id}`;

        // Check if user already has a sticky session for this round
        let progress = await UserProgress.findOne({
            userId: req.user._id,
            hackathonId: hackathon._id,
            roundId: activeRound._id
        });

        if (!progress) {
            // Sample all questions for the round, then do a seeded deterministic shuffle
            const allRoundQuestions = await Question.find({
                hackathonId: hackathon._id,
                roundId: activeRound._id
            }).select('_id');

            const shuffledIds = seededShuffle(
                allRoundQuestions.map(q => q._id),
                sessionSeed
            ).slice(0, sampleSize);

            progress = await UserProgress.create({
                userId: req.user._id,
                hackathonId: hackathon._id,
                roundId: activeRound._id,
                questionOrder: shuffledIds,
                draftAnswers: [],
                lastViewedIndex: 0
            });
        }

        const activeQuestionIds = progress.questionOrder;

        // Fetch the specific questions in stable order
        const questionsRaw = await Question.find({ _id: { $in: activeQuestionIds } });
        const orderedQuestions = activeQuestionIds.map(id =>
            questionsRaw.find(q => q._id.toString() === id.toString())
        );

        // Seeded option shuffle + strip sensitive fields
        const sanitizedQuestions = orderedQuestions.filter(Boolean).map(q => {
            const qId = q._id.toString();
            const shuffledOptions = seededShuffle(q.options, `${sessionSeed}:${qId}`);
            const { correctAnswer, explanation, ...publicData } = q.toObject ? q.toObject() : q;
            return { ...publicData, options: shuffledOptions };
        });

        res.json({
            questions: sanitizedQuestions,
            roundInfo: activeRound,
            resumeData: {
                draftAnswers: progress.draftAnswers,
                lastViewedIndex: progress.lastViewedIndex
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update Mission Progress (Auto-Save)
router.patch('/:id/progress', protect, async (req, res) => {
    try {
        const { draftAnswers, lastViewedIndex, roundNumber } = req.body;
        
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const hackathon = await Hackathon.findById(hId);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });
        const roundInfo = hackathon.rounds.find(r => r.roundNumber === roundNumber);
        if (!roundInfo) return res.status(404).json({ message: 'Tactical round not found.' });

        // SECURITY: Answers remain locked until Admin closes the round
        if (roundInfo.status !== 'Closed' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'INTELLIGENCE_LOCKED: Debrief artifacts will be released once Mission Control officially closes this round.' });
        }

        const progress = await UserProgress.findOneAndUpdate(
            {
                userId: req.user._id,
                hackathonId: hId,
                roundId: roundInfo._id
            },
            { $set: { draftAnswers, lastViewedIndex } },
            { new: true, upsert: false }
        );

        if (!progress) return res.status(404).json({ message: 'No active mission progress found to synchronize.' });
        
        res.json({ success: true, message: 'Telemetry synchronized' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Global Round Termination Protocol
// @route   POST /api/hackathons/:id/terminate-round
router.post('/:id/terminate-round', protect, isAdmin, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const hackathon = await Hackathon.findById(hId);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon mission not found' });

        // Logic: Emit global lockdown to all participants
        if (req.io) {
            req.io.to(`hackathon_${hId}`).emit('LOCKDOWN_SIGNAL', {
                message: 'All mission parameters concluded. Termination sequence active.',
                timestamp: new Date()
            });
        }

        const teams = await HackathonTeam.find({ hackathonId: hId });
        const activeTeams = teams.filter(t => !t.isDisqualified && !t.isFlagged);
        const summary = {
            totalTeams: teams.length,
            activeTeams: activeTeams.length,
            topScore: activeTeams.length ? Math.max(...activeTeams.map(t => t.score)) : 0,
            disqualifiedTeams: teams.filter(t => t.isDisqualified).length,
            flaggedTeams: teams.filter(t => t.isFlagged && !t.isDisqualified).length,
            terminator: req.user.name,
            timestamp: new Date()
        };

        // Emit round closed event to participants
        if (req.io) {
            req.io.to(`hackathon_${hId}`).emit('ROUND_STATUS_CHANGED', { status: 'Closed', summary });
        }

        res.json({ 
            message: 'Global Termination Successful.', 
            summary 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Broadcast message to all participants

// @desc    Submit specific question answer
router.post('/submit-answer/:id', protect, roundGuard, entropyAudit, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        // Ignore any isCorrect from client — computed server-side only
        const { questionId, answer } = req.body;

        const team = await HackathonTeam.findOne({
            hackathonId: hId,
            members: req.user._id
        });

        if (!team) return res.status(403).json({ message: 'Unauthorized. No squadron affiliation found.' });
        const isLeaderOrSolver = team.leader.toString() === req.user._id.toString() ||
            (team.activeSolver && team.activeSolver.toString() === req.user._id.toString());
        if (!isLeaderOrSolver) return res.status(403).json({ message: 'Unauthorized. Only the Squadron Leader or active solver can transmit mission data.' });
        if (team.isDisqualified) return res.status(403).json({ message: 'Purged from session.' });

        const question = await Question.findById(questionId);
        if (!question) return res.status(404).json({ message: 'Target intelligence artifact not found.' });

        // Validate question belongs to the team's current active round
        const hackathonForValidation = await Hackathon.findById(hId);
        const activeRoundForValidation = hackathonForValidation?.rounds.find(r => r.roundNumber === team.currentRound);
        if (!activeRoundForValidation || question.roundId.toString() !== activeRoundForValidation._id.toString()) {
            return res.status(400).json({ message: 'Question does not belong to the current active round.' });
        }

        // Server-Side Validation: Whitespace and case-insensitive matching
        const normalizedUserAnswer = (answer || "").toString().trim().toLowerCase();
        const normalizedCorrectAnswer = (question.correctAnswer || "").toString().trim().toLowerCase();
        const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

        // Idempotent Submission Handling: De-duplicate by questionId
        const existingSubIndex = team.submissions.findIndex(s => s.questionId && s.questionId.toString() === questionId);
        
        // 1A — Snapshot the point value at submission time so future question edits don't change scores
        const snapshotPoints = isCorrect ? (question.points || 10) : 0;

        if (existingSubIndex > -1) {
            // Update existing entry — re-snapshot points in case admin changed value during same session
            team.submissions[existingSubIndex].answer = normalizedUserAnswer;
            team.submissions[existingSubIndex].isCorrect = isCorrect;
            team.submissions[existingSubIndex].pointsAwarded = snapshotPoints;
            team.submissions[existingSubIndex].timestamp = new Date();
        } else {
            // Pushing new entry
            team.submissions.push({
                questionId,
                answer: normalizedUserAnswer,
                isCorrect,
                pointsAwarded: snapshotPoints,
                roundNumber: team.currentRound,
                timestamp: new Date()
            });
        }

        // --- SOURCE-OF-TRUTH RECALCULATION using snapshotted pointsAwarded ---
        // No Question re-fetch needed — avoids retroactive score drift
        let calculatedScore = 0;
        const roundBreakdown = {};

        if (team.submissions && team.submissions.length > 0) {
            team.submissions.forEach(sub => {
                if (sub.isCorrect) {
                    const pts = sub.pointsAwarded || 0;
                    calculatedScore += pts;
                    const roundKey = (sub.roundNumber || team.currentRound).toString();
                    roundBreakdown[roundKey] = (roundBreakdown[roundKey] || 0) + pts;
                }
            });
        }

        // Add manual judged points from all rounds
        (team.judgedPoints || []).forEach(item => {
            const pts = item.points || 0;
            calculatedScore += pts;
            const roundKey = item.roundNumber.toString();
            roundBreakdown[roundKey] = (roundBreakdown[roundKey] || 0) + pts;
        });

        // Update the running score and map
        team.score = calculatedScore;
        // Force Mongoose to see the Map update by clearing and rebuilding
        team.roundScores.clear();
        for (const [key, val] of Object.entries(roundBreakdown)) {
            team.roundScores.set(key, val);
        }
        team.markModified('roundScores');
        await team.save();

        if (req.io) {
            req.io.to(`hackathon_${req.params.id}`).emit('score_update', {
                teamId: team._id,
                newScore: team.score
            });
            // 4B — Trigger immediate leaderboard refresh for all participants
            req.io.to(`hackathon_${req.params.id}`).emit('LEADERBOARD_UPDATE');
        }

        res.json({ message: 'Telemetry Synced.', score: team.score });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Force Finalize Round (used for Auto-Submit on Breach)
router.post('/:id/finalize-round', protect, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const team = await HackathonTeam.findOne({ 
            hackathonId: hId, 
            members: req.user._id 
        });
        
        if (!team) return res.status(404).json({ message: 'Squadron not found' });
        
        // Finalize current round
        if (!team.finalizedRounds.includes(team.currentRound)) {
            team.finalizedRounds.push(team.currentRound);
            await team.save();
        }
        
        res.json({ message: 'Round finalized and transmitted.', team });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get Leaderboard
router.get('/:id/leaderboard', async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const teams = await HackathonTeam.find({ hackathonId: hId })
            .select('teamName slug score warnings isDisqualified members roundScores arenaEntries abortCount')
            .populate('leader', 'name')
            .sort({ isDisqualified: 1, score: -1, updatedAt: 1 });
        
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * PHASE 6: RESOLUTION & DETAIL ACCESS
 * These parametric routes are at the bottom to avoid shadowing static endpoints.
 */

// @desc    Get Round Debrief (Answers & Explanations)
router.get('/:id/round-debrief/:roundNumber', protect, async (req, res) => {
    try {
        const team = await HackathonTeam.findOne({ 
            hackathonId: req.params.id, 
            members: req.user._id 
        });
        
        if (!team) return res.status(404).json({ message: 'Squadron not found' });

        const hackathon = await Hackathon.findById(req.params.id);
        const roundNumber = parseInt(req.params.roundNumber);
        const round = hackathon.rounds.find(r => r.roundNumber === roundNumber);

        if (!round) return res.status(404).json({ message: 'Round not found' });

        // SECURITY: Answers remain locked until Admin closes the round
        if (round.status !== 'Closed' && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'INTELLIGENCE_LOCKED: Debrief artifacts will be released once Mission Control officially closes this round.' });
        }

        const isFinalized = team.finalizedRounds.includes(roundNumber);

        // Use the user's session question order (guards against deleted questions)
        const userProgress = await UserProgress.findOne({
            userId: req.user._id,
            hackathonId: req.params.id,
            roundId: round._id
        });
        const sessionQuestionCount = userProgress?.questionOrder?.length || 0;

        const roundQuestions = await Question.find({ hackathonId: req.params.id, roundId: round._id }).select('_id');
        const roundQuestionIds = roundQuestions.map(q => q._id.toString());
        const teamSubmissionsForRound = team.submissions.filter(s =>
            s.questionId && roundQuestionIds.includes(s.questionId.toString())
        );

        const answeredCount = teamSubmissionsForRound.length;
        const totalForCheck = sessionQuestionCount || roundQuestions.length;

        if (!isFinalized && answeredCount < totalForCheck) {
            return res.status(403).json({ message: 'Intelligence debrief unavailable until round finalization.' });
        }

        // Fetch questions WITH answers and explanations
        const questions = await Question.find({ 
            hackathonId: req.params.id,
            roundId: round._id
        });

        const roundScore = (team.roundScores instanceof Map) 
            ? (team.roundScores.get(roundNumber.toString()) || 0)
            : (team.roundScores && team.roundScores[roundNumber.toString()]) || 0;

        res.json({
            round,
            questions,
            submissions: team.submissions,
            teamScore: roundScore
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Submit Proctoring Snapshot
router.post('/:id/proctor/snapshot', protect, snapshotRateLimit, async (req, res) => {
    try {
        const { imageData, roundNumber } = req.body;
        if (!imageData || typeof imageData !== 'string' || imageData.length > 700000) {
            return res.status(400).json({ message: 'Invalid or oversized snapshot' });
        }
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });
        
        const team = await HackathonTeam.findOne({ 
            hackathonId: hId, 
            $or: [
                { members: req.user._id },
                { leader: req.user._id }
            ]
        });

        if (!team) return res.status(404).json({ message: 'Squadron affiliation not found' });

        // Save image to filesystem and get public path
        const imagePath = await saveProctorSnapshot(imageData, team._id, req.user._id);

        const snapshot = new ProctorSnapshot({
            hackathonId: hId,
            teamId: team._id,
            userId: req.user._id,
            roundNumber: roundNumber || team.currentRound,
            imagePath
        });

        await snapshot.save();
        res.status(201).json({ success: true, message: 'Telemetry artifact synchronized', imagePath });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get Proctoring Snapshots (Admin Only)
router.get('/:id/proctor/snapshots', protect, isAdmin, async (req, res) => {
    try {
        const snapshots = await ProctorSnapshot.find({ hackathonId: req.params.id })
            .populate('teamId', 'teamName')
            .populate('userId', 'name role avatarUrl')
            .sort({ timestamp: -1 })
            .limit(200); // Guardrails for performance

        res.json(snapshots);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Purge Proctoring Snapshots (Admin Only)
router.delete('/:id/proctor/snapshots', protect, isAdmin, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const snapshots = await ProctorSnapshot.find({ hackathonId: hId });
        
        // Delete each file from disk
        const fs = await import('fs');
        for (const snap of snapshots) {
            if (snap.imagePath) {
                const diskPath = snap.imagePath.startsWith('/') ? snap.imagePath.substring(1) : snap.imagePath;
                try {
                    if (fs.existsSync(diskPath)) {
                        fs.unlinkSync(diskPath);
                    }
                } catch (err) {
                    console.error(`Failed to delete snapshot file: ${diskPath}`, err);
                }
            }
        }

        await ProctorSnapshot.deleteMany({ hackathonId: hId });
        res.json({ message: 'Telemetry bank archived and purged successfully.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get hackathon details by Slug
// @route   GET /api/hackathons/slug/:slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const hackathon = await Hackathon.findOne({ slug: req.params.slug })
      .populate('organizer', 'name avatarUrl');
    if (!hackathon) return res.status(404).json({ message: 'Hackathon mission not found' });
    res.json(hackathon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get hackathon details by ID
// @route   GET /api/hackathons/id/:id
router.get('/id/:id', async (req, res) => {
  try {
    const hackathon = await Hackathon.findById(req.params.id)
      .populate('organizer', 'name avatarUrl');
    if (!hackathon) return res.status(404).json({ message: 'Hackathon mission not found' });
    res.json(hackathon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Submit Project
// @route   POST /api/hackathons/:id/submit-project
router.post('/:id/submit-project', protect, async (req, res) => {
    try {
        const { title, description, repoUrl, demoUrl, techStack, videoUrl } = req.body;
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Mission context not found.' });

        const team = await HackathonTeam.findOne({ 
            hackathonId: hId, 
            leader: req.user._id 
        });

        if (!team) return res.status(403).json({ message: 'Unauthorized. Only the Squadron Leader can submit the project.' });

        const submission = await HackathonSubmission.findOneAndUpdate(
            { hackathon: hId, team: team._id },
            {
                hackathon: hId,
                team: team._id,
                submittedBy: req.user._id,
                title,
                description,
                repoUrl,
                demoUrl,
                videoUrl,
                techStack,
                isFinal: true
            },
            { upsert: true, new: true }
        );

        res.json({ message: 'Project mission payload transmitted successfully.', team, projectSubmission: submission });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


/**
 * PHASE 7: SQUADRON PROFILES & SOCIAL
 */

// @desc    Get Squadron Profile (Public/Private Deep Aggregation)
// @route   GET /api/hackathons/squadron/:identifier
router.get('/squadron/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params;
        let team;
        
        // Find by ID or Slug
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            team = await HackathonTeam.findById(identifier);
        } else {
            team = await HackathonTeam.findOne({ slug: identifier });
        }

        if (!team) return res.status(404).json({ message: 'Squadron not found in any active engagement.' });

        // Self-heal: Generate and save slug if it is missing
        if (!team.slug) {
            const slugBase = team.teamName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            const randomHash = Math.random().toString(36).substring(2, 6);
            team.slug = `${slugBase}-${randomHash}`;
            await team.save();
        }

        // Populate members and hackathon
        await team.populate([
            { path: 'members', select: 'name username avatarUrl role reputationPoints skills' },
            { path: 'leader', select: 'name username avatarUrl' },
            { path: 'hackathonId', select: 'title slug status rounds bannerImage description type' }
        ]);

        // Calculate Rank in the specific hackathon
        let rank = 'TBD';
        if (team.hackathonId) {
            const allTeams = await HackathonTeam.find({ hackathonId: team.hackathonId._id })
                .sort({ isDisqualified: 1, score: -1, updatedAt: 1 });
            const teamIndex = allTeams.findIndex(t => t._id.toString() === team._id.toString());
            if (teamIndex !== -1) rank = teamIndex + 1;
        }

        // Authorization check for sensitive info (invite code)
        // We need to check if user is authenticated to see if they are a member
        // But the route is public, so we might not have req.user if they aren't logged in
        // I'll add a middleware that optionally gets the user if token is present
        // For now, I'll just check req.headers.authorization if I really wanted, but simpler is better.
        // Actually, many routes are public. Let's just use a simple check.
        
        const responseData = team.toObject({ flattenMaps: true });
        if (!team.hackathonId) {
            delete responseData.score;
            delete responseData.roundScores;
        } else {
            responseData.rank = rank;
        }
        
        // Show inviteCode only to team members — verify JWT without hard-failing
        let isMember = false;
        try {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                const { default: jwt } = await import('jsonwebtoken');
                if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not configured');
                const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
                const memberId = decoded.id?.toString();
                isMember = responseData.members?.some(m =>
                    (m._id || m).toString() === memberId
                );
            }
        } catch {}

        if (!isMember) delete responseData.inviteCode;

        res.json(responseData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Salute a Squadron (Social Signal)
// @route   POST /api/hackathons/squadron/:id/salute
router.post('/squadron/:id/salute', protect, async (req, res) => {
    try {
        const team = await HackathonTeam.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Squadron not found.' });

        team.salutes = (team.salutes || 0) + 1;
        await team.save();

        res.json({ message: 'Salute transmitted.', salutes: team.salutes });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update Squadron Profile (Leader Only)
// @route   PUT /api/hackathons/squadron/:id/manage
router.put('/squadron/:id/manage', protect, async (req, res) => {
    try {
        const team = await HackathonTeam.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Squadron not found.' });

        // Authorization check: Only Leader can manage
        if (team.leader.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized. Only the Squadron Leader can modify tactical parameters.' });
        }

        const { teamName, squadronBio, squadronAvatarUrl, memberRoles, maxMembers, isPublic } = req.body;

        if (teamName) team.teamName = teamName;
        if (squadronBio !== undefined) team.squadronBio = squadronBio;
        if (squadronAvatarUrl !== undefined) team.squadronAvatarUrl = squadronAvatarUrl;
        if (memberRoles) {
            team.memberRoles = memberRoles;
        }
        if (maxMembers !== undefined) team.maxMembers = Number(maxMembers);
        if (isPublic !== undefined) team.isPublic = Boolean(isPublic);

        await team.save();
        res.json({ message: 'Squadron parameters synchronized.', team });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

/**
 * NEW ROUTES — Admin Round Control, Transfer Leader, Violations, Invite Validate, Report
 */

// @desc    Get round info + time remaining
// @route   GET /api/hackathons/:id/rounds/:roundNumber
router.get('/:id/rounds/:roundNumber', protect, async (req, res) => {
    try {
        const hackathon = await Hackathon.findById(req.params.id);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });
        const round = hackathon.rounds.find(r => r.roundNumber === parseInt(req.params.roundNumber));
        if (!round) return res.status(404).json({ message: 'Round not found' });
        const now = Date.now();
        const endMs = new Date(round.endTime).getTime();
        const startMs = new Date(round.startTime).getTime();
        res.json({
            round,
            timeRemaining: Math.max(0, endMs - now),
            timeToStart: Math.max(0, startMs - now),
            serverTime: new Date()
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Pause a live round
// @route   POST /api/hackathons/:id/rounds/:roundNumber/pause
router.post('/:id/rounds/:roundNumber/pause', protect, isAdmin, async (req, res) => {
    try {
        const hackathon = await Hackathon.findById(req.params.id);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });
        const round = hackathon.rounds.find(r => r.roundNumber === parseInt(req.params.roundNumber));
        if (!round) return res.status(404).json({ message: 'Round not found' });
        if (round.status !== 'Live') return res.status(400).json({ message: 'Round is not live' });
        round.status = 'Scheduled';
        await hackathon.save();
        const io = req.app.get('io');
        if (io) io.to(`hackathon_${req.params.id}`).emit('ROUND_STATUS_CHANGED', { status: 'Paused', roundNumber: round.roundNumber });
        res.json({ message: 'Round paused', round });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Resume a paused round
// @route   POST /api/hackathons/:id/rounds/:roundNumber/resume
router.post('/:id/rounds/:roundNumber/resume', protect, isAdmin, async (req, res) => {
    try {
        const hackathon = await Hackathon.findById(req.params.id);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });
        const round = hackathon.rounds.find(r => r.roundNumber === parseInt(req.params.roundNumber));
        if (!round) return res.status(404).json({ message: 'Round not found' });
        round.status = 'Live';
        await hackathon.save();
        const io = req.app.get('io');
        if (io) io.to(`hackathon_${req.params.id}`).emit('ROUND_STATUS_CHANGED', { status: 'Live', roundNumber: round.roundNumber });
        res.json({ message: 'Round resumed', round });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Extend round deadline
// @route   PUT /api/hackathons/:id/rounds/:roundNumber/extend
router.put('/:id/rounds/:roundNumber/extend', protect, isAdmin, async (req, res) => {
    try {
        const { extraMinutes } = req.body;
        if (!extraMinutes || extraMinutes <= 0) return res.status(400).json({ message: 'extraMinutes must be positive' });
        const hackathon = await Hackathon.findById(req.params.id);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });
        const round = hackathon.rounds.find(r => r.roundNumber === parseInt(req.params.roundNumber));
        if (!round) return res.status(404).json({ message: 'Round not found' });
        round.endTime = new Date(new Date(round.endTime).getTime() + extraMinutes * 60000);
        await hackathon.save();
        const io = req.app.get('io');
        if (io) io.to(`hackathon_${req.params.id}`).emit('ROUND_STATUS_CHANGED', { status: 'Extended', roundNumber: round.roundNumber, newEndTime: round.endTime });
        res.json({ message: `Round extended by ${extraMinutes} minutes`, round });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Transfer team leadership
// @route   POST /api/hackathons/teams/:id/transfer-leader
router.post('/teams/:id/transfer-leader', protect, async (req, res) => {
    try {
        const { newLeaderId } = req.body;
        const team = await HackathonTeam.findById(req.params.id);
        if (!team) return res.status(404).json({ message: 'Squadron not found' });
        if (team.leader.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Only the current leader can transfer leadership' });
        }
        if (!team.members.some(m => m.toString() === newLeaderId)) {
            return res.status(400).json({ message: 'New leader must be an existing team member' });
        }
        team.leader = newLeaderId;
        await team.save();
        res.json({ message: 'Leadership transferred', team });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get all violations for a hackathon (Admin)
// @route   GET /api/hackathons/:id/violations
router.get('/:id/violations', protect, isAdmin, async (req, res) => {
    try {
        const violations = await ProctorViolation.find({ hackathonId: req.params.id })
            .populate('userId', 'name role')
            .populate('teamId', 'teamName')
            .sort({ timestamp: -1 });

        const result = violations.map(v => ({
            _id: v._id,
            hackathonId: v.hackathonId,
            type: v.type,
            details: v.details,
            timestamp: v.timestamp,
            user: v.userId,
            team: v.teamId
        }));
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Validate invite code before joining
// @route   GET /api/hackathons/invite-validate/:code
router.get('/invite-validate/:code', protect, async (req, res) => {
    try {
        const team = await HackathonTeam.findOne({ inviteCode: req.params.code.toUpperCase() })
            .select('teamName hackathonId members maxMembers')
            .populate('hackathonId', 'title status');
        if (!team) return res.status(404).json({ valid: false, message: 'Invalid invite code' });
        const cap = team.maxMembers || 5;
        if (team.members.length >= cap) return res.status(400).json({ valid: false, message: `Team is full (${team.members.length}/${cap} members)` });
        if (team.members.some(m => m.toString() === req.user._id.toString())) {
            return res.status(400).json({ valid: false, message: 'You are already in this team' });
        }
        res.json({ valid: true, teamName: team.teamName, hackathon: team.hackathonId, memberCount: team.members.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Generate full contest report (Admin)
// @route   GET /api/hackathons/:id/report
router.get('/:id/report', protect, isAdmin, async (req, res) => {
    try {
        const hackathon = await Hackathon.findById(req.params.id).populate('organizer', 'name');
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });

        const teams = await HackathonTeam.find({ hackathonId: req.params.id })
            .populate('leader', 'name email')
            .populate('members', 'name email role')
            .sort({ isDisqualified: 1, score: -1 });

        const questionCount = await Question.countDocuments({ hackathonId: req.params.id });
        const snapshotCount = await ProctorSnapshot.countDocuments({ hackathonId: req.params.id });

        const report = {
            hackathon: { title: hackathon.title, slug: hackathon.slug, status: hackathon.status, organizer: hackathon.organizer },
            generatedAt: new Date(),
            summary: {
                totalTeams: teams.length,
                activeTeams: teams.filter(t => !t.isDisqualified).length,
                disqualifiedTeams: teams.filter(t => t.isDisqualified).length,
                flaggedTeams: teams.filter(t => t.isFlagged).length,
                totalQuestions: questionCount,
                totalSnapshots: snapshotCount,
                topScore: teams.length ? teams[0].score : 0
            },
            leaderboard: teams.map((t, i) => ({
                rank: t.isDisqualified ? 'DQ' : i + 1,
                teamName: t.teamName,
                leader: t.leader,
                members: t.members,
                score: t.score,
                warnings: t.warnings,
                isDisqualified: t.isDisqualified,
                disqualificationReason: t.disqualificationReason,
                isFlagged: t.isFlagged,
                submissionsCount: t.submissions?.length || 0
            })),
            rounds: hackathon.rounds
        };
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Award Judged Points to a team (Admin)
// @route   POST /api/hackathons/:id/teams/:teamId/award-points
router.post('/:id/teams/:teamId/award-points', protect, isAdmin, async (req, res) => {
    try {
        const { points, reason, roundNumber } = req.body;
        const team = await HackathonTeam.findById(req.params.teamId);
        if (!team) return res.status(404).json({ message: 'Squadron not found' });

        // Add the new judged points
        team.judgedPoints.push({
            roundNumber: roundNumber || team.currentRound,
            points: parseInt(points),
            reason,
            awardedBy: req.user._id,
            awardedAt: new Date()
        });

        // 1A — Recalculate using snapshotted pointsAwarded (immutable to question edits)
        let mcqScore = 0;
        const roundBreakdown = {};

        team.submissions.forEach(sub => {
            if (sub.isCorrect) {
                const pts = sub.pointsAwarded || 0;
                mcqScore += pts;
                const roundKey = (sub.roundNumber || team.currentRound).toString();
                roundBreakdown[roundKey] = (roundBreakdown[roundKey] || 0) + pts;
            }
        });

        // Judged points
        let judgedScore = 0;
        (team.judgedPoints || []).forEach(item => {
            const pts = item.points || 0;
            judgedScore += pts;
            const rNum = item.roundNumber || team.currentRound || 1;
            const roundKey = rNum.toString();
            roundBreakdown[roundKey] = (roundBreakdown[roundKey] || 0) + pts;
        });

        team.score = mcqScore + judgedScore;
        
        // Ensure roundScores is initialized as a Map if not already
        if (!team.roundScores || typeof team.roundScores.clear !== 'function') {
            team.roundScores = new Map();
        } else {
            team.roundScores.clear();
        }

        for (const [key, val] of Object.entries(roundBreakdown)) {
            team.roundScores.set(key, val);
        }
        team.markModified('roundScores');
        await team.save();

        res.json({ message: 'Points awarded and total score synchronized.', team });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Mass Advance Teams (Move all teams to a specific round)
// @route   POST /api/hackathons/:id/mass-advance
// @access  Admin
router.post('/:id/mass-advance', protect, isAdmin, async (req, res) => {
    try {
        const { targetRound } = req.body; // e.g., 2, 3
        if (!targetRound) return res.status(400).json({ message: 'Target round number required.' });

        // Calculate rounds to finalize (all rounds < targetRound)
        const previousRounds = Array.from({ length: targetRound - 1 }, (_, i) => i + 1);

        const result = await HackathonTeam.updateMany(
            { hackathonId: req.params.id },
            { 
                $set: { currentRound: targetRound },
                $addToSet: { finalizedRounds: { $each: previousRounds } }
            }
        );

        res.json({ 
            message: `Successfully advanced ${result.modifiedCount} squadrons to Round ${targetRound}.`,
            modifiedCount: result.modifiedCount 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Mass Score Synchronization (Recalculate all teams)
// @route   POST /api/hackathons/:id/sync-all-scores
// @access  Admin
router.post('/:id/sync-all-scores', protect, isAdmin, async (req, res) => {
    try {
        const hackathon = await Hackathon.findById(req.params.id);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon mission not found' });

        const teams = await HackathonTeam.find({ hackathonId: req.params.id });
        const roundIdToNumber = new Map(hackathon.rounds.map(r => [r._id.toString(), r.roundNumber]));

        for (const team of teams) {
            // 1A — Use snapshotted pointsAwarded (immutable to question edits)
            let mcqScore = 0;
            const roundBreakdown = {};

            team.submissions.forEach(sub => {
                if (sub.isCorrect) {
                    const pts = sub.pointsAwarded || 0;
                    mcqScore += pts;
                    const roundKey = (sub.roundNumber || team.currentRound).toString();
                    roundBreakdown[roundKey] = (roundBreakdown[roundKey] || 0) + pts;
                }
            });

            // Judged points
            let judgedScore = 0;
            (team.judgedPoints || []).forEach(item => {
                const pts = item.points || 0;
                judgedScore += pts;
                const roundKey = item.roundNumber.toString();
                roundBreakdown[roundKey] = (roundBreakdown[roundKey] || 0) + pts;
            });

            team.score = mcqScore + judgedScore;
            team.roundScores.clear();
            for (const [key, val] of Object.entries(roundBreakdown)) {
                team.roundScores.set(key, val);
            }
            team.markModified('roundScores');
            await team.save();
        }

        res.json({ message: `Successfully synchronized telemetry for ${teams.length} squadrons.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// =============================================================================
// GROUP 2 — LIFECYCLE COMPLETION
// =============================================================================

// @desc    Close a live round (Scheduled → Live → Closed per-round lifecycle)
// @route   POST /api/hackathons/:id/rounds/:roundNumber/close
// @access  Admin
router.post('/:id/rounds/:roundNumber/close', protect, isAdmin, async (req, res) => {
    try {
        const hackathon = await Hackathon.findById(req.params.id);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });

        const round = hackathon.rounds.find(r => r.roundNumber === parseInt(req.params.roundNumber));
        if (!round) return res.status(404).json({ message: 'Round not found' });
        if (round.status === 'Closed') return res.status(400).json({ message: 'Round is already closed' });

        round.status = 'Closed';
        await hackathon.save();

        const io = req.app.get('io');
        if (io) {
            io.to(`hackathon_${req.params.id}`).emit('ROUND_STATUS_CHANGED', {
                status: 'Closed',
                roundNumber: round.roundNumber
            });
            io.to(`hackathon_${req.params.id}`).emit('LEADERBOARD_UPDATE');
        }

        await SAAuditLog.create({
            saId: req.user._id,
            action: 'ROUND_CLOSED',
            payload: { hackathonId: req.params.id, roundNumber: round.roundNumber },
            endpoint: req.originalUrl,
            method: req.method,
            ipAddress: req.ip,
        }).catch(() => {});

        res.json({ message: `Round ${round.roundNumber} closed. Debrief unlocked.`, round });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Conclude a hackathon (Live → Concluded) — blueprint conclusion phase
// @route   POST /api/hackathons/:id/conclude
// @access  Admin
router.post('/:id/conclude', protect, isAdmin, async (req, res) => {
    try {
        const hackathon = await Hackathon.findById(req.params.id);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });
        if (hackathon.status !== 'Live') {
            return res.status(400).json({ message: `Cannot conclude a hackathon with status '${hackathon.status}'. Must be Live.` });
        }

        // Validate all MCQ rounds are closed (offline rounds are exempt)
        const openRounds = hackathon.rounds.filter(r => r.type === 'Online MCQ' && r.status !== 'Closed');
        if (openRounds.length > 0) {
            return res.status(400).json({
                message: `${openRounds.length} round(s) still open. Close all online rounds before concluding.`,
                openRounds: openRounds.map(r => ({ roundNumber: r.roundNumber, title: r.title, status: r.status }))
            });
        }

        hackathon.status = 'Concluded';
        await hackathon.save();

        const io = req.app.get('io');
        if (io) {
            io.to(`hackathon_${req.params.id}`).emit('HACKATHON_CONCLUDED', {
                hackathonId: req.params.id,
                message: 'Mission concluded. All operations have ceased.'
            });
        }

        await SAAuditLog.create({
            saId: req.user._id,
            action: 'HACKATHON_CONCLUDED',
            payload: { hackathonId: req.params.id, title: hackathon.title },
            endpoint: req.originalUrl,
            method: req.method,
            ipAddress: req.ip,
        }).catch(() => {});

        res.json({ message: 'Hackathon concluded successfully.', hackathon });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Award reputation points to top teams' user accounts
// @route   POST /api/hackathons/:id/award-reputation
// @access  Admin
router.post('/:id/award-reputation', protect, isAdmin, async (req, res) => {
    try {
        const hackathon = await Hackathon.findById(req.params.id);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found' });
        if (hackathon.status !== 'Concluded') {
            return res.status(400).json({ message: 'Reputation can only be awarded after the hackathon is concluded.' });
        }
        if (hackathon.reputationAwarded) {
            return res.status(400).json({ message: 'Reputation has already been awarded for this hackathon.' });
        }

        // tiers: [{ rank: 1, points: 500 }, { rank: 2, points: 250 }, ...]
        const tiers = req.body.tiers || hackathon.reputationTiers || [];
        if (!tiers.length) return res.status(400).json({ message: 'No reputation tiers configured. Provide tiers in request body.' });

        // Get leaderboard (active teams only, ranked by score)
        const rankedTeams = await HackathonTeam.find({ hackathonId: req.params.id, isDisqualified: false })
            .populate('members', 'name reputationPoints')
            .sort({ score: -1, updatedAt: 1 });

        const awards = [];
        for (const tier of tiers) {
            const teamAtRank = rankedTeams[tier.rank - 1]; // rank 1 = index 0
            if (!teamAtRank) continue;

            for (const member of teamAtRank.members) {
                await User.findByIdAndUpdate(member._id, { $inc: { reputationPoints: tier.points } });
                awards.push({ userId: member._id, name: member.name, rank: tier.rank, points: tier.points, teamName: teamAtRank.teamName });
            }
        }

        // Store tiers for audit trail and mark as awarded
        hackathon.reputationTiers = tiers;
        hackathon.reputationAwarded = true;
        await hackathon.save();

        await SAAuditLog.create({
            saId: req.user._id,
            action: 'REPUTATION_AWARDED',
            payload: { hackathonId: req.params.id, tiers, totalUsersAwarded: awards.length, awards },
            endpoint: req.originalUrl,
            method: req.method,
            ipAddress: req.ip,
        }).catch(() => {});

        res.json({ message: `Reputation transferred to ${awards.length} operatives.`, awards });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// =============================================================================
// GROUP 3A — OFFLINE DELIVERABLE STORAGE
// =============================================================================

// @desc    Submit offline round deliverable (notes + link) — leader only
// @route   POST /api/hackathons/:id/submit-offline-deliverable
// @access  Protected
router.post('/:id/submit-offline-deliverable', protect, async (req, res) => {
    try {
        const { roundNumber, notes, link } = req.body;
        if (!roundNumber) return res.status(400).json({ message: 'roundNumber is required' });

        const team = await HackathonTeam.findOne({
            hackathonId: req.params.id,
            leader: req.user._id
        });
        if (!team) return res.status(403).json({ message: 'Unauthorized. Only the Squadron Leader can submit offline deliverables.' });

        // Replace existing deliverable for this round if any
        const existingIdx = team.offlineDeliverables.findIndex(d => d.roundNumber === roundNumber);
        if (existingIdx > -1) {
            team.offlineDeliverables[existingIdx] = { roundNumber, notes, link, submittedAt: new Date() };
        } else {
            team.offlineDeliverables.push({ roundNumber, notes, link, submittedAt: new Date() });
        }

        // Also finalize the round
        if (!team.finalizedRounds.includes(roundNumber)) {
            team.finalizedRounds.push(roundNumber);
        }

        await team.save();
        res.json({ message: 'Offline deliverable submitted successfully.', team });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const CONTEST_SUBMIT_COOLDOWN_SEC = 10;

// === ROUND SUBMISSION ROUTES (Phase 2: BuildX, DataStrom) ===

// @desc    Submit for a specific round (Report Submission / Data Challenge)
// @route   POST /api/hackathons/:id/rounds/:roundNumber/submit
router.post('/:id/rounds/:roundNumber/submit', protect, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Hackathon not found.' });

        const hackathon = await Hackathon.findById(hId);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found.' });

        const roundNumber = parseInt(req.params.roundNumber);
        const round = hackathon.rounds.find(r => r.roundNumber === roundNumber);
        if (!round) return res.status(404).json({ message: 'Round not found.' });

        if (!['Report Submission', 'Data Challenge'].includes(round.type)) {
            return res.status(400).json({ message: 'This round does not accept structured submissions.' });
        }

        if (round.status !== 'Live') {
            return res.status(400).json({ message: 'This round is not currently accepting submissions.' });
        }

        const team = await HackathonTeam.findOne({ hackathonId: hId, members: req.user._id });
        if (!team) return res.status(403).json({ message: 'You must be in a team to submit.' });

        const minSize = hackathon.minTeamSize || 1;
        if (team.members.length < minSize) {
            return res.status(400).json({ message: `Your team needs at least ${minSize} members to submit.` });
        }

        // Check max attempts
        const maxAttempts = round.submissionConfig?.maxAttempts || 1;
        const existingCount = await RoundSubmission.countDocuments({
            hackathonId: hId, teamId: team._id, roundNumber
        });

        if (existingCount >= maxAttempts) {
            return res.status(400).json({ message: `Maximum attempts reached (${maxAttempts}).` });
        }

        // Validate required fields
        const { fields, files } = req.body;
        const requiredFields = round.submissionConfig?.requiredFields || [];
        for (const rf of requiredFields) {
            if (rf.required && (!fields || !fields[rf.fieldName])) {
                return res.status(400).json({ message: `Field "${rf.fieldName}" is required.` });
            }
            if (rf.maxLength && fields?.[rf.fieldName]?.length > rf.maxLength) {
                return res.status(400).json({ message: `Field "${rf.fieldName}" exceeds max length of ${rf.maxLength}.` });
            }
        }

        const submission = await RoundSubmission.create({
            hackathonId: hId,
            teamId: team._id,
            roundNumber,
            attemptNumber: existingCount + 1,
            submittedBy: req.user._id,
            fields: fields || {},
            files: files || []
        });

        res.status(201).json(submission);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Duplicate submission detected.' });
        }
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get my team's submissions for a round
// @route   GET /api/hackathons/:id/rounds/:roundNumber/my-submissions
router.get('/:id/rounds/:roundNumber/my-submissions', protect, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Hackathon not found.' });

        const team = await HackathonTeam.findOne({ hackathonId: hId, members: req.user._id });
        if (!team) return res.status(404).json({ message: 'No team found.' });

        const roundNumber = parseInt(req.params.roundNumber);
        const submissions = await RoundSubmission.find({
            hackathonId: hId, teamId: team._id, roundNumber
        }).sort({ attemptNumber: -1 }).populate('submittedBy', 'name username');

        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Admin: Get all submissions for a round
// @route   GET /api/hackathons/admin/:id/rounds/:roundNumber/submissions
router.get('/admin/:id/rounds/:roundNumber/submissions', protect, isAdmin, async (req, res) => {
    try {
        const roundNumber = parseInt(req.params.roundNumber);
        const submissions = await RoundSubmission.find({
            hackathonId: req.params.id, roundNumber
        })
            .sort({ submittedAt: -1 })
            .populate('teamId', 'teamName')
            .populate('submittedBy', 'name username email')
            .populate('scoredBy', 'name');

        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Admin: Score a round submission
// @route   PUT /api/hackathons/admin/:id/rounds/:roundNumber/submissions/:subId/score
router.put('/admin/:id/rounds/:roundNumber/submissions/:subId/score', protect, isAdmin, async (req, res) => {
    try {
        const { score, feedback, status } = req.body;
        const submission = await RoundSubmission.findById(req.params.subId);
        if (!submission) return res.status(404).json({ message: 'Submission not found.' });

        if (score !== undefined) submission.score = score;
        if (feedback !== undefined) submission.feedback = feedback;
        submission.status = status || 'Scored';
        submission.scoredBy = req.user._id;
        submission.scoredAt = new Date();

        await submission.save();
        res.json(submission);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// === CODING CONTEST ROUTES (Phase 3: CodeBlitz) ===

// @desc    Get contest problems for a round with team's solve status
// @route   GET /api/hackathons/:id/rounds/:roundNumber/contest-problems
router.get('/:id/rounds/:roundNumber/contest-problems', protect, async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Hackathon not found.' });

        const hackathon = await Hackathon.findById(hId);
        if (!hackathon) return res.status(404).json({ message: 'Hackathon not found.' });

        const roundNumber = parseInt(req.params.roundNumber);
        const round = hackathon.rounds.find(r => r.roundNumber === roundNumber);
        if (!round || round.type !== 'Coding Contest') {
            return res.status(404).json({ message: 'Coding contest round not found.' });
        }

        const challengeIds = round.codingContestConfig?.challengeIds || [];
        const challenges = await Challenge.find({ _id: { $in: challengeIds } })
            .select('title difficulty problemStatement exampleInput exampleOutput constraints tags');

        const team = await HackathonTeam.findOne({ hackathonId: hId, members: req.user._id });
        let solveStatus = {};
        if (team) {
            const roundKey = String(roundNumber);
            const contestResult = team.contestResults?.get(roundKey);
            if (contestResult) {
                for (const p of contestResult.problems) {
                    solveStatus[p.challengeId.toString()] = {
                        solved: p.solved,
                        attempts: p.attempts
                    };
                }
            }
        }

        const problems = challenges.map(c => ({
            ...c.toObject(),
            solveStatus: solveStatus[c._id.toString()] || { solved: false, attempts: 0 }
        }));

        res.json({
            problems,
            round: {
                roundNumber: round.roundNumber,
                title: round.title,
                startTime: round.startTime,
                endTime: round.endTime,
                status: round.status,
                penaltyMinutes: round.codingContestConfig?.penaltyMinutes || 20
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Custom test run (no scoring, no penalty)
// @route   POST /api/hackathons/:id/rounds/:roundNumber/contest-run
router.post('/:id/rounds/:roundNumber/contest-run', protect, async (req, res) => {
    try {
        const { code, language, input } = req.body;
        if (!code || !language) {
            return res.status(400).json({ message: 'Code and language are required.' });
        }

        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Hackathon not found.' });

        const hackathon = await Hackathon.findById(hId);
        const roundNumber = parseInt(req.params.roundNumber);
        const round = hackathon?.rounds.find(r => r.roundNumber === roundNumber);
        if (!round || round.type !== 'Coding Contest' || round.status !== 'Live') {
            return res.status(400).json({ message: 'Contest round is not live.' });
        }

        const evaluation = await evaluateCode(code, language, [], input || '', '');
        res.json(evaluation);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Submit solution for a contest problem (scored, updates penalty)
// @route   POST /api/hackathons/:id/rounds/:roundNumber/contest-submit
router.post('/:id/rounds/:roundNumber/contest-submit', protect, async (req, res) => {
    try {
        const { code, language, challengeId } = req.body;
        if (!code || !language || !challengeId) {
            return res.status(400).json({ message: 'Code, language, and challengeId are required.' });
        }

        // Rate limit via Redis
        const redisRateKey = `submit:rate:${req.user._id}`;
        const redisClient = getRedis();
        const alreadySubmitted = await redisClient.exists(redisRateKey);
        if (alreadySubmitted) {
            const ttl = await redisClient.ttl(redisRateKey);
            return res.status(429).json({ message: `Please wait ${ttl > 0 ? ttl : CONTEST_SUBMIT_COOLDOWN_SEC}s before submitting again.` });
        }
        await redisClient.set(redisRateKey, '1', 'EX', CONTEST_SUBMIT_COOLDOWN_SEC);

        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Hackathon not found.' });

        const hackathon = await Hackathon.findById(hId);
        const roundNumber = parseInt(req.params.roundNumber);
        const round = hackathon?.rounds.find(r => r.roundNumber === roundNumber);
        if (!round || round.type !== 'Coding Contest' || round.status !== 'Live') {
            return res.status(400).json({ message: 'Contest round is not live.' });
        }

        const contestChallengeIds = (round.codingContestConfig?.challengeIds || []).map(id => id.toString());
        if (!contestChallengeIds.includes(challengeId)) {
            return res.status(400).json({ message: 'Challenge is not part of this contest round.' });
        }

        const team = await HackathonTeam.findOne({ hackathonId: hId, members: req.user._id });
        if (!team) return res.status(403).json({ message: 'You must be in a team to submit.' });

        const minSize = hackathon.minTeamSize || 1;
        if (team.members.length < minSize) {
            return res.status(400).json({ message: `Your team needs at least ${minSize} members to participate.` });
        }

        const roundKey = String(roundNumber);
        if (!team.contestResults.has(roundKey)) {
            team.contestResults.set(roundKey, {
                problems: contestChallengeIds.map(cId => ({
                    challengeId: cId,
                    solved: false,
                    attempts: 0,
                    penaltyTime: 0
                })),
                totalSolved: 0,
                totalPenalty: 0
            });
        }

        const contestResult = team.contestResults.get(roundKey);
        let problemEntry = contestResult.problems.find(p => p.challengeId.toString() === challengeId);
        if (!problemEntry) {
            contestResult.problems.push({
                challengeId, solved: false, attempts: 0, penaltyTime: 0
            });
            problemEntry = contestResult.problems[contestResult.problems.length - 1];
        }

        if (problemEntry.solved) {
            return res.status(400).json({ message: 'You have already solved this problem.' });
        }

        const challenge = await Challenge.findById(challengeId);
        if (!challenge) return res.status(404).json({ message: 'Challenge not found.' });

        const evaluation = await evaluateCode(code, language, challenge.testCases || [], challenge.exampleInput, challenge.exampleOutput);

        problemEntry.attempts += 1;

        const submission = await ChallengeSubmission.create({
            challengeId,
            userId: req.user._id,
            code,
            language,
            status: evaluation.status,
            testCaseResults: evaluation.testCaseResults,
            hackathonId: hId,
            roundNumber,
            teamId: team._id
        });

        if (evaluation.status === 'Accepted') {
            problemEntry.solved = true;
            problemEntry.solvedAt = new Date();

            const penaltyMinutes = round.codingContestConfig?.penaltyMinutes || 20;
            const minutesSinceStart = Math.floor((Date.now() - new Date(round.startTime).getTime()) / 60000);
            const failedAttempts = problemEntry.attempts - 1;
            problemEntry.penaltyTime = minutesSinceStart + (failedAttempts * penaltyMinutes);

            contestResult.totalSolved = contestResult.problems.filter(p => p.solved).length;
            contestResult.totalPenalty = contestResult.problems
                .filter(p => p.solved)
                .reduce((sum, p) => sum + (p.penaltyTime || 0), 0);
        }

        team.contestResults.set(roundKey, contestResult);
        team.markModified('contestResults');
        await team.save();

        res.json({
            evaluation,
            submissionId: submission._id,
            contestResult: {
                solved: problemEntry.solved,
                attempts: problemEntry.attempts,
                penaltyTime: problemEntry.penaltyTime,
                totalSolved: contestResult.totalSolved,
                totalPenalty: contestResult.totalPenalty
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Contest leaderboard (ICPC-style: totalSolved desc, totalPenalty asc)
// @route   GET /api/hackathons/:id/rounds/:roundNumber/contest-leaderboard
router.get('/:id/rounds/:roundNumber/contest-leaderboard', async (req, res) => {
    try {
        const hId = await resolveHackathonId(req.params.id);
        if (!hId) return res.status(404).json({ message: 'Hackathon not found.' });

        const hackathon = await Hackathon.findById(hId);
        const roundNumber = parseInt(req.params.roundNumber);
        const round = hackathon?.rounds.find(r => r.roundNumber === roundNumber);
        if (!round || round.type !== 'Coding Contest') {
            return res.status(404).json({ message: 'Coding contest round not found.' });
        }

        const teams = await HackathonTeam.find({ hackathonId: hId })
            .populate('members', 'name username avatarUrl')
            .lean();

        const roundKey = String(roundNumber);
        const leaderboard = teams
            .map(team => {
                const cr = team.contestResults?.[roundKey];
                return {
                    teamId: team._id,
                    teamName: team.teamName,
                    members: team.members,
                    totalSolved: cr?.totalSolved || 0,
                    totalPenalty: cr?.totalPenalty || 0,
                    problems: cr?.problems || []
                };
            })
            .filter(t => t.totalSolved > 0 || t.problems.some(p => p.attempts > 0))
            .sort((a, b) => {
                if (b.totalSolved !== a.totalSolved) return b.totalSolved - a.totalSolved;
                return a.totalPenalty - b.totalPenalty;
            });

        // Add rank
        leaderboard.forEach((entry, idx) => { entry.rank = idx + 1; });

        res.json({
            leaderboard,
            challengeIds: round.codingContestConfig?.challengeIds || [],
            penaltyMinutes: round.codingContestConfig?.penaltyMinutes || 20
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;

