import express from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import Bounty from '../models/Bounty.js';
import BountySubmission from '../models/BountySubmission.js';
import User from '../models/User.js';
import { createNotification } from '../utils/notify.js';

const router = express.Router();

// GET /api/bounties (Public/Authenticated depending on requirements, let's keep it generally accessible)
router.get('/', async (req, res) => {
  try {
    const bounties = await Bounty.find()
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json(bounties);
  } catch (error) {
    res.status(500).json({ message: 'System fault retrieving open bounties.' });
  }
});

// GET /api/bounties/:id
router.get('/:id', async (req, res) => {
  try {
    const bounty = await Bounty.findById(req.params.id)
      .populate('assignedTo', 'name role reputationPoints')
      .populate('createdBy', 'name role reputationPoints');
    if (!bounty) return res.status(404).json({ message: 'Bounty not found.' });
    res.json(bounty);
  } catch (error) {
    res.status(500).json({ message: 'System fault retrieving bounty detail.' });
  }
});

// POST /api/bounties (Restricted to Founders, Admins, Team Leads)
router.post('/', protect, isAdmin, async (req, res) => {
  try {
    const { title, description, techStack, pointReward } = req.body;
    
    const bounty = await Bounty.create({
      title,
      description,
      techStack,
      pointReward,
      createdBy: req.user._id
    });
    
    res.status(201).json(bounty);
  } catch (error) {
    res.status(500).json({ message: 'System fault initiating bounty matrix.' });
  }
});

// PUT /api/bounties/:id/claim (Any authenticated member)
router.put('/:id/claim', protect, async (req, res) => {
  try {
    const bounty = await Bounty.findById(req.params.id);
    
    if (!bounty) return res.status(404).json({ message: 'Target bounty missing.' });
    if (bounty.status !== 'Open') return res.status(400).json({ message: 'Bounty is not available for claim.' });

    bounty.status = 'Assigned';
    bounty.assignedTo = req.user._id;
    await bounty.save();

    await createNotification(req.user._id, 'bounty_assigned', 'Bounty Assigned', `You have claimed the bounty: ${bounty.title}`, `/bounties/${bounty._id}`);

    res.json(await Bounty.findById(bounty._id).populate('assignedTo', 'name role'));
  } catch (error) {
    res.status(500).json({ message: 'System fault assigning bounty.' });
  }
});

// PUT /api/bounties/:id/resolve (Restricted to Admins) - Central Gamification Logic Layer
router.put('/:id/resolve', protect, isAdmin, async (req, res) => {
  try {
    const bounty = await Bounty.findById(req.params.id);
    
    if (!bounty) return res.status(404).json({ message: 'Target bounty missing.' });
    if (bounty.status === 'Resolved') return res.status(400).json({ message: 'Bounty is already resolved.' });
    if (!bounty.assignedTo) return res.status(400).json({ message: 'Cannot resolve an unassigned bounty.' });

    bounty.status = 'Resolved';
    await bounty.save();

    const submissions = await BountySubmission.find({ bountyId: bounty._id, status: 'Approved' });
    const ReputationLog = (await import('../models/ReputationLog.js')).default;
    
    for (const sub of submissions) {
      const submitter = await User.findById(sub.userId);
      if (submitter) {
        const reward = bounty.pointReward || bounty.reward || 100;
        submitter.reputationPoints += reward;
        if (!submitter.badges.includes(`Cleared Bounty: ${bounty.title}`)) {
            submitter.badges.push(`Cleared Bounty: ${bounty.title}`);
        }
        await submitter.save();
        
        await ReputationLog.create({
            userId: submitter._id,
            points: reward,
            reason: `Resolved Bounty: ${bounty.title}`,
            sourceModel: 'Bounty',
            sourceId: bounty._id
        });
        
        await createNotification(submitter._id, 'bounty_resolved', 'Bounty Resolved', `You earned ${reward} XP for resolving ${bounty.title}!`, `/bounties/${bounty._id}`);
      }
    }

    res.json({ message: `Bounty resolved and rewards distributed to approved submitters.` });
  } catch (error) {
    res.status(500).json({ message: 'System fault resolving bounty telemetry: ' + error.message });
  }
});

// PUT /api/bounties/:id - Update mission brief (Admin Only)
router.put('/:id', protect, isAdmin, async (req, res) => {
  try {
    const bounty = await Bounty.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!bounty) return res.status(404).json({ message: 'Target bounty missing.' });
    res.json(bounty);
  } catch (error) {
    res.status(400).json({ message: 'Error updating bounty brief: ' + error.message });
  }
});

// DELETE /api/bounties/:id - Purge bounty (Admin Only)
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    const bounty = await Bounty.findByIdAndDelete(req.params.id);
    if (!bounty) return res.status(404).json({ message: 'Target bounty missing.' });
    res.json({ message: 'Bounty successfully purged from registry.' });
  } catch (error) {
    res.status(500).json({ message: 'Error purging bounty: ' + error.message });
  }
});

// @desc    Submit proof for a bounty
// @route   POST /api/bounties/:id/submit
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const { proofOfWork, links, attachments } = req.body;
    const bounty = await Bounty.findById(req.params.id);

    if (!bounty) return res.status(404).json({ message: 'Bounty not found.' });
    if (bounty.status !== 'Assigned') return res.status(400).json({ message: 'Bounty is not in assigned state.' });
    if (bounty.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Unauthorized: You are not assigned to this bounty.' });
    }

    const submission = await BountySubmission.create({
      bountyId: req.params.id,
      userId: req.user._id,
      proofOfWork,
      links: links || [],
      attachments: attachments || []
    });

    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Error submitting proof: ' + error.message });
  }
});

// @desc    Get submissions for a bounty
// @route   GET /api/bounties/:id/submissions
router.get('/:id/submissions', protect, async (req, res) => {
  try {
    const submissions = await BountySubmission.find({ bountyId: req.params.id })
      .populate('userId', 'name username avatarUrl')
      .sort({ createdAt: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submissions.' });
  }
});

// @desc    Review a bounty submission
// @route   PATCH /api/bounties/submissions/:id/review
router.patch('/submissions/:id/review', protect, isAdmin, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const submission = await BountySubmission.findById(req.params.id).populate('bountyId');

    if (!submission) return res.status(404).json({ message: 'Submission not found.' });
    if (submission.status !== 'Pending') return res.status(400).json({ message: 'Submission already reviewed.' });

    submission.status = status;
    submission.adminNote = adminNote;
    submission.reviewedBy = req.user._id;
    submission.reviewedAt = new Date();
    await submission.save();

    await createNotification(submission.userId, 'bounty_submission_reviewed', 'Bounty Submission Reviewed', `Your submission for ${submission.bountyId.title} was ${status}.`, `/bounties/${submission.bountyId._id}`);

    res.json(submission);
  } catch (error) {
    res.status(500).json({ message: 'Error reviewing submission: ' + error.message });
  }
});

export default router;
