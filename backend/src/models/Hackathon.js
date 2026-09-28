import mongoose from 'mongoose';

const VALID_TRANSITIONS = {
  Draft: ['Announced'],
  Announced: ['Live', 'Draft'],
  Live: ['Concluded'],
  Concluded: []
};

const roundSchema = new mongoose.Schema({
  roundNumber: { type: Number, required: true },
  title: { type: String, required: true },
  description: String,
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  durationMinutes: { type: Number, default: 30 },
  qualifyingThreshold: { type: Number, default: 40 },
  maxQuestions: { type: Number, default: 50 }, // configurable sample size per round
  type: {
    type: String,
    enum: ['Online MCQ', 'Offline Assessment', 'Presentation', 'Physical Build', 'Report Submission', 'Data Challenge', 'Coding Contest'],
    default: 'Online MCQ'
  },
  submissionConfig: {
    maxAttempts: { type: Number, default: 1 },
    requiredFields: [{
      fieldName: String,
      fieldType: { type: String, enum: ['text', 'textarea', 'url', 'file', 'select'] },
      required: { type: Boolean, default: false },
      maxLength: Number,
      options: [String]
    }]
  },
  codingContestConfig: {
    challengeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }],
    penaltyMinutes: { type: Number, default: 20 }
  },
  status: {
    type: String,
    enum: ['Draft', 'Scheduled', 'Live', 'Closed'],
    default: 'Draft'
  },
  snapshotInterval: {
    type: Number,
    default: 0
  }
});

const hackathonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  shortDescription: {
    type: String,
    required: true,
    maxlength: 180,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Published', 'Announced', 'Live', 'Concluded'],
    default: 'Draft'
  },
  rounds: [roundSchema],
  description: String,
  bannerImage: String,
  thumbnailImage: String,
  rulebookUrl: String,
  rules: [String],
  type: {
    type: String,
    enum: ['Hackathon', 'Competition'],
    default: 'Hackathon'
  },
  subCategory: {
    type: String,
    enum: ['Robogames', 'Software', 'Aeromodelling', 'Design', 'Business', 'General'],
    default: 'General'
  },
  prizes: [{
    position: String,
    reward: String,
    description: String
  }],
  chapterScope: {
    type: String,
    enum: ['Local', 'National', 'Global'],
    default: 'Local'
  },
  maxTeams: {
    type: Number,
    default: 100,
    min: [1, 'maxTeams must be at least 1']
  },
  organizer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Reputation Award System (blueprint conclusion phase)
  reputationAwarded: {
    type: Boolean,
    default: false
  },
  reputationTiers: [{
    rank: Number,
    points: Number
  }],
  resources: [{
    title: { type: String, required: true },
    url: { type: String, required: true },
    description: String
  }],
  minTeamSize: {
    type: Number,
    default: 1,
    min: 1
  },
  maxTeamSize: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  }
}, { timestamps: true });

// Status transition guard
hackathonSchema.pre('save', function () {
  if (this.isModified('status') && !this.isNew) {
    const prev = this._previousStatus;
    if (prev && !VALID_TRANSITIONS[prev]?.includes(this.status)) {
      throw new Error(`Invalid status transition: ${prev} → ${this.status}`);
    }
  }
  // Store previous status for next save cycle
  this._previousStatus = this.status;
});

// Round validation: endTime > startTime, no duplicate roundNumbers
hackathonSchema.pre('validate', function () {
  if (this.rounds?.length) {
    const nums = this.rounds.map(r => r.roundNumber);
    const unique = new Set(nums);
    if (unique.size !== nums.length) {
      this.invalidate('rounds', 'Duplicate round numbers are not allowed');
    }
    for (const r of this.rounds) {
      if (r.startTime && r.endTime && new Date(r.endTime) <= new Date(r.startTime)) {
        this.invalidate('rounds', `Round ${r.roundNumber}: endTime must be after startTime`);
      }
    }
  }
});

hackathonSchema.index({ status: 1 });

const Hackathon = mongoose.model('Hackathon', hackathonSchema);
export default Hackathon;
