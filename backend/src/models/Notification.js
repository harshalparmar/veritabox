import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['bounty_assigned', 'bounty_resolved', 'bounty_submitted', 'bounty_submission_reviewed',
           'hackathon_approved', 'hackathon_registration',
           'workshop_enrollment', 'workshop_attendance_xp',
           'xp_earned', 'article_published',
           'connection_request', 'connection_accepted',
           'chapter_application', 'chapter_approved', 'chapter_rejected',
           'mention', 'direct_message',
           'learning_milestone', 'streak_milestone', 'quiz_passed', 'phase_completed', 'roadmap_completed',
           'system'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
