import mongoose from 'mongoose';

const QuizAnswerSchema = new mongoose.Schema({
  questionIndex: { type: Number, required: true },
  selectedAnswer: { type: String },
  selectedAnswers: [{ type: String }],
  isCorrect: { type: Boolean },
  points: { type: Number, default: 0 }
});

const QuizAttemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningContent'
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  attemptNumber: { type: Number, default: 1 },
  answers: [QuizAnswerSchema],
  totalScore: { type: Number, default: 0 },
  maxScore: { type: Number, default: 0 },
  percentageScore: { type: Number, default: 0 },
  passed: { type: Boolean, default: false },
  // Questions snapshot (for record keeping; so we don't rely on content changing)
  questionsSnapshot: [{
    questionText: String,
    options: [String],
    correctAnswer: String,
    correctAnswers: [String],
    explanation: String,
    points: Number
  }],
  completedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for fast lookup and attempt counting
QuizAttemptSchema.index({ user: 1, content: 1 });
QuizAttemptSchema.index({ user: 1, content: 1, attemptNumber: 1 }, { unique: true });

export default mongoose.model('QuizAttempt', QuizAttemptSchema);
