import mongoose from 'mongoose';

const proctorSnapshotSchema = new mongoose.Schema({
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
  roundNumber: {
    type: Number,
    required: true
  },
  imagePath: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  // TTL: auto-delete snapshots after 30 days
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
}, { timestamps: true });

proctorSnapshotSchema.index({ hackathonId: 1, teamId: 1, timestamp: -1 });
proctorSnapshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ProctorSnapshot = mongoose.model('ProctorSnapshot', proctorSnapshotSchema);
export default ProctorSnapshot;
