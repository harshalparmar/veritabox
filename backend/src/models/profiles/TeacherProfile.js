import mongoose from 'mongoose';

const teacherProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  institution: { type: String, required: true, trim: true },
  department: { type: String, trim: true },
  subjectsTaught: [{ type: String, trim: true }],
  experienceYears: { type: Number, default: 0 },
  preferredSkills: [{ type: String, trim: true }],
  interests: [{ type: String, trim: true }],
  canMentor: [{ type: String, trim: true }],
  verificationMethod: { type: String, trim: true, default: 'Domain Email' }
}, { timestamps: true });

const TeacherProfile = mongoose.model('TeacherProfile', teacherProfileSchema);
export default TeacherProfile;
