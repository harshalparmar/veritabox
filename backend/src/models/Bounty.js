import mongoose from 'mongoose';

const bountySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  techStack: [{
    type: String
  }],
  pointReward: {
    type: Number,
    required: true,
    default: 10
  },
  difficulty: {
    type: String,
    enum: ['Rookie', 'Operative', 'Elite'],
    default: 'Operative'
  },
  status: {
    type: String,
    enum: ['Open', 'Assigned', 'Resolved'],
    default: 'Open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    default: null
  },
  isChapterExclusive: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('Bounty', bountySchema);
