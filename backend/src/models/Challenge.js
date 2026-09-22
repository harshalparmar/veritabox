import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  difficulty: {
    type: String,
    enum: ['Rookie', 'Operative', 'Elite'],
    default: 'Operative'
  },
  tags: [{
    type: String
  }],
  problemStatement: {
    type: String,
    required: true
  },
  constraints: {
    type: String
  },
  exampleInput: {
    type: String
  },
  exampleOutput: {
    type: String
  },
  testCases: [{
    input: String,
    output: String,
    isHidden: { type: Boolean, default: true }
  }],
  reputationReward: {
    type: Number,
    default: 50
  },
  acceptanceRate: {
    type: Number,
    default: 0
  },
  totalSolved: {
    type: Number,
    default: 0
  },
  activeFrom: {
    type: Date
  }
}, { timestamps: true });

const Challenge = mongoose.model('Challenge', challengeSchema);
export default Challenge;
