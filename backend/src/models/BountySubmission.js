import mongoose from 'mongoose';

const bountySubmissionSchema = new mongoose.Schema({
  bountyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bounty',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  proofOfWork: {
    type: String, // Text description
    required: true
  },
  links: [String],
  attachments: [String],
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

const BountySubmission = mongoose.model('BountySubmission', bountySubmissionSchema);
export default BountySubmission;
