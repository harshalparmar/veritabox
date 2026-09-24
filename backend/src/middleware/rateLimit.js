import { getRedis } from '../utils/redis.js';

export function rateLimit({ windowMs = 60_000, max = 10, message = 'Too many attempts. Try again later.' } = {}) {
  const windowSec = Math.ceil(windowMs / 1000);

  return async (req, res, next) => {
    const key = `rl:${req.ip}:${req.baseUrl}${req.path}`;
    try {
      const redis = getRedis();
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSec);
      }
      if (count > max) {
        const ttl = await redis.ttl(key);
        res.set('Retry-After', String(ttl > 0 ? ttl : windowSec));
        return res.status(429).json({ message });
      }
      next();
    } catch {
      return res.status(503).json({ message: 'Service temporarily unavailable' });
    }
  };
}

export function accountRateLimiter(prefix, max, windowSec) {
  return async (req, res, next) => {
    const identifier = req.body?.email || req.body?.userId || 'anon';
    const key = `${prefix}:${req.ip}:${identifier}`;
    try {
      const redis = getRedis();
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, windowSec);
      }
      if (count > max) {
        const ttl = await redis.ttl(key);
        res.set('Retry-After', String(ttl > 0 ? ttl : windowSec));
        return res.status(429).json({ message: 'Too many attempts. Try again later.' });
      }
      return next();
    } catch {
      return res.status(503).json({ message: 'Service temporarily unavailable' });
    }
  };
}
