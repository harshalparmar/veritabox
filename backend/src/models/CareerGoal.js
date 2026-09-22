import mongoose from 'mongoose';

const CareerGoalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  icon: {
    type: String,
    default: 'Briefcase'
  },
  // Skills associated with this career goal (refs to Skill collection)
  skills: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill'
  }],
  // Core skills required to be on roadmap
  coreSkills: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill'
  }],
  // Suggested duration in days
  suggestedDurationDays: {
    type: Number,
    default: 90
  },
  status: {
    type: String,
    enum: ['Draft', 'Active', 'Inactive'],
    default: 'Draft'
  },
  order: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }]
}, { timestamps: true });

// Index for fast slug lookup and active goals
CareerGoalSchema.index({ status: 1, order: 1 });

export default mongoose.model('CareerGoal', CareerGoalSchema);
