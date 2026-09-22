import mongoose from 'mongoose';

const recruiterProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, required: true, trim: true },
  hiringRoles: [{ type: String, trim: true }],
  linkedInUrl: { type: String, trim: true },
  teamSize: { type: String, enum: ['Small', 'Medium', 'Large'], default: 'Small' },
  hiringUrgency: { type: String, enum: ['Active', 'Passive', 'Exploring'], default: 'Exploring' },
  preferredSkills: [{ type: String, trim: true }],
  industry: { type: String, trim: true }
}, { timestamps: true });

const RecruiterProfile = mongoose.model('RecruiterProfile', recruiterProfileSchema);
export default RecruiterProfile;
