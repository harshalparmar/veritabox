import mongoose from 'mongoose';

// Full list of skill status values (no arbitrary percentages)
const SKILL_STATUS = ['Not Started', 'Self-Reported', 'Assessment Started', 'Partially Verified', 'Verified', 'Proficient', 'Mastered', 'Needs Learning'];

const SkillEvaluationSchema = new mongoose.Schema({
  skillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill'
  },
  skillName: {
    type: String,
    required: true,
    trim: true
  },
  // Real score from actual assessment (0-100), NOT arbitrary default
  proficiency: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  status: {
    type: String,
    enum: SKILL_STATUS,
    default: 'Not Started'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastEvaluated: {
    type: Date,
    default: Date.now
  },
  // Evidence: linked assessment, quiz, or practical
  verifiedBy: {
    type: String,
    enum: ['Diagnostic', 'Quiz', 'Practical', 'Admin', 'None'],
    default: 'None'
  },
  verificationRef: {
    type: mongoose.Schema.Types.ObjectId  // ref to DiagnosticAssessment or QuizAttempt
  },
  dateAcquired: { type: Date },
  history: [{
    score: Number,
    status: String,
    date: { type: Date, default: Date.now },
    sourceType: String,   // 'Diagnostic', 'Quiz', 'Practical'
    sourceId: mongoose.Schema.Types.ObjectId
  }]
});

const ProgressRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Calculated from actual completed topics, NOT sent from frontend
  overallCompletionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Skill progression
  skills: [SkillEvaluationSchema],
  // Learning stats
  assessmentsCompleted: { type: Number, default: 0 },
  quizzesPassed: { type: Number, default: 0 },
  practicalTasksCompleted: { type: Number, default: 0 },
  theoryTopicsCompleted: { type: Number, default: 0 },
  totalLearningMinutes: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActivityDate: { type: Date },
  // Current position in roadmap
  currentPhase: { type: String },
  currentModule: { type: String },
  currentTopic: { type: String },
  // Daily stats (rolling 30-day window)
  dailyStats: [{
    date: { type: Date, required: true },
    dateKey: { type: String },  // YYYY-MM-DD
    tasksAssigned: { type: Number, default: 0 },
    tasksCompleted: { type: Number, default: 0 },
    theoryCompleted: { type: Number, default: 0 },
    quizzesCompleted: { type: Number, default: 0 },
    practicalsCompleted: { type: Number, default: 0 },
    learningTimeMinutes: { type: Number, default: 0 },
    quizScoreAvg: { type: Number, default: 0 }
  }]
}, { timestamps: true });



export default mongoose.model('ProgressRecord', ProgressRecordSchema);
