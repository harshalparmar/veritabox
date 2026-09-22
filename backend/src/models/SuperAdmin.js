import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const superAdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  totpSecret: {
    type: String,
    required: true // Mandatory for every SA
  },
  failedLogins: {
    type: Number,
    default: 0
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  lastLoginIp: String,
  lastLoginAt: Date
}, { 
  timestamps: true,
  collection: 'super_admins' // Explicit separate collection
});

// Hash password before saving
superAdminSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12); // Slightly higher rounds for SA
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
superAdminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('SuperAdmin', superAdminSchema);
