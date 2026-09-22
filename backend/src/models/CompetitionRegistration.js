import mongoose from 'mongoose';

const abstractSchema = new mongoose.Schema({
  content: {
    type: String
  },
  pdfUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Selected', 'Rejected'],
    default: 'Pending'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  rubricScores: [{
    criteriaName: { type: String, required: true },
    score: { type: Number, required: true },
    comment: String
  }],
  totalScore: {
    type: Number,
    default: 0
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  }
});

const competitionRegistrationSchema = new mongoose.Schema({
  competitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Competition',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participationType: {
    type: String,
    enum: ['Individual', 'Squadron'],
    required: true
  },
  squadronId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CompetitionSquadron'
  },
  abstract: abstractSchema
}, {
  timestamps: true
});

// Ensure a user only registers once per competition
competitionRegistrationSchema.index({ competitionId: 1, userId: 1 }, { unique: true });

export default mongoose.model('CompetitionRegistration', competitionRegistrationSchema);
