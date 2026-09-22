import express from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Event from '../models/Event.js';
import KnowledgeArticle from '../models/KnowledgeArticle.js';
import Bounty from '../models/Bounty.js';
import BountySubmission from '../models/BountySubmission.js';
import Chapter from '../models/Chapter.js';
import Workshop from '../models/Workshop.js';
import ReputationLog from '../models/ReputationLog.js';
import Message from '../models/Message.js';
import Channel from '../models/Channel.js';
import CareerGoal from '../models/CareerGoal.js';
import Skill from '../models/Skill.js';
import LearningContent from '../models/LearningContent.js';
import PracticalSubmission from '../models/PracticalSubmission.js';
import Admin from '../models/Admin.js';
import slugify from 'slugify';
import { createNotification } from '../utils/notify.js';


const router = express.Router({ mergeParams: true });

// Apply middleware to all routes in this file
router.use(protect);
router.use(isAdmin);

router.use(async (req, res, next) => {
  const token = req.params.adminToken;
  if (!token) return res.status(403).json({ message: 'Access denied' });
  const admin = await Admin.findById(req.user._id);
  if (!admin || admin.adminToken !== token) {
    return res.status(403).json({ message: 'Invalid or expired admin session' });
  }
  next();
});

// --- Dashboard Stats ---

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    // Simulated DAU for now, or count users created in last 7 days
    const activeMembers = await User.countDocuments({ 
      lastLoginDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
    });

    const totalBounties = await Bounty.countDocuments();
    const resolvedBounties = await Bounty.countDocuments({ status: 'Resolved' });
    const bountyCompletion = totalBounties > 0 ? Math.round((resolvedBounties / totalBounties) * 100) : 0;

    const totalWorkshops = await Workshop.countDocuments();
    const pendingWorkshops = await Workshop.countDocuments({ status: 'Pending' });
    const pendingQueues = pendingWorkshops;

    res.json({
      activeMembers,
      bountyCompletion,
      pendingQueues,
      totalUsers,
      totalWorkshops,
      pendingWorkshops
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin stats: ' + error.message });
  }
});

// --- User Management ---

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    
    // Whitelist of roles an admin is permitted to assign. Constrained to the
    // canonical user types; privileged roles (Admin/Founder) are never
    // assignable through this endpoint.
    const ASSIGNABLE_ROLES = ['Student', 'Professional', 'Teacher', 'Recruiter'];
    if (!role || !ASSIGNABLE_ROLES.includes(role)) {
      return res.status(400).json({ message: `Invalid role. Permitted values: ${ASSIGNABLE_ROLES.join(', ')}` });
    }
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    await user.save();
    
    res.json({ message: 'User role updated', user: { _id: user._id, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user role' });
  }
});

// PUT /api/admin/users/:id/verify
router.put('/users/:id/verify', async (req, res) => {
  try {
    const { isVerified, method } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isVerified = isVerified;
    if (method) user.verificationMethod = method;
    await user.save();
    
    res.json({ message: 'User verification updated', isVerified: user.isVerified });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user verification' });
  }
});


// PUT /api/admin/users/:id/suspend
router.put('/users/:id/suspend', async (req, res) => {
  try {
    const { isSuspended } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isSuspended = isSuspended;
    await user.save();
    
    res.json({ message: user.isSuspended ? 'Operative suspended' : 'Operative reactivated', isSuspended: user.isSuspended });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling suspension' });
  }
});

// PUT /api/admin/users/:id/profile
router.put('/users/:id/profile', async (req, res) => {
  try {
    const { name, bio, skills, universityId, username } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (skills) user.skills = skills;
    if (universityId) user.universityId = universityId;
    if (username) user.username = username;
    
    await user.save();
    
    res.json({ message: 'Operative profile updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating operative profile: ' + error.message });
  }
});

// GET /api/admin/users/:id/stats
router.get('/users/:id/stats', async (req, res) => {
  try {
    const userId = req.params.id;
    const totalAssigned = await Bounty.countDocuments({ assignedTo: userId });
    const totalResolved = await Bounty.countDocuments({ assignedTo: userId, status: 'Resolved' });
    const submissions = await BountySubmission.find({ userId });
    
    const approvedSubmissions = submissions.filter(s => s.status === 'Approved').length;
    const successRate = totalAssigned > 0 ? Math.round((totalResolved / totalAssigned) * 100) : 0;

    res.json({
      totalAssigned,
      totalResolved,
      approvedSubmissions,
      successRate
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching operative stats' });
  }
});




// --- Event Management ---

// GET /api/admin/events
router.get('/events', async (req, res) => {
  try {
    const events = await Event.find({}).sort({ createdAt: -1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events' });
  }
});

// POST /api/admin/events
router.post('/events', async (req, res) => {
  try {
    const eventData = { ...req.body };
    delete eventData._id;

    const event = await Event.create(eventData);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error creating event: ' + error.message });
  }
});

// PUT /api/admin/events/:id
router.put('/events/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Error updating event' });
  }
});

// DELETE /api/admin/events/:id
router.delete('/events/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting event' });
  }
});

// --- Knowledge Article Management (CMS) ---

// GET /api/admin/knowledge
router.get('/knowledge', async (req, res) => {
  try {
    const articles = await KnowledgeArticle.find({}).populate('author', 'name').sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching articles' });
  }
});

// PUT /api/admin/knowledge/:id/publish
router.put('/knowledge/:id/publish', async (req, res) => {
  try {
    const { isPublished } = req.body;
    const article = await KnowledgeArticle.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    
    const wasPublished = article.isPublished;
    article.isPublished = isPublished;
    await article.save();
    
    if (isPublished === true && !wasPublished) {
        const author = await User.findById(article.author);
        if (author) {
            author.reputationPoints = (author.reputationPoints || 0) + 50;
            await author.save();
            
            await ReputationLog.create({
                userId: author._id,
                points: 50,
                reason: `Published Knowledge Article: ${article.title}`,
                sourceModel: 'KnowledgeArticle',
                sourceId: article._id
            });
            
            await createNotification(author._id, 'article_published', 'Article Published', `Your article ${article.title} has been published! You earned 50 XP.`, `/knowledge/${article.slug}`);
        }
    }
    
    res.json(article);
  } catch (error) {
    res.status(500).json({ message: 'Error updating publish status' });
  }
});

// DELETE /api/admin/knowledge/:id
router.delete('/knowledge/:id', async (req, res) => {
  try {
    const article = await KnowledgeArticle.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json({ message: 'Article deleted completely via CMS.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting article' });
  }
});

// --- Chapter Management ---

// GET /api/admin/chapters
router.get('/chapters', async (req, res) => {
  try {
    const chapters = await Chapter.find({}).populate('founder', 'name').sort({ createdAt: -1 });
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching chapters' });
  }
});

// --- Secure Comms / Messages Admin Oversight ---

// GET /api/admin/messages/conversations — every DM pair with counts, dedupe stable
router.get('/messages/conversations', async (req, res) => {
  try {
    const agg = await Message.aggregate([
      {
        $match: {
          receiverId: { $exists: true, $ne: null },
          isDeleted: { $ne: true }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          pair: {
            $cond: [
              { $lt: ['$senderId', '$receiverId'] },
              ['$senderId', '$receiverId'],
              ['$receiverId', '$senderId']
            ]
          }
        }
      },
      {
        $group: {
          _id: '$pair',
          lastMessage: { $first: '$content' },
          timestamp: { $first: '$createdAt' },
          messageCount: { $sum: 1 }
        }
      },
      { $sort: { timestamp: -1 } }
    ]);

    const populated = await Promise.all(agg.map(async (row) => {
      const [aId, bId] = row._id;
      const [a, b] = await Promise.all([
        User.findById(aId).select('name username avatarUrl'),
        User.findById(bId).select('name username avatarUrl')
      ]);
      return {
        threadId: `${aId}_${bId}`,
        participants: [a, b],
        lastMessage: row.lastMessage,
        timestamp: row.timestamp,
        messageCount: row.messageCount
      };
    }));

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving DM signal threads: ' + error.message });
  }
});

// GET /api/admin/messages/channels — every channel + last message + counts
router.get('/messages/channels', async (req, res) => {
  try {
    const channels = await Channel.find({}).lean();
    const enriched = await Promise.all(channels.map(async (c) => {
      const [lastMsg, count] = await Promise.all([
        Message.findOne({ channelId: c._id, isDeleted: { $ne: true } })
          .sort({ createdAt: -1 })
          .populate('senderId', 'name username avatarUrl'),
        Message.countDocuments({ channelId: c._id, isDeleted: { $ne: true } })
      ]);
      return { ...c, lastMessage: lastMsg, messageCount: count };
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving channels: ' + error.message });
  }
});

// POST /api/admin/channels/:id/mute — mute a user in a channel
router.post('/channels/:id/mute', async (req, res) => {
  try {
    const { userId } = req.body;
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Channel not found.' });
    if (!channel.mutedUsers.some(u => u.toString() === userId.toString())) {
      channel.mutedUsers.push(userId);
      await channel.save();
    }
    res.json({ message: 'User muted.', channel });
  } catch (error) {
    res.status(500).json({ message: 'Error muting user: ' + error.message });
  }
});

// POST /api/admin/channels/:id/unmute
router.post('/channels/:id/unmute', async (req, res) => {
  try {
    const { userId } = req.body;
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Channel not found.' });
    channel.mutedUsers = channel.mutedUsers.filter(u => u.toString() !== userId.toString());
    await channel.save();
    res.json({ message: 'User unmuted.', channel });
  } catch (error) {
    res.status(500).json({ message: 'Error unmuting user: ' + error.message });
  }
});

// DELETE /api/admin/channels/:id/members/:userId — kick user
router.delete('/channels/:id/members/:userId', async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Channel not found.' });
    channel.members = channel.members.filter(u => u.toString() !== req.params.userId);
    channel.admins = channel.admins.filter(u => u.toString() !== req.params.userId);
    await channel.save();
    res.json({ message: 'User removed from channel.' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing user: ' + error.message });
  }
});

// GET /api/admin/messages/conversations/:user1/:user2
router.get('/messages/conversations/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const messages = await Message.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 }
      ]
    })
    .populate('senderId', 'name username avatarUrl')
    .populate('receiverId', 'name username avatarUrl')
    .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching thread history: ' + error.message });
  }
});

// DELETE /api/admin/messages/:id
router.delete('/messages/:id', async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    await Message.deleteOne({ _id: req.params.id });

    // Socket broadcast
    if (req.io) {
      const targetRoom = message.channelId 
        ? `channel_${message.channelId.toString()}` 
        : message.receiverId.toString();

      const payload = { messageId: req.params.id, channelId: message.channelId, receiverId: message.receiverId };
      req.io.to(targetRoom).emit('MESSAGE_DELETED', payload);
      
      if (!message.channelId) {
        req.io.to(message.senderId.toString()).emit('MESSAGE_DELETED', payload);
      }
    }

    res.json({ message: 'Message deleted successfully by administrator.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message: ' + error.message });
  }
});

// PUT /api/admin/messages/:id
router.put('/messages/:id', async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    message.content = content;
    message.isEdited = true;
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name username avatarUrl')
      .populate('receiverId', 'name username avatarUrl');

    // Socket broadcast
    if (req.io) {
      const targetRoom = message.channelId 
        ? `channel_${message.channelId.toString()}` 
        : message.receiverId.toString();

      req.io.to(targetRoom).emit('MESSAGE_EDITED', populated);
      
      if (!message.channelId) {
        req.io.to(message.senderId.toString()).emit('MESSAGE_EDITED', populated);
      }
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error editing message: ' + error.message });
  }
});

// POST /api/admin/messages/send
router.post('/messages/send', async (req, res) => {
  try {
    const { channelId, receiverId, content } = req.body;
    
    const message = await Message.create({
      senderId: req.user._id,
      senderModel: 'Admin',
      channelId: channelId || null,
      receiverId: receiverId || null,
      content
    });

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name username avatarUrl')
      .populate('receiverId', 'name username avatarUrl');

    // Socket broadcast
    if (req.io) {
      if (channelId) {
        req.io.to(`channel_${channelId}`).emit('NEW_CHANNEL_MESSAGE', {
          channelId,
          message: populated
        });
      } else if (receiverId) {
        req.io.to(receiverId.toString()).emit('NEW_MESSAGE', populated);
        req.io.to(req.user._id.toString()).emit('NEW_MESSAGE', populated);
      }
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message as admin: ' + error.message });
  }
});

// ─── CAREER GOALS MANAGEMENT ─────────────────────────────────────────────────

router.get('/career-goals', async (req, res) => {
  try {
    const goals = await CareerGoal.find().sort({ order: 1, title: 1 }).populate('skills', 'name');
    res.json(goals);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/career-goals', async (req, res) => {
  try {
    const { title, description, icon, tags, suggestedDurationDays, status, order } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });
    const slug = slugify(title, { lower: true, strict: true });
    const goal = await CareerGoal.create({ title, slug, description, icon, tags, suggestedDurationDays, status: status || 'Draft', order });
    res.status(201).json(goal);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/career-goals/:id', async (req, res) => {
  try {
    const goal = await CareerGoal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!goal) return res.status(404).json({ message: 'Career goal not found.' });
    res.json(goal);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/career-goals/:id', async (req, res) => {
  try {
    await CareerGoal.findByIdAndDelete(req.params.id);
    res.json({ message: 'Career goal deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── SKILLS MANAGEMENT ───────────────────────────────────────────────────────

router.get('/skills', async (req, res) => {
  try {
    const { goalId } = req.query;
    const filter = goalId ? { careerGoals: goalId } : {};
    const skills = await Skill.find(filter).sort({ order: 1, name: 1 }).populate('careerGoals', 'title');
    res.json(skills);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/skills', async (req, res) => {
  try {
    const { name, description, category, careerGoals, prerequisites, difficulty, verificationPassScore, estimatedHours, icon, status, order } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required.' });
    const slug = slugify(name, { lower: true, strict: true });
    const skill = await Skill.create({ name, slug, description, category, careerGoals, prerequisites, difficulty, verificationPassScore, estimatedHours, icon, status: status || 'Active', order });

    // Link skill to career goals
    if (careerGoals?.length) {
      await CareerGoal.updateMany({ _id: { $in: careerGoals } }, { $addToSet: { skills: skill._id } });
    }
    res.status(201).json(skill);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/skills/:id', async (req, res) => {
  try {
    const skill = await Skill.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!skill) return res.status(404).json({ message: 'Skill not found.' });
    res.json(skill);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/skills/:id', async (req, res) => {
  try {
    const skill = await Skill.findByIdAndDelete(req.params.id);
    if (skill) {
      await CareerGoal.updateMany({}, { $pull: { skills: skill._id, coreSkills: skill._id } });
    }
    res.json({ message: 'Skill deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── LEARNING CONTENT MANAGEMENT ─────────────────────────────────────────────

router.get('/content', async (req, res) => {
  try {
    const { skillId, goalId, status, difficulty, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (skillId) filter.skill = skillId;
    if (goalId) filter.careerGoals = goalId;
    if (status) filter.status = status;
    if (difficulty) filter.difficulty = difficulty;

    const [content, total] = await Promise.all([
      LearningContent.find(filter)
        .populate('skill', 'name')
        .select('-theoryContent -quizQuestions.correctAnswer -quizQuestions.correctAnswers')
        .sort({ order: 1, createdAt: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit)),
      LearningContent.countDocuments(filter)
    ]);
    res.json({ content, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get('/content/:id', async (req, res) => {
  try {
    const content = await LearningContent.findById(req.params.id)
      .populate('skill', 'name category')
      .populate('careerGoals', 'title')
      .populate('prerequisites', 'title slug');
    if (!content) return res.status(404).json({ message: 'Content not found.' });
    res.json(content);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/content', async (req, res) => {
  try {
    const { title, skill, careerGoals, description, difficulty, estimatedMinutes, order, prerequisites,
      theoryContent, conceptSummary, commonMistakes, bestPractices, quizQuestions, quizPassScore,
      maxQuizAttempts, practiceTask, resources, status, isDiagnosticEligible, tags } = req.body;
    if (!title || !skill) return res.status(400).json({ message: 'Title and skill are required.' });
    const slug = slugify(title, { lower: true, strict: true });
    const content = await LearningContent.create({
      title, slug, skill, careerGoals, description, difficulty, estimatedMinutes, order, prerequisites,
      theoryContent, conceptSummary, commonMistakes, bestPractices, quizQuestions, quizPassScore,
      maxQuizAttempts, practiceTask, resources, status: status || 'Draft', isDiagnosticEligible, tags
    });
    res.status(201).json(content);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/content/:id', async (req, res) => {
  try {
    const content = await LearningContent.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!content) return res.status(404).json({ message: 'Content not found.' });
    res.json(content);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete('/content/:id', async (req, res) => {
  try {
    await LearningContent.findByIdAndDelete(req.params.id);
    res.json({ message: 'Content deleted.' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ─── PRACTICAL SUBMISSIONS REVIEW ────────────────────────────────────────────

router.get('/submissions', async (req, res) => {
  try {
    const { status = 'Pending', page = 1, limit = 20 } = req.query;
    const submissions = await PracticalSubmission.find({ status })
      .populate('user', 'name email avatarUrl')
      .populate('content', 'title')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));
    res.json(submissions);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/submissions/:id/review', async (req, res) => {
  try {
    let { status, feedback, score } = req.body;
    
    // Map legacy/UI states to strict model enum
    if (status === 'Approved') status = 'Verified';
    
    const validStatuses = ['Pending', 'UnderReview', 'Verified', 'Rejected', 'NeedsRevision'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status enum value' });
    }

    const sub = await PracticalSubmission.findByIdAndUpdate(
      req.params.id,
      { status, feedback, score: score || 0, reviewedBy: req.user._id, reviewedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('user', 'name').populate('content', 'title');
    if (!sub) return res.status(404).json({ message: 'Submission not found.' });

    // When verified, mark the user's checklist Practical item as completed
    if (status === 'Verified') {
      const DailyChecklist = (await import('../models/DailyChecklist.js')).default;
      const { completeChecklistTask } = await import('../utils/checklistGenerator.js');
      
      // Find all non-completed checklists containing this practical task for the user
      const checklists = await DailyChecklist.find({ 
        user: sub.user._id || sub.user,
        'items.contentId': sub.content._id || sub.content,
        'items.taskType': 'Practical',
        'items.status': { $in: ['Available', 'InProgress', 'Locked', 'Overdue'] }
      });
      
      for (const checklist of checklists) {
        const item = checklist.items.find(i => 
          i.contentId?.toString() === (sub.content._id || sub.content).toString() && 
          i.taskType === 'Practical' &&
          ['Available', 'InProgress', 'Locked', 'Overdue'].includes(i.status)
        );
        
        if (item) {
          // Temporarily unlock it if it was locked just so we can complete it smoothly
          if (item.status === 'Locked') {
            item.status = 'Available';
            await checklist.save();
          }
          await completeChecklistTask(sub.user._id || sub.user, checklist._id, item._id);
        }
      }
    }

    res.json(sub);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

export default router;

