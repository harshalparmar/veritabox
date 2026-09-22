import mongoose from 'mongoose';

const DiagnosticAnswerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  questionText: { type: String },
  selectedAnswer: { type: String },
  selectedAnswers: [{ type: String }],  // for MultiSelect
  isCorrect: { type: Boolean },
  points: { type: Number, default: 0 },
  maxPoints: { type: Number, default: 10 }
});

const DiagnosticAssessmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skill: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill',
    required: true
  },
  // Snapshot of questions used for this assessment
  questionsSnapshot: [{
    questionText: String,
    type: String,
    options: [String],
    correctAnswer: String,
    correctAnswers: [String],
    explanation: String,
    points: Number
  }],
  answers: [DiagnosticAnswerSchema],
  totalScore: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  percentageScore: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['Pending', 'InProgress', 'Completed', 'Expired'],
    default: 'Pending'
  },
  // Result classification
  result: {
    type: String,
    enum: ['NotAssessed', 'NeedsLearning', 'PartiallyVerified', 'Verified', 'Proficient'],
    default: 'NotAssessed'
  },
  startedAt: { type: Date },
  completedAt: { type: Date },
  expiresAt: { type: Date },   // assessments expire after 24h if not completed
}, { timestamps: true });

DiagnosticAssessmentSchema.index({ user: 1, skill: 1 });
DiagnosticAssessmentSchema.index({ user: 1, status: 1 });

export default mongoose.model('DiagnosticAssessment', DiagnosticAssessmentSchema);
