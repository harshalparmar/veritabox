import express from 'express';
import { protect, optionalProtect } from '../middleware/authMiddleware.js';
import { sanitizeUserContent } from '../utils/security.js';
import KnowledgeArticle from '../models/KnowledgeArticle.js';
import Comment from '../models/Comment.js';
import ArticleCollection from '../models/ArticleCollection.js';
import Category from '../models/Category.js';
import Chapter from '../models/Chapter.js';
import User from '../models/User.js';

const router = express.Router();

// --- CATEGORIES ---

router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({}).sort({ name: 1 });
    res.json(categories);
  } catch (error) { res.status(500).json({ message: 'Error fetching categories: ' + error.message }); }
});

router.post('/categories', protect, async (req, res) => {
  try {
    if (!['Admin'].includes(req.user.role)) return res.status(403).json({ message: 'Unauthorized' });
    const category = await Category.create({
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description,
      icon: req.body.icon
    });
    res.status(201).json(category);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'This category already exists.' });
    res.status(500).json({ message: 'Error creating category: ' + error.message });
  }
});

// --- COLLECTIONS ---

router.get('/collections', async (req, res) => {
  try {
    const collections = await ArticleCollection.find({}).populate('author', 'name role').sort({ createdAt: -1 });
    res.json(collections);
  } catch (error) { res.status(500).json({ message: 'Error' }); }
});

router.post('/collections', protect, async (req, res) => {
  try {
    if (!['Admin'].includes(req.user.role)) return res.status(403).json({ message: 'Unauthorized' });
    const { title, description, coverImage, articles, isFeatured } = req.body;
    const collection = await ArticleCollection.create({
      title, description, coverImage, articles, isFeatured,
      author: req.user._id,
    });
    res.status(201).json(collection);
  } catch (error) { res.status(500).json({ message: 'Error' }); }
});

// --- ARTICLES ---

// GET /api/knowledge - Retrieve articles (Supports category filtering)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    // Public view only shows published articles
    const filter = (category && category.trim() !== '') 
      ? { categoryId: category, isPublished: true } 
      : { isPublished: true };

    const articles = await KnowledgeArticle.find(filter)
      .populate('author', 'name role')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) { res.status(500).json({ message: 'Error retrieving articles: ' + error.message }); }
});

// GET /api/knowledge/bookmarked/me
router.get('/bookmarked/me', protect, async (req, res) => {
  try {
    const articles = await KnowledgeArticle.find({ bookmarks: req.user._id }).populate('author', 'name role').sort({ createdAt: -1 });
    res.json(articles);
  } catch (error) { res.status(500).json({ message: 'Error fetching bookmarks: ' + error.message }); }
});

// GET /api/knowledge/slug/:slug - Fetch by SEO slug
router.get('/slug/:slug', optionalProtect, async (req, res) => {
  try {
    const article = await KnowledgeArticle.findOne({ slug: req.params.slug })
      .populate('author', 'name role')
      .populate('categoryId', 'name');
    
    if (!article) return res.status(404).json({ message: 'Article not found' });

    // If not published, only allow Author or Admin
    if (!article.isPublished) {
      const allowedRoles = ['Admin'];
      const isAuthorized = req.user && (
        article.author._id.toString() === req.user._id.toString() || 
        allowedRoles.includes(req.user.role)
      );

      if (!isAuthorized) {
        return res.status(404).json({ message: 'Article not found' });
      }
    }

    const collection = await ArticleCollection.findOne({ articles: article._id }).populate({ path: 'articles', select: 'title _id slug' });
    res.json({ article, parentCollection: collection || null });
  } catch (error) { res.status(500).json({ message: 'Error fetching article by slug: ' + error.message }); }
});

// GET /api/knowledge/comments/:commentId/solution - MOVE THIS ABOVE /:id
router.put('/comments/:commentId/solution', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    const article = await KnowledgeArticle.findById(comment.articleId);
    if (article.author.toString() !== req.user._id.toString() && req.user.role !== 'Admin') return res.status(403).json({ message: 'Unauthorized' });
    comment.isSolution = !comment.isSolution;
    await comment.save();
    if (comment.isSolution) await Comment.updateMany({ articleId: article._id, _id: { $ne: comment._id } }, { isSolution: false });
    res.json(comment);
  } catch (error) { res.status(500).json({ message: 'Error' }); }
});

// GET /api/knowledge/:id - Fetch by ID (Internal/Admin)
router.get('/:id', optionalProtect, async (req, res) => {
  try {
    const article = await KnowledgeArticle.findById(req.params.id)
      .populate('author', 'name role')
      .populate('categoryId', 'name');
    if (!article) return res.status(404).json({ message: 'Article not found' });

    // Unpublished drafts are visible only to the author or an Admin.
    if (!article.isPublished) {
      const authorId = article.author?._id ? article.author._id.toString() : article.author?.toString();
      const isAuthorized = req.user && (
        authorId === req.user._id.toString() ||
        req.user.role === 'Admin'
      );
      if (!isAuthorized) return res.status(404).json({ message: 'Article not found' });
    }

    res.json(article);
  } catch (error) { res.status(500).json({ message: 'Error fetching article by ID: ' + error.message }); }
});

// POST /api/knowledge - Create article
router.post('/', protect, async (req, res) => {
  try {
    const { title, content, categoryId, slug, metaDescription, keywords, hardwareUsed, coverImage, attachments } = req.body;
    if (await KnowledgeArticle.findOne({ slug })) return res.status(400).json({ message: 'Slug already exists' });
    const sanitizedContent = content ? sanitizeUserContent(content) : '';
    const article = await KnowledgeArticle.create({ title, content: sanitizedContent, categoryId, slug, metaDescription, keywords, hardwareUsed: hardwareUsed || [], coverImage, attachments: attachments || [], author: req.user._id });
    res.status(201).json(article);
  } catch (error) { res.status(500).json({ message: 'Error: ' + error.message }); }
});

// PUT /api/knowledge/:id - Update article
router.put('/:id', protect, async (req, res) => {
  try {
    const article = await KnowledgeArticle.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });

    if (article.author.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized modification attempt.' });
    }

    const { title, content, categoryId, slug, metaDescription, keywords, hardwareUsed, coverImage, attachments } = req.body;
    
    if (slug && slug !== article.slug) {
        if (await KnowledgeArticle.findOne({ slug })) return res.status(400).json({ message: 'Target slug is already claimed.' });
    }

    article.title = title || article.title;
    article.content = content ? sanitizeUserContent(content) : article.content;
    article.categoryId = categoryId || article.categoryId;
    article.slug = slug || article.slug;
    article.metaDescription = metaDescription || article.metaDescription;
    article.keywords = keywords || article.keywords;
    article.hardwareUsed = hardwareUsed !== undefined ? hardwareUsed : article.hardwareUsed;
    article.coverImage = coverImage !== undefined ? coverImage : article.coverImage;
    article.attachments = attachments !== undefined ? attachments : article.attachments;

    await article.save();
    res.json(article);
  } catch (error) { res.status(500).json({ message: 'Error: ' + error.message }); }
});

// DELETE /api/knowledge/:id - Delete article
router.delete('/:id', protect, async (req, res) => {
  try {
    const article = await KnowledgeArticle.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });

    if (article.author.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Unauthorized purge attempt.' });
    }

    await KnowledgeArticle.findByIdAndDelete(req.params.id);
    res.json({ message: 'Article purged from registry.' });
  } catch (error) { res.status(500).json({ message: 'Error' }); }
});

// --- INTERACTIONS ---

router.post('/:id/upvote', protect, async (req, res) => {
  try {
    const article = await KnowledgeArticle.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    const alreadyUpvoted = article.upvotes.some(id => id.toString() === req.user._id.toString());
    // Symmetric reputation: +5 on upvote, -5 on un-upvote. Toggling therefore
    // nets zero, so a user cannot farm reputation by repeatedly toggling.
    let repDelta = 0;
    if (alreadyUpvoted) {
      article.upvotes = article.upvotes.filter(id => id.toString() !== req.user._id.toString());
      repDelta = -5;
    } else {
      article.upvotes.push(req.user._id);
      repDelta = 5;
    }

    const author = await User.findById(article.author);
    if (author && author.chapterId) {
      await Chapter.findByIdAndUpdate(author.chapterId, {
        $inc: { 'stats.totalReputation': repDelta, 'stats.reputationVelocity': repDelta }
      });
    }
    await article.save();
    res.json(article);
  } catch (error) { res.status(500).json({ message: 'Error toggling upvote: ' + error.message }); }
});

router.post('/:id/bookmark', protect, async (req, res) => {
  try {
    const article = await KnowledgeArticle.findById(req.params.id);
    if (!article) return res.status(404).json({ message: 'Article not found' });
    if (article.bookmarks.includes(req.user._id)) {
      article.bookmarks = article.bookmarks.filter(id => id.toString() !== req.user._id.toString());
    } else { article.bookmarks.push(req.user._id); }
    await article.save();
    res.json(article);
  } catch (error) { res.status(500).json({ message: 'Error toggling bookmark' }); }
});

router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.find({ articleId: req.params.id }).populate('author', 'name role').sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) { res.status(500).json({ message: 'Error' }); }
});

router.post('/:id/comments', protect, async (req, res) => {
  try {
    const content = sanitizeUserContent(req.body.content || '');
    const comment = await Comment.create({ articleId: req.params.id, author: req.user._id, content });
    res.status(201).json(await comment.populate('author', 'name role'));
  } catch (error) { res.status(500).json({ message: 'Error' }); }
});

// POST /api/knowledge/:id/view - Register a new view atomically (only triggered once per session on frontend)
// WARNING: This endpoint has no server-side rate limiting. A malicious client can
// rapidly inflate view counts. Consider adding IP-based rate limiting middleware
// (e.g., express-rate-limit) to prevent abuse in production.
router.post('/:id/view', async (req, res) => {
  try {
    const article = await KnowledgeArticle.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    );
    if (!article) return res.status(404).json({ message: 'Article not found' });
    res.json({ viewsCount: article.viewsCount });
  } catch (error) {
    res.status(500).json({ message: 'Error registering view: ' + error.message });
  }
});

export default router;
