import mongoose from 'mongoose';

const proctorViolationSchema = new mongoose.Schema({
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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['TAB_SWITCH', 'FULLSCREEN_EXIT', 'MINIMIZE'],
    required: true
  },
  details: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

proctorViolationSchema.index({ hackathonId: 1, teamId: 1, timestamp: -1 });

const ProctorViolation = mongoose.model('ProctorViolation', proctorViolationSchema);
export default ProctorViolation;
