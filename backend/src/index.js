import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import { protect, isAdmin } from './middleware/authMiddleware.js';
import { mongoSanitize } from './middleware/sanitize.js';

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
  if (!ALLOWED_ORIGINS) return cb(null, true); // dev: reflect
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
  // CSP is enforced by the frontend host; disable here to avoid breaking API responses
  contentSecurityPolicy: false,
}));
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(mongoSanitize);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: corsOrigin, credentials: true } });

// JWT Socket Middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('Unauthorized'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication Error'));
  }
});

// In-memory hackathon presence: { hackathonId: Map<userId, { name, socketId }> }
const hackathonPresence = new Map();

// Global user presence: userId -> Set<socketId>
const globalPresence = new Map();

function markOnline(userId, socketId) {
  const key = userId.toString();
  if (!globalPresence.has(key)) globalPresence.set(key, new Set());
  const wasEmpty = globalPresence.get(key).size === 0;
  globalPresence.get(key).add(socketId);
  return wasEmpty;
}

function markOffline(userId, socketId) {
  const key = userId.toString();
  const set = globalPresence.get(key);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    globalPresence.delete(key);
    return true;
  }
  return false;
}

export function getOnlineUserIds() {
  return [...globalPresence.keys()];
}

function broadcastPresence(hackathonId) {
  const members = hackathonPresence.get(hackathonId);
  if (!members) return;
  const list = [...members.values()];
  io.to(`hackathon_${hackathonId}`).emit('presence_update', { hackathonId, online: list });
}

// Socket Protocol Sub-engine
io.on('connection', (socket) => {
  // Join their own user ID room for direct message updates
  if (socket.user && socket.user._id) {
    socket.join(socket.user._id.toString());
    const wentOnline = markOnline(socket.user._id, socket.id);
    if (wentOnline) {
      io.emit('presence:online', { userId: socket.user._id.toString() });
    }
    // Ship current presence snapshot to the newly connected client
    socket.emit('presence:snapshot', { online: getOnlineUserIds() });
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

      // Keep the client-provided identifier as the room key so presence events
      // match what the client subscribed with.
      socket.join(`hackathon_${rawId}`);
      socket.hackathonId = rawId;

      if (!hackathonPresence.has(rawId)) hackathonPresence.set(rawId, new Map());
      hackathonPresence.get(rawId).set(socket.user._id.toString(), {
        userId: socket.user._id,
        name: socket.user.name,
        socketId: socket.id,
      });
      broadcastPresence(rawId);
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

  socket.on('proctor_violation', async (data) => {
    try {
      const { resolveHackathonId } = await import('./utils/hackathonUtils.js');
      const hId = await resolveHackathonId(data.hackathonId);
      if (!hId) return;

      // 1. Broadcast to Admin Panel for live monitoring
      io.to(`admin_proctor_${hId}`).emit('proctor_warning', {
        user: socket.user.name,
        userId: socket.user._id,
        timestamp: new Date(),
        type: data.type,
        details: data.details
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
          details: data.details || ''
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

  socket.on('disconnect', () => {
    if (socket.hackathonId) {
      const members = hackathonPresence.get(socket.hackathonId);
      if (members) {
        members.delete(socket.user._id.toString());
        broadcastPresence(socket.hackathonId);
        if (members.size === 0) hackathonPresence.delete(socket.hackathonId);
      }
    }
    if (socket.user && socket.user._id) {
      const wentOffline = markOffline(socket.user._id, socket.id);
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/roadmaps', roadmapRoutes);
app.use('/api/checklist', checklistRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/panel/:adminToken', adminRoutes);
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
// Accepts JWT via Authorization header OR ?token= (so <img> tags can load them).
const ADMIN_ROLES = ['Founder', 'Faculty', 'Admin'];
app.use('/uploads/proctor', async (req, res, next) => {
  try {
    const bearer = req.headers.authorization?.startsWith('Bearer')
      ? req.headers.authorization.split(' ')[1]
      : null;
    const token = bearer || req.query.token;
    if (!token) return res.status(401).json({ message: 'Not authorized.' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox')
  .then(async () => {
    console.log('✅ MongoDB Connected');
    await seedDefaultChannels();
  })
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Matrix Server is live on network interface [0.0.0.0:${PORT}]`);
});
