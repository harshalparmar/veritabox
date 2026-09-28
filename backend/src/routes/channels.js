import express from 'express';
import Channel from '../models/Channel.js';
import Message from '../models/Message.js';
import ChannelRead from '../models/ChannelRead.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import { parseMentions } from '../utils/parseMentions.js';
import { createNotification } from '../utils/notify.js';
import { DEFAULT_CHANNELS } from '../utils/seedChannels.js';
import { sanitizeUserContent } from '../utils/security.js';

const router = express.Router();
router.use(protect);

const DEFAULT_NAMES = DEFAULT_CHANNELS.map(c => c.name);

function canAccessChannel(channel, userId) {
  if (!channel.isPrivate) return true;
  const uid = userId.toString();
  return channel.members.some(m => m.toString() === uid) ||
         channel.admins.some(m => m.toString() === uid);
}

function isChannelAdmin(channel, userId) {
  const uid = userId.toString();
  if (channel.createdBy && channel.createdBy.toString() === uid) return true;
  return channel.admins.some(m => m.toString() === uid);
}

// GET /api/channels — list channels user can see, with unread counts
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const uidStr = userId.toString();

    // Show: all public channels + private channels the user is a member/admin of
    const channels = await Channel.find({
      $or: [
        { isPrivate: false },
        { members: userId },
        { admins: userId },
        { createdBy: userId }
      ]
    }).sort({ isDefault: -1, createdAt: 1 }).lean();

    // Preserve default channel order per DEFAULT_CHANNELS
    channels.sort((a, b) => {
      const ia = DEFAULT_NAMES.indexOf(a.name);
      const ib = DEFAULT_NAMES.indexOf(b.name);
      if (ia === -1 && ib === -1) return new Date(a.createdAt) - new Date(b.createdAt);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });

    // Attach unread count per channel
    const reads = await ChannelRead.find({ userId }).lean();
    const readMap = new Map(reads.map(r => [r.channelId.toString(), r.lastReadAt]));

    const withUnread = await Promise.all(channels.map(async (c) => {
      const lastReadAt = readMap.get(c._id.toString()) || new Date(0);
      const unreadCount = await Message.countDocuments({
        channelId: c._id,
        isDeleted: { $ne: true },
        senderId: { $ne: userId },
        createdAt: { $gt: lastReadAt }
      });
      return { ...c, unreadCount };
    }));

    res.json(withUnread);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving channels: ' + error.message });
  }
});

// POST /api/channels — create a channel
router.post('/', async (req, res) => {
  try {
    const { name, topic, isPrivate } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Channel name required.' });
    const clean = name.toLowerCase().trim().replace(/\s+/g, '-');

    const exists = await Channel.findOne({ name: clean });
    if (exists) return res.status(400).json({ message: 'Channel already exists.' });

    const channel = await Channel.create({
      name: clean,
      topic: topic || '',
      isPrivate: !!isPrivate,
      createdBy: req.user._id,
      admins: [req.user._id],
      members: [req.user._id]
    });

    res.status(201).json(channel);
  } catch (error) {
    res.status(500).json({ message: 'Error creating channel: ' + error.message });
  }
});

// DELETE /api/channels/:id — creator or platform admin, non-default only
router.delete('/:id', async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Channel not found.' });
    if (channel.isDefault) return res.status(403).json({ message: 'Default channels cannot be deleted.' });

    const platformAdmin = ['Admin'].includes(req.user.role);
    if (!platformAdmin && !isChannelAdmin(channel, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to delete this channel.' });
    }

    await Message.deleteMany({ channelId: channel._id });
    await ChannelRead.deleteMany({ channelId: channel._id });
    await channel.deleteOne();
    res.json({ message: 'Channel deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting channel: ' + error.message });
  }
});

// POST /api/channels/:id/join
router.post('/:id/join', async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Channel not found.' });
    const isMember = channel.members.some(m => m.toString() === req.user._id.toString());
    // Private channels are invite-only: a non-member cannot self-join. They must
    // be added by a channel admin.
    if (channel.isPrivate && !isMember && !isChannelAdmin(channel, req.user._id)) {
      return res.status(403).json({ message: 'This channel is private.' });
    }
    if (!isMember) {
      channel.members.push(req.user._id);
      await channel.save();
    }
    res.json(channel);
  } catch (error) {
    res.status(500).json({ message: 'Error joining channel: ' + error.message });
  }
});

// POST /api/channels/:id/leave
router.post('/:id/leave', async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ message: 'Channel not found.' });
    if (channel.isDefault) return res.status(400).json({ message: 'Cannot leave a default channel.' });
    channel.members = channel.members.filter(m => m.toString() !== req.user._id.toString());
    channel.admins = channel.admins.filter(m => m.toString() !== req.user._id.toString());
    await channel.save();
    res.json({ message: 'Left channel.' });
  } catch (error) {
    res.status(500).json({ message: 'Error leaving channel: ' + error.message });
  }
});

// POST /api/channels/:id/read — mark channel read
router.post('/:id/read', async (req, res) => {
  try {
    await ChannelRead.findOneAndUpdate(
      { userId: req.user._id, channelId: req.params.id },
      { lastReadAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ message: 'Marked as read.' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking channel read: ' + error.message });
  }
});

// GET /api/channels/:channelId/messages?before=<iso>&limit=50
router.get('/:channelId/messages', async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found.' });
    if (!canAccessChannel(channel, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to view this channel.' });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const before = req.query.before ? new Date(req.query.before) : null;
    const query = { channelId: req.params.channelId, isDeleted: { $ne: true } };
    if (before) query.createdAt = { $lt: before };

    const messages = await Message.find(query)
      .populate('senderId', 'name username avatarUrl')
      .populate('replyTo')
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving channel history: ' + error.message });
  }
});

// GET /api/channels/:channelId/pinned
router.get('/:channelId/pinned', async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found.' });
    if (!canAccessChannel(channel, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    const pinned = await Message.find({
      channelId: req.params.channelId,
      isPinned: true,
      isDeleted: { $ne: true }
    })
      .populate('senderId', 'name username avatarUrl')
      .sort({ pinnedAt: -1 })
      .limit(50);
    res.json(pinned);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching pinned messages: ' + error.message });
  }
});

// POST /api/channels/:channelId/messages — send message
router.post('/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { content, attachments, replyTo } = req.body;

    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: 'Channel not found.' });
    if (!canAccessChannel(channel, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to post in this channel.' });
    }
    if (channel.mutedUsers.some(u => u.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'You are muted in this channel.' });
    }
    if (!content?.trim() && !(attachments?.length)) {
      return res.status(400).json({ message: 'Empty message.' });
    }

    const cleanContent = sanitizeUserContent(content || '');
    const mentionedUsers = await parseMentions(cleanContent);

    const message = await Message.create({
      senderId: req.user._id,
      channelId,
      content: cleanContent,
      attachments: attachments || [],
      replyTo: replyTo || null,
      mentions: mentionedUsers.map(u => u._id)
    });

    const populated = await Message.findById(message._id)
      .populate('senderId', 'name username avatarUrl')
      .populate('replyTo');

    // Update sender's own read state so their unread count doesn't include their message
    await ChannelRead.findOneAndUpdate(
      { userId: req.user._id, channelId },
      { lastReadAt: new Date() },
      { upsert: true }
    );

    if (req.io) {
      req.io.to(`channel_${channelId}`).emit('NEW_CHANNEL_MESSAGE', {
        channelId,
        message: populated
      });
    }

    // Fire @mention notifications
    for (const u of mentionedUsers) {
      if (u._id.toString() === req.user._id.toString()) continue;
      createNotification(
        u._id,
        'mention',
        `Mentioned by ${req.user.name}`,
        (content || '').slice(0, 140),
        `/messages?channel=${channelId}`,
        { channelId, messageId: message._id }
      );
      if (req.io) req.io.to(u._id.toString()).emit('MENTION', { message: populated });
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Transmission failure: ' + error.message });
  }
});

// GET /api/channels/:channelId/members
router.get('/:channelId/members', async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId)
      .populate('members', 'name username avatarUrl role')
      .populate('admins', 'name username avatarUrl role');
    if (!channel) return res.status(404).json({ message: 'Channel not found.' });
    if (!canAccessChannel(channel, req.user._id)) {
      return res.status(403).json({ message: 'Not authorized.' });
    }
    res.json({ members: channel.members, admins: channel.admins });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving members: ' + error.message });
  }
});

export default router;
