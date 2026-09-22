import Notification from '../models/Notification.js';

export async function notifyLearningMilestone(userId, { type, title, message, link, metadata }) {
  try {
    await Notification.create({ userId, type, title, message, link, metadata });
  } catch (err) {
    console.error('[LearningNotification]', err.message);
  }
}

export async function checkStreakMilestone(userId, streakCount) {
  const milestones = [3, 7, 14, 30, 50, 100];
  if (milestones.includes(streakCount)) {
    await notifyLearningMilestone(userId, {
      type: 'streak_milestone',
      title: `${streakCount}-Day Streak!`,
      message: `You've maintained a ${streakCount}-day learning streak. Keep the momentum going!`,
      link: '/progress',
      metadata: { streak: streakCount }
    });
  }
}
