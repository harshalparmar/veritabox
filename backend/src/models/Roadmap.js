import mongoose from 'mongoose';

// ──────────────────────────────────────────────
// Sub-schemas (leaf → parent order)
// ──────────────────────────────────────────────

const RoadmapTopicSchema = new mongoose.Schema({
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningContent'
  },
  title: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['Theory', 'Quiz', 'Practical', 'Project', 'Milestone', 'Diagnostic'],
    default: 'Theory'
  },
  status: {
    type: String,
    enum: ['Locked', 'Available', 'InProgress', 'Completed', 'Skipped'],
    default: 'Locked'
  },
  estimatedMinutes: { type: Number, default: 30 },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  // AI scheduling
  scheduledDate: { type: Date },
  completedAt: { type: Date },
  // Score if quiz/assessment
  score: { type: Number },
  passed: { type: Boolean },
  // Order within module
  order: { type: Number, default: 0 }
});

const RoadmapModuleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  skillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
  status: {
    type: String,
    enum: ['Locked', 'Active', 'Completed'],
    default: 'Locked'
  },
  topics: [RoadmapTopicSchema],
  order: { type: Number, default: 0 },
  estimatedHours: { type: Number, default: 5 }
});

const RoadmapPhaseSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['Locked', 'Active', 'Completed'],
    default: 'Locked'
  },
  modules: [RoadmapModuleSchema],
  order: { type: Number, default: 0 },
  // Milestone info
  milestoneTitle: { type: String },
  milestoneDescription: { type: String }
});

// ──────────────────────────────────────────────
// Main Roadmap Schema
// ──────────────────────────────────────────────

const RoadmapSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  careerGoal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CareerGoal'
  },
  careerGoalTitle: { type: String, trim: true }, // denormalized for display

  // Personalization context snapshot (saved at generation time)
  generationContext: {
    level: String,
    selfReportedSkills: [String],
    verifiedSkills: [String],
    dailyMinutes: Number,
    daysPerWeek: Number,
    targetDurationDays: Number,
    diagnosticScores: mongoose.Schema.Types.Mixed
  },

  phases: [RoadmapPhaseSchema],

  // Current position pointers
  activePhaseIndex: { type: Number, default: 0 },
  activeModuleIndex: { type: Number, default: 0 },

  // Overall progress
  totalTopics: { type: Number, default: 0 },
  completedTopics: { type: Number, default: 0 },
  progressPercentage: { type: Number, default: 0 },

  // Completion
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },

  // Generation metadata
  generatedBy: {
    type: String,
    enum: ['ai', 'fallback', 'admin', 'legacy'],
    default: 'ai'
  },
  lastAdaptedAt: { type: Date },
  generationVersion: { type: Number, default: 1 },

  // Estimated completion date
  estimatedCompletionDate: { type: Date }
}, { timestamps: true });



export default mongoose.model('Roadmap', RoadmapSchema);
