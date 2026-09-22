import mongoose from 'mongoose';

const StudentOnboardingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  careerGoal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CareerGoal',
    required: true
  },
  currentLevel: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true,
    default: 'Beginner'
  },
  // Self-reported skills: { skillId, known: true/false }
  selfReportedSkills: [{
    skill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill' },
    known: { type: Boolean, default: false }
  }],
  // Time availability
  dailyMinutes: {
    type: Number,
    required: true,
    min: 15,
    max: 480,
    default: 60
  },
  daysPerWeek: {
    type: Number,
    required: true,
    min: 1,
    max: 7,
    default: 5
  },
  targetDurationDays: {
    type: Number,
    enum: [30, 60, 90, 180],
    default: 90
  },
  // Optional fields
  previousExperience: { type: String, trim: true },
  preferredStyle: {
    type: String,
    enum: ['Visual', 'ReadWrite', 'Hands-on', 'Mixed'],
    default: 'Mixed'
  },
  targetJobRole: { type: String, trim: true },
  previousProjects: { type: String, trim: true },
  areasNeedingHelp: { type: String, trim: true },
  // Status
  isComplete: { type: Boolean, default: false },
  roadmapGeneratedAt: { type: Date }
}, { timestamps: true });



export default mongoose.model('StudentOnboarding', StudentOnboardingSchema);
