import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import CareerGoal from './src/models/CareerGoal.js';
import Skill from './src/models/Skill.js';
import LearningContent from './src/models/LearningContent.js';

async function seed() {
  try {
    console.log('Connecting to MongoDB...', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    await CareerGoal.deleteMany({});
    await Skill.deleteMany({});
    await LearningContent.deleteMany({});
    console.log('Cleared old CareerGoals, Skills, and LearningContent.');

    const goal = await CareerGoal.create({
      title: "Full Stack Web Developer",
      slug: "full-stack-web-developer",
      description: "Build robust and scalable web applications using modern JavaScript frameworks.",
      status: "Active",
      suggestedDurationDays: 120
    });
    console.log(`Created Goal: ${goal.title}`);

    const skillReact = await Skill.create({
      name: "React.js",
      slug: "react-js",
      category: "Frontend",
      careerGoals: [goal._id],
      difficulty: "Intermediate",
      status: "Active"
    });
    const skillNode = await Skill.create({
      name: "Node.js",
      slug: "node-js",
      category: "Backend",
      careerGoals: [goal._id],
      difficulty: "Intermediate",
      status: "Active"
    });
    const skillMongo = await Skill.create({
      name: "MongoDB",
      slug: "mongodb",
      category: "Database",
      careerGoals: [goal._id],
      difficulty: "Beginner",
      status: "Active"
    });
    console.log('Created Skills: React, Node, MongoDB');

    await LearningContent.create({
      title: "React Components & State",
      slug: "react-components-state",
      skill: skillReact._id,
      careerGoals: [goal._id],
      difficulty: "Beginner",
      estimatedMinutes: 60,
      description: "Learn how to build reusable UI components and manage state in React.",
      conceptSummary: "React components are independent, reusable pieces of UI. State holds data that changes over time.",
      theoryContent: `# Introduction to React Components\n\nComponents are the building blocks of any React app. You can think of them as JavaScript functions that return HTML via JSX.\n\n## State\nState allows components to create and manage their own data.`,
      status: "Published",
      hasPracticeTask: true,
      practiceTask: {
        title: "Build a Counter Component",
        description: "Create a functional component that displays a number and has two buttons to increment and decrement the number.",
        submissionType: "Code",
        language: "javascript",
        starterCode: "function Counter() {\n  // your code here\n  return <div>Counter</div>;\n}",
        requiresVerification: true
      },
      quizQuestions: [
        {
          questionText: "Which hook is used to manage state in a functional component?",
          type: "MCQ",
          options: ["useEffect", "useState", "useContext", "useReducer"],
          correctAnswer: "useState",
          explanation: "useState is the primary hook for adding local state to function components."
        }
      ]
    });

    await LearningContent.create({
      title: "Advanced React Hooks",
      slug: "advanced-react-hooks",
      skill: skillReact._id,
      careerGoals: [goal._id],
      difficulty: "Advanced",
      estimatedMinutes: 90,
      description: "Deep dive into useMemo, useCallback, and custom hooks.",
      conceptSummary: "Optimize performance and reuse logic with advanced hooks.",
      theoryContent: `# Advanced Hooks\n\n\`useMemo\` memoizes values, \`useCallback\` memoizes functions.`,
      status: "Published",
      hasPracticeTask: true,
      practiceTask: {
        title: "Create a Custom Fetch Hook",
        description: "Write a useFetch custom hook that handles loading, error, and data states.",
        submissionType: "Code",
        language: "javascript",
        starterCode: "function useFetch(url) {\n  // your code here\n}",
        requiresVerification: true
      },
      quizQuestions: []
    });

    await LearningContent.create({
      title: "Building REST APIs with Express",
      slug: "building-rest-apis-express",
      skill: skillNode._id,
      careerGoals: [goal._id],
      difficulty: "Intermediate",
      estimatedMinutes: 45,
      description: "Create RESTful routes and handle HTTP methods.",
      conceptSummary: "Express makes it easy to handle GET, POST, PUT, DELETE requests.",
      theoryContent: `# Express Basics\n\nExpress is a minimal and flexible Node.js web application framework.`,
      status: "Published",
      hasPracticeTask: false,
      quizQuestions: [
        {
          questionText: "Which HTTP method is used to create a new resource?",
          type: "MCQ",
          options: ["GET", "POST", "PUT", "DELETE"],
          correctAnswer: "POST",
          explanation: "POST is standard for creating resources."
        },
        {
          questionText: "What object contains the data sent in the request body?",
          type: "MCQ",
          options: ["req.params", "req.query", "req.body", "req.headers"],
          correctAnswer: "req.body",
          explanation: "req.body holds the parsed request body data."
        }
      ]
    });

    await LearningContent.create({
      title: "MongoDB Indexing Strategies",
      slug: "mongodb-indexing-strategies",
      skill: skillMongo._id,
      careerGoals: [goal._id],
      difficulty: "Intermediate",
      estimatedMinutes: 30,
      description: "Learn how to optimize MongoDB queries using indexes.",
      conceptSummary: "Indexes support the efficient execution of queries in MongoDB.",
      theoryContent: `# Indexing\n\nWithout indexes, MongoDB must perform a collection scan.`,
      status: "Published",
      hasPracticeTask: false,
      quizQuestions: []
    });

    console.log('Created Learning Content successfully.');
    console.log('Seed completed! You can now test the learning module.');
    
    process.exit(0);
  } catch (err) {
    console.error('Error during seeding:', err);
    process.exit(1);
  }
}

seed();
