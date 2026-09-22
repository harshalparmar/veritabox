import mongoose from 'mongoose';

const PracticalSubmissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningContent',
    required: true
  },
  // What the student submitted
  submissionType: {
    type: String,
    enum: ['Text', 'Code', 'URL', 'File', 'Explanation'],
    default: 'Text'
  },
  submissionText: { type: String },
  submissionCode: { type: String },
  submissionUrl: { type: String },
  submissionFileUrl: { type: String },
  language: { type: String },  // for code submissions
  // Status
  status: {
    type: String,
    enum: ['Pending', 'UnderReview', 'Verified', 'Rejected', 'NeedsRevision'],
    default: 'Pending'
  },
  // Feedback from backend validation or admin review
  feedback: { type: String },
  score: { type: Number, default: 0 },  // 0-100
  // Whether auto-verified (test cases) or manual review
  verificationMethod: {
    type: String,
    enum: ['Auto', 'Manual'],
    default: 'Manual'
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  attemptNumber: { type: Number, default: 1 }
}, { timestamps: true });

PracticalSubmissionSchema.index({ user: 1, content: 1 });
PracticalSubmissionSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('PracticalSubmission', PracticalSubmissionSchema);
