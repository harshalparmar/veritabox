import mongoose from 'mongoose';

const chapterApplicationSchema = new mongoose.Schema({
  universityName: {
    type: String,
    required: true
  },
  proposedSlug: {
    type: String,
    required: true,
    lowercase: true
  },
  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  missionStatement: {
    type: String,
    required: true
  },
  expectedMembers: {
    type: Number,
    default: 10
  },
  socialProofUrl: String, // Link to existing club page or LinkedIn
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
}, { timestamps: true });

const ChapterApplication = mongoose.model('ChapterApplication', chapterApplicationSchema);
export default ChapterApplication;
