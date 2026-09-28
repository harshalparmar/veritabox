import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { cacheGet, cacheSet, cacheDelete } from '../utils/redis.js';

async function resolveUser(id) {
  const cacheKey = `user:${id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  let user = await User.findById(id).select('-password').lean();
  if (!user) {
    user = await Admin.findById(id).select('-password').lean();
  }
  if (user) {
    await cacheSet(cacheKey, user, 60);
  }
  return user;
}

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

      // Purpose-scoped tokens (e.g. short-lived asset tokens) are NOT session
      // credentials and must never authenticate an API request.
      if (decoded.purpose) {
        return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      req.user = await resolveUser(decoded.id);

      if (!req.user) {
         return res.status(401).json({ message: 'Not authorized, token failed' });
      }

      // Reject tokens issued before the user's last password change so a
      // reset/change revokes every previously issued session token. A small
      // skew avoids logging out the token freshly minted by the reset itself.
      if (req.user.passwordChangedAt && decoded.iat) {
        const changedAtSec = Math.floor(new Date(req.user.passwordChangedAt).getTime() / 1000);
        if (decoded.iat < changedAtSec - 5) {
          return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }
      }

      if (req.user.isSuspended) {
         return res.status(403).json({ message: 'This operative account has been suspended by network command.' });
      }

      return next();

    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const isAdmin = (req, res, next) => {
  const allowedRoles = ['Admin'];

  if (req.user && allowedRoles.includes(req.user.role)) {
    return next();
  } else {
    return res.status(403).json({ message: 'Forbidden. You do not have clearance to access this terminal.' });
  }
};

export const optionalProtect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      // Ignore purpose-scoped (non-session) tokens on optional-auth routes.
      if (decoded.purpose) return next();
      req.user = await resolveUser(decoded.id);
      return next();
    } catch (error) {
      return next();
    }
  } else {
    return next();
  }
};

export const authorize = (...roles) => (req, res, next) => {
  if (req.user && roles.includes(req.user.role)) {
    return next();
  } else {
    return res.status(403).json({ message: 'Forbidden. Role not authorized.' });
  }
};

export async function invalidateUserCache(userId) {
  await cacheDelete(`user:${userId}`);
}
