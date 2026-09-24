import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

// Import Models
import Hackathon from './src/models/Hackathon.js';
import Competition from './src/models/Competition.js';
import Workshop from './src/models/Workshop.js';
import Event from './src/models/Event.js';
import Bounty from './src/models/Bounty.js';
import Challenge from './src/models/Challenge.js';
import User from './src/models/User.js';
import Admin from './src/models/Admin.js';
import Chapter from './src/models/Chapter.js';

const seedDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    // Fetch an admin user and a chapter to attach to records if needed
    const admin = await Admin.findOne() || await User.findOne();
    const chapter = await Chapter.findOne();

    if (!admin) {
      console.warn("No admin or user found in DB. Bounty seeding might fail.");
    }

    const adminId = admin ? admin._id : new mongoose.Types.ObjectId();
    const chapterId = chapter ? chapter._id : null;

    // 1. Seed 4 Hackathons
    console.log('Seeding Hackathons...');
    const hackathons = [
      {
        title: 'CyberSec Relay 2026',
        slug: 'cybersec-relay-2026',
        shortDescription: 'Identify vulnerabilities in our simulated mainnet environment.',
        description: 'Join the ultimate cybersecurity relay. Test your skills against complex, multi-stage vulnerabilities.',
        status: 'Live',
        rounds: []
      },
      {
        title: 'AI Forge Hackathon',
        slug: 'ai-forge-hackathon',
        shortDescription: 'Build next-gen autonomous agents.',
        description: 'Compete with the best minds to build intelligent agents capable of navigating our custom simulators.',
        status: 'Live',
        rounds: []
      },
      {
        title: 'Quantum Circuits Challenge',
        slug: 'quantum-circuits-challenge',
        shortDescription: 'Design optimal quantum circuits for cryptographic breaking.',
        description: 'A hardware and software hackathon focused on quantum circuit optimization.',
        status: 'Live',
        rounds: []
      },
      {
        title: 'Robotics Automation Sprint',
        slug: 'robotics-automation-sprint',
        shortDescription: 'Program robotic arms for precision assembly.',
        description: 'Develop the most efficient pathing algorithms for a simulated 6-axis robotic arm.',
        status: 'Live',
        rounds: []
      }
    ];
    for (const h of hackathons) {
      await Hackathon.findOneAndUpdate({ slug: h.slug }, h, { upsert: true, new: true });
    }

    // 2. Seed 4 Competitions
    console.log('Seeding Competitions...');
    const competitions = [
      {
        title: 'RoboWars Alpha',
        slug: 'robowars-alpha',
        overview: 'The premier combat robotics competition.',
        problemStatement: 'Design a 15kg combat robot to defeat opponents in the arena.',
        registrationDeadline: new Date(Date.now() + 86400000 * 10),
        abstractDeadline: new Date(Date.now() + 86400000 * 20),
        status: 'Live'
      },
      {
        title: 'Line Follower Extreme',
        slug: 'line-follower-extreme',
        overview: 'Autonomous line following with obstacles.',
        problemStatement: 'Navigate the complex grid in the shortest time.',
        registrationDeadline: new Date(Date.now() + 86400000 * 10),
        abstractDeadline: new Date(Date.now() + 86400000 * 20),
        status: 'Live'
      },
      {
        title: 'Drone Delivery Challenge',
        slug: 'drone-delivery-challenge',
        overview: 'Autonomous payload delivery via aerial drones.',
        problemStatement: 'Navigate GPS-denied environments to drop payloads accurately.',
        registrationDeadline: new Date(Date.now() + 86400000 * 10),
        abstractDeadline: new Date(Date.now() + 86400000 * 20),
        status: 'Live'
      },
      {
        title: 'Smart City Hack',
        slug: 'smart-city-hack',
        overview: 'IoT solutions for urban environments.',
        problemStatement: 'Develop an IoT sensor network for traffic and pollution monitoring.',
        registrationDeadline: new Date(Date.now() + 86400000 * 10),
        abstractDeadline: new Date(Date.now() + 86400000 * 20),
        status: 'Live'
      }
    ];
    for (const c of competitions) {
      await Competition.findOneAndUpdate({ slug: c.slug }, c, { upsert: true, new: true });
    }

    // 3. Seed 2 Workshops
    console.log('Seeding Workshops...');
    const workshops = [
      {
        title: 'Intro to ROS2',
        slug: 'intro-to-ros2',
        description: 'Learn the Robot Operating System (ROS2) fundamentals.',
        date: new Date(Date.now() + 86400000 * 5),
        location: 'Virtual Arena',
        status: 'Live',
        chapter: chapterId || adminId // Fallback if no chapter
      },
      {
        title: 'Advanced Computer Vision',
        slug: 'advanced-cv',
        description: 'Implementing YOLOv8 for real-time object detection.',
        date: new Date(Date.now() + 86400000 * 8),
        location: 'Main Auditorium',
        status: 'Live',
        chapter: chapterId || adminId
      }
    ];
    for (const w of workshops) {
      if(w.chapter) await Workshop.findOneAndUpdate({ slug: w.slug }, w, { upsert: true, new: true });
    }

    // 4. Seed 3 Events
    console.log('Seeding Events...');
    const events = [
      {
        title: 'Tech Symposium 2026',
        category: 'Summit',
        subCategory: 'Business',
        description: 'Annual gathering of tech leaders and innovators.',
        prizeMoney: 0,
        eventDate: new Date(Date.now() + 86400000 * 15),
        status: 'Upcoming'
      },
      {
        title: 'AI Exhibition',
        category: 'Exhibition',
        subCategory: 'Software',
        description: 'Showcase of student-built AI projects.',
        prizeMoney: 10000,
        eventDate: new Date(Date.now() + 86400000 * 20),
        status: 'Upcoming'
      },
      {
        title: 'Robotics Workshop Series',
        category: 'Workshop',
        subCategory: 'Robogames',
        description: 'A 3-day intense robotics workshop.',
        prizeMoney: 0,
        eventDate: new Date(Date.now() + 86400000 * 25),
        status: 'Upcoming'
      }
    ];
    for (const e of events) {
      await Event.findOneAndUpdate({ title: e.title }, e, { upsert: true, new: true });
    }

    // 5. Seed 7 Bounties
    console.log('Seeding Bounties...');
    const bounties = Array.from({ length: 7 }).map((_, i) => ({
      title: `Fix UI Bug #${1000 + i}`,
      description: `Resolve the rendering issue in the dashboard component #${i}.`,
      pointReward: 50 + (i * 10),
      difficulty: i % 2 === 0 ? 'Operative' : 'Rookie',
      status: 'Open',
      createdBy: adminId,
      techStack: ['React', 'TypeScript']
    }));
    for (const b of bounties) {
      await Bounty.findOneAndUpdate({ title: b.title }, b, { upsert: true, new: true });
    }

    // 6. Seed 12 Codeforge Challenges
    console.log('Seeding Challenges...');
    const challenges = Array.from({ length: 12 }).map((_, i) => ({
      title: `Algorithm Challenge ${i + 1}`,
      problemStatement: `Solve the data processing problem using optimal time complexity. Task ${i + 1}.`,
      difficulty: i % 3 === 0 ? 'Elite' : i % 2 === 0 ? 'Operative' : 'Rookie',
      tags: ['Algorithms', 'Data Structures'],
      reputationReward: 100 + (i * 10)
    }));
    for (const ch of challenges) {
      await Challenge.findOneAndUpdate({ title: ch.title }, ch, { upsert: true, new: true });
    }

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedDB();
