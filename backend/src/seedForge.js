import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Challenge from './models/Challenge.js';

dotenv.config();

const challenges = [
  {
    title: "Mesh routing under packet loss",
    difficulty: "Elite",
    tags: ["Graph", "Networks"],
    problemStatement: "You are given a graph G of N nodes and M bidirectional links. Each link has a base latency and a packet-loss probability.\n\nFor Q queries, find the path from source s to destination t that minimizes expected total latency, accounting for retransmissions.",
    constraints: "1 ≤ N ≤ 10⁴, 1 ≤ M ≤ 10⁵, 1 ≤ Q ≤ 10³",
    exampleInput: "4 4 1\n1 2 5 0.1\n2 3 5 0.2\n1 3 12 0.0\n3 4 5 0.1\n1 4",
    exampleOutput: "17.78",
    reputationReward: 200
  },
  {
    title: "PID tuning on a noisy signal",
    difficulty: "Operative",
    tags: ["Embedded", "Sim"],
    problemStatement: "Implement a robust PID controller that can maintain a target setpoint despite Gaussian noise on the sensor input and a 50ms control loop delay.",
    constraints: "Setpoint: 100, Initial: 0, Max Output: 255",
    exampleInput: "P=1.2, I=0.5, D=0.1",
    exampleOutput: "Settling Time: 1.4s",
    reputationReward: 100
  },
  {
    title: "Two-pointer minimum window",
    difficulty: "Rookie",
    tags: ["Strings"],
    problemStatement: "Given two strings s and t, return the minimum window substring of s such that every character in t is included in the window.",
    constraints: "1 ≤ |s|, |t| ≤ 10⁵",
    exampleInput: "ADOBECODEBANC, ABC",
    exampleOutput: "BANC",
    reputationReward: 50
  }
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/veritabox');
    console.log('Seeding forge challenges...');
    
    await Challenge.deleteMany({});
    await Challenge.insertMany(challenges);
    
    console.log('Forge seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();
