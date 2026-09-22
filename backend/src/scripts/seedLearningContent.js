/**
 * scripts/seedLearningContent.js
 * Seeds realistic career goals, skills, and learning content for demo/development.
 * Run: node scripts/seedLearningContent.js
 * 
 * This creates enough content for the AI roadmap generator to work end-to-end.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import CareerGoal from '../models/CareerGoal.js';
import Skill from '../models/Skill.js';
import LearningContent from '../models/LearningContent.js';

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox');
  console.log('✅ Connected to MongoDB');

  // ── Career Goals ─────────────────────────────────────────────────
  const goalDefs = [
    { title: 'Frontend Developer', description: 'Build beautiful, responsive web UIs', icon: 'Layout', tags: ['web', 'ui', 'react'], suggestedDurationDays: 90, order: 1 },
    { title: 'Full Stack Developer', description: 'Master both frontend and backend development', icon: 'Code', tags: ['web', 'react', 'node', 'fullstack'], suggestedDurationDays: 180, order: 2 },
    { title: 'Backend Developer', description: 'Build robust APIs and server-side systems', icon: 'Database', tags: ['api', 'node', 'databases'], suggestedDurationDays: 120, order: 3 },
    { title: 'Data Analyst', description: 'Analyze and visualize data for insights', icon: 'BarChart', tags: ['data', 'sql', 'python', 'analytics'], suggestedDurationDays: 90, order: 4 },
    { title: 'DevOps Engineer', description: 'Automate infrastructure and deployments', icon: 'Server', tags: ['devops', 'docker', 'cloud'], suggestedDurationDays: 120, order: 5 },
  ];

  const goals = {};
  for (const g of goalDefs) {
    const slug = g.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const existing = await CareerGoal.findOneAndUpdate(
      { slug },
      { ...g, slug, status: 'Active' },
      { upsert: true, new: true }
    );
    goals[g.title] = existing;
    console.log(`✅ Career Goal: ${g.title}`);
  }

  // ── Skills for Frontend Developer & Full Stack Developer ─────────
  const skillDefs = [
    { name: 'HTML', category: 'Frontend', difficulty: 'Beginner', goals: ['Frontend Developer', 'Full Stack Developer'], estimatedHours: 8, order: 1 },
    { name: 'CSS', category: 'Frontend', difficulty: 'Beginner', goals: ['Frontend Developer', 'Full Stack Developer'], estimatedHours: 10, order: 2 },
    { name: 'JavaScript', category: 'Frontend', difficulty: 'Beginner', goals: ['Frontend Developer', 'Full Stack Developer', 'Backend Developer'], estimatedHours: 20, order: 3 },
    { name: 'TypeScript', category: 'Frontend', difficulty: 'Intermediate', goals: ['Frontend Developer', 'Full Stack Developer'], estimatedHours: 15, order: 4 },
    { name: 'React', category: 'Frontend', difficulty: 'Intermediate', goals: ['Frontend Developer', 'Full Stack Developer'], estimatedHours: 20, order: 5 },
    { name: 'Responsive Design', category: 'Frontend', difficulty: 'Beginner', goals: ['Frontend Developer', 'Full Stack Developer'], estimatedHours: 8, order: 6 },
    { name: 'Node.js', category: 'Backend', difficulty: 'Intermediate', goals: ['Full Stack Developer', 'Backend Developer'], estimatedHours: 20, order: 7 },
    { name: 'REST APIs', category: 'Backend', difficulty: 'Intermediate', goals: ['Full Stack Developer', 'Backend Developer'], estimatedHours: 15, order: 8 },
    { name: 'MongoDB', category: 'Database', difficulty: 'Intermediate', goals: ['Full Stack Developer', 'Backend Developer'], estimatedHours: 15, order: 9 },
    { name: 'Git & Version Control', category: 'Tools', difficulty: 'Beginner', goals: ['Frontend Developer', 'Full Stack Developer', 'Backend Developer'], estimatedHours: 5, order: 10 },
    { name: 'SQL', category: 'Database', difficulty: 'Beginner', goals: ['Data Analyst', 'Backend Developer', 'Full Stack Developer'], estimatedHours: 15, order: 11 },
    { name: 'Python', category: 'Programming', difficulty: 'Beginner', goals: ['Data Analyst'], estimatedHours: 20, order: 12 },
  ];

  const skills = {};
  for (const s of skillDefs) {
    const slug = s.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const careerGoals = s.goals.map(g => goals[g]?._id).filter(Boolean);
    const existing = await Skill.findOneAndUpdate(
      { slug },
      { ...s, slug, careerGoals, status: 'Active' },
      { upsert: true, new: true }
    );
    skills[s.name] = existing;

    // Link to career goals
    for (const goalId of careerGoals) {
      await CareerGoal.findByIdAndUpdate(goalId, { $addToSet: { skills: existing._id } });
    }
    console.log(`✅ Skill: ${s.name}`);
  }

  // ── Learning Content ──────────────────────────────────────────────
  const contentDefs = [
    {
      title: 'Introduction to HTML',
      skill: 'HTML',
      goals: ['Frontend Developer', 'Full Stack Developer'],
      difficulty: 'Beginner',
      estimatedMinutes: 45,
      order: 1,
      description: 'Learn the building blocks of every webpage',
      theoryContent: `# Introduction to HTML

HTML (HyperText Markup Language) is the standard language for creating web pages.

## What is HTML?
HTML describes the **structure** of a web page using **elements** represented by tags.

## Basic Structure
\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>My First Page</title>
  </head>
  <body>
    <h1>Hello, World!</h1>
    <p>This is a paragraph.</p>
  </body>
</html>
\`\`\`

## Key Elements
- \`<h1>–<h6>\`: Headings
- \`<p>\`: Paragraph
- \`<a href="">\`: Link
- \`<img src="">\`: Image
- \`<div>\`: Block container
- \`<span>\`: Inline container

## Semantic HTML
Always use semantic elements:
- \`<header>\`, \`<main>\`, \`<footer>\`
- \`<article>\`, \`<section>\`, \`<aside>\`
- \`<nav>\`, \`<figure>\`

## Common Mistakes
- Forgetting to close tags
- Using \`<br>\` instead of CSS margin
- Nesting block elements inside inline elements`,
      conceptSummary: 'HTML is the skeleton of every webpage — it defines structure and meaning.',
      commonMistakes: ['Forgetting to close tags', 'Using div for everything instead of semantic HTML', 'Missing alt attributes on images'],
      bestPractices: ['Use semantic HTML5 elements', 'Always add alt text to images', 'Validate your HTML with W3C validator'],
      quizQuestions: [
        {
          questionText: 'What does HTML stand for?',
          type: 'MCQ',
          options: ['HyperText Markup Language', 'Home Tool Markup Language', 'Hyperlinks and Text Markup Language', 'None of the above'],
          correctAnswer: 'HyperText Markup Language',
          explanation: 'HTML stands for HyperText Markup Language — it is the standard language for creating web pages.',
          points: 10,
          difficulty: 'Beginner'
        },
        {
          questionText: 'Which HTML element is used for the largest heading?',
          type: 'MCQ',
          options: ['<heading>', '<h6>', '<h1>', '<head>'],
          correctAnswer: '<h1>',
          explanation: '<h1> defines the most important (largest) heading. <h6> is the least important.',
          points: 10,
          difficulty: 'Beginner'
        },
        {
          questionText: 'Which of the following are semantic HTML5 elements?',
          type: 'MultiSelect',
          options: ['<div>', '<article>', '<section>', '<span>', '<footer>'],
          correctAnswers: ['<article>', '<section>', '<footer>'],
          explanation: 'Semantic elements like <article>, <section>, and <footer> clearly describe their purpose. <div> and <span> are non-semantic.',
          points: 15,
          difficulty: 'Beginner'
        }
      ],
      quizPassScore: 60,
      practiceTask: {
        title: 'Build a simple personal bio page',
        description: 'Create an HTML page that includes your name as an h1 heading, a short bio paragraph, a list of 3 hobbies, and an image (can be placeholder).',
        submissionType: 'Code',
        language: 'html',
        starterCode: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <title>My Bio</title>\n</head>\n<body>\n  <!-- Add your content here -->\n</body>\n</html>',
        hints: ['Use <h1> for your name', 'Use <p> for bio', 'Use <ul> and <li> for hobbies'],
        estimatedMinutes: 30
      },
      resources: [
        { title: 'MDN HTML Basics', type: 'Documentation', url: 'https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/HTML_basics', source: 'MDN Web Docs', isFree: true },
        { title: 'HTML Full Tutorial - freeCodeCamp', type: 'Video', url: 'https://www.youtube.com/watch?v=pQN-pnXPaVg', source: 'YouTube', isFree: true }
      ],
      isDiagnosticEligible: true
    },
    {
      title: 'CSS Fundamentals',
      skill: 'CSS',
      goals: ['Frontend Developer', 'Full Stack Developer'],
      difficulty: 'Beginner',
      estimatedMinutes: 60,
      order: 1,
      description: 'Style your HTML with CSS — colors, fonts, layouts, and more',
      theoryContent: `# CSS Fundamentals

CSS (Cascading Style Sheets) controls the **appearance** of HTML elements.

## How to Add CSS
\`\`\`html
<!-- External (recommended) -->
<link rel="stylesheet" href="styles.css">

<!-- Internal -->
<style>
  h1 { color: blue; }
</style>
\`\`\`

## CSS Selectors
\`\`\`css
/* Element */
p { color: gray; }

/* Class */
.highlight { background: yellow; }

/* ID */
#header { font-size: 24px; }

/* Descendant */
nav a { text-decoration: none; }
\`\`\`

## The Box Model
Every element has: margin → border → padding → content.

## Common Properties
- \`color\`, \`background-color\`
- \`font-family\`, \`font-size\`, \`font-weight\`
- \`margin\`, \`padding\`, \`border\`
- \`width\`, \`height\`
- \`display\`: block, inline, flex, grid`,
      conceptSummary: 'CSS is the language of web design — it controls how HTML looks on screen.',
      commonMistakes: ['Overusing IDs for styling (use classes)', 'Forgetting to set box-sizing: border-box', 'Not using shorthand properties'],
      bestPractices: ['Use external stylesheets', 'Follow BEM naming convention', 'Mobile-first approach'],
      quizQuestions: [
        {
          questionText: 'Which CSS property controls the text color?',
          type: 'MCQ',
          options: ['text-color', 'font-color', 'color', 'foreground'],
          correctAnswer: 'color',
          explanation: 'The "color" property sets the text color in CSS.',
          points: 10,
          difficulty: 'Beginner'
        },
        {
          questionText: 'In CSS, what does the "box model" consist of?',
          type: 'MCQ',
          options: ['content, padding, border, margin', 'content, spacing, outline, frame', 'inner, outer, border, gutter', 'None of the above'],
          correctAnswer: 'content, padding, border, margin',
          explanation: 'The CSS box model consists of content (innermost), padding, border, and margin (outermost).',
          points: 10,
          difficulty: 'Beginner'
        }
      ],
      quizPassScore: 60,
      practiceTask: {
        title: 'Style your bio page with CSS',
        description: 'Add CSS to the HTML bio page you created. Change the font, add colors, center the page, and add some padding.',
        submissionType: 'Code',
        language: 'css',
        hints: ['Use font-family to change the font', 'Use max-width and margin: auto to center', 'Use background-color on the body'],
        estimatedMinutes: 30
      },
      resources: [
        { title: 'MDN CSS Basics', type: 'Documentation', url: 'https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/CSS_basics', source: 'MDN Web Docs', isFree: true },
        { title: 'CSS Tutorial - W3Schools', type: 'Article', url: 'https://www.w3schools.com/css/', source: 'W3Schools', isFree: true }
      ],
      isDiagnosticEligible: true
    },
    {
      title: 'JavaScript Basics',
      skill: 'JavaScript',
      goals: ['Frontend Developer', 'Full Stack Developer', 'Backend Developer'],
      difficulty: 'Beginner',
      estimatedMinutes: 90,
      order: 1,
      description: 'Learn the fundamentals of JavaScript programming',
      theoryContent: `# JavaScript Basics

JavaScript makes web pages interactive and dynamic.

## Variables
\`\`\`javascript
let name = "Alice";      // can be reassigned
const age = 25;          // cannot be reassigned
var legacy = "avoid";    // old way, avoid
\`\`\`

## Data Types
- String: \`"hello"\`
- Number: \`42\`
- Boolean: \`true\` / \`false\`
- Array: \`[1, 2, 3]\`
- Object: \`{ name: "Alice", age: 25 }\`
- null, undefined

## Functions
\`\`\`javascript
// Function declaration
function greet(name) {
  return "Hello, " + name;
}

// Arrow function
const greet = (name) => \`Hello, \${name}\`;
\`\`\`

## Control Flow
\`\`\`javascript
if (age >= 18) {
  console.log("Adult");
} else {
  console.log("Minor");
}

for (let i = 0; i < 5; i++) {
  console.log(i);
}
\`\`\``,
      conceptSummary: 'JavaScript is the programming language of the web — it adds behavior and interactivity.',
      commonMistakes: ['Using var instead of let/const', 'Comparing with == instead of ===', 'Not handling async code properly'],
      bestPractices: ['Always use const by default, let when needed', 'Use === for comparisons', 'Use meaningful variable names'],
      quizQuestions: [
        {
          questionText: 'Which keyword declares a variable that cannot be reassigned?',
          type: 'MCQ',
          options: ['let', 'var', 'const', 'static'],
          correctAnswer: 'const',
          explanation: 'const declares a variable that cannot be reassigned after its initial value is set.',
          points: 10,
          difficulty: 'Beginner'
        },
        {
          questionText: 'What is the output of: console.log(typeof "hello")?',
          type: 'MCQ',
          options: ['"hello"', 'string', 'String', 'text'],
          correctAnswer: 'string',
          explanation: 'The typeof operator returns a lowercase string. typeof "hello" returns "string".',
          points: 10,
          difficulty: 'Beginner'
        },
        {
          questionText: 'Which of the following are valid ways to declare a function in JavaScript?',
          type: 'MultiSelect',
          options: ['function greet() {}', 'const greet = () => {}', 'const greet = function() {}', 'def greet():'],
          correctAnswers: ['function greet() {}', 'const greet = () => {}', 'const greet = function() {}'],
          explanation: 'JavaScript supports function declarations, arrow functions, and function expressions. "def" is Python syntax.',
          points: 15,
          difficulty: 'Beginner'
        }
      ],
      quizPassScore: 60,
      practiceTask: {
        title: 'Write a simple calculator function',
        description: 'Write a JavaScript function called calculate(a, operator, b) that takes two numbers and an operator (+, -, *, /) and returns the result.',
        submissionType: 'Code',
        language: 'javascript',
        starterCode: 'function calculate(a, operator, b) {\n  // Your code here\n}',
        hints: ['Use if/else or switch for the operator', 'Handle division by zero', 'Return the result'],
        estimatedMinutes: 30
      },
      resources: [
        { title: 'MDN JavaScript Guide', type: 'Documentation', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide', source: 'MDN Web Docs', isFree: true },
        { title: 'JavaScript.info', type: 'Article', url: 'https://javascript.info/', source: 'javascript.info', isFree: true }
      ],
      isDiagnosticEligible: true
    },
    {
      title: 'React Fundamentals',
      skill: 'React',
      goals: ['Frontend Developer', 'Full Stack Developer'],
      difficulty: 'Intermediate',
      estimatedMinutes: 90,
      order: 1,
      description: 'Build dynamic UIs with React components and hooks',
      theoryContent: `# React Fundamentals

React is a JavaScript library for building user interfaces using components.

## Components
\`\`\`jsx
// Functional component
function Welcome({ name }) {
  return <h1>Hello, {name}!</h1>;
}
\`\`\`

## JSX
JSX allows you to write HTML-like syntax in JavaScript.

## State with useState
\`\`\`jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}
\`\`\`

## Effects with useEffect
\`\`\`jsx
import { useEffect, useState } from 'react';

function Users() {
  const [users, setUsers] = useState([]);
  
  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(setUsers);
  }, []); // [] = run once on mount
}
\`\`\``,
      conceptSummary: 'React makes UI development declarative — you describe what the UI should look like, React handles updates.',
      commonMistakes: ['Mutating state directly', 'Missing dependency arrays in useEffect', 'Not using keys in lists'],
      bestPractices: ['Keep components small and focused', 'Lift state up when needed', 'Use custom hooks to share logic'],
      quizQuestions: [
        {
          questionText: 'What hook do you use to add local state to a functional component?',
          type: 'MCQ',
          options: ['useEffect', 'useState', 'useRef', 'useContext'],
          correctAnswer: 'useState',
          explanation: 'useState is the React hook for adding local state to functional components.',
          points: 10,
          difficulty: 'Intermediate'
        },
        {
          questionText: 'When does useEffect with an empty dependency array ([]) run?',
          type: 'MCQ',
          options: ['Every render', 'Only once after the initial render', 'Only when state changes', 'Never'],
          correctAnswer: 'Only once after the initial render',
          explanation: 'An empty [] dependency array tells React to run the effect only once after the initial render — equivalent to componentDidMount.',
          points: 10,
          difficulty: 'Intermediate'
        }
      ],
      quizPassScore: 60,
      practiceTask: {
        title: 'Build a Todo List component',
        description: 'Create a React component that allows users to add todos, mark them as complete, and delete them.',
        submissionType: 'Code',
        language: 'jsx',
        starterCode: 'import { useState } from "react";\n\nfunction TodoList() {\n  // Your code here\n}',
        hints: ['Use useState for the todos array', 'Use map() to render the list', 'Use filter() for deletion'],
        estimatedMinutes: 45
      },
      resources: [
        { title: 'React Official Docs', type: 'Documentation', url: 'https://react.dev/', source: 'React', isFree: true },
        { title: 'React Tutorial for Beginners', type: 'Video', url: 'https://www.youtube.com/watch?v=SqcY0GlETPk', source: 'YouTube', isFree: true }
      ],
      isDiagnosticEligible: true
    },
    {
      title: 'Node.js and Express Basics',
      skill: 'Node.js',
      goals: ['Full Stack Developer', 'Backend Developer'],
      difficulty: 'Intermediate',
      estimatedMinutes: 90,
      order: 1,
      description: 'Build server-side applications with Node.js and Express',
      theoryContent: `# Node.js and Express Basics

Node.js lets you run JavaScript on the server. Express is the most popular Node.js framework.

## Your First Server
\`\`\`javascript
import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
\`\`\`

## Route Parameters
\`\`\`javascript
app.get('/api/users/:id', (req, res) => {
  const { id } = req.params;
  // fetch user by id
  res.json({ id });
});
\`\`\`

## Middleware
\`\`\`javascript
// Custom middleware
const logger = (req, res, next) => {
  console.log(\`\${req.method} \${req.path}\`);
  next(); // pass to next middleware
};

app.use(logger);
\`\`\``,
      conceptSummary: 'Node.js + Express = the most popular server-side JavaScript stack for building REST APIs.',
      commonMistakes: ['Not handling async errors with try/catch', 'Forgetting res.json() or res.send()', 'Blocking the event loop with sync operations'],
      bestPractices: ['Always validate request input', 'Use async/await with proper error handling', 'Separate route handlers from business logic'],
      quizQuestions: [
        {
          questionText: 'What method do you call to send a JSON response in Express?',
          type: 'MCQ',
          options: ['res.send()', 'res.json()', 'res.write()', 'res.output()'],
          correctAnswer: 'res.json()',
          explanation: 'res.json() automatically sets the Content-Type to application/json and serializes the object.',
          points: 10,
          difficulty: 'Intermediate'
        }
      ],
      quizPassScore: 60,
      practiceTask: {
        title: 'Build a simple REST API',
        description: 'Create an Express API with routes to GET all items, POST a new item, and DELETE an item by ID (using an in-memory array).',
        submissionType: 'Code',
        language: 'javascript',
        hints: ['Start with app.get("/items", ...)', 'Use app.post("/items", ...)', 'Use app.delete("/items/:id", ...)'],
        estimatedMinutes: 45
      },
      resources: [
        { title: 'Node.js Official Docs', type: 'Documentation', url: 'https://nodejs.org/docs/latest/api/', source: 'Node.js', isFree: true },
        { title: 'Express.js Guide', type: 'Documentation', url: 'https://expressjs.com/en/guide/routing.html', source: 'Express.js', isFree: true }
      ],
      isDiagnosticEligible: true
    }
  ];

  for (const c of contentDefs) {
    const slug = c.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const careerGoals = c.goals.map(g => goals[g]?._id).filter(Boolean);
    const skillDoc = skills[c.skill];
    if (!skillDoc) { console.warn(`⚠️ Skill not found: ${c.skill}`); continue; }

    await LearningContent.findOneAndUpdate(
      { slug },
      {
        ...c,
        slug,
        skill: skillDoc._id,
        careerGoals,
        status: 'Published',
        isDiagnosticEligible: c.isDiagnosticEligible !== false
      },
      { upsert: true, new: true }
    );
    console.log(`✅ Content: ${c.title}`);
  }

  console.log('\n🎉 Seed complete! Career goals, skills, and learning content are ready.');
  console.log('📌 You can now run the AI roadmap generator for Frontend Developer and Full Stack Developer goals.');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
