import crypto from 'crypto';

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Constant-time string comparison — avoids leaking match progress via timing.
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Returns { locked: true, retryAfterMs } if the account is currently locked out.
export function isOtpLocked(user) {
  if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
    return { locked: true, retryAfterMs: user.otpLockedUntil - new Date() };
  }
  return { locked: false };
}

// Record a failed OTP attempt; locks the account after MAX_ATTEMPTS.
// Caller is responsible for persisting (await user.save()).
export function registerOtpFailure(user) {
  user.otpAttempts = (user.otpAttempts || 0) + 1;
  if (user.otpAttempts >= MAX_ATTEMPTS) {
    user.otpLockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    user.otpAttempts = 0;
    return { lockedNow: true };
  }
  return { lockedNow: false, remaining: MAX_ATTEMPTS - user.otpAttempts };
}

// Clear counters after a successful verification.
export function clearOtpFailures(user) {
  user.otpAttempts = 0;
  user.otpLockedUntil = null;
}

export const OTP_LOCK_MINUTES = LOCK_MINUTES;
