import mongoose from 'mongoose';

const chapterSprintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  initiatorChapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  targetChapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Concluded', 'Cancelled'],
    default: 'Pending'
  },
  stats: {
    initiatorScore: { type: Number, default: 0 },
    targetScore: { type: Number, default: 0 },
    bountiesResolved: [mongoose.Schema.Types.ObjectId]
  },
  winnerChapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter'
  }
}, {
  timestamps: true
});

const ChapterSprint = mongoose.model('ChapterSprint', chapterSprintSchema);

export default ChapterSprint;
