import Redis from 'ioredis';

let client = null;

export function getRedis() {
  if (!client) {
    if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
      throw new Error('[Redis] REDIS_URL must be set in production');
    }
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379/0';
    client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });

    client.on('connect', () => console.log('[Redis] Connected'));
    client.on('error', (err) => console.error('[Redis] Error:', err.message));
    client.on('reconnecting', (ms) => console.log(`[Redis] Reconnecting in ${ms}ms`));

    client.connect().catch((err) => {
      console.error('[Redis] Initial connection failed:', err.message);
    });
  }
  return client;
}

export async function cacheGet(key) {
  try {
    const val = await getRedis().get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds = 60) {
  try {
    await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // degrade silently
  }
}

export async function cacheDelete(key) {
  try {
    await getRedis().del(key);
  } catch {
    // degrade silently
  }
}

export async function invalidateUserCache(userId) {
  await cacheDelete(`user:${userId}`);
}
