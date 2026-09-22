import mongoose from 'mongoose';

const competitionSchema = new mongoose.Schema({
  title: {
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
  coverImage: {
    type: String,
    default: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80'
  },
  thumbnailImage: {
    type: String,
    default: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'
  },
  overview: {
    type: String,
    required: true
  },
  problemStatement: {
    type: String,
    required: true
  },
  problemStatementPdfUrl: {
    type: String
  },
  abstractTemplateDocUrl: {
    type: String
  },
  contacts: [{
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true }
  }],
  currentPhase: {
    type: String,
    enum: ['Registration', 'AbstractSelection', 'OfflineCompetition'],
    default: 'Registration'
  },
  registrationDeadline: {
    type: Date,
    required: true
  },
  abstractDeadline: {
    type: Date,
    required: true
  },
  competitionDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Published'],
    default: 'Draft'
  },
  rubricCriteria: [{
    name: { type: String, required: true },
    maxPoints: { type: Number, required: true }
  }],
  externalUrl: {
    type: String
  },
  maxSquadronSize: {
    type: Number,
    default: 10,
    min: 1
  }
}, {
  timestamps: true
});

competitionSchema.pre('validate', function (next) {
  if (this.registrationDeadline && this.abstractDeadline && this.competitionDate) {
    if (this.registrationDeadline >= this.abstractDeadline) {
      return next(new Error('Registration deadline must be before abstract deadline.'));
    }
    if (this.abstractDeadline >= this.competitionDate) {
      return next(new Error('Abstract deadline must be before competition date.'));
    }
  }
  next();
});

export default mongoose.model('Competition', competitionSchema);
