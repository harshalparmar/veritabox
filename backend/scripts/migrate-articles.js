import mongoose from 'mongoose';
import slugify from 'slugify';
import dotenv from 'dotenv';
import KnowledgeArticle from '../src/models/KnowledgeArticle.js';
import Category from '../src/models/Category.js';

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox');
    console.log("Connected to MongoDB for migration...");

    // 1. Ensure "General" category exists
    let generalCat = await Category.findOne({ name: 'General' });
    if (!generalCat) {
      generalCat = await Category.create({ name: 'General', slug: 'general' });
      console.log("Created 'General' category.");
    }

    // 2. Fetch all articles
    const articles = await KnowledgeArticle.find({});
    console.log(`Migrating ${articles.length} articles...`);

    for (const article of articles) {
      if (!article.categoryId || !article.slug) {
        article.categoryId = generalCat._id;
        article.slug = slugify(article.title, { lower: true, strict: true }) + '-' + Math.random().toString(36).substring(2, 7);
        await article.save();
        console.log(`Migrated: ${article.title}`);
      }
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

migrate();
