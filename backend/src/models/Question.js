import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  hackathonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hackathon'
  },
  roundId: {
    type: mongoose.Schema.Types.ObjectId
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz'
  },
  topic: String,
  subtopic: String,
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  status: {
    type: String,
    enum: ['Draft', 'Published'],
    default: 'Published'
  },
  questionText: {
    type: String,
    required: true,
    maxlength: 2000
  },
  options: {
    type: [String],
    required: true,
    validate: [
      { validator: v => v.length >= 2, msg: 'Minimum 2 options required' },
      { validator: v => v.length <= 6, msg: 'Maximum 6 options allowed' }
    ]
  },
  correctAnswer: {
    type: String,
    required: true
  },
  explanation: String,
  points: {
    type: Number,
    default: 10,
    min: [1, 'Points must be at least 1']
  }
}, { timestamps: true });

// Normalize correctAnswer to lowercase+trimmed at save time for consistent matching
questionSchema.pre('save', function () {
  if (this.isModified('correctAnswer')) {
    this.correctAnswer = this.correctAnswer.trim().toLowerCase();
  }
  if (this.isModified('options')) {
    this.options = this.options.map(o => o.trim());
  }
});

// Validate correctAnswer is one of the provided options (case-insensitive)
questionSchema.pre('validate', function () {
  if (this.correctAnswer && this.options?.length) {
    const normalizedOptions = this.options.map(o => o.trim().toLowerCase());
    const normalizedAnswer = this.correctAnswer.trim().toLowerCase();
    if (!normalizedOptions.includes(normalizedAnswer)) {
      this.invalidate('correctAnswer', 'correctAnswer must be one of the provided options');
    }
  }
});

// Index for fast round-based queries
questionSchema.index({ hackathonId: 1, roundId: 1 });

const Question = mongoose.model('Question', questionSchema);
export default Question;
