import express from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import Workshop from '../models/Workshop.js';
import Chapter from '../models/Chapter.js';
import User from '../models/User.js';
import ReputationLog from '../models/ReputationLog.js';
import slugify from 'slugify';
import mongoose from 'mongoose';
import { createNotification } from '../utils/notify.js';

const router = express.Router();

// Helper: check if user is a chapter lead or global Admin
const canManageChapterWorkshops = async (user, chapterId) => {
  if (user.role === 'Admin') return true;
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) return false;
  return chapter.leads.some(leadId => leadId.toString() === user._id.toString());
};

/**
 * @route   GET /api/workshops
 * @desc    Get workshops (public = only approved/live/completed; leads see their pending too)
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { chapter, status, search, all } = req.query;
    const query = {};

    if (chapter) {
      const isObjectId = mongoose.isValidObjectId(chapter);
      const chap = await Chapter.findOne({ $or: [{ slug: chapter }, ...(isObjectId ? [{ _id: chapter }] : [])] });
      if (chap) query.chapter = chap._id;
    }

    if (status) {
      query.status = status;
    } else if (!all) {
      // Default: only show publicly visible workshops
      query.status = { $in: ['Upcoming', 'Live', 'Completed'] };
    }

    if (search) {
      const searchCondition = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
      query.$or = searchCondition;
    }

    const workshops = await Workshop.find(query)
      .populate('chapter', 'name slug logoUrl')
      .populate('mentor', 'name avatarUrl')
      .populate('attendees', 'name username avatarUrl email')
      .sort({ date: 1 });

    res.json(workshops);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving workshops: ' + error.message });
  }
});

/**
 * @route   GET /api/workshops/pending/all
 * @desc    Get all pending workshops awaiting admin approval
 * @access  Admin
 */
router.get('/pending/all', protect, isAdmin, async (req, res) => {
  try {
    const workshops = await Workshop.find({ status: 'Pending' })
      .populate('chapter', 'name slug logoUrl')
      .populate('mentor', 'name avatarUrl')
      .populate('attendees', 'name username avatarUrl email')
      .sort({ createdAt: -1 });
    res.json(workshops);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving pending workshops: ' + error.message });
  }
});

/**
 * @route   GET /api/workshops/:slug
 * @desc    Get workshop by slug
 * @access  Public
 */
router.get('/:slug', async (req, res) => {
  try {
    const workshop = await Workshop.findOne({ slug: req.params.slug })
      .populate('chapter', 'name slug logoUrl leads')
      .populate('mentor', 'name avatarUrl universityId')
      .populate('attendees', 'name username avatarUrl')
      .populate('checkedInAttendees', 'name username avatarUrl');

    if (!workshop) {
      return res.status(404).json({ message: 'Workshop not found.' });
    }

    res.json(workshop);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving workshop: ' + error.message });
  }
});

/**
 * @route   POST /api/workshops
 * @desc    Create a workshop (starts as Pending, requires Admin approval)
 * @access  Protected (Chapter Lead/Admin)
 */
router.post('/', protect, async (req, res) => {
  try {
    const {
      title, description, chapterId, mentorId, externalMentor,
      date, duration, location, meetingLink,
      capacity, xpReward, tags, coverUrl, resources
    } = req.body;

    const allowed = await canManageChapterWorkshops(req.user, chapterId);
    if (!allowed) {
      return res.status(403).json({ message: 'Unauthorized: Only chapter leads or admins can create workshops.' });
    }

    const baseSlug = slugify(title, { lower: true, strict: true });
    let slug = baseSlug;
    let exists = await Workshop.findOne({ slug });
    let counter = 1;
    while (exists) {
      slug = `${baseSlug}-${counter}`;
      exists = await Workshop.findOne({ slug });
      counter++;
    }

    // Admins who create a workshop bypass the approval step
    const initialStatus = req.user.role === 'Admin' ? 'Upcoming' : 'Pending';

    const workshop = await Workshop.create({
      title,
      slug,
      chapter: chapterId,
      description,
      mentor: mentorId || null,
      externalMentor: externalMentor || null,
      date,
      duration: duration || 60,
      location,
      meetingLink,
      capacity: capacity || 50,
      xpReward: xpReward != null ? xpReward : 50,
      tags: tags || [],
      coverUrl,
      resources: resources || [],
      status: initialStatus
    });

    res.status(201).json(workshop);
  } catch (error) {
    res.status(500).json({ message: 'Error creating workshop: ' + error.message });
  }
});

/**
 * @route   PATCH /api/workshops/:id/approve
 * @desc    Approve a pending workshop (sets status to Upcoming)
 * @access  Admin only
 */
router.patch('/:id/approve', protect, isAdmin, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: 'Workshop not found.' });
    if (workshop.status !== 'Pending') {
      return res.status(400).json({ message: 'Workshop is not pending approval.' });
    }

    workshop.status = 'Upcoming';
    workshop.approvedBy = req.user._id;
    workshop.approvedAt = new Date();
    await workshop.save();

    res.json(workshop);
  } catch (error) {
    res.status(500).json({ message: 'Error approving workshop: ' + error.message });
  }
});

/**
 * @route   PATCH /api/workshops/:id/reject
 * @desc    Reject a pending workshop
 * @access  Admin only
 */
router.patch('/:id/reject', protect, isAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: 'Workshop not found.' });

    workshop.status = 'Cancelled';
    workshop.rejectionReason = reason || 'Does not meet standards.';
    await workshop.save();

    res.json(workshop);
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting workshop: ' + error.message });
  }
});

/**
 * @route   PUT /api/workshops/:id
 * @desc    Update a workshop
 * @access  Protected (Chapter Lead/Admin)
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: 'Workshop not found.' });

    const allowed = await canManageChapterWorkshops(req.user, workshop.chapter);
    if (!allowed) {
      return res.status(403).json({ message: 'Unauthorized: Only chapter leads or admins can update workshops.' });
    }

    const updates = { ...req.body };
    delete updates._id;
    delete updates.chapter;
    delete updates.registeredUsers;
    delete updates.checkedInUsers;
    delete updates.reputationAwarded;

    // Leads cannot override the status to bypass approval
    if (updates.status && req.user.role !== 'Admin') {
      delete updates.status;
    }

    if (updates.title && updates.title !== workshop.title) {
      const baseSlug = slugify(updates.title, { lower: true, strict: true });
      let slug = baseSlug;
      let exists = await Workshop.findOne({ slug, _id: { $ne: workshop._id } });
      let counter = 1;
      while (exists) {
        slug = `${baseSlug}-${counter}`;
        exists = await Workshop.findOne({ slug, _id: { $ne: workshop._id } });
        counter++;
      }
      updates.slug = slug;
    }

    Object.assign(workshop, updates);
    await workshop.save();

    res.json(workshop);
  } catch (error) {
    res.status(500).json({ message: 'Error updating workshop: ' + error.message });
  }
});

/**
 * @route   DELETE /api/workshops/:id
 * @desc    Delete a workshop
 * @access  Protected (Chapter Lead/Admin)
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: 'Workshop not found.' });

    const allowed = await canManageChapterWorkshops(req.user, workshop.chapter);
    if (!allowed) {
      return res.status(403).json({ message: 'Unauthorized: Only chapter leads or admins can delete workshops.' });
    }

    await Workshop.findByIdAndDelete(req.params.id);
    res.json({ message: 'Workshop successfully removed from registry.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting workshop: ' + error.message });
  }
});

/**
 * @route   POST /api/workshops/:id/register
 * @desc    RSVP for a workshop (only approved ones)
 * @access  Protected
 */
router.post('/:id/register', protect, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: 'Workshop not found.' });

    if (!['Upcoming', 'Live'].includes(workshop.status)) {
      return res.status(400).json({ message: 'Cannot register: workshop is not open for RSVP.' });
    }

    if (workshop.attendees.some(id => id.toString() === req.user._id.toString())) {
      return res.status(400).json({ message: 'Already registered for this workshop.' });
    }

    if (workshop.attendees.length >= workshop.capacity) {
      return res.status(400).json({ message: 'Workshop is at full capacity.' });
    }

    workshop.attendees.push(req.user._id);
    await workshop.save();

    res.json(workshop);
  } catch (error) {
    res.status(500).json({ message: 'Error registering for workshop: ' + error.message });
  }
});

/**
 * @route   POST /api/workshops/:id/unregister
 * @desc    Cancel RSVP for a workshop
 * @access  Protected
 */
router.post('/:id/unregister', protect, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: 'Workshop not found.' });

    workshop.attendees = workshop.attendees.filter(id => id.toString() !== req.user._id.toString());
    await workshop.save();

    res.json(workshop);
  } catch (error) {
    res.status(500).json({ message: 'Error unregistering from workshop: ' + error.message });
  }
});

/**
 * @route   POST /api/workshops/:id/attendance
 * @desc    Submit attendance — awards xpReward XP per checked-in attendee
 * @access  Protected (Chapter Lead/Admin)
 */
router.post('/:id/attendance', protect, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: 'Workshop not found.' });

    const allowed = await canManageChapterWorkshops(req.user, workshop.chapter);
    if (!allowed) {
      return res.status(403).json({ message: 'Unauthorized: Only chapter leads or admins can submit attendance.' });
    }

    const { checkedInUserIds } = req.body;
    if (!checkedInUserIds || !Array.isArray(checkedInUserIds)) {
      return res.status(400).json({ message: 'Invalid payload: checkedInUserIds array required.' });
    }

    const chapter = await Chapter.findById(workshop.chapter);
    const xpToAward = workshop.xpReward ?? 50;

    // Only award XP to users not already checked in (prevent double awards)
    const alreadyCheckedIn = new Set(workshop.checkedInAttendees.map(id => id.toString()));
    const newCheckedIns = checkedInUserIds.filter(userId => !alreadyCheckedIn.has(userId.toString()));

    let chapterXpGained = 0;

    for (const userId of newCheckedIns) {
      const user = await User.findById(userId);
      if (user) {
        user.reputationPoints = (user.reputationPoints || 0) + xpToAward;
        await user.save();

        await ReputationLog.create({
          userId: user._id,
          chapterId: chapter?._id,
          points: xpToAward,
          reason: `Attended Workshop: ${workshop.title}`,
          sourceModel: 'Workshop',
          sourceId: workshop._id
        });
        
        await createNotification(
          user._id, 
          'workshop_attendance_xp', 
          '🏅 Attendance Confirmed', 
          `You earned ${xpToAward} XP for attending ${workshop.title}`,
          `/workshops/${workshop.slug}`,
          { xp: xpToAward, workshopName: workshop.title }
        );

        chapterXpGained += xpToAward;
      }
    }

    if (chapter && chapterXpGained > 0) {
      chapter.stats.totalReputation = (chapter.stats.totalReputation || 0) + chapterXpGained;
      await chapter.save();
    }

    workshop.checkedInAttendees = checkedInUserIds;
    workshop.status = 'Completed';
    await workshop.save();

    res.json({
      workshop,
      awarded: newCheckedIns.length,
      xpPerAttendee: xpToAward,
      totalXpAwarded: chapterXpGained
    });
  } catch (error) {
    res.status(500).json({ message: 'Error marking attendance: ' + error.message });
  }
});

export default router;
