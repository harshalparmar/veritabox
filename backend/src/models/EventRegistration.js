import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const eventRegistrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Null if registered as a guest
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['Student', 'Professional'],
    required: true
  },
  institutionOrCompany: {
    type: String,
    required: true,
    trim: true
  },
  ticketToken: {
    type: String,
    default: uuidv4,
    unique: true
  },
  attended: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Ensure a user/email can't register for the same event multiple times
eventRegistrationSchema.index({ event: 1, email: 1 }, { unique: true });

export default mongoose.model('EventRegistration', eventRegistrationSchema);
