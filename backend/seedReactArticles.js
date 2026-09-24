import mongoose from 'mongoose';
import ArticleCategory from './src/models/ArticleCategory.js';
import Article from './src/models/Article.js';
import slugify from 'slugify';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox';

const articles = [
  {
    title: "Introduction to React Hooks",
    content: "<h2>What are Hooks?</h2><p>Hooks allow you to use state and other React features without writing a class.</p><pre><code>const [count, setCount] = useState(0);</code></pre>"
  },
  {
    title: "Understanding useEffect",
    content: "<h2>Side Effects in React</h2><p>The useEffect Hook lets you perform side effects in function components.</p><pre><code>useEffect(() => {\n  document.title = `You clicked ${count} times`;\n}, [count]);</code></pre>"
  },
  {
    title: "React Context API Tutorial",
    content: "<h2>Global State</h2><p>Context provides a way to pass data through the component tree without having to pass props down manually at every level.</p>"
  },
  {
    title: "Building Custom Hooks",
    content: "<h2>Reusing Logic</h2><p>Building your own Hooks lets you extract component logic into reusable functions.</p><pre><code>function useFriendStatus(friendID) {\n  const [isOnline, setIsOnline] = useState(null);\n  // ...\n  return isOnline;\n}</code></pre>"
  },
  {
    title: "Performance Optimization in React",
    content: "<h2>React.memo and useMemo</h2><p>React provides several ways to optimize the performance of your applications.</p>"
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Create category
    const catName = "React.js";
    let category = await ArticleCategory.findOne({ slug: slugify(catName, { lower: true }) });
    
    if (!category) {
      category = await ArticleCategory.create({
        name: catName,
        slug: slugify(catName, { lower: true }),
        description: "Learn all about React.js, hooks, context, and more.",
        order: 1
      });
      console.log('Created React.js category');
    } else {
      console.log('React.js category already exists');
    }

    // Insert articles
    for (const art of articles) {
      const slug = slugify(art.title, { lower: true });
      const existing = await Article.findOne({ slug });
      if (!existing) {
        await Article.create({
          title: art.title,
          slug,
          category: category._id,
          content: art.content,
          status: 'published',
          tags: ['react', 'javascript', 'frontend'],
        });
        console.log(`Published: ${art.title}`);
      } else {
        console.log(`Already exists: ${art.title}`);
      }
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
