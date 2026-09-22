import mongoose from 'mongoose';
import crypto from 'crypto';

const competitionSquadronSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  competitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Competition',
    required: true
  },
  leaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinCode: {
    type: String,
    unique: true
  },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Pending', 'Accepted'], default: 'Pending' },
    joinedAt: { type: Date, default: Date.now }
  }],
  roleCategory: {
    type: String,
    enum: ['Student', 'Professional', 'Teacher'],
    default: 'Student'
  }
}, {
  timestamps: true
});

competitionSquadronSchema.pre('save', function(next) {
  if (!this.joinCode) {
    this.joinCode = crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

export default mongoose.model('CompetitionSquadron', competitionSquadronSchema);
