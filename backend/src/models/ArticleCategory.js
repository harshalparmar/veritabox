import mongoose from 'mongoose';

const articleCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., "React.js"
  slug: { type: String, required: true, unique: true }, // e.g., "react-js"
  description: { type: String },
  order: { type: Number, default: 0 }, // For ordering in the sidebar/navbar
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'ArticleCategory' }, // For sub-categories
  icon: { type: String, default: '' },
  articleCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('ArticleCategory', articleCategorySchema);
