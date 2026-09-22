import mongoose from 'mongoose';

const userProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hackathonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hackathon',
    required: true
  },
  roundId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  // Stable question order for this user's session (seeded shuffle)
  questionOrder: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  // Draft answers: array of { questionId, selectedOption }
  draftAnswers: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    selectedOption: String
  }],
  lastViewedIndex: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// One progress record per user per hackathon per round
userProgressSchema.index({ userId: 1, hackathonId: 1, roundId: 1 }, { unique: true });

const UserProgress = mongoose.model('UserProgress', userProgressSchema);
export default UserProgress;
