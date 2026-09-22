import User from '../models/User.js';

export async function parseMentions(content = '') {
  const matches = [...content.matchAll(/@([a-zA-Z0-9_.-]+)/g)].map(m => m[1]);
  if (matches.length === 0) return [];
  const users = await User.find({ username: { $in: matches } }).select('_id username name');
  return users;
}
