import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../src/models/Category.js';
import KnowledgeArticle from '../src/models/KnowledgeArticle.js';
import User from '../src/models/User.js';

dotenv.config();

const MONGO_URI = "mongodb+srv://ircdbadmin:1NYh0XetvD4hAY6l@cluster0.w1qhc5g.mongodb.net/veritabox?retryWrites=true&w=majority";

const SECTORS = [
  { name: "Robotics", slug: "robotics" },
  { name: "AI", slug: "ai" },
  { name: "Security", slug: "security" },
  { name: "Embedded", slug: "embedded" },
  { name: "Hardware", slug: "hardware" },
  { name: "Research", slug: "research" },
];

const ARTICLES = [
  { 
    slug: "rtos-101", 
    title: "RTOS 101 — picking your scheduler", 
    cat: "Embedded", 
    content: "# RTOS 101 — picking your scheduler\n\nMost embedded systems start without a scheduler. They get one when interrupt latency, timing budgets, or sheer code volume make the bare-loop unmanageable. This piece is a small map for the moment that decision arrives.\n\n## Three families\n\nCooperative schedulers run tasks to completion. They are simple and predictable, with one cost: a misbehaving task starves everything.\n\nPreemptive schedulers slice time. They guarantee responsiveness, at the cost of a real context-switch and the discipline of synchronization primitives.\n\nEvent-driven schedulers blur the line. They feel familiar to anyone who has used a UI framework and pair well with state machines.\n\n### Cooperative — when it fits\n\nIf your deadlines are soft and your codebase fits in one head, cooperative is fine. Below is a minimal scheduler in C — it has earned its keep on more than one campus drone.\n\n```c\ntypedef void (*task_t)(void);\nstatic task_t queue[16];\nstatic uint8_t head = 0, tail = 0;\n\nvoid sched_post(task_t t) {\n  queue[tail++ & 0xF] = t;\n}\n\nvoid sched_run(void) {\n  while (head != tail) queue[head++ & 0xF]();\n}\n```\n\n## Picking\n\nIf your deadlines are soft and your codebase fits in one head, cooperative is fine. If they aren't, reach for **FreeRTOS** or **Zephyr** — but read the porting layer before committing.\n\n> Rule of thumb: scheduler complexity should match interrupt complexity, not feature count.\n\n### When to graduate\n\nYou'll know it's time when a single late ISR is enough to break your worst-case path.",
    hardwareUsed: [
      { componentName: "STM32F411 Black Pill", supplierLink: "https://www.mouser.com/" },
      { componentName: "ST-Link V2 Programmer", supplierLink: "https://robu.in/" }
    ]
  },
  { 
    slug: "kicad-pcb-flow", 
    title: "A modern KiCad PCB flow for hackathons", 
    cat: "Hardware", 
    content: "# KiCad PCB Flow\n\nFrom schematic capture to fab-ready gerbers in under an evening. Library hygiene, DRC tuning, and the panel tricks JLC accepts.",
    hardwareUsed: []
  },
  { 
    slug: "wgpu-onramp", 
    title: "On-ramp to wgpu for graphics", 
    cat: "AI", 
    content: "# wgpu On-ramp\n\nWebGPU through the lens of a Vulkan refugee. Buffers, bind groups, and the smallest compute pipeline that earns its keep.",
    hardwareUsed: []
  },
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB Atlas");

    // Get an author (first user)
    const author = await User.findOne();
    if (!author) {
      console.error("No users found to assign as author. Please register a user first.");
      process.exit(1);
    }

    console.log(`Using author: ${author.name} (${author._id})`);

    // Seed Categories
    const categoryMap = {};
    for (const s of SECTORS) {
      let cat = await Category.findOne({ slug: s.slug });
      if (!cat) {
        cat = await Category.create(s);
        console.log(`Created category: ${s.name}`);
      }
      categoryMap[s.name] = cat._id;
    }

    // Seed Articles
    for (const a of ARTICLES) {
      const existing = await KnowledgeArticle.findOne({ slug: a.slug });
      if (existing) {
        console.log(`Article exists: ${a.slug}`);
        continue;
      }

      await KnowledgeArticle.create({
        ...a,
        categoryId: categoryMap[a.cat] || null,
        author: author._id,
        upvotes: [],
        bookmarks: [],
        keywords: [a.cat, "Manual"],
        metaDescription: a.title
      });
      console.log(`Created article: ${a.title}`);
    }

    console.log("Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
}

seed();
