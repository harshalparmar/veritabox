import express from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Notification from '../models/Notification.js';
import speakeasy from 'speakeasy';
import { sendWelcomeEmail, sendOTPEmail } from '../utils/email.js';
import NewsletterSubscriber from '../models/NewsletterSubscriber.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { safeEqual, isOtpLocked, registerOtpFailure, clearOtpFailures, OTP_LOCK_MINUTES } from '../utils/otpSecurity.js';
import { hashOtp } from '../utils/security.js';

const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, message: 'Too many authentication attempts. Try again in 15 minutes.' });

// Primary frontend origin for OAuth redirect URIs (first entry from the comma-separated FRONTEND_URL)
const PRIMARY_ORIGIN = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim();
const otpLimiter = rateLimit({ windowMs: 15 * 60_000, max: 8, message: 'Too many OTP attempts. Try again in 15 minutes.' });

const router = express.Router();

const handleNewUserSignup = async (user, email, name) => {
  try {
    await sendWelcomeEmail(email, name);
  } catch (error) {
    console.error('Welcome email failed (non-critical):', error);
  }
  try {
    await NewsletterSubscriber.findOneAndUpdate(
      { email: email.toLowerCase() },
      { isActive: true, userId: user._id, $setOnInsert: { subscribedAt: Date.now() } },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('Auto-subscribe error:', error);
  }
};

// --- Streak Calculation Helper ---
async function updateStreak(userId, currentStreak, longestStreak, lastLoginDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let newStreak = currentStreak || 0;

  if (!lastLoginDate) {
    newStreak = 1;
  } else {
    const lastDay = new Date(lastLoginDate);
    lastDay.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - lastDay) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) { /* same day, no change */ }
    else if (diffDays === 1) { newStreak += 1; }
    else { newStreak = 1; }
  }

  const newLongest = Math.max(longestStreak || 0, newStreak);
  await User.findByIdAndUpdate(userId, {
    lastLoginDate: new Date(),
    currentStreak: newStreak,
    longestStreak: newLongest
  });
  return { currentStreak: newStreak, longestStreak: newLongest };
}

// Password complexity regex (Min 8 chars, 1 letter, 1 number, 1 special character)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password, universityId } = req.body;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters with an uppercase letter, a lowercase letter, a number, and a special character.' });
    }

    const userExists = await User.findOne({ 
      $or: [
        { email }, 
        { universityId: email },
        ...(universityId ? [{ universityId }, { email: universityId }] : [])
      ] 
    });
    if (userExists) {
      return res.status(400).json({ message: 'User with this Email or University ID already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      universityId,
    });

    // Send welcome email and auto-subscribe to newsletter
    await handleNewUserSignup(user, email, name);


    const device = req.headers['user-agent'] || 'Unknown Device';
    const location = req.ip || 'Unknown IP';
    await User.findByIdAndUpdate(user._id, {
      $push: { loginHistory: { success: true, device, location } }
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email || user.universityId,
      role: user.role,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      skills: user.skills,
      socialLinks: user.socialLinks,
      currentProjects: user.currentProjects,
      isOnboarded: user.isOnboarded,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ 
      $or: [{ email }, { universityId: email }] 
    });
    let isAdminModel = false;
    let isSuperAdminModel = false;
    
    if (!user) {
      user = await Admin.findOne({ email });
      if (user) isAdminModel = true;
    }
    
    if (!user) {
      const SuperAdmin = (await import('../models/SuperAdmin.js')).default;
      user = await SuperAdmin.findOne({ email });
      if (user) isSuperAdminModel = true;
    }
    const device = req.headers['user-agent'] || 'Unknown Device';
    const location = req.ip || 'Unknown IP';

    if (user && (await user.matchPassword(password))) {
      
      if (isSuperAdminModel) {
        if (user.isLocked) return res.status(404).json({ message: 'Not Found' });
        return res.json({ 
          requireTotp: true,
          isSuperAdmin: true,
          userId: user._id,
          message: 'Password accepted. Provide TOTP to engage Shadow Layer.' 
        });
      }

      // Opportunistic email migration for legacy accounts
      const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
      if (isEmail(email) && (!user.email || !user.email.includes('@'))) {
        user.email = email;
        await user.save();
      }
      // Log successful login
      const Model = isAdminModel ? Admin : User;
      await Model.findByIdAndUpdate(user._id, {
        $push: { 
          loginHistory: { 
            $each: [{ success: true, device, location }],
            $slice: -50 
          } 
        }
      });

      if (user.isTwoFactorEnabled) {
        return res.json({
          requireTotp: true,
          userId: user._id,
          message: 'Two-factor authentication required'
        });
      }

      // Reactivate if they were deactivated
      if (!user.isActive || user.settings?.privacy?.searchable === false) {
        user.isActive = true;
        if (user.settings && user.settings.privacy) {
          user.settings.privacy.searchable = true;
        }
        await user.save();
      }

      let streakData = { currentStreak: 0, longestStreak: 0 };
      if (!isAdminModel) {
        streakData = await updateStreak(user._id, user.currentStreak, user.longestStreak, user.lastLoginDate);
      }

      let adminToken = undefined;
      if (isAdminModel) {
        adminToken = crypto.randomBytes(12).toString('hex');
        await Admin.findByIdAndUpdate(user._id, { adminToken });
      }

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
        isOnboarded: isAdminModel ? true : user.isOnboarded,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        token: generateToken(user._id),
        ...(adminToken && { adminToken }),
      });
    } else {
      if (user && !isSuperAdminModel) {
        // Log failed login for existing user
        const Model = isAdminModel ? Admin : User;
        await Model.findByIdAndUpdate(user._id, {
          $push: { 
            loginHistory: { 
              $each: [{ success: false, device, location }],
              $slice: -50 
            } 
          }
        });
      }
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/google', authLimiter, async (req, res) => {
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
      // Fetch user info using access token — send via Authorization header, NOT query param
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      // Check HTTP status BEFORE parsing body to avoid crashing on non-JSON error pages
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Google userinfo failed (${response.status}): ${text.substring(0, 200)}`);
      }
      payload = await response.json();
    } else {
      return res.status(400).json({ message: 'No token provided' });
    }

    const { email, name, picture, sub } = payload;
    const googleId = sub || payload.id;

    // 1. Try to find user by Google ID first
    let user = await User.findOne({ 'socialProviders.google.id': googleId });

    // 2. If not found by ID, try by Email
    if (!user) {
      user = await User.findOne({ 
        $or: [{ email }, { universityId: email }] 
      });
      if (user) {
        // Link Google ID to existing account
        if (!user.socialProviders) user.socialProviders = {};
        user.socialProviders.google = { id: googleId, email, linkedAt: new Date() };
        await user.save();
      }
    }

    if (!user) {
      user = await User.create({
        name,
        email,
        password: crypto.randomBytes(16).toString('hex'),
        avatarUrl: picture,
        isOnboarded: false,
        socialProviders: {
          google: { id: googleId, email, linkedAt: new Date() }
        }
      });

      // Send welcome email and auto-subscribe to newsletter
      await handleNewUserSignup(user, email, name);
    }

    const device = req.headers['user-agent'] || 'Unknown Device';
    const location = req.ip || 'Unknown IP';
    await User.findByIdAndUpdate(user._id, {
      $push: { 
        loginHistory: { 
          $each: [{ success: true, device, location }],
          $slice: -50 
        } 
      }
    });

    if (user.isTwoFactorEnabled) {
      return res.json({
        requireTotp: true,
        userId: user._id,
        message: 'Two-factor authentication required'
      });
    }

    const streakData = await updateStreak(user._id, user.currentStreak, user.longestStreak, user.lastLoginDate);

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
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Authentication failed' });
  }
});

router.post('/github', authLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'GitHub authorization code is required' });
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${PRIMARY_ORIGIN}/auth`,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return res.status(401).json({ message: 'GitHub Auth failed: ' + tokenData.error_description });
    }

    const accessToken = tokenData.access_token;

    const githubApiHeaders = { 
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'VeritaBox-App'
    };

    const userResponse = await fetch('https://api.github.com/user', {
      headers: githubApiHeaders,
    });
    const githubUser = await userResponse.json();

    let email = githubUser.email;

    // Only fetch emails array if public email is not available
    if (!email) {
      try {
        const emailsResponse = await fetch('https://api.github.com/user/emails', {
          headers: githubApiHeaders,
        });
        const emails = await emailsResponse.json();
        
        if (Array.isArray(emails)) {
          const primaryEmailObj = emails.find(e => e.primary) || emails[0];
          if (primaryEmailObj) {
            email = primaryEmailObj.email;
          }
        }
      } catch (err) {
        console.error("Failed to fetch GitHub emails:", err);
      }
    }

    if (!email) {
      return res.status(400).json({ 
        message: 'No email found. If using a GitHub App, ensure "User permissions -> Email addresses" is set to "Read-only". Otherwise, make your email public.' 
      });
    }
    
    const githubId = githubUser.id.toString();
    const githubUsername = githubUser.login;

    // 1. Try to find user by GitHub ID first
    let user = await User.findOne({ 'socialProviders.github.id': githubId });

    // 2. If not found by ID, try by Email
    if (!user) {
      user = await User.findOne({ 
        $or: [{ email }, { universityId: email }] 
      });
      if (user) {
        // Link GitHub ID to existing account
        if (!user.socialProviders) user.socialProviders = {};
        user.socialProviders.github = { id: githubId, username: githubUsername, linkedAt: new Date() };
        await user.save();
      }
    }

    // 3. If still not found, create new account
    if (!user) {
      user = await User.create({
        name: githubUser.name || githubUsername,
        universityId: email,
        password: crypto.randomBytes(16).toString('hex'),
        avatarUrl: githubUser.avatar_url,
        socialLinks: { github: githubUser.html_url, linkedin: '', portfolio: '', twitter: '' },
        isOnboarded: false,
        socialProviders: {
          github: { id: githubId, username: githubUsername, linkedAt: new Date() }
        }
      });

      // Send welcome email and auto-subscribe to newsletter
      await handleNewUserSignup(user, email, user.name);
    }


    const device = req.headers['user-agent'] || 'Unknown Device';
    const location = req.ip || 'Unknown IP';
    await User.findByIdAndUpdate(user._id, {
      $push: { loginHistory: { success: true, device, location } }
    });

    if (user.isTwoFactorEnabled) {
      return res.json({
        requireTotp: true,
        userId: user._id,
        message: 'Two-factor authentication required'
      });
    }

    const streakData = await updateStreak(user._id, user.currentStreak, user.longestStreak, user.lastLoginDate);

    res.json({
      _id: user._id,
      name: user.name,
      universityId: user.universityId,
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
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Authentication failed' });
  }
});

router.post('/microsoft', authLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Microsoft authorization code is required' });
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${PRIMARY_ORIGIN}/auth`,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return res.status(401).json({ message: 'Microsoft Auth failed: ' + tokenData.error_description });
    }

    const accessToken = tokenData.access_token;

    // Fetch user info from Microsoft Graph
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const msUser = await userResponse.json();

    if (msUser.error) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const email = msUser.mail || msUser.userPrincipalName;
    const name = msUser.displayName;

    if (!email) {
      return res.status(400).json({ message: 'No email found in Microsoft account' });
    }

    const microsoftId = msUser.id;
    const microsoftEmail = email;

    // 1. Try to find user by Microsoft ID first
    let user = await User.findOne({ 'socialProviders.microsoft.id': microsoftId });

    // 2. If not found by ID, try by Email
    if (!user) {
      user = await User.findOne({ 
        $or: [{ email: microsoftEmail }, { universityId: microsoftEmail }] 
      });
      if (user) {
        // Link Microsoft ID to existing account
        if (!user.socialProviders) user.socialProviders = {};
        user.socialProviders.microsoft = { id: microsoftId, email: microsoftEmail, linkedAt: new Date() };
        await user.save();
      }
    }

    // 3. If still not found, create new account
    if (!user) {
      user = await User.create({
        name: msUser.displayName,
        email: microsoftEmail,
        password: crypto.randomBytes(16).toString('hex'),
        isOnboarded: false,
        socialProviders: {
          microsoft: { id: microsoftId, email: microsoftEmail, linkedAt: new Date() }
        }
      });

      // Send welcome email and auto-subscribe to newsletter
      await handleNewUserSignup(user, microsoftEmail, user.name);
    }


    const device = req.headers['user-agent'] || 'Unknown Device';
    const location = req.ip || 'Unknown IP';
    await User.findByIdAndUpdate(user._id, {
      $push: { 
        loginHistory: { 
          $each: [{ success: true, device, location }],
          $slice: -50 
        } 
      }
    });

    if (user.isTwoFactorEnabled) {
      return res.json({
        requireTotp: true,
        userId: user._id,
        message: 'Two-factor authentication required'
      });
    }

    const streakData = await updateStreak(user._id, user.currentStreak, user.longestStreak, user.lastLoginDate);

    res.json({
      _id: user._id,
      name: user.name,
      universityId: user.universityId,
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
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Authentication failed' });
  }
});

router.post('/linkedin', authLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'LinkedIn authorization code is required' });
    }

    // 1. Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
        redirect_uri: `${PRIMARY_ORIGIN}/auth`,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.error) {
      return res.status(401).json({ message: 'LinkedIn Auth failed: ' + tokenData.error_description });
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch user info (using OIDC userinfo endpoint)
    const userResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const liUser = await userResponse.json();

    const email = liUser.email;
    const name = liUser.name || `${liUser.given_name} ${liUser.family_name}`;
    const linkedinId = liUser.sub; // OIDC uses 'sub' as ID

    if (!email) {
      return res.status(400).json({ message: 'No email found in LinkedIn account' });
    }

    // 1. Try to find user by LinkedIn ID first
    let user = await User.findOne({ 'socialProviders.linkedin.id': linkedinId });

    // 2. If not found by ID, try by Email
    if (!user) {
      user = await User.findOne({ 
        $or: [{ email }, { universityId: email }] 
      });
      if (user) {
        if (!user.socialProviders) user.socialProviders = {};
        user.socialProviders.linkedin = { id: linkedinId, email, linkedAt: new Date() };
        await user.save();
      }
    }

    // 3. If still not found, create new account
    if (!user) {
      user = await User.create({
        name,
        email,
        password: crypto.randomBytes(16).toString('hex'),
        avatarUrl: liUser.picture || '',
        isOnboarded: false,
        socialProviders: {
          linkedin: { id: linkedinId, email, linkedAt: new Date() }
        }
      });

      // Send welcome email and auto-subscribe to newsletter
      await handleNewUserSignup(user, email, name);
    }


    const device = req.headers['user-agent'] || 'Unknown Device';
    const location = req.ip || 'Unknown IP';
    await User.findByIdAndUpdate(user._id, {
      $push: { 
        loginHistory: { 
          $each: [{ success: true, device, location }],
          $slice: -50 
        } 
      }
    });

    if (user.isTwoFactorEnabled) {
      return res.json({
        requireTotp: true,
        userId: user._id,
        message: 'Two-factor authentication required'
      });
    }

    const streakData = await updateStreak(user._id, user.currentStreak, user.longestStreak, user.lastLoginDate);

    res.json({
      _id: user._id,
      name: user.name,
      universityId: user.universityId,
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
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Authentication failed' });
  }
});

router.post('/verify-totp', otpLimiter, async (req, res) => {
  try {
    const { userId, token } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ message: 'Invalid authentication' });
    }

    const lock = isOtpLocked(user);
    if (lock.locked) {
      return res.status(429).json({ message: `Too many failed attempts. Try again in ${Math.ceil(lock.retryAfterMs / 60000)} minutes.` });
    }

    // Decrypt TOTP secret for verification (try-catch for backward compat)
    let totpSecret = user.twoFactorSecret;
    try {
      const { decrypt } = await import('../utils/security.js');
      totpSecret = decrypt(user.twoFactorSecret);
    } catch (e) {
      // Fall back to plaintext if decryption fails (legacy secret)
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: totpSecret,
      encoding: 'base32',
      token: token
    });

    // Check backup codes if TOTP fails (codes stored hashed)
    let isBackupCode = false;
    const hashedToken = hashOtp(String(token || ''));
    if (!verified && user.twoFactorBackupCodes.some(c => safeEqual(c, hashedToken))) {
      isBackupCode = true;
      // Remove used backup code
      user.twoFactorBackupCodes = user.twoFactorBackupCodes.filter(c => !safeEqual(c, hashedToken));
      await user.save();
    }

    if (verified || isBackupCode) {
      clearOtpFailures(user);
      await user.save();
      const device = req.headers['user-agent'] || 'Unknown Device';
      const location = req.ip || 'Unknown IP';
      
      await User.findByIdAndUpdate(user._id, {
        $push: { 
          loginHistory: { 
            $each: [{ success: true, device, location, note: isBackupCode ? 'Used backup code' : '2FA Verified' }],
            $slice: -50 
          } 
        }
      });

      const streakData = await updateStreak(user._id, user.currentStreak, user.longestStreak, user.lastLoginDate);

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
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        token: generateToken(user._id),
      });
    } else {
      const result = registerOtpFailure(user);
      await user.save();
      if (result.lockedNow) {
        return res.status(429).json({ message: `Too many failed attempts. Account locked for ${OTP_LOCK_MINUTES} minutes.` });
      }
      res.status(401).json({ message: 'Invalid authentication code' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Authentication failed' });
  }
});

// --- OTP Login Flow ---

router.post('/request-otp-login', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ 
      $or: [{ email }, { universityId: email }] 
    });

    if (!user) {
      // Return 200 to prevent email enumeration — don't reveal whether the account exists
      return res.json({ message: 'If that account exists, an OTP has been sent to your email.' });
    }

    // Opportunistic migration
    const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    if (isEmail(email) && (!user.email || !user.email.includes('@'))) {
      user.email = email;
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.loginOtp = hashOtp(otp);
    user.loginOtpExpires = expires;
    await user.save();

    await sendOTPEmail(email, otp);

    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/verify-otp-login', otpLimiter, async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ 
      $or: [{ email }, { universityId: email }] 
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const lock = isOtpLocked(user);
    if (lock.locked) {
      return res.status(429).json({ message: `Too many failed attempts. Try again in ${Math.ceil(lock.retryAfterMs / 60000)} minutes.` });
    }

    const expired = !user.loginOtpExpires || user.loginOtpExpires < new Date();
    const matches = user.loginOtp && safeEqual(user.loginOtp, hashOtp(String(otp || '')));
    if (!matches || expired) {
      const result = registerOtpFailure(user);
      await user.save();
      if (result.lockedNow) {
        return res.status(429).json({ message: `Too many failed attempts. Account locked for ${OTP_LOCK_MINUTES} minutes.` });
      }
      return res.status(401).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP + failure counters
    user.loginOtp = null;
    user.loginOtpExpires = null;
    clearOtpFailures(user);
    await user.save();

    const device = req.headers['user-agent'] || 'Unknown Device';
    const location = req.ip || 'Unknown IP';
    
    await User.findByIdAndUpdate(user._id, {
      $push: { 
        loginHistory: { 
          $each: [{ success: true, device, location, note: 'OTP Login' }],
          $slice: -50 
        } 
      }
    });

    if (user.isTwoFactorEnabled) {
      return res.json({
        requireTotp: true,
        userId: user._id,
        message: 'Two-factor authentication required'
      });
    }

    const streakData = await updateStreak(user._id, user.currentStreak, user.longestStreak, user.lastLoginDate);

    res.json({
      _id: user._id,
      name: user.name,
      universityId: user.universityId,
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
      currentStreak: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Forgot Password Flow ---

router.post('/forgot-password', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ 
      $or: [{ email }, { universityId: email }] 
    });

    if (!user) {
      // Return 200 to prevent email enumeration — don't reveal whether the account exists
      return res.json({ message: 'If that account exists, a reset code has been sent to your email.' });
    }

    // Opportunistic migration
    const isEmail = (str) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    if (isEmail(email) && (!user.email || !user.email.includes('@'))) {
      user.email = email;
      // Saved below when setting resetPasswordOtp
    }

    // Generate 6-digit OTP for password reset
    const otp = crypto.randomInt(100000, 999999).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetPasswordOtp = hashOtp(otp);
    user.resetPasswordExpires = expires;
    await user.save();

    await sendOTPEmail(isEmail(email) ? email : user.email, otp); // Re-using OTP email template

    res.json({ message: 'Password reset code sent to your email' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/reset-password', otpLimiter, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters with an uppercase letter, a lowercase letter, a number, and a special character.' });
    }

    const user = await User.findOne({ 
      $or: [{ email }, { universityId: email }] 
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const lock = isOtpLocked(user);
    if (lock.locked) {
      return res.status(429).json({ message: `Too many failed attempts. Try again in ${Math.ceil(lock.retryAfterMs / 60000)} minutes.` });
    }

    const expired = !user.resetPasswordExpires || user.resetPasswordExpires < new Date();
    const matches = user.resetPasswordOtp && safeEqual(user.resetPasswordOtp, hashOtp(String(otp || '')));
    if (!matches || expired) {
      const result = registerOtpFailure(user);
      await user.save();
      if (result.lockedNow) {
        return res.status(429).json({ message: `Too many failed attempts. Account locked for ${OTP_LOCK_MINUTES} minutes.` });
      }
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    // Update password
    user.password = newPassword; // Will be hashed by pre-save hook
    user.resetPasswordOtp = null;
    user.resetPasswordExpires = null;
    clearOtpFailures(user);
    await user.save();

    res.json({ message: 'Password has been successfully reset' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
