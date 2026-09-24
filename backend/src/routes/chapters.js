import express from 'express';
import Chapter from '../models/Chapter.js';
import ChapterApplication from '../models/ChapterApplication.js';
import ChapterMemberApplication from '../models/ChapterMemberApplication.js';
import ChapterSprint from '../models/ChapterSprint.js';
import ReputationLog from '../models/ReputationLog.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import slugify from 'slugify';
import { createNotification } from '../utils/notify.js';

const router = express.Router();

/**
 * @route   GET /api/chapters
 * @desc    Get all active chapters
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const chapters = await Chapter.find({ status: 'Active' })
      .select('name slug university city stats logoUrl members')
      .sort({ 'stats.rank': 1 });
    
    // Add member count manually to response
    const response = chapters.map(c => ({
      ...c._doc,
      memberCount: c.members.length
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/chapters/managed
 * @desc    Get chapters where current user is a lead
 * @access  Protected
 */
router.get('/managed', protect, async (req, res) => {
  try {
    const chapters = await Chapter.find({ leads: req.user._id })
      .populate('members', 'name username avatarUrl')
      .populate('founder', 'name');
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/chapters/:slug
 * @desc    Get chapter by slug
 * @access  Public
 */
router.get('/:slug', async (req, res) => {
  try {
    const chapter = await Chapter.findOne({ slug: req.params.slug })
      .populate('founder', 'name universityId avatarUrl')
      .populate('leads', 'name universityId avatarUrl')
      .populate('localRoles.user', 'name')
      .populate('members', 'name username universityId avatarUrl');
    
    if (!chapter) {
      return res.status(404).json({ message: 'Chapter not found' });
    }
    res.json(chapter);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/chapters/apply
 * @desc    Submit a formal chapter application
 * @access  Protected
 */
router.post('/apply', protect, async (req, res) => {
  try {
    if (req.user.role !== 'Teacher' && req.user.role !== 'Faculty') {
      return res.status(403).json({ message: 'Only teachers can register an institute.' });
    }

    const { universityName, proposedSlug, missionStatement, expectedMembers, socialProofUrl } = req.body;

    const existingApp = await ChapterApplication.findOne({ universityName, status: 'Pending' });
    if (existingApp) return res.status(400).json({ message: 'An application for this university is already pending review.' });

    const application = await ChapterApplication.create({
      universityName,
      proposedSlug: slugify(proposedSlug, { lower: true }),
      applicantId: req.user._id,
      missionStatement,
      expectedMembers,
      socialProofUrl
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Application sequence failure: ' + error.message });
  }
});

/**
 * @route   GET /api/chapters/applications
 * @desc    Get all chapter applications (Admin only)
 * @access  Admin
 */
router.get('/applications/all', protect, isAdmin, async (req, res) => {
  try {
    const applications = await ChapterApplication.find({}).populate('applicantId', 'name username universityId').sort({ createdAt: -1 });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching applications.' });
  }
});

/**
 * @route   PATCH /api/chapters/applications/:id/review
 * @desc    Review a chapter application (Admin only)
 * @access  Admin
 */
router.patch('/applications/:id/review', protect, isAdmin, async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    const validStatuses = ['Approved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Approved or Rejected.' });
    }

    const application = await ChapterApplication.findById(req.params.id);

    if (!application) return res.status(404).json({ message: 'Application not found.' });
    if (application.status !== 'Pending') return res.status(400).json({ message: 'Application already reviewed.' });

    application.status = status;
    application.adminNote = adminNote;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();

    if (status === 'Approved') {
      // Initialize the official Chapter
      await Chapter.create({
        name: application.universityName,
        slug: application.proposedSlug,
        university: application.universityName,
        city: 'TBD', // To be filled by founder
        founder: application.applicantId,
        leads: [application.applicantId],
        members: [application.applicantId],
        status: 'Active',
        description: application.missionStatement
      });
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Review sequence failure: ' + error.message });
  }
});

/**
 * @route   PUT /api/chapters/:id/manage
 * @desc    Update chapter settings (Founder/Leads only)
 * @access  Protected (Chapter Lead)
 */
router.put('/:id/manage', protect, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    const isLead = chapter.leads.some(leadId => leadId.toString() === req.user._id.toString());
    if (!isLead && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized: You are not a lead of this chapter.' });
    }

    const { description, city, logoUrl, bannerUrl, socialLinks, verifiedDomains, themeColor, localRoles } = req.body;
    
    chapter.description = description !== undefined ? description : chapter.description;
    chapter.city = city !== undefined ? city : chapter.city;
    chapter.logoUrl = logoUrl !== undefined ? logoUrl : chapter.logoUrl;
    chapter.bannerUrl = bannerUrl !== undefined ? bannerUrl : chapter.bannerUrl;
    chapter.socialLinks = socialLinks !== undefined ? { ...chapter.socialLinks, ...socialLinks } : chapter.socialLinks;
    chapter.verifiedDomains = verifiedDomains !== undefined ? verifiedDomains : chapter.verifiedDomains;
    chapter.themeColor = themeColor !== undefined ? themeColor : chapter.themeColor;
    chapter.localRoles = localRoles !== undefined ? localRoles : chapter.localRoles;

    await chapter.save();
    res.json(chapter);
  } catch (error) {
    res.status(500).json({ message: 'Management update failure: ' + error.message });
  }
});

/**
 * @route   PATCH /api/chapters/:id/verify
 * @desc    Verify/Approve chapter (Admin only)
 * @access  Admin
 */
router.patch('/:id/verify', protect, isAdmin, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    chapter.status = 'Active';
    await chapter.save();
    res.json({ message: 'Chapter verified and activated', chapter });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/chapters/:id/join
 * @desc    Join a chapter
 * @access  Protected
 */
router.post('/:id/join', protect, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });
    if (chapter.status !== 'Active') return res.status(400).json({ message: 'Chapter is not active' });

    if (chapter.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already a member' });
    }

    chapter.members.push(req.user._id);
    await chapter.save();
    res.json({ message: 'Successfully joined chapter', chapter });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/chapters/:id/apply-to-join
 * @desc    Submit application to join a chapter
 * @access  Protected
 */
router.post('/:id/apply-to-join', protect, async (req, res) => {
  try {
    const { motivation, universityId, skills } = req.body;
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    // Check if already a member
    if (chapter.members.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already a verified operative of this sector.' });
    }

    const application = await ChapterMemberApplication.create({
      chapterId: chapter._id,
      userId: req.user._id,
      universityId,
      motivation,
      skills
    });

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: 'Enlistment request failure: ' + error.message });
  }
});

/**
 * @route   GET /api/chapters/:id/recruitment-queue
 * @desc    Get pending join requests (Chapter Leads only)
 * @access  Protected (Chapter Lead)
 */
router.get('/:id/recruitment-queue', protect, async (req, res) => {
  try {
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    const isLead = chapter.leads.some(l => l.toString() === req.user._id.toString());
    if (!isLead && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized access to recruitment data.' });
    }

    const applications = await ChapterMemberApplication.find({ 
      chapterId: chapter._id, 
      status: 'Pending' 
    }).populate('userId', 'name username avatarUrl reputationPoints');

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   PATCH /api/chapters/recruitment/:appId/review
 * @desc    Review a join request
 * @access  Protected (Chapter Lead)
 */
router.patch('/recruitment/:appId/review', protect, async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    const validStatuses = ['Approved', 'Rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Approved or Rejected.' });
    }

    const application = await ChapterMemberApplication.findById(req.params.appId);
    if (!application) return res.status(404).json({ message: 'Application not found' });

    const chapter = await Chapter.findById(application.chapterId);
    const isLead = chapter.leads.some(l => l.toString() === req.user._id.toString());
    if (!isLead && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized to review enlistment requests.' });
    }

    application.status = status;
    application.adminNote = adminNote;
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();

    if (status === 'Approved') {
      // Add to chapter members
      if (!chapter.members.includes(application.userId)) {
        chapter.members.push(application.userId);
        await chapter.save();
      }
      await createNotification(application.userId, 'chapter_approved', 'Chapter Application Approved', `Your request to join ${chapter.name} was approved.`, `/chapter/${chapter.slug}`);
    } else if (status === 'Rejected') {
      await createNotification(application.userId, 'chapter_rejected', 'Chapter Application Rejected', `Your request to join ${chapter.name} was rejected.`, `/chapters`);
    }

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: 'Review sequence failure: ' + error.message });
  }
});

/**
 * @route   POST /api/chapters/sprints/initiate
 * @desc    Initiate a CvC sprint challenge
 * @access  Protected (Chapter Lead)
 */
router.post('/sprints/initiate', protect, async (req, res) => {
  try {
    const { title, description, initiatorChapterId, targetChapterId, durationHours } = req.body;
    
    const chapter = await Chapter.findById(initiatorChapterId);
    const isLead = chapter.leads.some(l => l.toString() === req.user._id.toString());
    if (!isLead) return res.status(403).json({ message: 'Only sector leads can initiate challenges.' });

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + (durationHours || 48) * 60 * 60 * 1000);

    const sprint = await ChapterSprint.create({
      title,
      description,
      initiatorChapterId,
      targetChapterId,
      startTime,
      endTime,
      status: 'Pending'
    });

    res.status(201).json(sprint);
  } catch (error) {
    res.status(500).json({ message: 'Sprint initialization failure: ' + error.message });
  }
});

/**
 * @route   PATCH /api/chapters/sprints/:sprintId/accept
 * @desc    Accept a CvC sprint challenge
 * @access  Protected (Chapter Lead)
 */
router.patch('/sprints/:sprintId/accept', protect, async (req, res) => {
  try {
    const sprint = await ChapterSprint.findById(req.params.sprintId);
    if (!sprint) return res.status(404).json({ message: 'Sprint challenge not found.' });

    const chapter = await Chapter.findById(sprint.targetChapterId);
    const isLead = chapter.leads.some(l => l.toString() === req.user._id.toString());
    if (!isLead) return res.status(403).json({ message: 'Only target sector leads can accept challenges.' });

    sprint.status = 'Active';
    await sprint.save();

    res.json(sprint);
  } catch (error) {
    res.status(500).json({ message: 'Authorization failure: ' + error.message });
  }
});

/**
 * @route   GET /api/chapters/:id/sprints
 * @desc    Get all sprints involving this chapter
 * @access  Protected
 */
router.get('/:id/sprints', protect, async (req, res) => {
  try {
    const sprints = await ChapterSprint.find({
      $or: [
        { initiatorChapterId: req.params.id },
        { targetChapterId: req.params.id }
      ]
    }).populate('initiatorChapterId', 'name logoUrl')
      .populate('targetChapterId', 'name logoUrl')
      .sort({ createdAt: -1 });

    res.json(sprints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   PATCH /api/chapters/:id/member-role
 * @desc    Assign or remove a tactical role for a member
 * @access  Protected (Chapter Lead)
 */
router.patch('/:id/member-role', protect, async (req, res) => {
  try {
    const { userId, roleName } = req.body; // roleName can be null to remove
    const chapter = await Chapter.findById(req.params.id);
    if (!chapter) return res.status(404).json({ message: 'Chapter not found' });

    const isLead = chapter.leads.some(l => l.toString() === req.user._id.toString());
    if (!isLead && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only sector leads can reassign tactical roles.' });
    }

    // Remove any existing roles for this user
    chapter.localRoles = chapter.localRoles.filter(r => r.user.toString() !== userId);

    // Add new role if provided
    if (roleName) {
      chapter.localRoles.push({ user: userId, roleName });
    }

    await chapter.save();
    res.json(chapter);
  } catch (error) {
    res.status(500).json({ message: 'Role assignment failure: ' + error.message });
  }
});

/**
 * @route   PATCH /api/chapters/sprints/:sprintId/sync
 * @desc    Synchronize sprint scores based on member reputation logs
 * @access  Protected
 */
router.patch('/sprints/:sprintId/sync', protect, async (req, res) => {
  try {
    const sprint = await ChapterSprint.findById(req.params.sprintId);
    if (!sprint) return res.status(404).json({ message: 'Sprint not found.' });
    if (sprint.status !== 'Active') return res.status(400).json({ message: 'Can only sync active sprints.' });

    const initiatorChapter = await Chapter.findById(sprint.initiatorChapterId);
    const targetChapter = await Chapter.findById(sprint.targetChapterId);

    // Sum initiator scores
    const initiatorPoints = await ReputationLog.aggregate([
      { 
        $match: { 
          userId: { $in: initiatorChapter.members },
          createdAt: { $gte: sprint.startTime, $lte: sprint.endTime }
        }
      },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);

    // Sum target scores
    const targetPoints = await ReputationLog.aggregate([
      { 
        $match: { 
          userId: { $in: targetChapter.members },
          createdAt: { $gte: sprint.startTime, $lte: sprint.endTime }
        }
      },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);

    sprint.stats.initiatorScore = initiatorPoints[0]?.total || 0;
    sprint.stats.targetScore = targetPoints[0]?.total || 0;

    // Check for conclusion
    if (new Date() > sprint.endTime) {
      sprint.status = 'Concluded';
      sprint.winnerChapterId = sprint.stats.initiatorScore > sprint.stats.targetScore 
        ? sprint.initiatorChapterId 
        : sprint.targetChapterId;
    }

    await sprint.save();
    res.json(sprint);
  } catch (error) {
    res.status(500).json({ message: 'Telemetry sync failure: ' + error.message });
  }
});

export default router;
