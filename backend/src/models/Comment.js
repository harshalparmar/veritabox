import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeArticle',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  isSolution: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('Comment', commentSchema);
