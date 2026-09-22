import mongoose from 'mongoose';

const reputationLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    index: true
  },
  points: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  sourceModel: {
    type: String,
    enum: ['Bounty', 'Project', 'KnowledgeArticle', 'Hackathon', 'Manual', 'Workshop', 'Challenge'],
    required: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId
  }
}, {
  timestamps: true
});

const ReputationLog = mongoose.model('ReputationLog', reputationLogSchema);

export default ReputationLog;
