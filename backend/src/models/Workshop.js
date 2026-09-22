import mongoose from 'mongoose';

const workshopSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  chapter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // External / guest speaker profile
  externalMentor: {
    name: String,
    designation: String,  // e.g. "PhD Researcher, IIT Delhi"
    bio: String,
    avatarUrl: String,
  },
  date: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // In minutes
    default: 60
  },
  location: {
    type: String,
    required: true
  },
  meetingLink: String,
  status: {
    type: String,
    // Pending = awaiting admin approval, Upcoming = approved & scheduled
    enum: ['Pending', 'Draft', 'Upcoming', 'Live', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  capacity: {
    type: Number,
    default: 50
  },
  // XP reward for attendees — set by workshop creator
  xpReward: {
    type: Number,
    default: 50,
    min: 0,
    max: 500
  },
  attendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  checkedInAttendees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [String],
  resources: [{
    name: String,
    url: String
  }],
  coverUrl: String,
  // Admin approval metadata
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String
}, {
  timestamps: true
});

export default mongoose.model('Workshop', workshopSchema);
