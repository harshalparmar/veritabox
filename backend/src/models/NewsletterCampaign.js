import mongoose from 'mongoose';

const newsletterCampaignSchema = new mongoose.Schema({
  subject: {
    type: String,
    required: true,
    trim: true
  },
  htmlContent: {
    type: String,
    required: true
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientCount: {
    type: Number,
    default: 0
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Draft', 'Sending', 'Completed', 'Failed'],
    default: 'Completed'
  }
}, {
  timestamps: true
});

const NewsletterCampaign = mongoose.model('NewsletterCampaign', newsletterCampaignSchema);

export default NewsletterCampaign;
