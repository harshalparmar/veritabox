/**
 * routes/pulse.js — VeritaBox Pulse: platform-wide announcements, events, offers.
 *
 * Public (authenticated):
 *   GET /api/pulse          — Get active announcements targeted to current user
 *
 * Admin-only:
 *   POST   /api/pulse       — Create announcement
 *   PUT    /api/pulse/:id   — Update announcement
 *   DELETE /api/pulse/:id   — Delete announcement
 *   GET    /api/pulse/all   — All announcements (paginated, for admin panel)
 */

import express from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import VeritaBoxPulse from '../models/VeritaBoxPulse.js';
import StudentOnboarding from '../models/StudentOnboarding.js';
import ProgressRecord from '../models/ProgressRecord.js';

const router = express.Router();

// ── GET /api/pulse — Active announcements for the authenticated user ──────────
router.get('/', protect, async (req, res) => {
  try {
    const now = new Date();

    // Fetch user context for targeting
    const [onboarding, progress] = await Promise.all([
      StudentOnboarding.findOne({ user: req.user._id })
        .select('careerGoal currentLevel'),
      ProgressRecord.findOne({ user: req.user._id })
        .select('skills')
    ]);

    const userCareerGoal = onboarding?.careerGoal;
    const userLevel = onboarding?.currentLevel;
    const userSkillIds = (progress?.skills || []).map(s => s.skillId?.toString()).filter(Boolean);

    // Build targeting query
    const query = {
      isActive: true,
      startDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gt: now } }
      ]
    };

    const allActive = await VeritaBoxPulse.find(query)
      .populate('targetCareerGoals', 'title')
      .populate('targetSkills', 'name')
      .sort({ priority: -1, createdAt: -1 })
      .limit(20);

    // Filter by targeting
    const filtered = allActive.filter(pulse => {
      if (pulse.targetAudience === 'All') return true;

      if (pulse.targetAudience === 'CareerGoal' && pulse.targetCareerGoals.length > 0) {
        return pulse.targetCareerGoals.some(g => g._id.toString() === userCareerGoal?.toString());
      }
      if (pulse.targetAudience === 'Skill' && pulse.targetSkills.length > 0) {
        return pulse.targetSkills.some(s => userSkillIds.includes(s._id.toString()));
      }
      if (pulse.targetAudience === 'Level' && pulse.targetLevels.length > 0) {
        return userLevel && pulse.targetLevels.includes(userLevel);
      }
      // Custom — show to all (no special targeting logic defined)
      return true;
    });

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching announcements: ' + err.message });
  }
});

// ── GET /api/pulse/all — Admin: All announcements ─────────────────────────────
router.get('/all', protect, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pulses = await VeritaBoxPulse.find()
      .populate('targetCareerGoals', 'title')
      .populate('targetSkills', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    const total = await VeritaBoxPulse.countDocuments();
    res.json({ pulses, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching all announcements: ' + err.message });
  }
});

// ── POST /api/pulse — Admin: Create announcement ──────────────────────────────
router.post('/', protect, isAdmin, async (req, res) => {
  try {
    const {
      title, body, type, priority, ctaLabel, ctaUrl,
      startDate, endDate, isActive,
      targetAudience, targetCareerGoals, targetSkills, targetLevels
    } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required.' });
    }

    const pulse = await VeritaBoxPulse.create({
      title, body, type, priority, ctaLabel, ctaUrl,
      startDate: startDate || new Date(),
      endDate: endDate || null,
      isActive: isActive !== false,
      targetAudience: targetAudience || 'All',
      targetCareerGoals: targetCareerGoals || [],
      targetSkills: targetSkills || [],
      targetLevels: targetLevels || [],
      createdBy: req.user._id
    });

    res.status(201).json(pulse);
  } catch (err) {
    res.status(500).json({ message: 'Error creating announcement: ' + err.message });
  }
});

// ── PUT /api/pulse/:id — Admin: Update announcement ───────────────────────────
router.put('/:id', protect, isAdmin, async (req, res) => {
  try {
    const allowedFields = ['title', 'body', 'type', 'priority', 'ctaLabel', 'ctaUrl',
      'startDate', 'endDate', 'isActive', 'targetAudience', 'targetCareerGoals',
      'targetSkills', 'targetLevels'];
    const update = { updatedBy: req.user._id };
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    const pulse = await VeritaBoxPulse.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    );
    if (!pulse) return res.status(404).json({ message: 'Announcement not found.' });
    res.json(pulse);
  } catch (err) {
    res.status(500).json({ message: 'Error updating announcement: ' + err.message });
  }
});

// ── DELETE /api/pulse/:id — Admin: Delete announcement ────────────────────────
router.delete('/:id', protect, isAdmin, async (req, res) => {
  try {
    await VeritaBoxPulse.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting announcement: ' + err.message });
  }
});

export default router;
