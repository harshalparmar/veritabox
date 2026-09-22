import Notification from '../models/Notification.js';

export async function createNotification(userId, type, title, message, link = '', metadata = {}) {
  try {
    const notif = await Notification.create({ userId, type, title, message, link, metadata });
    return notif;
  } catch (err) {
    console.error('Notification creation failed:', err.message);
    return null;
  }
}
