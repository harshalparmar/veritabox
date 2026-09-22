import mongoose from 'mongoose';

/**
 * Tracks individual user registration per hackathon.
 * Used alongside HackathonTeam (team-level) for per-user violation and status tracking.
 */
const hackathonRegistrationSchema = new mongoose.Schema({
  hackathon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hackathon',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Reference to the team this user joined
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HackathonTeam',
    default: null
  },
  teamName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['registered', 'participating', 'submitted', 'disqualified', 'flagged'],
    default: 'registered'
  },
  violationCount: {
    type: Number,
    default: 0
  },
  violationLogs: [{
    type: {
      type: String,
      enum: ['tab-blur', 'fullscreen-exit', 'dev-tools', 'minimize', 'copy-paste', 'speed-flag']
    },
    timestamp: { type: Date, default: Date.now },
    details: String
  }],
  totalScore: {
    type: Number,
    default: 0
  },
  rank: {
    type: Number,
    min: 1,
    default: null
  }
}, { timestamps: true });

// One registration per user per hackathon
hackathonRegistrationSchema.index({ hackathon: 1, user: 1 }, { unique: true });

const HackathonRegistration = mongoose.model('HackathonRegistration', hackathonRegistrationSchema);
export default HackathonRegistration;
