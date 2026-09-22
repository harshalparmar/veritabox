import mongoose from 'mongoose';

const LearningActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventType: {
    type: String,
    enum: [
      'theory_viewed',
      'theory_completed',
      'quiz_started',
      'quiz_submitted',
      'quiz_passed',
      'quiz_failed',
      'practical_submitted',
      'practical_verified',
      'diagnostic_started',
      'diagnostic_completed',
      'skill_verified',
      'roadmap_generated',
      'roadmap_adapted',
      'checklist_completed',
      'milestone_reached'
    ],
    required: true
  },
  // References
  roadmap: { type: mongoose.Schema.Types.ObjectId, ref: 'Roadmap' },
  content: { type: mongoose.Schema.Types.ObjectId, ref: 'LearningContent' },
  skill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  // Metadata (score, duration, etc.)
  metadata: {
    score: Number,
    durationMinutes: Number,
    phase: String,
    module: String,
    topic: String,
    passed: Boolean,
    attemptNumber: Number
  }
}, { timestamps: true });

LearningActivitySchema.index({ user: 1, createdAt: -1 });
LearningActivitySchema.index({ user: 1, eventType: 1 });

export default mongoose.model('LearningActivity', LearningActivitySchema);
