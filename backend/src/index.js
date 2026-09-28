import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import { protect, isAdmin } from './middleware/authMiddleware.js';
import { mongoSanitize } from './middleware/sanitize.js';
import { getRedis, cacheGet, cacheSet } from './utils/redis.js';

// Load env vars
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Refuse to boot without real signing secrets. No fallbacks anywhere in the
// codebase — a missing or weak secret means every token is forgeable.
const WEAK_SECRETS = new Set(['fallback_secret', 'shadow_secret_sa', 'akshetra_matrix_secret_2024_elite']);
for (const name of ['JWT_SECRET', 'SA_JWT_SECRET']) {
  const val = process.env[name];
  if (!val || val.length < 32 || WEAK_SECRETS.has(val)) {
    console.error(`FATAL: ${name} must be set to a strong (>=32 char) random secret. Generate one with:`);
    console.error(`  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`);
    process.exit(1);
  }
}

// ENCRYPTION_KEY protects TOTP secrets at rest. Without it, 2FA setup would
// otherwise fail at runtime — fail fast at boot instead of mid-request.
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length < 32) {
  console.error('FATAL: ENCRYPTION_KEY must be set to a strong (>=32 char) random secret. Generate one with:');
  console.error('  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"');
  process.exit(1);
}

import authRoutes from './routes/auth.js';
import roadmapRoutes from './routes/roadmap.js';
import checklistRoutes from './routes/checklist.js';
import jobsRoutes from './routes/jobs.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import eventRoutes from './routes/events.js';
import knowledgeRoutes from './routes/knowledge.js';
import userRoutes from './routes/users.js';
import bountyRoutes from './routes/bounties.js';
import missionRoutes from './routes/missions.js';
import hackathonRoutes from './routes/hackathons.js';
import projectRoutes from './routes/projects.js';
import activityRoutes from './routes/activity.js';
import saRoutes from './routes/sa.js';
import chapterRoutes from './routes/chapters.js';
import systemRoutes from './routes/system.js';
import searchRoutes from './routes/search.js';
import feedRoutes from './routes/feed.js';
import forgeRoutes from './routes/forge.js';
import messageRoutes from './routes/messages.js';
import channelRoutes from './routes/channels.js';
import authSecurityRoutes from './routes/authSecurity.js';
import workshopRoutes from './routes/workshops.js';
import notificationsRoutes from './routes/notifications.js';
import newsletterRoutes from './routes/newsletter.js';
import competitionsRoutes from './routes/competitions.js';
import learningRoutes from './routes/learning.js';
import progressRoutes from './routes/progress.js';
import pulseRoutes from './routes/pulse.js';
import publishingRoutes from './routes/publishing.js';

import { seedDefaultChannels } from './utils/seedChannels.js';
import path from 'path';

const IS_PROD = process.env.NODE_ENV === 'production';
const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim()).filter(Boolean)
  : null;

if (IS_PROD && !ALLOWED_ORIGINS) {
  console.error('FATAL: FRONTEND_URL must be set in production (comma-separated allowed origins).');
  process.exit(1);
}

// A credentialed CORS response must never use a wildcard origin. When an
// allowlist is configured we validate against it; in dev (no allowlist) we
// reflect the caller's origin so local/LAN testing keeps working.
function corsOrigin(origin, cb) {
  if (!origin) return cb(null, true); // same-origin / curl / server-to-server
  if (!ALLOWED_ORIGINS) return cb(null, /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)); // dev: restrict to localhost
  if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
  return cb(new Error('Not allowed by CORS'));
}

// Trust the reverse proxy so req.ip (rate limiting, audit logs) reflects the
// real client, not the proxy. Trust only one hop by default.
app.set('trust proxy', IS_PROD ? 1 : false);

// Middleware
app.use(helmet({
  // Allow assets (uploaded images) to be embedded cross-origin by the frontend
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // No 'unsafe-inline' for scripts: this API serves JSON and uploaded files,
      // never inline-script HTML, so any uploaded/served HTML cannot run inline JS.
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    }
  },
}));
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(mongoSanitize);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: corsOrigin, credentials: true } });

// Redis adapter for Socket.IO — enables multi-instance pub/sub
try {
  const pubClient = getRedis();
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));
  console.log('[Socket.IO] Redis adapter attached');
} catch (err) {
  console.warn('[Socket.IO] Redis adapter failed, using in-memory:', err.message);
}

// JWT Socket Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const cacheKey = `user:${decoded.id}`;
    let user = await cacheGet(cacheKey);
    if (!user) {
      user = await User.findById(decoded.id).select('-password').lean();
      if (user) await cacheSet(cacheKey, user, 60);
    }
    if (!user) return next(new Error('Unauthorized'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication Error'));
  }
});

// Redis-backed presence tracking
const redis = getRedis();

// Master set of currently-online user IDs. Maintained alongside the per-user
// socket sets so we never have to scan the keyspace with the O(N), Redis-blocking
// KEYS command to list who is online.
const ONLINE_USERS_KEY = 'presence:online_users';

async function markOnline(userId, socketId) {
  const key = `presence:global:${userId}`;
  const sizeBefore = await redis.scard(key);
  await redis.sadd(key, socketId);
  if (sizeBefore === 0) {
    await redis.sadd(ONLINE_USERS_KEY, userId.toString());
    return true;
  }
  return false;
}

async function markOffline(userId, socketId) {
  const key = `presence:global:${userId}`;
  await redis.srem(key, socketId);
  const remaining = await redis.scard(key);
  if (remaining === 0) {
    await redis.del(key);
    await redis.srem(ONLINE_USERS_KEY, userId.toString());
    return true;
  }
  return false;
}

export async function getOnlineUserIds() {
  return await redis.smembers(ONLINE_USERS_KEY);
}

async function broadcastPresence(hackathonId) {
  const data = await redis.hgetall(`presence:hackathon:${hackathonId}`);
  if (!data || Object.keys(data).length === 0) return;
  const list = Object.values(data).map(v => JSON.parse(v));
  io.to(`hackathon_${hackathonId}`).emit('presence_update', { hackathonId, online: list });
}

// Socket Protocol Sub-engine
io.on('connection', async (socket) => {
  if (socket.user && socket.user._id) {
    socket.join(socket.user._id.toString());
    const wentOnline = await markOnline(socket.user._id, socket.id);
    if (wentOnline) {
      io.emit('presence:online', { userId: socket.user._id.toString() });
    }
    const online = await getOnlineUserIds();
    socket.emit('presence:snapshot', { online });
  }

  // Join a channel room only if the user is allowed to see it. Public channels
  // are open; private channels require membership/admin — otherwise a client
  // could join any room and receive its live messages, edits and typing.
  socket.on('join_channel', async (channelId) => {
    try {
      if (!socket.user) return;
      const id = String(channelId ?? '');
      if (!id) return;
      const Channel = (await import('./models/Channel.js')).default;
      const channel = await Channel.findById(id).select('isPrivate members admins');
      if (!channel) return;
      const uid = socket.user._id.toString();
      const allowed = !channel.isPrivate
        || channel.members.some(m => m.toString() === uid)
        || channel.admins.some(m => m.toString() === uid);
      if (!allowed) {
        return socket.emit('error', { message: 'Not authorized to join this channel.' });
      }
      socket.join(`channel_${id}`);
    } catch (err) {
      console.error('join_channel error:', err);
    }
  });

  socket.on('leave_channel', (channelId) => {
    socket.leave(`channel_${String(channelId ?? '')}`);
  });

  // Typing indicators — relay only to rooms the socket has actually joined
  // (channel typing) or to the direct recipient (DM typing).
  socket.on('typing:start', ({ channelId, receiverId } = {}) => {
    if (!socket.user) return;
    const payload = { userId: socket.user._id, name: socket.user.name, channelId, receiverId };
    if (channelId) {
      if (!socket.rooms.has(`channel_${channelId}`)) return;
      socket.to(`channel_${channelId}`).emit('typing:start', payload);
    } else if (receiverId) {
      socket.to(String(receiverId)).emit('typing:start', payload);
    }
  });
  socket.on('typing:stop', ({ channelId, receiverId } = {}) => {
    if (!socket.user) return;
    const payload = { userId: socket.user._id, channelId, receiverId };
    if (channelId) {
      if (!socket.rooms.has(`channel_${channelId}`)) return;
      socket.to(`channel_${channelId}`).emit('typing:stop', payload);
    } else if (receiverId) {
      socket.to(String(receiverId)).emit('typing:stop', payload);
    }
  });

  // Join a hackathon presence room only if the user is a team member of that
  // hackathon (or a privileged organizer role). Prevents outsiders from
  // seeing/spoofing participant presence.
  socket.on('join_hackathon', async (hackathonId) => {
    try {
      if (!socket.user) return;
      const rawId = String(hackathonId ?? '');
      if (!rawId) return;
      const { resolveHackathonId } = await import('./utils/hackathonUtils.js');
      const hId = await resolveHackathonId(rawId);
      if (!hId) return;

      const PRIVILEGED = ['Founder', 'Faculty', 'Admin', 'Team Lead'];
      if (!PRIVILEGED.includes(socket.user.role)) {
        const HackathonTeam = (await import('./models/HackathonTeam.js')).default;
        const isMember = await HackathonTeam.exists({ hackathonId: hId, members: socket.user._id });
        if (!isMember) {
          return socket.emit('error', { message: 'Not authorized to join this hackathon room.' });
        }
      }

      socket.join(`hackathon_${rawId}`);
      socket.hackathonId = rawId;

      await redis.hset(`presence:hackathon:${rawId}`, socket.user._id.toString(), JSON.stringify({
        userId: socket.user._id,
        name: socket.user.name,
        socketId: socket.id,
      }));
      await broadcastPresence(rawId);
    } catch (err) {
      console.error('join_hackathon error:', err);
    }
  });

  socket.on('join_admin_proctor', (hackathonId) => {
    if (!socket.user) return;
    const allowedRoles = ['Founder', 'Faculty', 'Team Lead', 'Admin'];
    if (allowedRoles.includes(socket.user.role)) {
        socket.join(`admin_proctor_${String(hackathonId ?? '')}`);
    } else {
        socket.emit('error', { message: 'Unauthorized: insufficient role for proctor room' });
    }
  });

  const VALID_VIOLATION_TYPES = new Set(['TAB_SWITCH', 'FULLSCREEN_EXIT', 'MINIMIZE']);
  socket.on('proctor_violation', async (data) => {
    try {
      data = data || {};
      // Validate the client-supplied type against the known set; reject anything else.
      if (!VALID_VIOLATION_TYPES.has(data.type)) return;
      // Cap details length to prevent DB bloat via oversized payloads.
      const details = typeof data.details === 'string' ? data.details.slice(0, 500) : '';
      // Throttle: ignore violations arriving faster than one per 2s per socket, so
      // a malicious client cannot flood the DB or self-disqualify in a burst.
      const now = Date.now();
      if (socket._lastViolationAt && now - socket._lastViolationAt < 2000) return;
      socket._lastViolationAt = now;

      const { resolveHackathonId } = await import('./utils/hackathonUtils.js');
      const hId = await resolveHackathonId(data.hackathonId);
      if (!hId) return;

      // 1. Broadcast to Admin Panel for live monitoring
      io.to(`admin_proctor_${hId}`).emit('proctor_warning', {
        user: socket.user.name,
        userId: socket.user._id,
        timestamp: new Date(),
        type: data.type,
        details
      });

      // 2. Persist violation to HackathonTeam record
      const HackathonTeam = (await import('./models/HackathonTeam.js')).default;
      const team = await HackathonTeam.findOneAndUpdate(
        { 
          hackathonId: hId, 
          members: socket.user._id 
        },
        { $inc: { warnings: 1 } },
        { new: true }
      );

      if (team) {
        const ProctorViolation = (await import('./models/ProctorViolation.js')).default;
        await ProctorViolation.create({
          hackathonId: hId,
          teamId: team._id,
          userId: socket.user._id,
          type: data.type,
          details
        });
      }

      if (team && team.warnings >= 6) {
        team.isDisqualified = true;
        team.disqualificationReason = `Automatic disqualification: Security integrity breached (${team.warnings}/6 strikes recorded).`;
        await team.save();
        
        // Notify the user immediately via socket
        socket.emit('mission_terminated', { reason: team.disqualificationReason });
      }
    } catch (error) {
      console.error('Proctoring persistence failure:', error);
    }
  });

  socket.on('disconnect', async () => {
    if (socket.hackathonId && socket.user) {
      const hKey = `presence:hackathon:${socket.hackathonId}`;
      await redis.hdel(hKey, socket.user._id.toString());
      await broadcastPresence(socket.hackathonId);
      const remaining = await redis.hlen(hKey);
      if (remaining === 0) await redis.del(hKey);
    }
    if (socket.user && socket.user._id) {
      const wentOffline = await markOffline(socket.user._id, socket.id);
      if (wentOffline) {
        io.emit('presence:offline', { userId: socket.user._id.toString() });
      }
    }
  });
});

// Pass IO to routes via both req.io and app settings
app.set('io', io);
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Server-side logout — invalidate cached user so the token cannot be reused
// from the cache after sign-out.
app.post('/api/auth/logout', protect, async (req, res) => {
  try {
    const { cacheDelete } = await import('./utils/redis.js');
    if (cacheDelete) await cacheDelete(`user:${req.user._id}`);
    res.json({ message: 'Logged out' });
  } catch { res.json({ message: 'Logged out' }); }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/panel', (req, res, next) => {
  // Admin token is taken from the header only — never from the URL.
  req.adminToken = req.headers['x-admin-token'];
  next();
}, adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bounties', bountyRoutes);
app.use('/api/missions', missionRoutes);
app.use('/api/hackathons', hackathonRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/sa', saRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/forge', forgeRoutes);
app.use('/api/auth-security', authSecurityRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/messages', (req, res, next) => {
    req.io = io;
    next();
}, messageRoutes);
app.use('/api/channels', (req, res, next) => {
    req.io = io;
    next();
}, channelRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/competitions', competitionsRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/pulse', pulseRoutes);
app.use('/api/publishing', publishingRoutes);


// Secure static routing for document files globally
const __dirname = path.resolve();

// Gate sensitive proctor snapshots (webcam images) behind auth + admin.
// Two accepted credentials:
//   1. A normal admin session token in the Authorization header (API access).
//   2. A short-lived, purpose-scoped asset token in ?token= (so <img> tags can
//      load them). Session tokens are NOT accepted via the query string, so a
//      long-lived JWT can never leak through logs/history/Referer.
const ADMIN_ROLES = ['Founder', 'Faculty', 'Admin'];

// Mint a short-lived (5 min) asset-scoped token. Requires a valid admin session
// (Authorization header) — never itself takes a token in the URL.
app.get('/api/media/proctor-token', protect, async (req, res) => {
  if (!req.user || !ADMIN_ROLES.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden.' });
  }
  const token = jwt.sign(
    { id: req.user._id, purpose: 'proctor-asset' },
    process.env.JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '5m' }
  );
  res.json({ token });
});

app.use('/uploads/proctor', async (req, res, next) => {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;
    if (bearer) {
      // Header path: must be a normal admin session token (no purpose claim).
      const decoded = jwt.verify(bearer, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      if (decoded.purpose) return res.status(401).json({ message: 'Not authorized.' });
      const user = await User.findById(decoded.id).select('role');
      if (!user || !ADMIN_ROLES.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden.' });
      }
      return next();
    }
    // Query path: only a short-lived, purpose-scoped asset token is accepted.
    const qToken = req.query.token;
    if (!qToken) return res.status(401).json({ message: 'Not authorized.' });
    const decoded = jwt.verify(qToken, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (decoded.purpose !== 'proctor-asset') {
      return res.status(401).json({ message: 'Not authorized.' });
    }
    const user = await User.findById(decoded.id).select('role');
    if (!user || !ADMIN_ROLES.includes(user.role)) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    next();
  } catch {
    return res.status(401).json({ message: 'Not authorized.' });
  }
});

app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'VeritaBox Backend is running perfectly!' });
});

// Centralized error handler — logs full detail server-side, returns a generic
// message to clients in production so stack traces / internals never leak.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not allowed.' });
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: IS_PROD ? 'An unexpected error occurred.' : (err.message || 'Server error'),
  });
});

// Database connection logic
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox', {
  maxPoolSize: 20,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
})
  .then(async () => {
    console.log('✅ MongoDB Connected (pool: 5-20)');
    await seedDefaultChannels();
  })
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Matrix Server is live on network interface [0.0.0.0:${PORT}]`);
});
