import mongoose from 'mongoose';

const projectLogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  projectRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true // Markdown representation of the dynamic build log
  },
  logType: {
    type: String,
    enum: ['Build', 'Testing', 'Deployment', 'Maintenance', 'Brainstorming'],
    default: 'Build'
  },
  mediaUrls: [{
    type: String, // URLs to media (images, videos) supporting the log
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  isPublished: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export default mongoose.model('ProjectLog', projectLogSchema);
