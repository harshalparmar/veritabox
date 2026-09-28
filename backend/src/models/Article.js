import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ArticleCategory', required: true },
  content: { type: String, required: true }, // HTML content or Editor.js JSON generated from the WYSIWYG editor
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' }, // Tracks which admin wrote it
  tags: [{ type: String }],
  excerpt: { type: String, default: '' },
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Beginner' },
  estimatedReadMinutes: { type: Number, default: 5 },
  prerequisites: [{ type: String }],
  relatedArticles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Article' }],
  relatedChallenges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }],
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  tableOfContents: [{ id: String, text: String, level: Number }],
  order: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Article', articleSchema);
