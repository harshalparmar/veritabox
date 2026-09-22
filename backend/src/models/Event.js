import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['Competition', 'Summit', 'Workshop', 'Exhibition'],
    required: true
  },
  subCategory: {
    type: String,
    enum: ['Robogames', 'Software', 'Aeromodelling', 'Design', 'Business'],
    default: 'Robogames'
  },
  description: {
    type: String,
    required: true
  },
  prizeMoney: {
    type: Number,
    default: 0
  },
  rulebookUrl: {
    type: String // Link to the PDF rules
  },
  eventDate: {
    type: Date
  },
  registrationDeadline: {
    type: Date
  },
  maxTeamSize: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  chapterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chapter',
    default: null
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true
  },
  location: {
    type: String
  },
  coverUrl: {
    type: String
  },
  status: {
    type: String,
    enum: ['Pending', 'Draft', 'Upcoming', 'Live', 'Completed', 'Cancelled'],
    default: 'Upcoming'
  },
  capacity: {
    type: Number,
    default: 50
  }
}, { timestamps: true });

export default mongoose.model('Event', eventSchema);
