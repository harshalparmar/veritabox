import mongoose from 'mongoose';
import Hackathon from '../models/Hackathon.js';
import fs from 'fs';
import path from 'path';

// Helper to resolve Hackathon ID from either ObjectId or Slug
export async function resolveHackathonId(identifier) {
    if (!identifier) return null;
    const cleanId = identifier.toString().trim();
    // Escape regex metacharacters so a crafted slug can't inject a pattern
    // (wildcard match / ReDoS) into the lookup.
    const escaped = cleanId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // 1. Try slug lookup first (most common in frontend URLs now)
    const hBySlug = await Hackathon.findOne({
        slug: { $regex: new RegExp("^" + escaped + "$", "i") }
    }).select('_id');
    if (hBySlug) return hBySlug._id;

    // 2. If it's a valid ObjectId, assume it's an ID
    if (mongoose.Types.ObjectId.isValid(cleanId)) return cleanId;
    
    return null;
}

const MAX_SNAPSHOT_SIZE = 2 * 1024 * 1024; // 2MB max
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function saveProctorSnapshot(base64Data, teamId, userId) {
    if (!base64Data || typeof base64Data !== 'string') throw new Error('No image telemetry data provided');
    if (base64Data.length > MAX_SNAPSHOT_SIZE * 1.37) throw new Error('Snapshot exceeds maximum allowed size');

    const dir = path.join('uploads', 'proctor');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let imageBuffer;
    let extension = 'jpg';

    if (matches && matches.length === 3) {
        const mimeType = matches[1];
        if (!ALLOWED_MIME_TYPES.includes(mimeType)) throw new Error('Invalid image type. Only JPEG, PNG, and WebP are allowed.');
        imageBuffer = Buffer.from(matches[2], 'base64');
        if (mimeType.includes('png')) {
            extension = 'png';
        } else if (mimeType.includes('webp')) {
            extension = 'webp';
        }
    } else {
        imageBuffer = Buffer.from(base64Data, 'base64');
    }

    if (imageBuffer.length > MAX_SNAPSHOT_SIZE) throw new Error('Decoded snapshot exceeds maximum allowed size');

    const safeTeamId = String(teamId).replace(/[^a-zA-Z0-9-]/g, '');
    const safeUserId = String(userId).replace(/[^a-zA-Z0-9-]/g, '');
    const filename = `proctor-${safeTeamId}-${safeUserId}-${Date.now()}.${extension}`;
    const filePath = path.join(dir, filename);

    await fs.promises.writeFile(filePath, imageBuffer);
    return `/uploads/proctor/${filename}`;
}
