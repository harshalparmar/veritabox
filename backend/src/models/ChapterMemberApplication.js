import mongoose from 'mongoose';

const chapterMemberApplicationSchema = new mongoose.Schema({
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  universityId: {
    type: String,
    required: true
  },
  motivation: {
    type: String,
    required: true
  },
  skills: [String],
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  adminNote: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date
}, {
  timestamps: true
});

// Prevent duplicate pending applications
chapterMemberApplicationSchema.index({ chapterId: 1, userId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'Pending' } });

const ChapterMemberApplication = mongoose.model('ChapterMemberApplication', chapterMemberApplicationSchema);

export default ChapterMemberApplication;
