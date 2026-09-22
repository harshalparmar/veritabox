import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Bounty from '../src/models/Bounty.js';
import Hackathon from '../src/models/Hackathon.js';
import KnowledgeArticle from '../src/models/KnowledgeArticle.js';
import Category from '../src/models/Category.js';
import User from '../src/models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/veritabox';

const seedData = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('⚡ Connected to MongoDB for seeding...');

        // 1. Clear Existing Data
        await Bounty.deleteMany({});
        await Hackathon.deleteMany({});
        await KnowledgeArticle.deleteMany({});
        await Category.deleteMany({});
        
        console.log('🧹 Cleared existing collections.');

        // 2. Seed Categories
        const catDocs = await Category.insertMany([
            { name: 'Hardware', slug: 'hardware' },
            { name: 'Software', slug: 'software' },
            { name: 'Design', slug: 'design' },
            { name: 'Robotics', slug: 'robotics' },
        ]);
        console.log('📂 Seeded Categories.');

        // 3. Seed User (Admin/Founding Operative)
        let admin = await User.findOne({ universityId: 'ADMIN-001' });
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
            console.log('👤 Created Admin User.');
        }

        // 4. Seed Bounties
        await Bounty.insertMany([
            {
                title: 'Audit PCB silkscreens — Fusion build',
                description: 'Review the current PCB silkscreens for any overlapping components.',
                techStack: ['KiCad', 'Altium'],
                pointReward: 140,
                status: 'Open',
                createdBy: admin._id,
            },
            {
                title: 'Document FreeRTOS task graph',
                description: 'Create a visual graph of the task prioritization in the current firmware.',
                techStack: ['FreeRTOS', 'C++'],
                pointReward: 180,
                status: 'Open',
                createdBy: admin._id,
            },
        ]);
        console.log('🎯 Seeded Bounties.');

        // 5. Seed Hackathons
        await Hackathon.insertMany([
            {
                title: 'Fusion Build 26',
                slug: 'fusion-build-26',
                description: 'A 48-hour sprint to build connected IoT meshes.',
                shortDescription: 'A 48-hour sprint to build connected IoT meshes.',
                status: 'Announced',
                organizer: admin._id,
                rounds: [{ 
                    roundNumber: 1, 
                    title: 'Inception', 
                    startTime: new Date(), 
                    endTime: new Date(Date.now() + 86400000) 
                }]
            },
            {
                title: 'Dawn Robotics Sprint',
                slug: 'dawn-robotics',
                description: 'Autonomous navigation challenge for mobile base robots.',
                shortDescription: 'Autonomous navigation challenge for mobile base robots.',
                status: 'Live',
                organizer: admin._id,
                rounds: [{ 
                    roundNumber: 1, 
                    title: 'Navigation', 
                    startTime: new Date(), 
                    endTime: new Date(Date.now() + 172800000) 
                }]
            }
        ]);
        console.log('🏆 Seeded Hackathons.');

        // 6. Seed Knowledge Articles
        await KnowledgeArticle.insertMany([
            {
                title: 'RTOS 101 — picking your scheduler',
                slug: 'rtos-101-scheduler',
                content: '# Picking a Scheduler\n\nChoosing the right scheduler is critical for real-time systems...',
                author: admin._id,
                categoryId: catDocs[1]._id,
                metaDescription: 'A guide to RTOS schedulers.',
                isPublished: true,
                hardwareUsed: [
                    { componentName: 'ESP32', supplierLink: 'https://example.com/esp32' }
                ]
            },
            {
                title: 'PCB Silkscreen Best Practices',
                slug: 'pcb-silkscreen-best-practices',
                content: '# Silk Screen Basics\n\nClear silkscreens help in debugging and manufacturing...',
                author: admin._id,
                categoryId: catDocs[0]._id,
                metaDescription: 'Best practices for PCB silkscreen design.',
                isPublished: true,
                hardwareUsed: [
                    { componentName: 'KiCad', supplierLink: 'https://kicad.org' }
                ]
            }
        ]);
        console.log('📚 Seeded Knowledge Hub.');

        console.log('✅ Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedData();
