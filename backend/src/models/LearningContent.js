import mongoose from 'mongoose';

// Resource sub-schema
const ResourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ['Article', 'Video', 'Documentation', 'Book', 'GitHub', 'Practice', 'Research'],
    default: 'Article'
  },
  url: { type: String, required: true, trim: true },
  source: { type: String, trim: true },
  description: { type: String, trim: true },
  isFree: { type: Boolean, default: true }
});

// Quiz question sub-schema (embedded for quick access)
const QuizQuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  type: {
    type: String,
    enum: ['MCQ', 'TrueFalse', 'MultiSelect', 'OutputBased', 'Conceptual'],
    default: 'MCQ'
  },
  options: [{ type: String }],
  correctAnswer: { type: String },           // for MCQ / TrueFalse
  correctAnswers: [{ type: String }],         // for MultiSelect
  explanation: { type: String },
  points: { type: Number, default: 10 },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  }
});

// Practice task sub-schema
const PracticeTaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  submissionType: {
    type: String,
    enum: ['Text', 'Code', 'URL', 'File', 'Explanation'],
    default: 'Text'
  },
  language: { type: String },           // for code tasks
  starterCode: { type: String },
  expectedOutput: { type: String },
  hints: [{ type: String }],
  estimatedMinutes: { type: Number, default: 30 },
  requiresVerification: { type: Boolean, default: true }
});

const LearningContentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },

  // Association
  skill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', required: true },
  careerGoals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CareerGoal' }],

  // Topic metadata
  description: { type: String, trim: true },
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  estimatedMinutes: { type: Number, default: 60 },
  order: { type: Number, default: 0 },

  // Prerequisites (other LearningContent items)
  prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'LearningContent' }],

  // Theory content — stored as markdown
  theoryContent: { type: String, default: '' },
  // Core concept summary
  conceptSummary: { type: String },
  // Common mistakes and best practices
  commonMistakes: [{ type: String }],
  bestPractices: [{ type: String }],

  // Mini quiz questions (embedded for fast access)
  quizQuestions: [QuizQuestionSchema],
  // Minimum quiz score to mark quiz as passed (percentage 0-100)
  quizPassScore: { type: Number, default: 60 },
  // Maximum quiz attempts before cooldown
  maxQuizAttempts: { type: Number, default: 3 },

  // Practice task
  practiceTask: PracticeTaskSchema,

  // Resources
  resources: [ResourceSchema],

  // Content flags
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Archived'],
    default: 'Draft'
  },
  isDiagnosticEligible: {
    type: Boolean,
    default: true   // can be used in diagnostic assessments
  },
  tags: [{ type: String, trim: true }]
}, { timestamps: true });

LearningContentSchema.index({ skill: 1, status: 1, order: 1 });
LearningContentSchema.index({ careerGoals: 1, difficulty: 1, status: 1 });

export default mongoose.model('LearningContent', LearningContentSchema);
