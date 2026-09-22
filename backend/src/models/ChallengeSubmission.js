import mongoose from 'mongoose';

const challengeSubmissionSchema = new mongoose.Schema({
  challengeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Pending'],
    default: 'Pending'
  },
  runtime: Number, // in ms
  memory: Number, // in KB
  testCaseResults: [{
    caseIndex: Number,
    status: String,
    message: String
  }],
  hackathonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hackathon'
  },
  roundNumber: Number,
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HackathonTeam'
  }
}, { timestamps: true });

challengeSubmissionSchema.index(
  { hackathonId: 1, teamId: 1, challengeId: 1 },
  { sparse: true }
);

const ChallengeSubmission = mongoose.model('ChallengeSubmission', challengeSubmissionSchema);
export default ChallengeSubmission;
