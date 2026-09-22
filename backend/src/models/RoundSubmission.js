import mongoose from 'mongoose';

const roundSubmissionSchema = new mongoose.Schema({
  hackathonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hackathon',
    required: true
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HackathonTeam',
    required: true
  },
  roundNumber: {
    type: Number,
    required: true
  },
  attemptNumber: {
    type: Number,
    default: 1
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fields: {
    type: Map,
    of: String
  },
  files: [String],
  status: {
    type: String,
    enum: ['Submitted', 'Under Review', 'Scored', 'Rejected'],
    default: 'Submitted'
  },
  score: Number,
  feedback: String,
  scoredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  scoredAt: Date,
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

roundSubmissionSchema.index(
  { hackathonId: 1, teamId: 1, roundNumber: 1, attemptNumber: 1 },
  { unique: true }
);

export default mongoose.model('RoundSubmission', roundSubmissionSchema);
