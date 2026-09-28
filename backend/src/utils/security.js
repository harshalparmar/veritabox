import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Legacy static salt used by ciphertext written before per-value salts were
// introduced. Retained ONLY so old values can still be decrypted.
const LEGACY_SALT = 'salt';

// OTPs live in a tiny keyspace (6 digits => 900k values), so a bare SHA-256
// digest is trivially reversible with a precomputed table. Keying the digest
// with a server-side secret makes the stored hash useless without that secret.
const OTP_HMAC_KEY = process.env.OTP_HMAC_SECRET || process.env.JWT_SECRET || '';

export function hashOtp(otp) {
  if (OTP_HMAC_KEY) {
    return crypto.createHmac('sha256', OTP_HMAC_KEY).update(String(otp)).digest('hex');
  }
  // No key available (should never happen in a booted server): fall back to a
  // plain digest rather than crashing OTP flows.
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

// Escape regex metacharacters so user input can be used safely inside a
// RegExp / $regex query without enabling ReDoS or altering query semantics.
export function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function htmlEscape(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizeUserContent(dirty) {
  if (typeof dirty !== 'string') return '';
  return sanitizeHtml(dirty, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'pre', 'code', 'span']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      code: ['class'],
      span: ['class'],
      pre: ['class'],
      img: ['src', 'alt', 'width', 'height'],
    },
    allowedSchemes: ['http', 'https'],
  });
}

export function encrypt(text) {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY env var is required');
  // Derive a fresh key per value with a random salt so identical plaintext and
  // key never produce the same derived key across deployments/values.
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag}:${encrypted}`;
}

export function decrypt(encryptedText) {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY env var is required');
  const parts = String(encryptedText).split(':');
  let saltBuf, ivHex, tagHex, encrypted;
  if (parts.length === 4) {
    // New format: salt:iv:tag:ciphertext
    saltBuf = Buffer.from(parts[0], 'hex');
    [, ivHex, tagHex, encrypted] = parts;
  } else if (parts.length === 3) {
    // Legacy format written with the static salt.
    saltBuf = LEGACY_SALT;
    [ivHex, tagHex, encrypted] = parts;
  } else {
    throw new Error('Malformed ciphertext');
  }
  const key = crypto.scryptSync(ENCRYPTION_KEY, saltBuf, 32);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function generateSecureCode(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  // Rejection sampling to avoid modulo bias: discard bytes that fall in the
  // partial final bucket so every character is equally likely.
  const limit = 256 - (256 % chars.length);
  let result = '';
  while (result.length < length) {
    const bytes = crypto.randomBytes(length - result.length);
    for (let i = 0; i < bytes.length && result.length < length; i++) {
      if (bytes[i] < limit) {
        result += chars[bytes[i] % chars.length];
      }
    }
  }
  return result;
}
