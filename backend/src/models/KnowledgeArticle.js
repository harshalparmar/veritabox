import mongoose from 'mongoose';

const knowledgeArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true // Markdown or HTML representation of the body
  },
  coverImage: {
    type: String,
    default: null
  },
  currentVersion: {
    type: Number,
    default: 1
  },
  versionHistory: [{
    versionNumber: Number,
    content: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true // Optimized for high-frequency SEO lookups
  },
  metaDescription: {
    type: String,
    maxlength: 160,
    trim: true
  },
  keywords: [{
    type: String,
    trim: true
  }],
  hardwareUsed: [{
    componentName: { type: String, required: true },
    supplierLink: { type: String, required: true }
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  attachments: [{
    type: String,
    trim: true
  }]
}, { timestamps: true });

export default mongoose.model('KnowledgeArticle', knowledgeArticleSchema);
