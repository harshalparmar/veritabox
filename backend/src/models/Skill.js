import mongoose from 'mongoose';

const SkillSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
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
  category: {
    type: String,
    trim: true,
    default: 'General'
  },
  // Career goals this skill belongs to
  careerGoals: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CareerGoal'
  }],
  // Skills that must be verified before this one
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Skill'
  }],
  difficulty: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    default: 'Beginner'
  },
  // Minimum score on diagnostic to be considered "Verified"
  verificationPassScore: {
    type: Number,
    default: 60 // 60% pass
  },
  // Estimated learning time in hours
  estimatedHours: {
    type: Number,
    default: 10
  },
  icon: {
    type: String,
    default: 'Code'
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

SkillSchema.index({ careerGoals: 1, status: 1 });

export default mongoose.model('Skill', SkillSchema);
