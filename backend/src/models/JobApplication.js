import mongoose from 'mongoose';

const JobApplicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobOpportunity',
    required: true
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Interviewing', 'Accepted', 'Rejected'],
    default: 'Pending'
  },
  resumeUrl: {
    type: String
  },
  coverLetter: {
    type: String
  },
  recruiterFeedback: {
    type: String
  },
  interviewRounds: [{
    roundName: String,
    date: Date,
    feedback: String,
    passed: Boolean
  }]
}, { timestamps: true });

export default mongoose.model('JobApplication', JobApplicationSchema);
