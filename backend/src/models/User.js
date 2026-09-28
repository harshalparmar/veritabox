import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    minLength: 3,
    maxLength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  universityId: { 
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: true,
  },
  // Set whenever the password changes; tokens issued before this instant are
  // rejected so a password reset/change revokes all existing sessions.
  passwordChangedAt: {
    type: Date,
    default: null,
  },
  role: {
    type: String,
    enum: ['Student', 'Professional', 'Recruiter', 'Teacher', 'Founder'],
    default: 'Student'
  },
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'profileModel',
    default: null
  },
  profileModel: {
    type: String,
    enum: ['StudentProfile', 'ProfessionalProfile', 'RecruiterProfile', 'TeacherProfile'],
    default: null
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    default: null
  },
  graduationYear: {
    type: Number
  },
  institutionalDomain: {
    type: String,
    trim: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['Domain', 'ID', 'Vouch', 'Admin', 'None'],
    default: 'None'
  },
  vouchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  reputationVelocity: {
    type: Number,
    default: 0 // Weekly points
  },
  bio: {
    type: String,
    maxLength: 250
  },
  careerGoal: {
    type: String,
    trim: true,
    default: ''
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  aiContext: {
    type: String,
    default: ''
  },
  avatarUrl: {
    type: String,
    default: ''
  },
  coverPhotoUrl: {
    type: String,
    default: ''
  },
  skills: [{
    type: String
  }],
  skillMatrix: {
    software: { type: Number, default: 0 },
    hardware: { type: Number, default: 0 },
    embedded: { type: Number, default: 0 },
    mechanical: { type: Number, default: 0 },
    leadership: { type: Number, default: 0 },
    research: { type: Number, default: 0 }
  },
  settings: {
    notifications: {
      bounties: { platform: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
      hackathons: { platform: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
      reputation: { platform: { type: Boolean, default: true }, email: { type: Boolean, default: false } },
      community: { platform: { type: Boolean, default: true }, email: { type: Boolean, default: false } }
    },
    privacy: {
      profileVisibility: { type: String, enum: ['Public', 'Community', 'Chapter'], default: 'Community' },
      searchable: { type: Boolean, default: true },
      teamBuilder: { type: Boolean, default: true },
      showRadar: { type: Boolean, default: true },
      showTimeline: { type: Boolean, default: true },
      showReputation: { type: Boolean, default: true },
      showBadges: { type: Boolean, default: true }
    }
  },
  phone: {
    type: String,
    trim: true
  },
  dob: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say']
  },
  whatsappNo: {
    type: String,
    trim: true
  },
  alternateNo: {
    type: String,
    trim: true
  },
  permanentAddress: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  employmentStatus: {
    type: String,
    enum: ['Studying', 'Working', 'Both', 'None'],
    default: 'None'
  },
  occupation: {
    type: String,
    trim: true
  },
  designation: {
    type: String,
    trim: true
  },
  workExperience: {
    type: Number,
    default: 0
  },
  companyName: {
    type: String,
    trim: true
  },
  eduInstitutionType: {
    type: String,
    enum: ['College', 'University', 'None'],
    default: 'None'
  },
  eduInstitutionName: {
    type: String,
    trim: true
  },
  eduInstitutionAddress: {
    type: String,
    trim: true
  },
  eduState: {
    type: String,
    trim: true
  },
  eduCity: {
    type: String,
    trim: true
  },
  course: {
    type: String,
    trim: true
  },
  branch: {
    type: String,
    trim: true
  },
  batch: {
    type: String,
    trim: true
  },
  isOnboarded: {
    type: Boolean,
    default: false
  },
  pinnedProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  activeSessions: [{
    device: String,
    location: String,
    lastActive: { type: Date, default: Date.now },
    tokenHash: String
  }],
  loginHistory: [{
    success: Boolean,
    device: String,
    location: String,
    timestamp: { type: Date, default: Date.now }
  }],
  socialLinks: {
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    twitter: { type: String, default: '' }
  },
  currentProjects: [{
    type: String
  }],
  reputationPoints: {
    type: Number,
    default: 0
  },
  badges: [{
    type: String
  }],
  connections: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['Collaborator', 'Squadmate'] },
    status: { type: String, enum: ['Pending', 'Accepted'], default: 'Pending' },
    timestamp: { type: Date, default: Date.now }
  }],
  isSuspended: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // --- Enhanced Security ---
  twoFactorSecret: {
    type: String,
    default: null
  },
  isTwoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorBackupCodes: [{
    type: String
  }],
  // --- Social Provider Links ---
  socialProviders: {
    google: { id: String, email: String, linkedAt: Date },
    github: { id: String, username: String, linkedAt: Date },
    microsoft: { id: String, email: String, linkedAt: Date },
    linkedin: { id: String, email: String, linkedAt: Date }
  },
  // --- OTP & Password Reset ---
  loginOtp: {
    type: String,
    default: null
  },
  loginOtpExpires: {
    type: Date,
    default: null
  },
  resetPasswordOtp: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  // --- OTP / 2FA brute-force protection ---
  otpAttempts: { type: Number, default: 0 },
  otpLockedUntil: { type: Date, default: null },
  // --- Login Streak ---
  lastLoginDate: { type: Date, default: null },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
}, { timestamps: true });


userSchema.pre('validate', function() {
  if (!this.email && this.universityId) {
    this.email = this.universityId;
  }
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  // Stamp the change (skip on the initial document creation so brand-new
  // accounts don't immediately invalidate their first-issued token).
  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }
});

// Compare password method
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Credential/secret fields that must never leave the server in any serialized
// output. Internal auth flows read these directly off the live document, so
// stripping them from toJSON/toObject copies does not affect verification.
const SENSITIVE_FIELDS = [
  'password',
  'twoFactorSecret',
  'twoFactorBackupCodes',
  'loginOtp',
  'loginOtpExpires',
  'resetPasswordOtp',
  'resetPasswordExpires',
  'otpAttempts',
  'otpLockedUntil',
];

function stripSensitive(doc, ret) {
  for (const field of SENSITIVE_FIELDS) delete ret[field];
  // Keep session metadata (device/IP/last-used) usable by the UI, but never
  // expose the token hash that could be used to forge/replay a session.
  if (Array.isArray(ret.activeSessions)) {
    ret.activeSessions = ret.activeSessions.map((s) => {
      if (s && typeof s === 'object') {
        const { tokenHash, ...rest } = s;
        return rest;
      }
      return s;
    });
  }
  return ret;
}

userSchema.set('toJSON', { transform: stripSensitive });
userSchema.set('toObject', { transform: stripSensitive });

export default mongoose.model('User', userSchema);
