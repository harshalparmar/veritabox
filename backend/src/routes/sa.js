import express from 'express';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import SuperAdmin from '../models/SuperAdmin.js';
import User from '../models/User.js';
import SAAuditLog from '../models/SAAuditLog.js';
import { protectSA, saAudit } from '../middleware/saMiddleware.js';
import { rateLimit } from '../middleware/rateLimit.js';

const saLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, message: 'Too many attempts.' });

const router = express.Router();

// ─── AUTHENTICATION (TOTP MANDATORY) ──────────────────────────────────────────

/**
 * @route   POST /api/sa/auth/login
 * @desc    SA Login Step 1 (Email/Pass)
 * @access  Public (Hidden)
 */
router.post('/auth/login', saLimiter, async (req, res) => {
  const { email, password } = req.body;
  const sa = await SuperAdmin.findOne({ email });

  if (sa && (await sa.matchPassword(password))) {
    if (sa.isLocked) return res.status(404).json({ message: 'Not Found' });

    // Step 1 success, request TOTP
    res.json({ 
      requireTotp: true,
      message: 'Password accepted. Provide TOTP to engage Shadow Layer.' 
    });
  } else {
    // Audit failed attempt for lockout logic (omitted for brevity but planned)
    res.status(404).json({ message: 'Not Found' });
  }
});

/**
 * @route   POST /api/sa/auth/verify
 * @desc    SA Login Step 2 (TOTP Verification)
 * @access  Public (Hidden)
 */
router.post('/auth/verify', saLimiter, async (req, res) => {
  const { email, password, token } = req.body;
  const sa = await SuperAdmin.findOne({ email });

  if (sa && (await sa.matchPassword(password))) {
    // Check lockout
    if (sa.lockedUntil && sa.lockedUntil > new Date()) {
      return res.status(423).json({ message: 'Account locked. Try again later.' });
    }

    const verified = speakeasy.totp.verify({
      secret: sa.totpSecret,
      encoding: 'base32',
      token
    });

    if (verified) {
      const saToken = jwt.sign(
        { id: sa._id },
        process.env.SA_JWT_SECRET,
        { expiresIn: '2h' }
      );

      sa.lastLoginAt = new Date();
      sa.lastLoginIp = req.ip || req.connection.remoteAddress;
      sa.failedLogins = 0;
      await sa.save();

      res.json({ token: saToken, email: sa.email });
    } else {
      // Increment failed logins and check for lockout
      sa.failedLogins = (sa.failedLogins || 0) + 1;
      if (sa.failedLogins >= 5) {
        sa.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        await sa.save();
        return res.status(423).json({ message: 'Account locked. Try again later.' });
      }
      await sa.save();
      res.status(404).json({ message: 'Not Found' });
    }
  } else {
    res.status(404).json({ message: 'Not Found' });
  }
});

// ─── GHOST MODE PROTOCOL ──────────────────────────────────────────────────────

/**
 * @route   POST /api/sa/ghost/:userId
 * @desc    Possess a user account (Generate Ghost JWT)
 * @access  SuperAdmin Only
 */
router.post('/ghost/:userId', protectSA, saAudit('Possess User'), async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    console.log(`[SA] Ghost login: SA ${req.sa._id} impersonating user ${req.params.userId}`);

    // Forging the Ghost JWT
    // This token is signed with the STANDARD JWT_SECRET but contains SA markers
    const ghostToken = jwt.sign(
      { 
        id: targetUser._id,
        isGhost: true,
        saId: req.sa._id,
        ghostExpiresAt: Date.now() + (30 * 60 * 1000) // 30 mins
      },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    res.json({ 
      token: ghostToken, 
      user: {
        id: targetUser._id,
        name: targetUser.name,
        username: targetUser.universityId,
        role: targetUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Possession failure' });
  }
});

// ─── UTILITY ──────────────────────────────────────────────────────────────────

/**
 * @route   GET /api/sa/users
 * @desc    Fetch all users for possession (SuperAdmin Only)
 * @access  SuperAdmin Only
 */
router.get('/users', protectSA, async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'User query failure' });
  }
});

/**
 * @route   GET /api/sa/audit
 * @desc    Fetch SA Audit Logs
 * @access  SuperAdmin Only
 */
router.get('/audit', protectSA, async (req, res) => {
  try {
    const logs = await SAAuditLog.find({})
      .populate('saId', 'email')
      .populate('targetUserId', 'name universityId')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Audit stream failure' });
  }
});

export default router;
