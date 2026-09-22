import mongoose from 'mongoose';

/**
 * VeritaBoxPulse — Platform-wide announcements, events, offers, and updates.
 * Supports targeting by career goal, skill, course, learning level, or all users.
 */
const VeritaBoxPulseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['Event', 'Hackathon', 'Competition', 'Workshop', 'Offer', 'Opportunity', 'Announcement', 'Update'],
    default: 'Announcement'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  // Call-to-action link (optional)
  ctaLabel: { type: String },
  ctaUrl: { type: String },

  // Visibility window
  startDate: { type: Date, required: true, default: Date.now },
  endDate: { type: Date },  // null = no expiry
  isActive: { type: Boolean, default: true },

  // Targeting (null/empty = platform-wide)
  targetAudience: {
    type: String,
    enum: ['All', 'CareerGoal', 'Skill', 'Level', 'Custom'],
    default: 'All'
  },
  targetCareerGoals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CareerGoal' }],
  targetSkills: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Skill' }],
  targetLevels: [{ type: String, enum: ['Beginner', 'Intermediate', 'Advanced'] }],

  // Creator
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Index for fast active-announcement queries
VeritaBoxPulseSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
VeritaBoxPulseSchema.index({ targetCareerGoals: 1, isActive: 1 });
VeritaBoxPulseSchema.index({ targetSkills: 1, isActive: 1 });

export default mongoose.model('VeritaBoxPulse', VeritaBoxPulseSchema);
