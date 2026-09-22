import mongoose from 'mongoose';

const ChecklistItemSchema = new mongoose.Schema({
  // Reference to roadmap topic
  topicRef: {
    phaseIndex: { type: Number },
    moduleIndex: { type: Number },
    topicIndex: { type: Number }
  },
  // Reference to LearningContent
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningContent'
  },
  title: { type: String, required: true },
  taskType: {
    type: String,
    enum: ['Theory', 'Quiz', 'Practical', 'Diagnostic', 'Project', 'Milestone', 'Review'],
    default: 'Theory'
  },
  // Context breadcrumb
  phase: { type: String },
  module: { type: String },
  topic: { type: String },
  // Scheduling
  estimatedMinutes: { type: Number, default: 30 },
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  dueDate: { type: Date },
  // Status
  status: {
    type: String,
    enum: ['Locked', 'Available', 'InProgress', 'Completed', 'Overdue', 'Skipped'],
    default: 'Available'
  },
  // Carry-forward tracking
  isCarriedForward: { type: Boolean, default: false },
  carriedFromDate: { type: Date },
  originalDate: { type: Date },
  // Completion tracking
  startedAt: { type: Date },
  completedAt: { type: Date },
  actualMinutes: { type: Number },
  // Linked resources for verification
  linkedChallengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }
});

const DailyChecklistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roadmap: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Roadmap'
  },
  date: {
    type: Date,
    required: true
  },
  // Normalized date key for idempotent lookup (YYYY-MM-DD)
  dateKey: {
    type: String,
    required: true
  },
  items: [ChecklistItemSchema],
  // Stats
  totalMinutes: { type: Number, default: 0 },
  completedMinutes: { type: Number, default: 0 },
  streakCount: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date }
}, { timestamps: true });

// Unique constraint: one checklist per user per day
DailyChecklistSchema.index({ user: 1, dateKey: 1 }, { unique: true });
DailyChecklistSchema.index({ user: 1, date: -1 });

export default mongoose.model('DailyChecklist', DailyChecklistSchema);
