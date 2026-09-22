import mongoose from 'mongoose';

const tutorialProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
  completed: { type: Boolean, default: false },
  completedAt: { type: Date },
}, { timestamps: true });

tutorialProgressSchema.index({ user: 1, article: 1 }, { unique: true });

export default mongoose.model('TutorialProgress', tutorialProgressSchema);
