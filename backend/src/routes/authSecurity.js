import jwt from 'jsonwebtoken';
import express from 'express';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { sendOTPEmail } from '../utils/email.js';
import { rateLimit } from '../middleware/rateLimit.js';

const PRIMARY_ORIGIN = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
import { safeEqual } from '../utils/otpSecurity.js';
import { hashOtp, generateSecureCode, encrypt, decrypt } from '../utils/security.js';

const lost2faLimiter = rateLimit({ windowMs: 15 * 60_000, max: 5, message: 'Too many attempts. Try again in 15 minutes.' });

const router = express.Router();

// @desc    Setup 2FA (Generate Secret & QR Code)
// @route   POST /api/auth-security/2fa/setup
// @access  Private
router.post('/2fa/setup', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user.isTwoFactorEnabled) {
      return res.status(400).json({ message: '2FA is already enabled' });
    }

    const secret = speakeasy.generateSecret({
      name: `VeritaBox:${user.universityId}`,
    });

    // Never store the TOTP secret in plaintext. If encryption is unavailable
    // we fail the request rather than silently persisting a readable secret.
    user.twoFactorSecret = encrypt(secret.base32);
    await user.save();

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCodeUrl,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Verify and Enable 2FA
// @route   POST /api/auth-security/2fa/verify
// @access  Private
router.post('/2fa/verify', protect, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: '2FA setup not initiated' });
    }

    // Decrypt TOTP secret for verification (try-catch for backward compat)
    let totpSecret = user.twoFactorSecret;
    try {
      totpSecret = decrypt(user.twoFactorSecret);
    } catch (e) {
      // Fall back to plaintext if decryption fails (legacy secret)
    }

    const verified = speakeasy.totp.verify({
      secret: totpSecret,
      encoding: 'base32',
      token,
    });

    if (verified) {
      user.isTwoFactorEnabled = true;
      // Generate backup codes using crypto
      const backupCodes = Array.from({ length: 8 }, () => generateSecureCode(8).toUpperCase());
      user.twoFactorBackupCodes = backupCodes.map(c => hashOtp(c));
      await user.save();
      res.json({ message: '2FA enabled successfully', backupCodes });
    } else {
      res.status(400).json({ message: 'Invalid verification token' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Disable 2FA
// @route   POST /api/auth-security/2fa/disable
// @access  Private
router.post('/2fa/disable', protect, async (req, res) => {
  try {
    const { password, token } = req.body;
    const user = await User.findById(req.user._id);

    if (!user.isTwoFactorEnabled) {
      return res.status(400).json({ message: '2FA is not enabled' });
    }

    // Verify password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Decrypt TOTP secret for verification (try-catch for backward compat)
    let totpSecret = user.twoFactorSecret;
    try {
      totpSecret = decrypt(user.twoFactorSecret);
    } catch (e) {
      // Fall back to plaintext if decryption fails (legacy secret)
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: totpSecret,
      encoding: 'base32',
      token,
    });

    if (verified) {
      user.isTwoFactorEnabled = false;
      user.twoFactorSecret = null;
      user.twoFactorBackupCodes = [];
      await user.save();
      res.json({ message: '2FA disabled successfully' });
    } else {
      res.status(400).json({ message: 'Invalid verification token' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Link GitHub via Code
// @route   POST /api/auth-security/social/link/github
// @access  Private
router.post('/social/link/github', protect, async (req, res) => {
  try {
    const { code } = req.body;
    
    // Exchange code for token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description);

    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, 'User-Agent': 'VeritaBox-App' }
    });
    const githubUser = await userResponse.json();
    const githubId = githubUser.id.toString();

    // Conflict Check: Is this GitHub ID already linked to another user?
    const existingLink = await User.findOne({ 
      'socialProviders.github.id': githubId,
      _id: { $ne: req.user._id } 
    });
    
    if (existingLink) {
      return res.status(400).json({ message: 'This GitHub account is already linked to another operative identity.' });
    }

    const user = await User.findById(req.user._id);
    if (!user.socialProviders) user.socialProviders = {};

    user.socialProviders.github = {
      id: githubId,
      username: githubUser.login,
      linkedAt: new Date()
    };

    await user.save();
    res.json({ message: 'GitHub linked successfully', socialProviders: user.socialProviders });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Link Microsoft via Code
// @route   POST /api/auth-security/social/link/microsoft
// @access  Private
router.post('/social/link/microsoft', protect, async (req, res) => {
  try {
    const { code } = req.body;
    
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${PRIMARY_ORIGIN}/auth`
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description);

    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const msUser = await userResponse.json();
    const microsoftId = msUser.id;

    // Conflict Check: Is this Microsoft ID already linked to another user?
    const existingLink = await User.findOne({ 
      'socialProviders.microsoft.id': microsoftId,
      _id: { $ne: req.user._id } 
    });

    if (existingLink) {
      return res.status(400).json({ message: 'This Microsoft account is already linked to another operative identity.' });
    }

    const user = await User.findById(req.user._id);
    if (!user.socialProviders) user.socialProviders = {};

    user.socialProviders.microsoft = {
      id: microsoftId,
      email: msUser.mail || msUser.userPrincipalName,
      linkedAt: new Date()
    };

    await user.save();
    res.json({ message: 'Microsoft linked successfully', socialProviders: user.socialProviders });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Link Google via Token
// @route   POST /api/auth-security/social/link/google
// @access  Private
router.post('/social/link/google', protect, async (req, res) => {
  try {
    const { idToken, accessToken } = req.body;
    let payload;

    if (idToken) {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } else if (accessToken) {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      payload = await response.json();
    }

    const googleId = payload.sub || payload.id;

    // Conflict Check: Is this Google ID already linked to another user?
    const existingLink = await User.findOne({ 
      'socialProviders.google.id': googleId,
      _id: { $ne: req.user._id } 
    });

    if (existingLink) {
      return res.status(400).json({ message: 'This Google account is already linked to another operative identity.' });
    }

    const user = await User.findById(req.user._id);
    if (!user.socialProviders) user.socialProviders = {};

    user.socialProviders.google = {
      id: googleId,
      email: payload.email,
      linkedAt: new Date()
    };

    await user.save();
    res.json({ message: 'Google linked successfully', socialProviders: user.socialProviders });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Link LinkedIn via Code
// @route   POST /api/auth-security/social/link/linkedin
// @access  Private
router.post('/social/link/linkedin', protect, async (req, res) => {
  try {
    const { code } = req.body;
    
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: `${PRIMARY_ORIGIN}/auth`
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) throw new Error(tokenData.error_description);

    const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const liUser = await userResponse.json();
    const linkedinId = liUser.sub;

    // Conflict Check
    const existingLink = await User.findOne({ 
      'socialProviders.linkedin.id': linkedinId,
      _id: { $ne: req.user._id } 
    });

    if (existingLink) {
      return res.status(400).json({ message: 'This LinkedIn account is already linked to another operative identity.' });
    }

    const user = await User.findById(req.user._id);
    if (!user.socialProviders) user.socialProviders = {};

    user.socialProviders.linkedin = {
      id: linkedinId,
      email: liUser.email,
      linkedAt: new Date()
    };

    await user.save();
    res.json({ message: 'LinkedIn linked successfully', socialProviders: user.socialProviders });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Unlink Social Provider
// @route   POST /api/auth-security/social/unlink
// @access  Private
router.post('/social/unlink', protect, async (req, res) => {
    try {
        const { provider } = req.body;
        const user = await User.findById(req.user._id);

        if (user.socialProviders && user.socialProviders[provider]) {
            user.socialProviders[provider] = undefined;
            await user.save();
            res.json({ message: `${provider} unlinked successfully`, socialProviders: user.socialProviders });
        } else {
            res.status(400).json({ message: 'Provider not linked' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Request Lost 2FA OTP
// @route   POST /api/auth-security/2fa/lost-request
// @access  Private (rate-limited)
router.post('/2fa/lost-request', lost2faLimiter, protect, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.isTwoFactorEnabled) return res.status(400).json({ message: '2FA is not enabled' });

    // Require password re-authentication: a stolen session token alone must not
    // be enough to disable 2FA. The user must also prove they know the password.
    if (!password || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Password verification required to reset 2FA.' });
    }

    // Verify email if provided
    if (email && email !== user.email && email !== user.universityId) {
      return res.status(403).json({ message: 'The provided email does not match this account.' });
    }

    const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    const targetEmail = isEmail(email) ? email : (isEmail(user.email) ? user.email : null);

    if (!targetEmail) {
      return res.status(400).json({ message: 'No valid email address found for this account. Please contact support.' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.loginOtp = hashOtp(otp);
    user.loginOtpExpires = expires;
    await user.save();

    await sendOTPEmail(targetEmail, otp);

    res.json({ message: 'OTP sent to your email to bypass 2FA' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @desc    Verify Lost 2FA OTP & Disable 2FA
// @route   POST /api/auth-security/2fa/lost-verify
// @access  Private (rate-limited)
router.post('/2fa/lost-verify', lost2faLimiter, protect, async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.loginOtp || !safeEqual(user.loginOtp, hashOtp(String(otp || ''))) || user.loginOtpExpires < new Date()) {
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP and disable 2FA
    user.loginOtp = null;
    user.loginOtpExpires = null;
    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = [];
    await user.save();

    const device = req.headers['user-agent'] || 'Unknown Device';
    const location = req.ip || 'Unknown IP';

    await User.findByIdAndUpdate(user._id, {
      $push: {
        loginHistory: {
          $each: [{ success: true, device, location, note: 'Disabled 2FA via OTP' }],
          $slice: -50
        }
      }
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email || user.universityId,
      role: user.role,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      skills: user.skills,
      skillMatrix: user.skillMatrix,
      settings: user.settings,
      socialLinks: user.socialLinks,
      currentProjects: user.currentProjects,
      isOnboarded: user.isOnboarded,
      socialProviders: user.socialProviders,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
