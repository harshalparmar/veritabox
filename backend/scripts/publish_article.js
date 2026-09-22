import mongoose from 'mongoose';
import dotenv from 'dotenv';
import KnowledgeArticle from '../src/models/KnowledgeArticle.js';

dotenv.config();

const articleData = {
  title: 'Tactical Power Management for Autonomous Field Operatives',
  slug: 'tactical-power-management-robotics',
  categoryId: '69e627570c16b418669b9dbe',
  author: '69d543955582addb8a4b58d4',
  content: `# Tactical Power Management for Autonomous Field Operatives

## Abstract
In high-intensity field operations, the reliability of your power subsystem determines the mission's longevity. This brief covers the critical protocols for managing Lithium-Polymer (LiPo) and Lithium-Ion batteries within the VeritaBox ecosystem.

## 1. Subsystem Isolation
Always ensure that your high-current ESC rails are isolated from your micro-controller telemetry lines. Voltage spikes during aggressive maneuvers can compromise sensor data and cause erratic logic behavior.

### Critical Constraints:
| Parameter | Threshold | Action |
|-----------|-----------|--------|
| Bus Voltage | 22.2V - 25.2V | Standard operational range (6S) |
| Peak Current | 120A (10s Burst) | Cooling required for Mosfets |
| Cutoff | 3.3V per cell | Immediate tactical RTB (Return to Base) |

## 2. ESC Calibration Protocol
Calibrate each Electronic Speed Controller (ESC) using the VeritaBox tactical terminal. Synchronized timing is essential for stable hover and locomotion.

\`\`\`bash
# VeritaBox Terminal ESC Sync
veritabox esc --calibrate --id all --throttle max

# Wait for tactical beep sequence (Ready state)
veritabox esc --throttle min
\`\`\`

## 3. Real-Time Telemetry & Monitoring
Monitor battery cell drift via the VeritaBox Mainnet feed. A deviation of more than 0.2V between cells indicates a tactical failure risk or cell aging.

> [!IMPORTANT]
> Never discharge cells below 3.0V. Dropping beyond this threshold initiates irreversible chemical degradation of the substrate, rendering the power-pack volatile.

## 4. Hardware Inventory
This protocol has been verified on the following hardware artifacts:
- **T-Motor F60 Pro V**: High-torque tactical motors.
- **VeritaBox Sentinel Core v2**: Primary flight/compute controller.
- **Samsung 21700 45P Cells**: High-discharge energy storage.

---
*Intel contributed by Harshal Parmar, VeritaBox Founder. This brief is classified for VeritaBox Operatives.*`,
  metaDescription: 'A comprehensive technical manual on managing tactical power subsystems for autonomous mobile robotics.',
  keywords: ['robotics', 'power management', 'ESC', 'telemetry', 'li-ion', 'veritabox'],
  hardwareUsed: [
    { componentName: 'T-Motor F60 Pro V', supplierLink: 'https://store.tmotor.com' },
    { componentName: 'VeritaBox Sentinel Core v2', supplierLink: 'https://veritabox.com/docs' }
  ]
};

async function publish() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/veritabox';
    await mongoose.connect(mongoUri);
    console.log("Connected to VeritaBox Intelligence Network.");

    // Check if exists, update or create
    const existing = await KnowledgeArticle.findOne({ slug: articleData.slug });
    if (existing) {
      console.log("Updating existing intelligence artifact...");
      await KnowledgeArticle.findByIdAndUpdate(existing._id, articleData);
      console.log(`Artifact Synced: ${existing._id}`);
    } else {
      const article = await KnowledgeArticle.create(articleData);
      console.log(`Knowledge Artifact Published: ${article._id}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("Publication Failed:", error);
    process.exit(1);
  }
}

publish();
