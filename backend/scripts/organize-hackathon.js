import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Hackathon from '../src/models/Hackathon.js';
import Question from '../src/models/Question.js';
import User from '../src/models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox';

const organizeHackathon = async () => {
    try {
        console.log('⚡ Connecting to MongoDB:', MONGO_URI);
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB.');

        // Find or create admin user to assign as organizer
        let admin = await User.findOne({ role: 'Founder' });
        if (!admin) {
            admin = await User.findOne({ universityId: 'ADMIN-001' });
        }
        if (!admin) {
            admin = await User.create({
                name: 'System Architect',
                universityId: 'ADMIN-001',
                password: 'Password123!',
                role: 'Founder',
                reputationPoints: 1000,
                skills: ['Robotics', 'Firmware', 'Systems Design'],
                university: 'VeritaBox HQ'
            });
            console.log('👤 Created default Founder admin user.');
        }

        // Define rounds
        const now = new Date();
        const round1Start = new Date(now.getTime() - 3600000); // 1 hour ago
        const round1End = new Date(now.getTime() + 86400000); // 1 day from now
        
        const round2Start = new Date(round1End.getTime() + 3600000);
        const round2End = new Date(round2Start.getTime() + 86400000);
        
        const round3Start = new Date(round2End.getTime() + 3600000);
        const round3End = new Date(round3Start.getTime() + 86400000);

        const round4Start = new Date(round3End.getTime() + 3600000);
        const round4End = new Date(round4Start.getTime() + 172800000); // 2 days for physical grand finale

        const rounds = [
            {
                roundNumber: 1,
                title: 'Round 1: Online Screening MCQ',
                description: 'The first stage to test your core engineering, systems and programming knowledge.',
                startTime: round1Start,
                endTime: round1End,
                durationMinutes: 30,
                qualifyingThreshold: 20,
                maxQuestions: 10,
                type: 'Online MCQ',
                status: 'Live',
                snapshotInterval: 30
            },
            {
                roundNumber: 2,
                title: 'Round 2: Online Advanced Systems MCQ',
                description: 'A deep-dive online test challenging your understanding of real-time systems, network topologies, and algorithms.',
                startTime: round2Start,
                endTime: round2End,
                durationMinutes: 45,
                qualifyingThreshold: 30,
                maxQuestions: 10,
                type: 'Online MCQ',
                status: 'Scheduled',
                snapshotInterval: 30
            },
            {
                roundNumber: 3,
                title: 'Round 3: Online Architecture & Security MCQ',
                description: 'The final online filter testing cybersecurity, performance optimization, and architectural decisions.',
                startTime: round3Start,
                endTime: round3End,
                durationMinutes: 45,
                qualifyingThreshold: 40,
                maxQuestions: 10,
                type: 'Online MCQ',
                status: 'Scheduled',
                snapshotInterval: 30
            },
            {
                roundNumber: 4,
                title: 'Round 4: Grand Finale (Physical Onsite Build)',
                description: 'The physical, onsite culmination round where qualifying squadrons assemble at the arena to build real solutions under intense conditions.',
                startTime: round4Start,
                endTime: round4End,
                durationMinutes: 1440,
                qualifyingThreshold: 0,
                maxQuestions: 0,
                type: 'Physical Build',
                status: 'Scheduled',
                snapshotInterval: 0
            }
        ];

        // Clean up any existing hackathon with this slug
        const slug = 'veritabox-nexus-2026';
        await Hackathon.deleteOne({ slug });
        console.log('🧹 Cleaned any existing hackathon with slug:', slug);

        const newHackathon = new Hackathon({
            title: 'VeritaBox Nexus 2026',
            shortDescription: 'The ultimate 4-stage hardware & software engineering showdown.',
            description: 'VeritaBox Nexus 2026 is designed to challenge the limits of your system design, embedded hardware capability, and software architecture. 3 online qualifying rounds testing theory, performance, and security, culminating in a 48-hour physical, onsite build where top squadrons clash for glory.',
            slug,
            status: 'Announced',
            type: 'Hackathon',
            subCategory: 'General',
            chapterScope: 'National',
            maxTeams: 150,
            organizer: admin._id,
            rounds: rounds,
            rules: [
                'Squadrons must consist of 1 to 5 members.',
                'Tabs switching or leaving the screen during online MCQ rounds is actively tracked and flagged by the proctor.',
                'Qualifying thresholds for each round must be met to advance to the next stage.',
                'The final round is physical and requires attendance at VeritaBox Arena.'
            ],
            prizes: [
                { position: '1st Place', reward: '$5,000 USD + VeritaBox Champions Trophy', description: 'Awarded to the team with the highest physical build scoring.' },
                { position: '2nd Place', reward: '$3,000 USD', description: 'Runners up.' },
                { position: '3rd Place', reward: '$1,500 USD', description: 'Second runners up.' }
            ],
            reputationTiers: [
                { rank: 1, points: 500 },
                { rank: 2, points: 300 },
                { rank: 3, points: 150 }
            ]
        });

        const savedHackathon = await newHackathon.save();
        console.log('🏆 Seeded Hackathon with ID:', savedHackathon._id);

        // Seed questions for the three online rounds
        const round1 = savedHackathon.rounds.find(r => r.roundNumber === 1);
        const round2 = savedHackathon.rounds.find(r => r.roundNumber === 2);
        const round3 = savedHackathon.rounds.find(r => r.roundNumber === 3);

        const questionsList = [];

        // Round 1 Questions (Screening)
        questionsList.push(
            {
                hackathonId: savedHackathon._id,
                roundId: round1._id,
                questionText: 'What is the primary function of a pull-up resistor in input pin configurations?',
                options: ['To limit current flow to ground', 'To ensure a stable high logic level when the switch is open', 'To increase the speed of state transition', 'To generate a clock pulse'],
                correctAnswer: 'To ensure a stable high logic level when the switch is open',
                points: 10,
                explanation: 'A pull-up resistor ensures that the input pin is held at a high logic level when no external device is pulling it low.'
            },
            {
                hackathonId: savedHackathon._id,
                roundId: round1._id,
                questionText: 'Which protocol is most commonly used for low-latency, real-time message telemetry in IoT applications?',
                options: ['HTTP/1.1', 'FTP', 'MQTT', 'SMTP'],
                correctAnswer: 'MQTT',
                points: 10,
                explanation: 'MQTT is a lightweight, publish-subscribe network protocol that is ideal for low-bandwidth, high-latency, or unreliable networks.'
            }
        );

        // Round 2 Questions (Advanced Systems)
        questionsList.push(
            {
                hackathonId: savedHackathon._id,
                roundId: round2._id,
                questionText: 'What issue does priority inheritance solve in a Real-Time Operating System (RTOS)?',
                options: ['Deadlock', 'Priority Inversion', 'Race Condition', 'Fragmentation'],
                correctAnswer: 'Priority Inversion',
                points: 15,
                explanation: 'Priority inheritance temporarily elevates the priority of a lower-priority task holding a resource needed by a higher-priority task, preventing intermediate-priority tasks from pre-empting it.'
            },
            {
                hackathonId: savedHackathon._id,
                roundId: round2._id,
                questionText: 'In digital communications, what is the purpose of parity bits?',
                options: ['To compress data', 'To encrypt messages', 'To detect single-bit errors in transmission', 'To synchronize baud rate clocks'],
                correctAnswer: 'To detect single-bit errors in transmission',
                points: 15,
                explanation: 'Parity bits are a simple error-detection mechanism used to verify the integrity of transmitted data characters.'
            }
        );

        // Round 3 Questions (Architecture & Security)
        questionsList.push(
            {
                hackathonId: savedHackathon._id,
                roundId: round3._id,
                questionText: 'Which security feature ensures that only authorized code runs on a microcontroller at boot time?',
                options: ['Secure Boot', 'Flash Readout Protection', 'Hardware Watchdog', 'JTAG Lock'],
                correctAnswer: 'Secure Boot',
                points: 20,
                explanation: 'Secure boot establishes a root of trust to verify signatures of the boot firmware before running it, preventing execution of malicious payloads.'
            },
            {
                hackathonId: savedHackathon._id,
                roundId: round3._id,
                questionText: 'What is the main drawback of employing excessive cryptographic security overhead in resource-constrained IoT systems?',
                options: ['Incompatibility with IPv6', 'Elevated power consumption and CPU latency', 'Loss of physical sensor sensitivity', 'Decreased physical storage size'],
                correctAnswer: 'Elevated power consumption and CPU latency',
                points: 20,
                explanation: 'Cryptographic algorithms are computationally expensive, leading to high CPU usage and increased energy consumption, which drains battery-operated edge devices.'
            }
        );

        await Question.insertMany(questionsList);
        console.log('📝 Seeded questions for the 3 online rounds.');

        console.log('🚀 Hackathon organization completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error organizing hackathon:', err);
        process.exit(1);
    }
};

organizeHackathon();
