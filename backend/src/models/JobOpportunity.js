import mongoose from 'mongoose';

const JobOpportunitySchema = new mongoose.Schema({
  recruiter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  companyLogo: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Job', 'Internship', 'Contract'],
    required: true
  },
  requiredSkills: [{
    skillName: String,
    minimumProficiency: Number
  }],
  location: {
    type: String,
    trim: true
  },
  isRemote: {
    type: Boolean,
    default: false
  },
  salary: {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: 'INR' }
  },
  experience: {
    type: String,
    enum: ['Fresher', '0-1 years', '1-3 years', '3-5 years', '5+ years'],
    default: 'Fresher'
  },
  deadline: {
    type: Date
  },
  applicationCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Open', 'Closed', 'Draft'],
    default: 'Open'
  },
  perfectMatches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

export default mongoose.model('JobOpportunity', JobOpportunitySchema);
