import mongoose from 'mongoose';

const signalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxLength: 1000
  },
  code: {
    type: String,
    trim: true,
    maxLength: 5000
  },
  type: {
    type: String,
    enum: ['Broadcast', 'Intelligence', 'Field Note', 'Alert'],
    default: 'Broadcast'
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    type: String // URLs to images/files
  }],
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true 
});

// Index for faster feed retrieval
signalSchema.index({ createdAt: -1 });

export default mongoose.model('Signal', signalSchema);
