// Minimal in-memory rate limiter (per IP + route). No external deps.
// For multi-instance deployments swap for a Redis-backed limiter.
const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 10, message = 'Too many attempts. Try again later.' } = {}) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.set('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      return res.status(429).json({ message });
    }
    next();
  };
}

// Periodic cleanup so the map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (now > v.resetAt) buckets.delete(k);
}, 5 * 60_000).unref();
