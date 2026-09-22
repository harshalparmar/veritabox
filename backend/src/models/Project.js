import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  // Identity
  title: {
    type: String,
    required: true,
    trim: true
  },
  tagline: {
    type: String,
    default: 'A New Tactical Innovation'
  },
  description: {
    type: String,
    required: true
  },
  headerImage: {
    type: String,
    default: ''
  },

  // Logistics & Squad
  associatedTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HackathonTeam',
    required: true
  },
  techStack: [{
    type: String
  }],
  
  // Vitals
  status: {
    type: String,
    enum: ['Ideation', 'Prototype', 'Testing', 'Battle-Ready', 'Mission-Complete'],
    default: 'Ideation'
  },

  // Progress Matrix (Timeline)
  progressMatrix: [{
    logContent: { type: String, required: true },
    mediaURL: { type: String },
    isPublic: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
  }],
  attachments: [{
    name: { type: String, required: true },
    url: { type: String, required: true }
  }],
}, { timestamps: true });

const Project = mongoose.model('Project', projectSchema);
export default Project;
