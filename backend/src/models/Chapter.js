import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  university: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  founder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leads: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['Pending', 'Active', 'Suspended'],
    default: 'Pending'
  },
  description: String,
  logoUrl: String,
  bannerUrl: String,
  socialLinks: {
    instagram: String,
    linkedin: String,
    twitter: String,
    website: String
  },
  stats: {
    totalReputation: { type: Number, default: 0 },
    reputationVelocity: { type: Number, default: 0 },
    rank: { type: Number },
    eventsCount: { type: Number, default: 0 },
    projectsCount: { type: Number, default: 0 },
    activeBounties: { type: Number, default: 0 }
  },
  tier: {
    type: String,
    enum: ['Provisional', 'Standard', 'Elite'],
    default: 'Provisional'
  },
  themeColor: {
    type: String,
    default: 'hsl(var(--primary))'
  },
  localRoles: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    roleName: { type: String, enum: ['Technical Commander', 'Logistics Lead', 'Communications Officer', 'Intelligence Liaison'] }
  }],
  verifiedMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  verifiedDomains: [String]
}, { 
  timestamps: true 
});

chapterSchema.pre('save', async function() {
  if (this.stats.totalReputation >= 5000) {
    this.tier = 'Elite';
  } else if (this.stats.totalReputation >= 1000) {
    this.tier = 'Standard';
  } else {
    this.tier = 'Provisional';
  }
});

export default mongoose.model('Chapter', chapterSchema);
