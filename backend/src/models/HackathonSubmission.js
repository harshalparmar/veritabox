import mongoose from 'mongoose';

/**
 * Final project submission for a hackathon team.
 * Replaces the embedded HackathonTeam.projectSubmission for dedicated querying.
 */
const hackathonSubmissionSchema = new mongoose.Schema({
  hackathon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hackathon',
    required: true
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HackathonTeam',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true, maxlength: 5000 },
  repoUrl: {
    type: String,
    validate: {
      validator: v => !v || /^https?:\/\/.+/.test(v),
      message: 'repoUrl must be a valid URL'
    }
  },
  demoUrl: {
    type: String,
    validate: {
      validator: v => !v || /^https?:\/\/.+/.test(v),
      message: 'demoUrl must be a valid URL'
    }
  },
  videoUrl: {
    type: String,
    validate: {
      validator: v => !v || /^https?:\/\/.+/.test(v),
      message: 'videoUrl must be a valid URL'
    }
  },
  techStack: [String],
  files: [String],
  score: { type: Number, default: 0 },
  feedback: String,
  isFinal: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// One submission per team per hackathon
hackathonSubmissionSchema.index({ hackathon: 1, team: 1 }, { unique: true });

const HackathonSubmission = mongoose.model('HackathonSubmission', hackathonSubmissionSchema);
export default HackathonSubmission;
