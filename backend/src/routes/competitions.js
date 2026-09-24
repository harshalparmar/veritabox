import express from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import Competition from '../models/Competition.js';
import CompetitionRegistration from '../models/CompetitionRegistration.js';
import CompetitionSquadron from '../models/CompetitionSquadron.js';

const router = express.Router();

function getRoleCategory(role) {
  if (['Professional', 'Industry'].includes(role)) return 'Professional';
  if (['Teacher', 'Faculty'].includes(role)) return 'Teacher';
  return 'Student';
}

// --- PUBLIC ROUTES ---

// @route   GET /api/competitions
// @desc    Get all published competitions
// @access  Public
router.get('/', async (req, res) => {
  try {
    const competitions = await Competition.find({ status: 'Published' }).sort('competitionDate');
    res.json(competitions);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- ADMIN ROUTES (before parametric /:slug to avoid shadowing) ---

router.get('/admin/all', protect, isAdmin, async (req, res) => {
  try {
    const competitions = await Competition.find().sort('-createdAt');
    res.json(competitions);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.post('/admin/create', protect, isAdmin, async (req, res) => {
  try {
    const { title, slug, overview, problemStatement, problemStatementPdfUrl, abstractTemplateDocUrl,
            coverImage, thumbnailImage, registrationDeadline, abstractDeadline, competitionDate,
            status, currentPhase, contacts, rubricCriteria, externalUrl, maxSquadronSize } = req.body;
    const competition = new Competition({
      title, slug, overview, problemStatement, problemStatementPdfUrl, abstractTemplateDocUrl,
      coverImage, thumbnailImage, registrationDeadline, abstractDeadline, competitionDate,
      status, currentPhase, contacts, rubricCriteria, externalUrl, maxSquadronSize
    });
    await competition.save();
    res.status(201).json(competition);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

router.put('/admin/:id', protect, isAdmin, async (req, res) => {
  try {
    const allowed = ['title', 'slug', 'overview', 'problemStatement', 'problemStatementPdfUrl',
      'abstractTemplateDocUrl', 'coverImage', 'thumbnailImage', 'registrationDeadline',
      'abstractDeadline', 'competitionDate', 'status', 'currentPhase', 'contacts',
      'rubricCriteria', 'externalUrl', 'maxSquadronSize'];
    const updateData = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }
    const competition = await Competition.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!competition) return res.status(404).json({ message: 'Competition not found' });
    res.json(competition);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/admin/:id/abstracts', protect, isAdmin, async (req, res) => {
  try {
    const sortField = req.query.sort === 'score' ? { 'abstract.totalScore': -1 } : { createdAt: -1 };
    const registrations = await CompetitionRegistration.find({
      competitionId: req.params.id,
      abstract: { $exists: true }
    }).populate('userId', 'name email').populate('squadronId', 'name').sort(sortField);

    const abstracts = registrations.filter(r => r.abstract && r.abstract.pdfUrl);
    res.json(abstracts);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.put('/admin/:id/abstracts/:registrationId', protect, isAdmin, async (req, res) => {
  try {
    const { status, rubricScores } = req.body;
    const registration = await CompetitionRegistration.findOne({
      _id: req.params.registrationId,
      competitionId: req.params.id
    });
    if (!registration) return res.status(404).json({ message: 'Registration not found' });

    if (status) {
      const validStatuses = ['Pending', 'UnderReview', 'Shortlisted', 'Rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid abstract status.' });
      }
      registration.abstract.status = status;
    }

    if (rubricScores && Array.isArray(rubricScores)) {
      const competition = await Competition.findById(req.params.id);
      if (competition?.rubricCriteria?.length) {
        const criteriaMap = Object.fromEntries(competition.rubricCriteria.map(c => [c.name, c.maxPoints]));
        for (const s of rubricScores) {
          const max = criteriaMap[s.criteriaName];
          if (max !== undefined && (s.score < 0 || s.score > max)) {
            return res.status(400).json({ message: `Score for "${s.criteriaName}" must be between 0 and ${max}.` });
          }
        }
      }
      registration.abstract.rubricScores = rubricScores;
      registration.abstract.totalScore = rubricScores.reduce((sum, s) => sum + (s.score || 0), 0);
      registration.abstract.reviewedBy = req.user._id;
      registration.abstract.reviewedAt = new Date();
    }

    await registration.save();
    res.json(registration);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/admin/:id/results', protect, isAdmin, async (req, res) => {
  try {
    const registrations = await CompetitionRegistration.find({
      competitionId: req.params.id,
      'abstract.totalScore': { $gt: 0 }
    })
      .populate('userId', 'name email')
      .populate('squadronId', 'name')
      .sort({ 'abstract.totalScore': -1 });

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.get('/admin/:id/squadrons', protect, isAdmin, async (req, res) => {
  try {
    const squadrons = await CompetitionSquadron.find({ competitionId: req.params.id })
      .populate('leaderId', 'name email')
      .populate('members.userId', 'name email');
    res.json(squadrons);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

router.delete('/admin/:id/squadrons/:squadronId', protect, isAdmin, async (req, res) => {
  try {
    const squadron = await CompetitionSquadron.findById(req.params.squadronId);
    if (!squadron) return res.status(404).json({ message: 'Squadron not found' });

    await CompetitionRegistration.deleteMany({ squadronId: req.params.squadronId });
    await CompetitionSquadron.findByIdAndDelete(req.params.squadronId);

    res.json({ message: 'Squadron dissolved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @route   GET /api/competitions/:slug
// @desc    Get competition by slug (MUST be after /admin/* routes)
// @access  Public
router.get('/:slug', async (req, res) => {
  try {
    const competition = await Competition.findOne({ slug: req.params.slug, status: 'Published' });
    if (!competition) return res.status(404).json({ message: 'Competition not found' });
    res.json(competition);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- PROTECTED ROUTES ---

// @route   GET /api/competitions/:id/enrollment
// @desc    Check user enrollment status and fetch dashboard data
// @access  Private
router.get('/:id/enrollment', protect, async (req, res) => {
  try {
    const registration = await CompetitionRegistration.findOne({ 
      competitionId: req.params.id, 
      userId: req.user._id 
    }).populate({
      path: 'squadronId',
      populate: { path: 'members.userId', select: 'name email' }
    });
    
    if (!registration) {
      return res.json({ isEnrolled: false });
    }

    res.json({ isEnrolled: true, registration });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   POST /api/competitions/:id/enroll
// @desc    Enroll in competition (Individual or Squadron)
// @access  Private
router.post('/:id/enroll', protect, async (req, res) => {
  try {
    const { participationType, squadronName, joinCode } = req.body;
    const competitionId = req.params.id;

    const competition = await Competition.findById(competitionId);
    if (!competition) return res.status(404).json({ message: 'Competition not found' });
    
    if (competition.currentPhase !== 'Registration') {
      return res.status(400).json({ message: 'Registration is currently closed for this competition' });
    }

    // Check existing registration
    const existing = await CompetitionRegistration.findOne({ competitionId, userId: req.user._id });
    if (existing) return res.status(400).json({ message: 'You are already enrolled' });

    let squadronId = null;

    if (participationType === 'Squadron') {
      if (squadronName) {
        // Create new Squadron
        const squadron = new CompetitionSquadron({
          name: squadronName,
          competitionId,
          leaderId: req.user._id,
          members: [{ userId: req.user._id, status: 'Accepted' }],
          roleCategory: getRoleCategory(req.user.role)
        });
        await squadron.save();
        squadronId = squadron._id;
      } else if (joinCode) {
        // Join existing Squadron
        const squadron = await CompetitionSquadron.findOne({ joinCode: joinCode.toUpperCase(), competitionId });
        if (!squadron) return res.status(404).json({ message: 'Invalid Join Code' });

        const joinerCategory = getRoleCategory(req.user.role);
        if (squadron.roleCategory && squadron.roleCategory !== joinerCategory) {
          return res.status(403).json({ message: `This squadron is for ${squadron.roleCategory}s only. You cannot join as a ${joinerCategory}.` });
        }

        const maxSize = competition.maxSquadronSize || 10;
        if (squadron.members.length >= maxSize) {
          return res.status(400).json({ message: `Squadron has reached the maximum capacity of ${maxSize} members` });
        }

        if (squadron.members.some(m => m.userId.toString() === req.user._id.toString())) {
          return res.status(400).json({ message: 'You are already a member of this squadron' });
        }

        squadron.members.push({ userId: req.user._id, status: 'Pending' });
        await squadron.save();
        squadronId = squadron._id;
      } else {
        return res.status(400).json({ message: 'Squadron name or join code is required' });
      }
    }

    const registration = new CompetitionRegistration({
      competitionId,
      userId: req.user._id,
      participationType,
      squadronId
    });

    await registration.save();
    res.status(201).json(registration);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @route   POST /api/competitions/:id/abstract
// @desc    Submit abstract for phase 2
// @access  Private
router.post('/:id/abstract', protect, async (req, res) => {
  try {
    const { pdfUrl } = req.body;
    if (!pdfUrl) return res.status(400).json({ message: 'Abstract PDF Document is required' });

    const competition = await Competition.findById(req.params.id);
    if (competition.currentPhase !== 'AbstractSelection') {
      return res.status(400).json({ message: 'Abstract submission is not open currently' });
    }

    const registration = await CompetitionRegistration.findOne({ 
      competitionId: req.params.id, 
      userId: req.user._id 
    });

    if (!registration) return res.status(404).json({ message: 'Not enrolled in competition' });

    if (registration.participationType === 'Squadron') {
      const squadron = await CompetitionSquadron.findById(registration.squadronId);
      if (squadron && squadron.leaderId.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Only the Squadron Leader can submit the abstract.' });
      }
    }

    registration.abstract = {
      pdfUrl,
      status: 'Pending',
      submittedAt: Date.now()
    };

    await registration.save();
    res.json({ message: 'Abstract submitted successfully', registration });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/competitions/:id/squadron/members/:userId/accept
// @desc    Leader accepts a pending member
// @access  Private
router.put('/:id/squadron/members/:userId/accept', protect, async (req, res) => {
  try {
    const registration = await CompetitionRegistration.findOne({ competitionId: req.params.id, userId: req.user._id });
    if (!registration || registration.participationType !== 'Squadron') return res.status(404).json({ message: 'Squadron not found' });
    
    const squadron = await CompetitionSquadron.findById(registration.squadronId);
    if (!squadron) return res.status(404).json({ message: 'Squadron not found' });
    
    if (squadron.leaderId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only leader can manage members' });
    
    const member = squadron.members.find(m => m.userId.toString() === req.params.userId);
    if (!member) return res.status(404).json({ message: 'Member not found in squadron' });
    
    member.status = 'Accepted';
    await squadron.save();
    
    res.json(squadron);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @route   PUT /api/competitions/:id/squadron/members/:userId/reject
// @desc    Leader rejects or removes a member
// @access  Private
router.put('/:id/squadron/members/:userId/reject', protect, async (req, res) => {
  try {
    const registration = await CompetitionRegistration.findOne({ competitionId: req.params.id, userId: req.user._id });
    if (!registration || registration.participationType !== 'Squadron') return res.status(404).json({ message: 'Squadron not found' });
    
    const squadron = await CompetitionSquadron.findById(registration.squadronId);
    if (!squadron) return res.status(404).json({ message: 'Squadron not found' });
    
    if (squadron.leaderId.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Only leader can manage members' });
    
    if (squadron.leaderId.toString() === req.params.userId) return res.status(400).json({ message: 'Leader cannot be removed' });

    squadron.members = squadron.members.filter(m => m.userId.toString() !== req.params.userId);
    await squadron.save();
    
    // Also delete the registration for that user
    await CompetitionRegistration.deleteOne({ competitionId: req.params.id, userId: req.params.userId });
    
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @route   GET /api/competitions/:id/squadron
// @desc    Get full squadron details for the enrolled user (populated members)
// @access  Private
router.get('/:id/squadron', protect, async (req, res) => {
  try {
    const registration = await CompetitionRegistration.findOne({ 
      competitionId: req.params.id, 
      userId: req.user._id 
    });

    if (!registration || registration.participationType !== 'Squadron' || !registration.squadronId) {
      return res.status(404).json({ message: 'No squadron found for this registration' });
    }

    const squadron = await CompetitionSquadron.findById(registration.squadronId)
      .populate('leaderId', 'name email username avatarUrl reputationPoints')
      .populate('members.userId', 'name email username avatarUrl reputationPoints');

    if (!squadron) return res.status(404).json({ message: 'Squadron not found' });

    res.json(squadron);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// @route   POST /api/competitions/:id/squadron/leave
// @desc    Non-leader member leaves their squadron
// @access  Private
router.post('/:id/squadron/leave', protect, async (req, res) => {
  try {
    const registration = await CompetitionRegistration.findOne({ 
      competitionId: req.params.id, 
      userId: req.user._id 
    });

    if (!registration || registration.participationType !== 'Squadron' || !registration.squadronId) {
      return res.status(404).json({ message: 'You are not in a squadron for this competition' });
    }

    const squadron = await CompetitionSquadron.findById(registration.squadronId);
    if (!squadron) return res.status(404).json({ message: 'Squadron not found' });

    if (squadron.leaderId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Squadron leader cannot leave. You must dissolve the squadron or transfer leadership first.' });
    }

    // Remove user from squadron members
    squadron.members = squadron.members.filter(m => m.userId.toString() !== req.user._id.toString());
    await squadron.save();

    // Delete the user's registration
    await CompetitionRegistration.deleteOne({ competitionId: req.params.id, userId: req.user._id });

    res.json({ message: 'You have successfully left the squadron.' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
});

// (Admin routes moved above /:slug to prevent route shadowing)

export default router;
