import mongoose from 'mongoose';

const professionalProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, required: true, trim: true },
  jobTitle: { type: String, required: true, trim: true },
  yearsOfExperience: { type: Number, required: true },
  techStack: [{ type: String, trim: true }],
  industry: { type: String, trim: true },
  interests: [{ type: String, trim: true }],
  openToMentor: { type: Boolean, default: false }
}, { timestamps: true });

const ProfessionalProfile = mongoose.model('ProfessionalProfile', professionalProfileSchema);
export default ProfessionalProfile;
