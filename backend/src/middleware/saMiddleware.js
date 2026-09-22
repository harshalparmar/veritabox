import jwt from 'jsonwebtoken';
import SuperAdmin from '../models/SuperAdmin.js';
import SAAuditLog from '../models/SAAuditLog.js';

/**
 * protectSA — Middleware to secure the Shadow Layer.
 * Verifies SA_JWT_SECRET and checks against the super_admins collection.
 */
export const protectSA = async (req, res, next) => {
  let token;

  // discovery protection: if IP is not in allowlist, return 404
  // (In production, process.env.SA_IP_ALLOWLIST would be used)
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.SA_JWT_SECRET);

      req.sa = await SuperAdmin.findById(decoded.id).select('-password');
      
      if (!req.sa || req.sa.isLocked) {
         // Discovery protection: return 404 even if token exists but account is locked/deleted
         return res.status(404).json({ message: 'Not Found' });
      }

      next();
    } catch (error) {
      // Discovery protection: return 404 for invalid tokens
      res.status(404).json({ message: 'Not Found' });
    }
  }

  if (!token) {
    res.status(404).json({ message: 'Not Found' });
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
    next(); // Don't block the request if auditing fails, but log it
  }
};
