import mongoose from 'mongoose';

const studentProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  university: { type: String, required: true, trim: true },
  degree: { type: String, required: true, trim: true },
  graduationYear: { type: Number, required: true },
  department: { type: String, trim: true },
  careerGoals: [{ type: String, trim: true }],
  currentSkills: [{ type: String, trim: true }],
  interests: [{ type: String, trim: true }],
  skillLevel: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' }
}, { timestamps: true });

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);
export default StudentProfile;
