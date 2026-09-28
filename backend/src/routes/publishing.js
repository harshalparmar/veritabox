import express from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import ArticleCategory from '../models/ArticleCategory.js';
import Article from '../models/Article.js';
import Challenge from '../models/Challenge.js';
import slugify from 'slugify';
import { escapeRegex } from '../utils/security.js';

const router = express.Router();

// ==========================================
// PUBLIC ENDPOINTS (No Auth Required)
// ==========================================

// GET /api/publishing/categories
// Fetch all categories (useful for navbar/sidebar)
router.get('/categories', async (req, res) => {
  try {
    const categories = await ArticleCategory.find().sort({ order: 1 });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error fetching categories' });
  }
});

// GET /api/publishing/categories/:slug/articles
// Fetch all published articles under a specific category
router.get('/categories/:slug/articles', async (req, res) => {
  try {
    const category = await ArticleCategory.findOne({ slug: req.params.slug });
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const articles = await Article.find({ category: category._id, status: 'published' })
      .select('title slug excerpt difficulty estimatedReadMinutes views tags createdAt author category')
      .populate('author', 'name')
      .populate('category', 'name slug')
      .sort({ order: 1, createdAt: -1 });

    res.json(articles);
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).json({ message: 'Server error fetching articles' });
  }
});

// GET /api/publishing/articles/:slug
// Fetch a single published article and increment view count
router.get('/articles/:slug', async (req, res) => {
  try {
    const article = await Article.findOneAndUpdate(
      { slug: req.params.slug, status: 'published' },
      { $inc: { views: 1 } },
      { new: true }
    ).populate('author', 'name').populate('category', 'name slug').populate('relatedArticles', 'title slug difficulty').populate('relatedChallenges', 'title difficulty tags');

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    let articleData = article;
    if ((!article.relatedChallenges || article.relatedChallenges.length === 0) && article.tags && article.tags.length > 0) {
      const autoMatched = await Challenge.find({
        tags: { $in: article.tags },
        $or: [{ activeFrom: null }, { activeFrom: { $lte: new Date() } }]
      }).select('title difficulty tags').limit(5);
      articleData = article.toObject();
      articleData.relatedChallenges = autoMatched;
    }

    res.json(articleData);
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({ message: 'Server error fetching article' });
  }
});

// GET /api/publishing/articles
// Fetch all published articles
router.get('/articles', async (req, res) => {
  try {
    const articles = await Article.find({ status: 'published' })
      .populate('category', 'name slug')
      .sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    console.error('Error fetching all published articles:', error);
    res.status(500).json({ message: 'Server error fetching articles' });
  }
});

// GET /api/publishing/search?q=...
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q?.toString().trim();
    if (!q || q.length < 2) return res.json([]);
    const safe = escapeRegex(q);

    const articles = await Article.find({
      status: 'published',
      $or: [
        { title: { $regex: safe, $options: 'i' } },
        { excerpt: { $regex: safe, $options: 'i' } },
        { tags: { $regex: safe, $options: 'i' } },
        { content: { $regex: safe, $options: 'i' } }
      ]
    })
    .select('title slug excerpt difficulty estimatedReadMinutes views tags category createdAt')
    .populate('category', 'name slug')
    .sort({ views: -1 })
    .limit(20);

    res.json(articles);
  } catch (error) {
    console.error('Error searching articles:', error);
    res.status(500).json({ message: 'Server error searching articles' });
  }
});


// ==========================================
// USER ENDPOINTS (Requires Auth, not Admin)
// ==========================================

// POST /api/publishing/bookmark/:articleId — Toggle bookmark
router.post('/bookmark/:articleId', protect, async (req, res) => {
  try {
    const TutorialBookmark = (await import('../models/TutorialBookmark.js')).default;
    const existing = await TutorialBookmark.findOne({ user: req.user._id, article: req.params.articleId });
    if (existing) {
      await TutorialBookmark.deleteOne({ _id: existing._id });
      return res.json({ bookmarked: false });
    }
    await TutorialBookmark.create({ user: req.user._id, article: req.params.articleId });
    res.json({ bookmarked: true });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ message: 'Server error toggling bookmark' });
  }
});

// GET /api/publishing/bookmarks — Get user's bookmarked articles
router.get('/bookmarks', protect, async (req, res) => {
  try {
    const TutorialBookmark = (await import('../models/TutorialBookmark.js')).default;
    const bookmarks = await TutorialBookmark.find({ user: req.user._id })
      .populate({
        path: 'article',
        select: 'title slug excerpt difficulty estimatedReadMinutes views tags category createdAt',
        populate: { path: 'category', select: 'name slug' }
      })
      .sort({ createdAt: -1 });
    res.json(bookmarks.map(b => b.article).filter(Boolean));
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ message: 'Server error fetching bookmarks' });
  }
});

// POST /api/publishing/progress/:articleId — Mark article as completed
router.post('/progress/:articleId', protect, async (req, res) => {
  try {
    const TutorialProgress = (await import('../models/TutorialProgress.js')).default;
    const existing = await TutorialProgress.findOne({ user: req.user._id, article: req.params.articleId });
    if (existing) {
      existing.completed = !existing.completed;
      existing.completedAt = existing.completed ? new Date() : null;
      await existing.save();
      return res.json({ completed: existing.completed });
    }
    await TutorialProgress.create({ user: req.user._id, article: req.params.articleId, completed: true, completedAt: new Date() });
    res.json({ completed: true });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ message: 'Server error updating progress' });
  }
});

// GET /api/publishing/progress — Get user's tutorial progress
router.get('/progress', protect, async (req, res) => {
  try {
    const TutorialProgress = (await import('../models/TutorialProgress.js')).default;
    const progress = await TutorialProgress.find({ user: req.user._id, completed: true })
      .select('article completedAt');
    res.json(progress);
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ message: 'Server error fetching progress' });
  }
});

// GET /api/publishing/user-state/:articleId — Get bookmark + progress for a single article
router.get('/user-state/:articleId', protect, async (req, res) => {
  try {
    const [TutorialBookmark, TutorialProgress] = await Promise.all([
      import('../models/TutorialBookmark.js').then(m => m.default),
      import('../models/TutorialProgress.js').then(m => m.default)
    ]);
    const [bookmark, progress] = await Promise.all([
      TutorialBookmark.findOne({ user: req.user._id, article: req.params.articleId }),
      TutorialProgress.findOne({ user: req.user._id, article: req.params.articleId })
    ]);
    res.json({
      bookmarked: !!bookmark,
      completed: progress?.completed || false
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


// ==========================================
// ADMIN ENDPOINTS (Requires Admin Auth)
// ==========================================
router.use(protect);
router.use(isAdmin);

// POST /api/publishing/admin/categories
router.post('/admin/categories', async (req, res) => {
  try {
    const { name, description, order, parentCategory, icon } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    const category = await ArticleCategory.create({ name, slug, description, order, parentCategory, icon });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category name or slug already exists' });
    }
    res.status(500).json({ message: 'Server error creating category' });
  }
});

// PUT /api/publishing/admin/categories/:id
router.put('/admin/categories/:id', async (req, res) => {
  try {
    const { name, description, order, parentCategory, icon } = req.body;
    const updateData = { name, description, order, parentCategory, icon };
    if (name) {
      updateData.slug = slugify(name, { lower: true, strict: true });
    }

    const category = await ArticleCategory.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!category) return res.status(404).json({ message: 'Category not found' });

    res.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Server error updating category' });
  }
});

// DELETE /api/publishing/admin/categories/:id
router.delete('/admin/categories/:id', async (req, res) => {
  try {
    // Check if category has articles
    const articleCount = await Article.countDocuments({ category: req.params.id });
    if (articleCount > 0) {
      return res.status(400).json({ message: `Cannot delete category with ${articleCount} article(s). Move or delete them first.` });
    }
    // Check if category has subcategories
    const subCount = await ArticleCategory.countDocuments({ parentCategory: req.params.id });
    if (subCount > 0) {
      return res.status(400).json({ message: `Cannot delete category with ${subCount} subcategory(ies). Delete them first.` });
    }
    const category = await ArticleCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Server error deleting category' });
  }
});

// POST /api/publishing/admin/articles
router.post('/admin/articles', async (req, res) => {
  try {
    const { title, category, content, status, tags, excerpt, difficulty, estimatedReadMinutes, prerequisites, relatedArticles, relatedChallenges, tableOfContents, order } = req.body;

    let slug = slugify(title, { lower: true, strict: true });

    // Check if slug exists
    const existingArticle = await Article.findOne({ slug });
    if (existingArticle) {
      slug = `${slug}-${Date.now()}`;
    }

    const article = await Article.create({
      title,
      slug,
      category,
      content,
      status: status || 'draft',
      tags: tags || [],
      excerpt: excerpt || '',
      difficulty: difficulty || 'Beginner',
      estimatedReadMinutes: estimatedReadMinutes || 5,
      prerequisites: prerequisites || [],
      relatedArticles: relatedArticles || [],
      relatedChallenges: relatedChallenges || [],
      tableOfContents: tableOfContents || [],
      order: order || 0,
      author: req.user._id
    });

    res.status(201).json(article);
  } catch (error) {
    console.error('Error creating article:', error);
    res.status(500).json({ message: 'Server error creating article' });
  }
});

// PUT /api/publishing/admin/articles/:id
router.put('/admin/articles/:id', async (req, res) => {
  try {
    const { title, category, content, status, tags, excerpt, difficulty, estimatedReadMinutes, prerequisites, relatedArticles, relatedChallenges, tableOfContents, order } = req.body;
    const updateData = { category, content, status, tags, excerpt, difficulty, estimatedReadMinutes, prerequisites, relatedArticles, relatedChallenges, tableOfContents, order };

    if (title) {
      updateData.title = title;
    }
    updateData.lastUpdatedBy = req.user._id;

    const article = await Article.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!article) return res.status(404).json({ message: 'Article not found' });

    res.json(article);
  } catch (error) {
    console.error('Error updating article:', error);
    res.status(500).json({ message: 'Server error updating article' });
  }
});

// GET /api/publishing/admin/articles/:id
router.get('/admin/articles/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json(article);
  } catch (error) {
    console.error('Error fetching admin article:', error);
    res.status(500).json({ message: 'Server error fetching admin article' });
  }
});

// GET /api/publishing/admin/articles
// Admin endpoint to get all articles (drafts + published) for management
router.get('/admin/articles', async (req, res) => {
  try {
    const articles = await Article.find()
      .populate('category', 'name')
      .populate('author', 'name')
      .sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) {
    console.error('Error fetching admin articles:', error);
    res.status(500).json({ message: 'Server error fetching admin articles' });
  }
});

// DELETE /api/publishing/admin/articles/:id
router.delete('/admin/articles/:id', async (req, res) => {
  try {
    const article = await Article.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    res.status(500).json({ message: 'Server error deleting article' });
  }
});

// GET /api/publishing/admin/analytics
router.get('/admin/analytics', async (req, res) => {
  try {
    const [articles, categories] = await Promise.all([
      Article.find().select('title views status category difficulty createdAt tags'),
      ArticleCategory.find()
    ]);

    const totalViews = articles.reduce((s, a) => s + (a.views || 0), 0);
    const published = articles.filter(a => a.status === 'published');
    const drafts = articles.filter(a => a.status === 'draft');

    // Views by category
    const viewsByCategory = {};
    for (const art of articles) {
      const catId = art.category?.toString();
      const cat = categories.find(c => c._id.toString() === catId);
      const name = cat?.name || 'Uncategorized';
      viewsByCategory[name] = (viewsByCategory[name] || 0) + (art.views || 0);
    }

    // Articles by difficulty
    const byDifficulty = { Beginner: 0, Intermediate: 0, Advanced: 0 };
    for (const art of published) {
      byDifficulty[art.difficulty || 'Beginner']++;
    }

    // Top articles
    const topArticles = [...published].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10).map(a => ({
      title: a.title, views: a.views
    }));

    // All tags with counts
    const tagCounts = {};
    for (const art of published) {
      for (const tag of (art.tags || [])) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    res.json({
      totalArticles: articles.length,
      publishedCount: published.length,
      draftCount: drafts.length,
      totalViews,
      totalCategories: categories.length,
      viewsByCategory,
      byDifficulty,
      topArticles,
      tagCounts
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
