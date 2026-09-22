import express from 'express';
import multer from 'multer';
import path from 'path';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import { parseMentions } from '../utils/parseMentions.js';
import { createNotification } from '../utils/notify.js';

const router = express.Router();

// ---------- attachments upload ----------
const storage = multer.diskStorage({
  destination(req, file, cb) { cb(null, 'uploads/'); },
  filename(req, file, cb) {
    cb(null, `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname)}`);
  }
});
const ALLOWED_TYPES = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|mp4|mp3|wav/;
function fileFilter(req, file, cb) {
  const ok = ALLOWED_TYPES.test(path.extname(file.originalname).toLowerCase());
  if (ok) cb(null, true);
  else cb(new Error('File type not supported.'));
}
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 }, fileFilter });

const blockRecruiter = (req, res, next) => {
  if (req.user && req.user.role === 'Recruiter') {
    return res.status(403).json({ message: 'Messaging is not available for Recruiter accounts.' });
  }
  next();
};

router.post('/attachments', protect, blockRecruiter, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Upload failed' });
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    res.json({
      url: `/uploads/${req.file.filename}`,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      size: req.file.size
    });
  });
});

// ---------- search ----------
router.get('/search', protect, async (req, res) => {
  try {
    const { q, channelId, userId } = req.query;
    if (!q) return res.json([]);
    const safe = String(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const query = { isDeleted: { $ne: true }, content: { $regex: safe, $options: 'i' } };
    if (channelId) {
      query.channelId = channelId;
    } else if (userId) {
      query.$or = [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id }
      ];
    } else {
      // Search across all DMs the user is a participant of, plus channel messages they authored
      query.$or = [
        { senderId: req.user._id },
        { receiverId: req.user._id }
      ];
    }
    const results = await Message.find(query)
      .populate('senderId', 'name username avatarUrl')
      .populate('receiverId', 'name username avatarUrl')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Search failed: ' + error.message });
  }
});

// ---------- conversations list ----------
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    const agg = await Message.aggregate([
      {
        $match: {
          receiverId: { $exists: true, $ne: null },
          isDeleted: { $ne: true },
          $or: [{ senderId: userId }, { receiverId: userId }]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          otherParticipantId: {
            $cond: [{ $eq: ['$senderId', userId] }, '$receiverId', '$senderId']
          }
        }
      },
      {
        $group: {
          _id: '$otherParticipantId',
          lastMessage: { $first: '$content' },
          timestamp: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$receiverId', userId] }, { $eq: ['$isRead', false] }] },
                1, 0
              ]
            }
          }
        }
      },
      { $sort: { timestamp: -1 } }
    ]);

    const populated = await Promise.all(agg.map(async (row) => {
      const user = await User.findById(row._id).select('name username avatarUrl');
      return {
        otherParticipantId: row._id,
        otherParticipant: user,
        lastMessage: row.lastMessage,
        timestamp: row.timestamp,
        unreadCount: row.unreadCount
      };
    }));

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving signal threads: ' + error.message });
  }
});

// ---------- DM history with pagination ----------
router.get('/:otherUserId', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const before = req.query.before ? new Date(req.query.before) : null;

    const query = {
      isDeleted: { $ne: true },
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    };
    if (before) query.createdAt = { $lt: before };

    const messages = await Message.find(query)
      .populate('senderId', 'name username avatarUrl')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit);

    await Message.updateMany(
      { senderId: otherUserId, receiverId: userId, isRead: false },
      { isRead: true }
    );

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving transmission history.' });
  }
});

// ---------- send DM ----------
router.post('/', protect, blockRecruiter, async (req, res) => {
  try {
    const { receiverId, content, attachments, replyTo } = req.body;
    if (!receiverId) return res.status(400).json({ message: 'receiverId required.' });
    if (!content?.trim() && !(attachments?.length)) {
      return res.status(400).json({ message: 'Empty message.' });
    }
    const senderId = req.user._id;

    const mentionedUsers = await parseMentions(content || '');

    const message = await Message.create({
      senderId,
      receiverId,
      content: content || '',
      attachments: attachments || [],
      replyTo: replyTo || null,
      mentions: mentionedUsers.map(u => u._id)
    });

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name username avatarUrl')
      .populate('receiverId', 'name username avatarUrl')
      .populate('replyTo');

    if (req.io) {
      req.io.to(receiverId.toString()).emit('NEW_MESSAGE', populated);
      req.io.to(senderId.toString()).emit('NEW_MESSAGE', populated);
    }

    // Direct-message notification (if receiver isn't sender)
    if (receiverId.toString() !== senderId.toString()) {
      createNotification(
        receiverId,
        'direct_message',
        `New message from ${req.user.name}`,
        (content || '').slice(0, 140),
        `/messages?user=${senderId}`,
        { fromUserId: senderId, messageId: message._id }
      );
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Transmission failure: ' + error.message });
  }
});

// ---------- edit ----------
router.put('/:id', protect, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }
    message.content = content;
    message.isEdited = true;
    // re-parse mentions
    const mentionedUsers = await parseMentions(content || '');
    message.mentions = mentionedUsers.map(u => u._id);
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name username avatarUrl')
      .populate('receiverId', 'name username avatarUrl')
      .populate('replyTo');

    if (req.io) {
      const room = message.channelId
        ? `channel_${message.channelId.toString()}`
        : message.receiverId.toString();
      req.io.to(room).emit('MESSAGE_EDITED', populated);
      if (!message.channelId) {
        req.io.to(message.senderId.toString()).emit('MESSAGE_EDITED', populated);
      }
    }
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error editing message: ' + error.message });
  }
});

// ---------- delete (soft) ----------
router.delete('/:id', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }
    message.isDeleted = true;
    message.content = '';
    message.attachments = [];
    await message.save();

    if (req.io) {
      const room = message.channelId
        ? `channel_${message.channelId.toString()}`
        : (message.receiverId && message.receiverId.toString());
      const payload = { messageId: req.params.id, channelId: message.channelId, receiverId: message.receiverId };
      if (room) req.io.to(room).emit('MESSAGE_DELETED', payload);
      if (!message.channelId) {
        req.io.to(message.senderId.toString()).emit('MESSAGE_DELETED', payload);
      }
    }
    res.json({ message: 'Message deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting message: ' + error.message });
  }
});

// ---------- reactions (toggle) ----------
router.post('/:id/react', protect, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: 'Emoji required.' });

    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    const uid = req.user._id.toString();
    let reaction = message.reactions.find(r => r.emoji === emoji);
    if (!reaction) {
      message.reactions.push({ emoji, users: [req.user._id] });
    } else {
      const hasUser = reaction.users.some(u => u.toString() === uid);
      if (hasUser) {
        reaction.users = reaction.users.filter(u => u.toString() !== uid);
        if (reaction.users.length === 0) {
          message.reactions = message.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        reaction.users.push(req.user._id);
      }
    }
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name username avatarUrl');

    if (req.io) {
      const room = message.channelId
        ? `channel_${message.channelId.toString()}`
        : (message.receiverId && message.receiverId.toString());
      if (room) req.io.to(room).emit('MESSAGE_REACTED', populated);
      if (!message.channelId) {
        req.io.to(message.senderId.toString()).emit('MESSAGE_REACTED', populated);
      }
    }
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error reacting: ' + error.message });
  }
});

// ---------- pin (toggle) ----------
router.post('/:id/pin', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ message: 'Message not found.' });

    message.isPinned = !message.isPinned;
    message.pinnedAt = message.isPinned ? new Date() : null;
    message.pinnedBy = message.isPinned ? req.user._id : null;
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name username avatarUrl');

    if (req.io) {
      const room = message.channelId
        ? `channel_${message.channelId.toString()}`
        : (message.receiverId && message.receiverId.toString());
      if (room) req.io.to(room).emit('MESSAGE_PINNED', populated);
    }
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Error pinning: ' + error.message });
  }
});

// ---------- mark DM read ----------
router.post('/:otherUserId/read', protect, async (req, res) => {
  try {
    const result = await Message.updateMany(
      { senderId: req.params.otherUserId, receiverId: req.user._id, isRead: false },
      { isRead: true }
    );
    // Notify the sender that their messages were seen (real-time read receipt).
    if (req.io && result.modifiedCount > 0) {
      req.io.to(req.params.otherUserId.toString()).emit('DM_READ', {
        readerId: req.user._id.toString()
      });
    }
    res.json({ message: 'Marked as read.' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking read: ' + error.message });
  }
});

export default router;
