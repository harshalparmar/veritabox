import express from 'express';
import Project from '../models/Project.js';
import Bounty from '../models/Bounty.js';
import BountySubmission from '../models/BountySubmission.js';
import KnowledgeArticle from '../models/KnowledgeArticle.js';
import User from '../models/User.js';
import Signal from '../models/Signal.js';
import { sanitizeUserContent } from '../utils/security.js';

import { protect, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get global Mainnet feed
// @route   GET /api/feed/mainnet
router.get('/mainnet', async (req, res) => {
    try {
        const limit = 20;

        // Fetch multiple types of activities
        const [projects, bounties, submissions, articles, signals] = await Promise.all([
            Project.find({}).populate('associatedTeam', 'teamName').sort({ updatedAt: -1 }).limit(10),
            Bounty.find({ status: 'Open' }).sort({ createdAt: -1 }).limit(10),
            BountySubmission.find({ status: 'Approved' }).populate('userId', 'name avatarUrl').populate('bountyId', 'title').sort({ updatedAt: -1 }).limit(10),
            KnowledgeArticle.find({}).populate('author', 'name avatarUrl').sort({ createdAt: -1 }).limit(10),
            Signal.find({ isPublic: true })
                .populate('user', 'name avatarUrl')
                .populate('chapterId', 'chapterName')
                .populate('comments.user', 'name avatarUrl')
                .sort({ createdAt: -1 })
                .limit(15)
        ]);

        // Transform into standardized feed items
        const feedItems = [
            ...projects.flatMap(p => p.progressMatrix.filter(log => log.isPublic).map(log => ({
                id: `log-${p._id}-${log.timestamp.getTime()}`,
                type: 'PROJECT_LOG',
                user: 'Squadron', 
                title: p.title,
                content: log.logContent,
                chapter: p.associatedTeam?.teamName || 'Global',
                tags: p.techStack,
                timestamp: log.timestamp,
                meta: { projectId: p._id }
            }))),
            ...bounties.map(b => ({
                id: `bounty-${b._id}`,
                type: 'NEW_BOUNTY',
                user: 'System',
                title: b.title,
                content: `New high-priority mission issued: ${b.title}. Reward: ${b.pointReward} Rep.`,
                chapter: 'Mainnet',
                tags: ['bounty', ...b.techStack],
                timestamp: b.createdAt,
                meta: { bountyId: b._id }
            })),
            ...submissions.map(s => ({
                id: `sub-${s._id}`,
                type: 'BOUNTY_RESOLVED',
                user: s.userId?.name || 'Operative',
                title: 'Bounty Resolved',
                content: `Operative has successfully cleared the objective: ${s.bountyId?.title}`,
                chapter: 'Achievement',
                tags: ['resolution', 'rep'],
                timestamp: s.updatedAt,
                meta: { 
                    bountyId: s.bountyId?._id,
                    userId: s.userId?._id,
                    avatarUrl: s.userId?.avatarUrl
                }
            })),
            ...articles.map(a => ({
                id: `art-${a._id}`,
                type: 'KNOWLEDGE_SHARE',
                user: a.author?.name || 'Scholar',
                title: a.title,
                content: `New tactical briefing published: ${a.title}`,
                chapter: 'Knowledge',
                tags: ['article', 'intel'],
                timestamp: a.createdAt,
                meta: { 
                    articleSlug: a.slug,
                    userId: a.author?._id,
                    avatarUrl: a.author?.avatarUrl
                }
            })),
            ...signals.map(s => ({
                id: `sig-${s._id}`,
                type: 'SIGNAL',
                user: s.user?.name || 'Operative',
                title: s.type,
                content: s.content,
                chapter: s.chapterId?.chapterName || 'Mainnet',
                tags: s.tags,
                timestamp: s.createdAt,
                meta: { 
                    signalId: s._id,
                    userId: s.user?._id,
                    avatarUrl: s.user?.avatarUrl,
                    isEdited: s.isEdited,
                    comments: s.comments,
                    code: s.code,
                    attachments: s.attachments
                }
            }))
        ];



        // Sort globally by timestamp
        const sortedFeed = feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit);

        res.json(sortedFeed);
    } catch (error) {
        res.status(500).json({ message: 'Mainnet downlink failure: ' + error.message });
    }
});

// @desc    Transmit a new signal
// @route   POST /api/feed/transmit
router.post('/transmit', protect, async (req, res) => {
    try {
        const { content, type, tags, isPublic, code, attachments } = req.body;

        if (!content && !code) {
            return res.status(400).json({ message: 'Signal content or code is required' });
        }

        // Validate attachment URLs if present
        if (attachments && Array.isArray(attachments)) {
            for (const url of attachments) {
                if (typeof url === 'string' && !url.startsWith('http://') && !url.startsWith('https://')) {
                    return res.status(400).json({ message: 'Attachment URLs must use http:// or https://' });
                }
            }
        }

        const sanitizedContent = content ? sanitizeUserContent(content) : '';

        const signal = await Signal.create({
            user: req.user._id,
            content: sanitizedContent,
            code,
            type: type || 'Broadcast',
            tags: tags || [],
            isPublic: isPublic !== undefined ? isPublic : true,
            chapterId: req.user.chapterId || null,
            attachments: attachments || []
        });

        const populatedSignal = await Signal.findById(signal._id)
            .populate('user', 'name avatarUrl')
            .populate('chapterId', 'chapterName');

        const feedItem = {
            id: `sig-${populatedSignal._id}`,
            type: 'SIGNAL',
            user: populatedSignal.user?.name || 'Operative',
            title: populatedSignal.type,
            content: populatedSignal.content,
            chapter: populatedSignal.chapterId?.chapterName || 'Mainnet',
            tags: populatedSignal.tags,
            timestamp: populatedSignal.createdAt,
            meta: { 
                signalId: populatedSignal._id,
                userId: populatedSignal.user?._id,
                avatarUrl: populatedSignal.user?.avatarUrl,
                isEdited: populatedSignal.isEdited,
                comments: populatedSignal.comments,
                code: populatedSignal.code,
                attachments: populatedSignal.attachments
            }
        };

        if (req.io) {
            req.io.emit('new_signal', feedItem);
        }

        res.status(201).json(feedItem);
    } catch (error) {
        res.status(500).json({ message: 'Signal transmission failure: ' + error.message });
    }
});

// @desc    Edit a signal
// @route   PUT /api/feed/signal/:id
router.put('/signal/:id', protect, async (req, res) => {
    try {
        const signal = await Signal.findById(req.params.id);

        if (!signal) {
            return res.status(404).json({ message: 'Signal not found' });
        }

        const isAdmin = req.user.role === 'Admin';
        if (signal.user.toString() !== req.user._id.toString() && !isAdmin) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        signal.content = req.body.content !== undefined ? sanitizeUserContent(req.body.content) : signal.content;
        signal.code = req.body.code !== undefined ? req.body.code : signal.code;
        signal.attachments = req.body.attachments !== undefined ? req.body.attachments : signal.attachments;
        signal.isEdited = true;
        
        await signal.save();

        const updatedSignal = await Signal.findById(signal._id)
            .populate('user', 'name avatarUrl')
            .populate('chapterId', 'chapterName')
            .populate('comments.user', 'name avatarUrl');

        const feedItem = {
            id: `sig-${updatedSignal._id}`,
            type: 'SIGNAL',
            user: updatedSignal.user?.name || 'Operative',
            title: updatedSignal.type,
            content: updatedSignal.content,
            chapter: updatedSignal.chapterId?.chapterName || 'Mainnet',
            tags: updatedSignal.tags,
            timestamp: updatedSignal.createdAt,
            meta: { 
                signalId: updatedSignal._id,
                userId: updatedSignal.user?._id,
                avatarUrl: updatedSignal.user?.avatarUrl,
                isEdited: updatedSignal.isEdited,
                comments: updatedSignal.comments,
                code: updatedSignal.code,
                attachments: updatedSignal.attachments
            }
        };

        if (req.io) {
            req.io.emit('signal_updated', feedItem);
        }

        res.json(feedItem);
    } catch (error) {
        res.status(500).json({ message: 'Signal update failure: ' + error.message });
    }
});

// @desc    Delete a signal
// @route   DELETE /api/feed/signal/:id
router.delete('/signal/:id', protect, async (req, res) => {
    try {
        const signal = await Signal.findById(req.params.id);

        if (!signal) {
            return res.status(404).json({ message: 'Signal not found' });
        }

        const isAdmin = req.user.role === 'Admin';
        if (signal.user.toString() !== req.user._id.toString() && !isAdmin) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        const signalId = signal._id;
        await signal.deleteOne();

        if (req.io) {
            req.io.emit('signal_deleted', signalId);
        }

        res.json({ message: 'Signal decommissioned' });
    } catch (error) {
        res.status(500).json({ message: 'Signal deletion failure: ' + error.message });
    }
});

// @desc    Comment on a signal
// @route   POST /api/feed/signal/:id/comment
router.post('/signal/:id/comment', protect, async (req, res) => {
    try {
        const signal = await Signal.findById(req.params.id);

        if (!signal) {
            return res.status(404).json({ message: 'Signal not found' });
        }

        const newComment = {
            user: req.user._id,
            content: sanitizeUserContent(req.body.content)
        };

        signal.comments.push(newComment);
        await signal.save();

        const updatedSignal = await Signal.findById(signal._id)
            .populate('user', 'name avatarUrl')
            .populate('chapterId', 'chapterName')
            .populate('comments.user', 'name avatarUrl');

        const feedItem = {
            id: `sig-${updatedSignal._id}`,
            type: 'SIGNAL',
            user: updatedSignal.user?.name || 'Operative',
            title: updatedSignal.type,
            content: updatedSignal.content,
            chapter: updatedSignal.chapterId?.chapterName || 'Mainnet',
            tags: updatedSignal.tags,
            timestamp: updatedSignal.createdAt,
            meta: { 
                signalId: updatedSignal._id,
                userId: updatedSignal.user?._id,
                avatarUrl: updatedSignal.user?.avatarUrl,
                isEdited: updatedSignal.isEdited,
                comments: updatedSignal.comments,
                code: updatedSignal.code,
                attachments: updatedSignal.attachments
            }
        };

        if (req.io) {
            req.io.emit('signal_updated', feedItem);
        }

        res.json(feedItem);
    } catch (error) {
        res.status(500).json({ message: 'Comment transmission failure: ' + error.message });
    }
});

// @desc    Get all signals for administration
// @route   GET /api/feed/admin/signals
router.get('/admin/signals', protect, isAdmin, async (req, res) => {
    try {
        const signals = await Signal.find({})
            .populate('user', 'name avatarUrl role')
            .populate('chapterId', 'chapterName')
            .populate('comments.user', 'name avatarUrl')
            .sort({ createdAt: -1 });

        res.json(signals);
    } catch (error) {
        res.status(500).json({ message: 'Registry retrieval failure: ' + error.message });
    }
});

// @desc    Delete a comment from a signal
// @route   DELETE /api/feed/signal/:id/comment/:commentId
router.delete('/signal/:id/comment/:commentId', protect, async (req, res) => {
    try {
        const signal = await Signal.findById(req.params.id);
        if (!signal) return res.status(404).json({ message: 'Signal not found' });

        const comment = signal.comments.id(req.params.commentId);
        if (!comment) return res.status(404).json({ message: 'Comment not found' });

        const isAdmin = req.user.role === 'Admin';
        const isCommentOwner = comment.user.toString() === req.user._id.toString();
        const isSignalOwner = signal.user.toString() === req.user._id.toString();

        if (!isAdmin && !isCommentOwner && !isSignalOwner) {
            return res.status(401).json({ message: 'User not authorized' });
        }

        comment.deleteOne();
        await signal.save();

        const updatedSignal = await Signal.findById(signal._id)
            .populate('user', 'name avatarUrl')
            .populate('chapterId', 'chapterName')
            .populate('comments.user', 'name avatarUrl');

        const feedItem = {
            id: `sig-${updatedSignal._id}`,
            type: 'SIGNAL',
            user: updatedSignal.user?.name || 'Operative',
            title: updatedSignal.type,
            content: updatedSignal.content,
            chapter: updatedSignal.chapterId?.chapterName || 'Mainnet',
            tags: updatedSignal.tags,
            timestamp: updatedSignal.createdAt,
            meta: { 
                signalId: updatedSignal._id,
                userId: updatedSignal.user?._id,
                avatarUrl: updatedSignal.user?.avatarUrl,
                isEdited: updatedSignal.isEdited,
                comments: updatedSignal.comments,
                code: updatedSignal.code,
                attachments: updatedSignal.attachments
            }
        };

        if (req.io) {
            req.io.emit('signal_updated', feedItem);
        }

        res.json(feedItem);
    } catch (error) {
        res.status(500).json({ message: 'Comment deletion failure: ' + error.message });
    }
});

export default router;

