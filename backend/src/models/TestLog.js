import mongoose from 'mongoose';

const testLogSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  projectRef: {
    type: String,
    required: true,
    trim: true
  },
  pilotOrLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  objectives: [{
    type: String,
    required: true
  }],
  outcome: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Scrubbed'],
    default: 'Scheduled'
  }
}, { timestamps: true });

export default mongoose.model('TestLog', testLogSchema);
