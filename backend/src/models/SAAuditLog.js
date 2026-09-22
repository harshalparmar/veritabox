import mongoose from 'mongoose';

const saAuditLogSchema = new mongoose.Schema({
  saId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperAdmin',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  endpoint: String,
  method: String,
  payload: mongoose.Schema.Types.Mixed,
  ipAddress: String,
  isGhostAction: {
    type: Boolean,
    default: false
  }
}, { 
  timestamps: true,
  collection: 'sa_audit_logs'
});

// Audit logs are conceptually immutable - we don't provide update/delete hooks.
export default mongoose.model('SAAuditLog', saAuditLogSchema);
