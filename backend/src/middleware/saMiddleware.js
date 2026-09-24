import jwt from 'jsonwebtoken';
import SuperAdmin from '../models/SuperAdmin.js';
import SAAuditLog from '../models/SAAuditLog.js';

/**
 * protectSA — Middleware to secure the Shadow Layer.
 * Verifies SA_JWT_SECRET and checks against the super_admins collection.
 */
export const protectSA = async (req, res, next) => {
  // IP allowlist check
  if (process.env.SA_IP_ALLOWLIST) {
    const allowed = process.env.SA_IP_ALLOWLIST.split(',').map(ip => ip.trim());
    if (!allowed.includes(req.ip)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.SA_JWT_SECRET);

      req.sa = await SuperAdmin.findById(decoded.id).select('-password');

      if (!req.sa || req.sa.isLocked) {
         return res.status(404).json({ message: 'Not Found' });
      }

      return next();
    } catch (error) {
      return res.status(404).json({ message: 'Not Found' });
    }
  }

  if (!token) {
    return res.status(404).json({ message: 'Not Found' });
  }
};

/**
 * saAudit — Middleware to log SuperAdmin actions to the immutable audit trail.
 */
const SENSITIVE_KEYS = new Set(['password', 'newPassword', 'oldPassword', 'token', 'totp', 'otp', 'secret', 'totpSecret']);
function redact(body) {
  if (!body || typeof body !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(body)) {
    out[k] = SENSITIVE_KEYS.has(k) ? '[REDACTED]' : v;
  }
  return out;
}

export const saAudit = (action) => async (req, res, next) => {
  try {
    await SAAuditLog.create({
      saId: req.sa._id,
      action,
      endpoint: req.originalUrl,
      method: req.method,
      payload: req.method === 'POST' || req.method === 'PATCH' ? redact(req.body) : undefined,
      ipAddress: req.ip || req.connection.remoteAddress,
      isGhostAction: !!req.headers['x-veritabox-ghost']
    });
    next();
  } catch (error) {
    console.error('Audit Log Error:', error);
    return res.status(500).json({ message: 'Internal server error: audit logging failed' });
  }
};
