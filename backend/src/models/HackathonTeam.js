import mongoose from 'mongoose';

const hackathonTeamSchema = new mongoose.Schema({
  hackathonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hackathon',
    required: false
  },
  teamName: {
    type: String,
    required: true,
    trim: true
  },
  inviteCode: {
    type: String,
    unique: true
  },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Anti-Cheat & Progress State
  activeSolver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  score: {
    type: Number,
    default: 0
  },
  warnings: {
    type: Number,
    default: 0
  },
  isDisqualified: {
    type: Boolean,
    default: false
  },
  disqualificationReason: {
    type: String,
    default: null
  },
  lastSubmissionTimestamp: {
    type: Date,
    default: null
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  currentRound: {
    type: Number,
    default: 1
  },
  submissions: [{
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    answer: String,
    isCorrect: Boolean,
    pointsAwarded: { type: Number, default: 0 }, // Snapshot at submission time — immutable to question edits
    roundNumber: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  roundScores: {
    type: Map,
    of: Number,
    default: {}
  },
  // Fixed: was incorrectly nested, should be a flat array of Numbers
  finalizedRounds: {
    type: [Number],
    default: []
  },
  judgedPoints: [{
    roundNumber: Number,
    points: Number,
    reason: String,
    awardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    awardedAt: { type: Date, default: Date.now }
  }],
  // Offline round deliverables (notes + link submitted per offline round)
  offlineDeliverables: [{
    roundNumber: Number,
    notes: String,
    link: String,
    submittedAt: { type: Date, default: Date.now }
  }],
  // Squadron Profile
  squadronBio: {
    type: String,
    default: "This tactical unit has not yet provided a mission brief."
  },
  squadronAvatarUrl: String,
  memberRoles: {
    type: Map,
    of: String,
    default: {}
  },
  salutes: {
    type: Number,
    default: 0
  },
  arenaEntries: {
    type: Number,
    default: 0
  },
  abortCount: {
    type: Number,
    default: 0
  },
  maxMembers: {
    type: Number,
    default: 5,
    min: 1,
    max: 10
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  slug: {
    type: String,
    unique: true,
    sparse: true
  },
  roleCategory: {
    type: String,
    enum: ['Student', 'Professional', 'Teacher'],
    default: 'Student'
  },
  contestResults: {
    type: Map,
    of: new mongoose.Schema({
      problems: [{
        challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
        solved: { type: Boolean, default: false },
        attempts: { type: Number, default: 0 },
        solvedAt: Date,
        penaltyTime: Number
      }],
      totalSolved: { type: Number, default: 0 },
      totalPenalty: { type: Number, default: 0 }
    }, { _id: false }),
    default: {}
  }
}, { timestamps: true });

// Generate slug from teamName before saving
hackathonTeamSchema.pre('save', async function() {
  if (this.isModified('teamName')) {
    const slugBase = this.teamName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const randomHash = Math.random().toString(36).substring(2, 6);
    this.slug = `${slugBase}-${randomHash}`;
  }
});

// Prevent a user from leading multiple teams in the same hackathon
hackathonTeamSchema.index(
  { hackathonId: 1, leader: 1 },
  { unique: true, sparse: true, partialFilterExpression: { hackathonId: { $exists: true } } }
);

// Max members dynamic validation — uses maxMembers (set from hackathon.maxTeamSize on creation)
hackathonTeamSchema.path('members').validate(function (value) {
  const limit = this.maxMembers || 5;
  return value.length <= limit;
}, 'Squadron exceeds maximum authorized operative capacity.');

const HackathonTeam = mongoose.model('HackathonTeam', hackathonTeamSchema);
export default HackathonTeam;
