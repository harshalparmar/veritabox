import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Competition from '../src/models/Competition.js';
import Hackathon from '../src/models/Hackathon.js';
import Challenge from '../src/models/Challenge.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox';

const seedTechfest27 = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // ──────────────────────────────────────────────
    // PHASE 1: COMPETITIONS (Robowar, MazeSolve, H@ckShield)
    // ──────────────────────────────────────────────

    const existingSlugs = (await Competition.find({ slug: { $in: ['robowar-tf27', 'mazesolve-tf27', 'hackshield-tf27'] } })).map(c => c.slug);

    if (!existingSlugs.includes('robowar-tf27')) {
      await Competition.create({
        title: 'Robowar — Combat Robotics',
        slug: 'robowar-tf27',
        overview: `**Build It. Fight It. Win It.**\n\nDesign and build a combat robot (max 15 kg) to compete in a single-elimination bracket tournament. Robots fight in a custom fabricated 3m × 3m steel arena.\n\n**Weight:** Max 15 kg ready-to-fight\n**Dimensions:** Max 60cm × 60cm footprint, must fit through 65cm × 65cm gate\n**Weapons Allowed:** Spinning disc, flipper, crusher, lifter, wedge, hammer, drum spinner\n**Power:** LiPo batteries only, max 24V, failsafe mandatory\n**Arena:** 3m × 3m steel surface, 50cm UHMW walls, polycarbonate top`,
        problemStatement: `### Design Report Submission\n\nSubmit a comprehensive design report covering:\n\n1. **Team Profile** — Names, roles, institution, contact details\n2. **Robot Name & Concept** — Combat philosophy, inspiration, CAD render\n3. **Technical Specifications** — Weight, dimensions, drive train, weapon system, power system\n4. **Material Selection** — Frame, weapon, armour materials with justification and bill of materials\n5. **Control System** — RC transmitter/receiver, ESC, failsafe config, wiring diagram\n6. **Safety Plan** — Dangerous components, LiPo storage, removable link, safety gear\n7. **Build Timeline** — Week-by-week plan from Nov to Jan\n8. **Test Results** — Evidence of at least 2 test runs with photos/videos\n\n**Combat Rules:** Single-elimination bracket, top 24 bots. 3-minute matches. KO = 10 seconds immobile. Time-out scoring: Aggression 40%, Damage 35%, Control 25%.`,
        registrationDeadline: new Date('2026-11-12T00:00:00+05:30'),
        abstractDeadline: new Date('2026-11-30T23:59:59+05:30'),
        competitionDate: new Date('2027-01-28T09:00:00+05:30'),
        status: 'Published',
        currentPhase: 'Registration',
        maxSquadronSize: 10,
        rubricCriteria: [
          { name: 'Technical Completeness', maxPoints: 30 },
          { name: 'Design Innovation', maxPoints: 20 },
          { name: 'Feasibility & Safety', maxPoints: 25 },
          { name: 'Build Evidence', maxPoints: 15 },
          { name: 'Presentation Quality', maxPoints: 10 }
        ],
        contacts: [
          { name: 'Harshal Parmar', email: 'techfest@indirauniversity.edu.in', mobile: '0000000000' }
        ]
      });
      console.log('Created: Robowar');
    } else {
      console.log('Skipped: Robowar (already exists)');
    }

    if (!existingSlugs.includes('mazesolve-tf27')) {
      await Competition.create({
        title: 'MazeSolve — Autonomous Navigation',
        slug: 'mazesolve-tf27',
        overview: `**Autonomous. Precise. Fast.**\n\nBuild a fully autonomous robot that navigates a physical 4m × 4m maze grid (16×16 cells, 25cm each) from START to END without any human control.\n\n**Robot Size:** Max 20cm × 20cm footprint, 25cm height, must fit 22cm corridor\n**Autonomy:** FULLY AUTONOMOUS — no RC, Bluetooth, or WiFi during run\n**Sensors:** IR, ultrasonic, line-following, encoders, IMU, ToF, camera all allowed\n**Processors:** Arduino, Raspberry Pi, ESP32, STM32, Jetson Nano all allowed\n**Retries:** 3 attempts per round, best time counts\n**Penalty:** Wall touch = +5 seconds, leaving maze = run voided`,
        problemStatement: `### Design Report Submission\n\nSubmit a report covering:\n\n1. **Team & Robot Name** — Profile, photo/render\n2. **Sensing Strategy** — Sensors, placement diagram, wall/end detection\n3. **Algorithm Description** — Wall-following / Flood-fill / Tremaux / A* — plain English AND pseudocode\n4. **Motor & Drive System** — Motor type, wheel diameter, speed, turning mechanism\n5. **Microcontroller & Code** — Processor, language, code structure\n6. **Calibration Plan** — Maze-day calibration, environment variables, mitigation\n7. **Test Evidence** — Video of robot navigating a maze, time achieved, improvements\n8. **Improvement Plan** — Changes with more time, theoretical minimum time\n\n**Offline:** Round 1 (Morning): Maze A, 3 attempts. Top 12 advance. Round 2 (Afternoon): Maze B (harder). Final ranking: 70% R2 + 30% R1.`,
        registrationDeadline: new Date('2026-11-12T00:00:00+05:30'),
        abstractDeadline: new Date('2026-11-30T23:59:59+05:30'),
        competitionDate: new Date('2027-01-27T09:00:00+05:30'),
        status: 'Published',
        currentPhase: 'Registration',
        maxSquadronSize: 10,
        rubricCriteria: [
          { name: 'Algorithm Quality', maxPoints: 35 },
          { name: 'Sensing Design', maxPoints: 20 },
          { name: 'Build Quality', maxPoints: 20 },
          { name: 'Technical Writing', maxPoints: 15 },
          { name: 'Calibration Awareness', maxPoints: 10 }
        ],
        contacts: [
          { name: 'Harshal Parmar', email: 'techfest@indirauniversity.edu.in', mobile: '0000000000' }
        ]
      });
      console.log('Created: MazeSolve');
    } else {
      console.log('Skipped: MazeSolve (already exists)');
    }

    if (!existingSlugs.includes('hackshield-tf27')) {
      await Competition.create({
        title: 'H@ckShield — Capture The Flag',
        slug: 'hackshield-tf27',
        overview: `**Break In. Think Out.**\n\nJeopardy-style CTF: solve challenges across 6 categories to earn points. Online qualifying rounds followed by an 8-hour offline sprint.\n\n**Platform:** CTFd (self-hosted)\n**Flag Format:** TF27{...} — case-sensitive\n**Scoring:** Static points per challenge, +10 bonus for first blood\n**Categories:** Web Exploitation (5), Cryptography (5), Digital Forensics (4), Reverse Engineering (4), OSINT (3), Bonus Offline-Only (3)\n**Total:** 24 challenges, 6575 points\n\n**Online:** 48-hour window. **Offline Final:** 8 hours (9 AM – 5 PM), dedicated CTF lab with Kali Linux VMs, Wireshark, Burp Suite, GDB, Ghidra.`,
        problemStatement: `### Registration Only — CTF runs on external CTFd platform\n\nRegister your team on this platform, then access the CTF challenges on the dedicated CTFd instance.\n\n**Rules:**\n- No attacking CTF infrastructure\n- No sharing flags between teams\n- No brute-forcing the platform\n- Automated solvers must stay within rate limits\n\n**Categories & Points:**\n- Web Exploitation: 1,100 pts (5 challenges)\n- Cryptography: 1,175 pts (5 challenges)\n- Digital Forensics: 1,000 pts (4 challenges)\n- Reverse Engineering: 1,175 pts (4 challenges)\n- OSINT: 625 pts (3 challenges)\n- Bonus Offline: 1,600 pts (3 challenges)`,
        registrationDeadline: new Date('2026-12-29T23:59:59+05:30'),
        abstractDeadline: new Date('2027-01-02T00:00:00+05:30'),
        competitionDate: new Date('2027-01-29T09:00:00+05:30'),
        status: 'Published',
        currentPhase: 'Registration',
        maxSquadronSize: 4,
        externalUrl: 'https://ctf.techfest27.indirauniversity.edu.in',
        contacts: [
          { name: 'Harshal Parmar', email: 'techfest@indirauniversity.edu.in', mobile: '0000000000' }
        ]
      });
      console.log('Created: H@ckShield');
    } else {
      console.log('Skipped: H@ckShield (already exists)');
    }

    // ──────────────────────────────────────────────
    // PHASE 2: FORGE CHALLENGES (for CodeBlitz)
    // ──────────────────────────────────────────────

    const challengeData = [
      // Round 1
      {
        title: 'Sum of Evens',
        difficulty: 'Rookie',
        tags: ['arrays', 'iteration', 'codeblitz-r1'],
        problemStatement: `Given an array of N integers, find the sum of all even numbers in the array.`,
        constraints: '1 ≤ N ≤ 10^5. |a_i| ≤ 10^9. Answer fits in 64-bit integer.',
        exampleInput: '5\n1 2 3 4 5',
        exampleOutput: '6',
        testCases: [
          { input: '5\n1 2 3 4 5', output: '6', isHidden: false },
          { input: '3\n2 4 6', output: '12', isHidden: true },
          { input: '4\n1 3 5 7', output: '0', isHidden: true },
          { input: '1\n1000000000', output: '1000000000', isHidden: true },
          { input: '6\n-2 -4 3 5 8 -10', output: '-8', isHidden: true },
        ],
        reputationReward: 30
      },
      {
        title: 'Balanced Brackets',
        difficulty: 'Rookie',
        tags: ['stack', 'strings', 'codeblitz-r1'],
        problemStatement: `Given a string containing only '(', ')', '{', '}', '[', ']', determine if it is valid. Valid means every opening bracket has a matching closing bracket in correct order.`,
        constraints: '1 ≤ |S| ≤ 10^5. String contains only the 6 bracket characters.',
        exampleInput: '{[()]}',
        exampleOutput: 'YES',
        testCases: [
          { input: '{[()]}', output: 'YES', isHidden: false },
          { input: '([)]', output: 'NO', isHidden: false },
          { input: '', output: 'YES', isHidden: true },
          { input: '((((', output: 'NO', isHidden: true },
          { input: '{[]{()}}', output: 'YES', isHidden: true },
          { input: '}{', output: 'NO', isHidden: true },
        ],
        reputationReward: 30
      },
      {
        title: 'Minimum Spanning Tree Cost',
        difficulty: 'Operative',
        tags: ['graphs', 'mst', 'kruskal', 'codeblitz-r1'],
        problemStatement: `Given an undirected weighted graph with N nodes and M edges, find the total weight of the Minimum Spanning Tree. If the graph is not connected, print -1.`,
        constraints: '1 ≤ N ≤ 1000. 1 ≤ M ≤ 10^4. 1 ≤ w ≤ 10^6.',
        exampleInput: '4 5\n1 2 1\n1 3 4\n2 3 2\n2 4 5\n3 4 3',
        exampleOutput: '6',
        testCases: [
          { input: '4 5\n1 2 1\n1 3 4\n2 3 2\n2 4 5\n3 4 3', output: '6', isHidden: false },
          { input: '3 1\n1 2 5', output: '-1', isHidden: true },
          { input: '2 1\n1 2 10', output: '10', isHidden: true },
          { input: '5 7\n1 2 2\n1 3 3\n2 3 1\n2 4 4\n3 5 6\n4 5 5\n3 4 2', output: '10', isHidden: true },
        ],
        reputationReward: 60
      },
      {
        title: 'Longest Palindromic Substring',
        difficulty: 'Operative',
        tags: ['strings', 'dp', 'codeblitz-r1'],
        problemStatement: `Given a string S, find the length of the longest palindromic substring. A substring is a contiguous part of the string.`,
        constraints: '1 ≤ |S| ≤ 1000. S contains only lowercase English letters.',
        exampleInput: 'babad',
        exampleOutput: '3',
        testCases: [
          { input: 'babad', output: '3', isHidden: false },
          { input: 'cbbd', output: '2', isHidden: false },
          { input: 'a', output: '1', isHidden: true },
          { input: 'racecar', output: '7', isHidden: true },
          { input: 'abcde', output: '1', isHidden: true },
          { input: 'aaaaaa', output: '6', isHidden: true },
        ],
        reputationReward: 60
      },
      {
        title: 'Matrix Chain Multiplication',
        difficulty: 'Elite',
        tags: ['dp', 'matrix', 'codeblitz-r1'],
        problemStatement: `Given a chain of N matrices where matrix i has dimensions p[i-1] × p[i], find the minimum number of scalar multiplications needed to multiply the entire chain.`,
        constraints: '2 ≤ N ≤ 100. 1 ≤ p[i] ≤ 500.',
        exampleInput: '3\n10 30 5 60',
        exampleOutput: '4500',
        testCases: [
          { input: '3\n10 30 5 60', output: '4500', isHidden: false },
          { input: '2\n10 20 30', output: '6000', isHidden: true },
          { input: '4\n40 20 30 10 30', output: '26000', isHidden: true },
          { input: '3\n1 2 3 4', output: '18', isHidden: true },
        ],
        reputationReward: 100
      },
      // Round 2
      {
        title: 'Segment Tree Range Sum',
        difficulty: 'Operative',
        tags: ['segment-tree', 'data-structures', 'codeblitz-r2'],
        problemStatement: `Given array of N integers and Q queries — each query is either: (1) Update: set A[i]=v, or (2) Query: find sum in range [l,r]. Implement using Segment Tree.`,
        constraints: '1 ≤ N, Q ≤ 10^5. |A[i]| ≤ 10^9.',
        exampleInput: '5 3\n1 3 5 7 9\n2 1 3\n1 3 10\n2 1 5',
        exampleOutput: '9\n30',
        testCases: [
          { input: '5 3\n1 3 5 7 9\n2 1 3\n1 3 10\n2 1 5', output: '9\n30', isHidden: false },
          { input: '3 2\n1 2 3\n2 1 3\n2 2 2', output: '6\n2', isHidden: true },
          { input: '4 4\n5 5 5 5\n1 2 10\n2 1 4\n1 4 1\n2 1 4', output: '25\n21', isHidden: true },
        ],
        reputationReward: 60
      },
      {
        title: "Dijkstra's Shortest Path",
        difficulty: 'Operative',
        tags: ['graphs', 'dijkstra', 'shortest-path', 'codeblitz-r2'],
        problemStatement: `Given a directed weighted graph with N nodes and M edges, find shortest path from node 1 to all other nodes. Output shortest distances. If unreachable, output -1.`,
        constraints: '1 ≤ N ≤ 10^4. 1 ≤ M ≤ 5×10^4. 1 ≤ w ≤ 10^6.',
        exampleInput: '4 4\n1 2 1\n1 3 4\n2 3 2\n3 4 1',
        exampleOutput: '1\n3\n4',
        testCases: [
          { input: '4 4\n1 2 1\n1 3 4\n2 3 2\n3 4 1', output: '1\n3\n4', isHidden: false },
          { input: '3 2\n1 2 5\n2 3 3', output: '5\n8', isHidden: true },
          { input: '3 1\n1 2 1', output: '1\n-1', isHidden: true },
          { input: '2 2\n1 2 10\n1 2 5', output: '5', isHidden: true },
        ],
        reputationReward: 60
      },
      {
        title: 'Topological Sort + Cycle Detection',
        difficulty: 'Operative',
        tags: ['graphs', 'topological-sort', 'dfs', 'codeblitz-r2'],
        problemStatement: `Given a directed graph with N nodes and M edges, determine if it has a cycle. If no cycle, print a valid topological ordering.`,
        constraints: '1 ≤ N ≤ 10^4. 1 ≤ M ≤ 5×10^4.',
        exampleInput: '4 4\n1 2\n2 3\n3 4\n4 2',
        exampleOutput: 'CYCLE DETECTED',
        testCases: [
          { input: '4 4\n1 2\n2 3\n3 4\n4 2', output: 'CYCLE DETECTED', isHidden: false },
          { input: '4 3\n1 2\n1 3\n3 4', output: '1 3 4 2', isHidden: true },
          { input: '3 3\n1 2\n2 3\n1 3', output: '1 2 3', isHidden: true },
        ],
        reputationReward: 60
      },
      {
        title: 'Coin Change — Count Ways',
        difficulty: 'Elite',
        tags: ['dp', 'coin-change', 'codeblitz-r2'],
        problemStatement: `Given a list of coin denominations and a target amount, count the number of distinct ways to make the target amount using any number of each coin. Output modulo 10^9 + 7.`,
        constraints: '1 ≤ N ≤ 300. 1 ≤ T ≤ 5000. 1 ≤ coin[i] ≤ 1000.',
        exampleInput: '3 4\n1 2 3',
        exampleOutput: '4',
        testCases: [
          { input: '3 4\n1 2 3', output: '4', isHidden: false },
          { input: '2 5\n1 2', output: '3', isHidden: true },
          { input: '1 0\n5', output: '1', isHidden: true },
          { input: '3 10\n2 5 3', output: '4', isHidden: true },
        ],
        reputationReward: 100
      },
      {
        title: 'Suffix Array Construction',
        difficulty: 'Elite',
        tags: ['strings', 'suffix-array', 'advanced', 'codeblitz-r2'],
        problemStatement: `Build the suffix array of a given string S. Output the 0-indexed starting positions of all suffixes in sorted order. O(N log N) solution expected.`,
        constraints: '1 ≤ |S| ≤ 10^5. S contains only lowercase English letters.',
        exampleInput: 'banana',
        exampleOutput: '5 3 1 0 4 2',
        testCases: [
          { input: 'banana', output: '5 3 1 0 4 2', isHidden: false },
          { input: 'abc', output: '0 1 2', isHidden: true },
          { input: 'aaa', output: '2 1 0', isHidden: true },
          { input: 'abracadabra', output: '10 7 0 3 5 8 1 4 6 9 2', isHidden: true },
        ],
        reputationReward: 120
      }
    ];

    const r1Tags = 'codeblitz-r1';
    const r2Tags = 'codeblitz-r2';
    const existingR1 = await Challenge.countDocuments({ tags: r1Tags });
    const existingR2 = await Challenge.countDocuments({ tags: r2Tags });

    let r1ChallengeIds = [];
    let r2ChallengeIds = [];

    if (existingR1 === 0 && existingR2 === 0) {
      const created = await Challenge.insertMany(challengeData);
      r1ChallengeIds = created.filter(c => c.tags.includes('codeblitz-r1')).map(c => c._id);
      r2ChallengeIds = created.filter(c => c.tags.includes('codeblitz-r2')).map(c => c._id);
      console.log(`Created: ${created.length} Forge challenges for CodeBlitz`);
    } else {
      r1ChallengeIds = (await Challenge.find({ tags: r1Tags }).select('_id')).map(c => c._id);
      r2ChallengeIds = (await Challenge.find({ tags: r2Tags }).select('_id')).map(c => c._id);
      console.log(`Skipped: CodeBlitz challenges (already exist — R1: ${r1ChallengeIds.length}, R2: ${r2ChallengeIds.length})`);
    }

    // ──────────────────────────────────────────────
    // PHASE 3: HACKATHONS (BuildX, DataStrom, CodeBlitz)
    // ──────────────────────────────────────────────

    const existingHackSlugs = (await Hackathon.find({ slug: { $in: ['buildx-tf27', 'datastrom-tf27', 'codeblitz-tf27'] } })).map(h => h.slug);

    // --- BuildX Hackathon ---
    if (!existingHackSlugs.includes('buildx-tf27')) {
      await Hackathon.create({
        title: 'BuildX Hackathon',
        slug: 'buildx-tf27',
        shortDescription: 'Multi-round hackathon: abstract → prototype → live pitch → 36-hour offline build. Solve real problems across 5 domains.',
        description: `## BuildX Hackathon — One Problem. Build the Future.\n\nTrack-based hardware & software solution hackathon.\n\n**Format:** Multi-round online elimination + 36-hour offline hackathon final\n**Eligibility:** Category A (High School), B (UG/PG), C (Professionals). Mixed categories allowed.\n**Languages:** Any programming language, any framework, any cloud provider\n**Hardware:** Raspberry Pi, Arduino, sensors allowed if declared in abstract\n\n### Domains\n- **Climate Tech & Sustainability** — Renewable energy, waste reduction, carbon tracking\n- **FinTech & Financial Inclusion** — UPI/payments, micro-lending, expense tracking\n- **Healthcare & Mental Wellness** — Patient management, teleconsultation, medication reminders\n- **Smart Cities & Infrastructure** — Urban mobility, waste routing, smart parking\n- **Open Innovation** — Any real problem you've experienced\n\n**Rules:** No AI code generation tools (ChatGPT, Copilot). Plagiarism = immediate DQ. All IP belongs to the creating team.`,
        status: 'Published',
        type: 'Hackathon',
        subCategory: 'Software',
        chapterScope: 'National',
        maxTeams: 300,
        minTeamSize: 2,
        maxTeamSize: 4,
        rules: [
          'Team size: 2 to 4 members. All members must register individually.',
          'No AI code generation tools (ChatGPT, Copilot) allowed during offline round.',
          'Full internet access during offline round.',
          'Each team gets 2 power sockets. Bring your own extension if needed.',
          'All IP created belongs to the creating team. Techfest retains right to showcase.',
          'Plagiarism, AI tool use for code, or sharing solutions = immediate disqualification.'
        ],
        prizes: [
          { position: 'Champion', reward: 'Certificate + Medal + Trophy', description: 'Highest combined score across all judging criteria' },
          { position: 'Runner-Up', reward: 'Certificate + Medal + Trophy', description: 'Second-highest ranked team' },
          { position: '2nd Runner-Up', reward: 'Certificate + Medal + Trophy', description: 'Third-highest ranked team' },
          { position: 'Best UI/UX Design', reward: 'Certificate', description: 'Most polished, intuitive, and visually appealing interface' },
          { position: 'Best Technical Implementation', reward: 'Certificate', description: 'Most robust, scalable, and well-engineered system' },
          { position: 'Best Use of AI/ML', reward: 'Certificate', description: 'Most effective and creative AI/ML integration' },
        ],
        rounds: [
          {
            roundNumber: 1,
            title: 'Abstract & Problem Selection',
            type: 'Report Submission',
            startTime: new Date('2026-09-22T00:00:00+05:30'),
            endTime: new Date('2026-11-12T23:59:59+05:30'),
            durationMinutes: 0,
            status: 'Scheduled',
            submissionConfig: {
              maxAttempts: 1,
              requiredFields: [
                { fieldName: 'Problem Domain', fieldType: 'select', required: true, options: ['Climate Tech & Sustainability', 'FinTech & Financial Inclusion', 'Healthcare & Mental Wellness', 'Smart Cities & Infrastructure', 'Open Innovation'] },
                { fieldName: 'Problem Statement', fieldType: 'textarea', required: true, maxLength: 200 },
                { fieldName: 'Proposed Solution Summary', fieldType: 'textarea', required: true, maxLength: 300 },
                { fieldName: 'Expected Impact', fieldType: 'textarea', required: true, maxLength: 150 },
                { fieldName: 'Tech Stack Plan', fieldType: 'text', required: true },
                { fieldName: 'Team Member Roles', fieldType: 'textarea', required: true }
              ]
            }
          },
          {
            roundNumber: 2,
            title: 'Online Qualifying — Prototype Submission',
            type: 'Report Submission',
            startTime: new Date('2027-01-09T00:00:00+05:30'),
            endTime: new Date('2027-01-10T23:59:59+05:30'),
            durationMinutes: 0,
            status: 'Draft',
            submissionConfig: {
              maxAttempts: 1,
              requiredFields: [
                { fieldName: 'GitHub Repository URL', fieldType: 'url', required: true },
                { fieldName: '2-Minute Video Walkthrough URL', fieldType: 'url', required: true },
                { fieldName: 'Updated Problem Statement with User Research', fieldType: 'textarea', required: true },
                { fieldName: 'Architecture Diagram', fieldType: 'file', required: true }
              ]
            }
          },
          {
            roundNumber: 3,
            title: 'Online Semi-Final — Live Pitch',
            type: 'Presentation',
            startTime: new Date('2027-01-16T09:00:00+05:30'),
            endTime: new Date('2027-01-17T18:00:00+05:30'),
            durationMinutes: 15,
            status: 'Draft'
          },
          {
            roundNumber: 4,
            title: 'Offline Final — 36-Hour Hackathon',
            type: 'Physical Build',
            startTime: new Date('2027-01-29T09:00:00+05:30'),
            endTime: new Date('2027-01-30T21:00:00+05:30'),
            durationMinutes: 2160,
            status: 'Draft'
          }
        ]
      });
      console.log('Created: BuildX Hackathon');
    } else {
      console.log('Skipped: BuildX (already exists)');
    }

    // --- DataStrom AI/ML ---
    if (!existingHackSlugs.includes('datastrom-tf27')) {
      await Hackathon.create({
        title: 'DataStrom — AI/ML Challenge',
        slug: 'datastrom-tf27',
        shortDescription: 'Train models on real agricultural data. Predict crop yields across 4 Indian states. Top teams present to a jury.',
        description: `## DataStrom — Train Fast. Predict Faster.\n\n**Format:** Dataset challenge — model training + submission rounds + offline live presentation\n\n**Dataset: CropYield-IND 2024**\nAnonymized agricultural records from 4 Indian states (Maharashtra, Punjab, Karnataka, Uttar Pradesh), 2018–2024.\n\n**Task:** Multi-class classification — predict yield_class (Low / Medium / High / Exceptional) from 18 features.\n- Training set: 28,000 rows\n- Test set: 7,000 rows (labels hidden)\n- Class distribution: Low 22%, Medium 38%, High 28%, Exceptional 12%\n\n**Evaluation:** Primary: F1-Score (macro). Secondary: Inference time per sample (< 500ms).\n\n**Allowed:** Python, R, Julia. Scikit-learn, TensorFlow, PyTorch, XGBoost, LightGBM, Keras.\n**Forbidden:** Pretrained LLMs for direct prediction. AutoML platforms (unless you explain internals).`,
        status: 'Published',
        type: 'Hackathon',
        subCategory: 'Software',
        chapterScope: 'National',
        maxTeams: 500,
        minTeamSize: 1,
        maxTeamSize: 3,
        resources: [
          { title: 'CropYield-IND 2024 — Training Dataset', url: '/uploads/placeholder-training-dataset.csv', description: 'Training set: 28,000 rows with 18 features and yield_class labels. Released Nov 12, 2026.' },
          { title: 'CropYield-IND 2024 — Test Dataset', url: '/uploads/placeholder-test-dataset.csv', description: 'Test set: 7,000 rows without labels. Submit predictions for these rows.' },
          { title: 'Submission Template', url: '/uploads/placeholder-submission-template.csv', description: 'CSV template with 7,000 rows: row_id, predicted_yield_class' }
        ],
        rules: [
          'Solo participants allowed and encouraged. Max team size: 3.',
          'Submit predictions CSV + Jupyter notebook + PDF report. All three required.',
          'Up to 5 submissions allowed during the window. Only the last submission is evaluated.',
          'Pretrained LLMs (GPT, Gemini, Claude) forbidden for direct prediction.',
          'Dataset is anonymized. Teams must not attempt to re-identify individuals.',
          'Leaderboard is HIDDEN during submission — no score shown until window closes.'
        ],
        prizes: [
          { position: 'Champion', reward: 'Certificate + Medal + Trophy', description: 'Highest model accuracy + best offline presentation' },
          { position: 'Runner-Up', reward: 'Certificate + Medal + Trophy', description: 'Second-highest overall score' },
          { position: '2nd Runner-Up', reward: 'Certificate + Medal + Trophy', description: 'Third-place finisher' },
          { position: 'Best Model Accuracy', reward: 'Certificate', description: 'Highest F1/Accuracy/AUC on test set' },
          { position: 'Best Explainability', reward: 'Certificate', description: 'Best explained predictions to non-technical judges' },
          { position: 'Best Solo Participant', reward: 'Certificate + Medal', description: 'Highest-ranked individual in DataStrom' },
        ],
        rounds: [
          {
            roundNumber: 1,
            title: 'Dataset Release & Model Submission',
            type: 'Data Challenge',
            startTime: new Date('2026-11-12T10:00:00+05:30'),
            endTime: new Date('2027-01-03T23:59:59+05:30'),
            durationMinutes: 0,
            status: 'Scheduled',
            submissionConfig: {
              maxAttempts: 5,
              requiredFields: [
                { fieldName: 'Predictions CSV', fieldType: 'file', required: true },
                { fieldName: 'Jupyter Notebook (.ipynb)', fieldType: 'file', required: true },
                { fieldName: 'Report PDF', fieldType: 'file', required: true }
              ]
            }
          },
          {
            roundNumber: 2,
            title: 'Online Model Defence',
            type: 'Presentation',
            startTime: new Date('2027-01-09T09:00:00+05:30'),
            endTime: new Date('2027-01-10T18:00:00+05:30'),
            durationMinutes: 20,
            status: 'Draft'
          },
          {
            roundNumber: 3,
            title: 'Offline Final — Live Presentation & Mini-Dataset',
            type: 'Offline Assessment',
            startTime: new Date('2027-01-27T09:00:00+05:30'),
            endTime: new Date('2027-01-27T17:00:00+05:30'),
            durationMinutes: 480,
            status: 'Draft'
          }
        ]
      });
      console.log('Created: DataStrom');
    } else {
      console.log('Skipped: DataStrom (already exists)');
    }

    // --- CodeBlitz ---
    if (!existingHackSlugs.includes('codeblitz-tf27')) {
      await Hackathon.create({
        title: 'CodeBlitz — Competitive Coding',
        slug: 'codeblitz-tf27',
        shortDescription: 'ICPC-style solo competitive programming. Solve algorithmic problems under time pressure. Pure logic, no excuses.',
        description: `## CodeBlitz — Pure Logic. No Excuses.\n\n**Format:** ICPC-style competitive programming. Solve as many problems as possible within the time limit.\n\n**Scoring:** Problems solved (descending) → Penalty time (ascending). +20 minutes penalty per wrong submission.\n\n**Languages:** C, C++, Python, JavaScript\n\n**Round 1 (Online):** 90 minutes, 5 problems — from basic arrays/stacks to DP\n**Round 2 (Online):** 90 minutes, 5 problems — segment trees, graphs, advanced DP\n**Offline Final:** 3 hours, 7 problems — sealed until contest day\n\n**Allowed:** Your own written notes (max 2 A4 pages). No phone.\n**Forbidden:** Internet, IDE autocompletion, AI tools, communication with others.`,
        status: 'Published',
        type: 'Hackathon',
        subCategory: 'Software',
        chapterScope: 'National',
        maxTeams: 1000,
        minTeamSize: 1,
        maxTeamSize: 1,
        rules: [
          'Solo only. No collaboration. Any discussion during contest = immediate disqualification.',
          'Scoring: problems solved × speed. Penalty: +20 min per wrong submission.',
          'Compilation Error: no penalty. Wrong Answer / TLE / Runtime Error: +20 min penalty.',
          'Languages allowed: C, C++, Python, JavaScript.',
          'No internet, no IDE autocompletion, no AI tools during offline final.',
          'Own written notes allowed (max 2 A4 pages, both sides). No printed code.'
        ],
        prizes: [
          { position: 'Champion', reward: 'Certificate + Medal + Trophy', description: 'Highest score (problems solved × speed) in the offline final' },
          { position: 'Runner-Up', reward: 'Certificate + Medal + Trophy', description: 'Second-highest score' },
          { position: '2nd Runner-Up', reward: 'Certificate + Medal + Trophy', description: 'Third-highest score' },
          { position: '4th Place', reward: 'Certificate + Medal', description: 'Fourth-highest finisher' },
          { position: '5th Place', reward: 'Certificate + Medal', description: 'Fifth-highest finisher' },
          { position: 'Fastest Correct Submission', reward: 'Certificate', description: 'First accepted solution in the finals' },
          { position: 'Most Problems Solved', reward: 'Certificate', description: 'Highest count of problems regardless of time' },
        ],
        rounds: [
          {
            roundNumber: 1,
            title: 'Online Round 1',
            type: 'Coding Contest',
            startTime: new Date('2027-01-02T10:00:00+05:30'),
            endTime: new Date('2027-01-02T11:30:00+05:30'),
            durationMinutes: 90,
            status: 'Scheduled',
            codingContestConfig: {
              challengeIds: r1ChallengeIds,
              penaltyMinutes: 20
            }
          },
          {
            roundNumber: 2,
            title: 'Online Round 2',
            type: 'Coding Contest',
            startTime: new Date('2027-01-09T10:00:00+05:30'),
            endTime: new Date('2027-01-09T11:30:00+05:30'),
            durationMinutes: 90,
            status: 'Draft',
            codingContestConfig: {
              challengeIds: r2ChallengeIds,
              penaltyMinutes: 20
            }
          },
          {
            roundNumber: 3,
            title: 'Offline Final',
            type: 'Offline Assessment',
            startTime: new Date('2027-01-28T09:00:00+05:30'),
            endTime: new Date('2027-01-28T12:00:00+05:30'),
            durationMinutes: 180,
            status: 'Draft'
          }
        ]
      });
      console.log('Created: CodeBlitz');
    } else {
      console.log('Skipped: CodeBlitz (already exists)');
    }

    // ──────────────────────────────────────────────
    // SUMMARY
    // ──────────────────────────────────────────────
    const compCount = await Competition.countDocuments({ slug: { $in: ['robowar-tf27', 'mazesolve-tf27', 'hackshield-tf27'] } });
    const hackCount = await Hackathon.countDocuments({ slug: { $in: ['buildx-tf27', 'datastrom-tf27', 'codeblitz-tf27'] } });
    const challengeCount = await Challenge.countDocuments({ tags: { $in: ['codeblitz-r1', 'codeblitz-r2'] } });

    console.log('\n════════════════════════════════════════');
    console.log('  TECHFEST 27 — SEED COMPLETE');
    console.log('════════════════════════════════════════');
    console.log(`  Competitions : ${compCount}/3`);
    console.log(`  Hackathons   : ${hackCount}/3`);
    console.log(`  Forge Challs : ${challengeCount}/10`);
    console.log('════════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedTechfest27();
