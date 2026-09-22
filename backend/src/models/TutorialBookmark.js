import mongoose from 'mongoose';

const tutorialBookmarkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  article: { type: mongoose.Schema.Types.ObjectId, ref: 'Article', required: true },
}, { timestamps: true });

tutorialBookmarkSchema.index({ user: 1, article: 1 }, { unique: true });

export default mongoose.model('TutorialBookmark', tutorialBookmarkSchema);
