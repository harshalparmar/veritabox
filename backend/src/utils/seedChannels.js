import Channel from '../models/Channel.js';

export const DEFAULT_CHANNELS = [
  { name: 'general', topic: 'General communications and announcements', isPrivate: false, isDefault: true },
  { name: 'hackathons', topic: 'Hackathons discussion and updates', isPrivate: false, isDefault: true },
  { name: 'competitions', topic: 'Competitions discussion and updates', isPrivate: false, isDefault: true },
  { name: 'workshops', topic: 'Workshops discussion and updates', isPrivate: false, isDefault: true },
  { name: 'bounties', topic: 'Bounties discussion and updates', isPrivate: false, isDefault: true },
  { name: 'codeforge', topic: 'Code forge discussion and updates', isPrivate: false, isDefault: true },
  { name: 'incidents', topic: 'Incident response coordination', isPrivate: true, isDefault: true }
];

export async function seedDefaultChannels() {
  try {
    const existing = await Channel.find({ name: { $in: DEFAULT_CHANNELS.map(c => c.name) } });
    const existingNames = new Set(existing.map(c => c.name));
    const missing = DEFAULT_CHANNELS.filter(c => !existingNames.has(c.name));
    if (missing.length > 0) {
      await Channel.insertMany(missing);
      console.log(`✅ Seeded ${missing.length} default channels`);
    }
  } catch (err) {
    console.error('Channel seeding failed:', err.message);
  }
}
