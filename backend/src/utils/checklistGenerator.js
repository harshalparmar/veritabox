/**
 * checklistGenerator.js
 * Generates the daily checklist from a student's personalized roadmap.
 * Idempotent: returns existing checklist if already generated for the date.
 * Carries forward incomplete tasks. No duplicates.
 */

import DailyChecklist from '../models/DailyChecklist.js';
import Roadmap from '../models/Roadmap.js';
import { notifyLearningMilestone } from './learningNotifications.js';

/**
 * Get today's date as a YYYY-MM-DD key for idempotent lookup.
 */
export function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Get or generate today's checklist for a student.
 * @param {string} userId
 * @returns {Object} DailyChecklist document
 */
export async function getOrCreateTodaysChecklist(userId) {
  const todayKey = getTodayKey();

  // ── Idempotent: return existing if already created ────────────────
  const existing = await DailyChecklist.findOne({ user: userId, dateKey: todayKey });
  if (existing) return existing;

  // ── Load student's roadmap ────────────────────────────────────────
  const roadmap = await Roadmap.findOne({ user: userId });
  if (!roadmap) return null;

  // ── Collect carried-forward pending tasks from recent days ─────────
  // Look back up to 7 days so multi-day absences don't silently drop tasks
  const pendingItems = [];
  const seenContentIds = new Set();
  let lastChecklist = null;

  for (let daysBack = 1; daysBack <= 7; daysBack++) {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - daysBack);
    const pastKey = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`;

    const pastChecklist = await DailyChecklist.findOne({ user: userId, dateKey: pastKey });
    if (!pastChecklist) continue;

    if (daysBack === 1) lastChecklist = pastChecklist;

    for (const item of pastChecklist.items) {
      if (item.status !== 'Completed' && item.status !== 'Skipped') {
        const contentKey = item.contentId ? item.contentId.toString() + ':' + item.taskType : item._id.toString();
        if (seenContentIds.has(contentKey)) continue;
        seenContentIds.add(contentKey);

        pendingItems.push({
          topicRef: item.topicRef,
          contentId: item.contentId,
          title: item.title,
          taskType: item.taskType,
          phase: item.phase,
          module: item.module,
          topic: item.topic,
          estimatedMinutes: item.estimatedMinutes,
          difficulty: item.difficulty,
          priority: 'High',
          dueDate: pastDate,
          status: 'Available',
          isCarriedForward: true,
          carriedFromDate: pastDate,
          originalDate: item.originalDate || pastDate
        });
      }
    }

    // Stop looking back once we find a completed checklist (no older tasks to recover)
    if (pastChecklist.isCompleted) break;
  }

  // Also fix any roadmap topics stuck as InProgress with no active checklist item
  for (let pi = 0; pi < roadmap.phases.length; pi++) {
    const phase = roadmap.phases[pi];
    if (phase.status === 'Locked') continue;
    for (let mi = 0; mi < phase.modules.length; mi++) {
      const module = phase.modules[mi];
      if (module.status === 'Locked') continue;
      for (let ti = 0; ti < module.topics.length; ti++) {
        const topic = module.topics[ti];
        if (topic.status === 'InProgress' && topic.contentId) {
          const contentStr = topic.contentId.toString();
          const alreadyCarried = pendingItems.some(p => p.contentId?.toString() === contentStr);
          if (!alreadyCarried) {
            // Reset stuck InProgress topics back to Available so they can be rescheduled
            roadmap.phases[pi].modules[mi].topics[ti].status = 'Available';
          }
        }
      }
    }
  }

  // ── Calculate remaining minutes for new tasks ─────────────────────
  const totalDailyMinutes = roadmap.generationContext?.dailyMinutes || 60;
  const carriedMinutes = pendingItems.reduce((sum, i) => sum + (i.estimatedMinutes || 30), 0);
  let remainingMinutes = Math.max(0, totalDailyMinutes - carriedMinutes);

  // ── Find next available roadmap topics ────────────────────────────
  const newItems = [];
  let minutesScheduled = 0;

  // Get already-scheduled content IDs for today to avoid duplicates
  const pendingContentIds = new Set(pendingItems.map(i => i.contentId?.toString()).filter(Boolean));

  outerLoop: for (let pi = 0; pi < roadmap.phases.length; pi++) {
    const phase = roadmap.phases[pi];
    if (phase.status === 'Locked') continue;

    for (let mi = 0; mi < phase.modules.length; mi++) {
      const module = phase.modules[mi];
      if (module.status === 'Locked') continue;

      for (let ti = 0; ti < module.topics.length; ti++) {
        const topic = module.topics[ti];

        // Skip completed/skipped topics
        if (topic.status === 'Completed' || topic.status === 'Skipped') continue;

        // Skip if already in carried-forward list
        if (topic.contentId && pendingContentIds.has(topic.contentId.toString())) continue;

        const topicMinutes = topic.estimatedMinutes || 30;

        // Stop if we'd exceed daily limit
        if (minutesScheduled + topicMinutes > remainingMinutes && newItems.length > 0) {
          break outerLoop;
        }

        // Fetch the actual content to see if it has practical/quiz
        const LearningContent = (await import('../models/LearningContent.js')).default;
        const contentInfo = await LearningContent.findById(topic.contentId).select('quizQuestions practiceTask');
        
        const hasQuiz = contentInfo && contentInfo.quizQuestions && contentInfo.quizQuestions.length > 0;
        const hasPractical = contentInfo && contentInfo.practiceTask && contentInfo.practiceTask.title;

        // Base item data
        const baseItem = {
          topicRef: { phaseIndex: pi, moduleIndex: mi, topicIndex: ti },
          contentId: topic.contentId,
          phase: phase.title,
          module: module.title,
          topic: topic.title,
          difficulty: topic.difficulty || 'Beginner',
          priority: 'Medium',
          dueDate: new Date(),
          isCarriedForward: false,
          originalDate: new Date()
        };

        // 1. Theory Item
        newItems.push({
          ...baseItem,
          title: `Theory: ${topic.title}`,
          taskType: 'Theory',
          estimatedMinutes: Math.floor(topicMinutes * 0.5), // 50% time for theory
          status: 'Available'
        });

        // 2. Practical Item
        if (hasPractical) {
          newItems.push({
            ...baseItem,
            title: `Practical: ${contentInfo.practiceTask.title}`,
            taskType: 'Practical',
            estimatedMinutes: Math.floor(topicMinutes * 0.3), // 30% time
            status: 'Locked' // Requires Theory
          });
        }

        // 3. Quiz/Assessment Item
        if (hasQuiz) {
          newItems.push({
            ...baseItem,
            title: `Assessment: ${topic.title}`,
            taskType: 'Quiz',
            estimatedMinutes: Math.floor(topicMinutes * 0.2), // 20% time
            status: 'Locked' // Requires Theory + Practical
          });
        }
        
        // If it's a diagnostic or other custom type (not Theory), add as its own item
        // but only if no Theory item was already pushed for this topic
        if (!hasQuiz && !hasPractical && topic.type && topic.type !== 'Theory') {
           // Remove the generic Theory item we just added since this is a special type
           newItems.pop();
           newItems.push({
             ...baseItem,
             title: topic.title,
             taskType: topic.type,
             estimatedMinutes: topicMinutes,
             status: 'Available'
           });
        }

        minutesScheduled += topicMinutes;

        // Mark as "InProgress" in roadmap (will be updated on completion)
        if (topic.status === 'Available') {
          roadmap.phases[pi].modules[mi].topics[ti].status = 'InProgress';
        }
      }
    }
  }

  // Save roadmap status updates (new items or stuck-topic resets)
  await roadmap.save();

  // ── Combine carried + new items ───────────────────────────────────
  const allItems = [...pendingItems, ...newItems];

  if (allItems.length === 0) {
    // No tasks available (roadmap complete or no active content)
    const checklist = new DailyChecklist({
      user: userId,
      roadmap: roadmap._id,
      date: new Date(),
      dateKey: todayKey,
      items: [],
      totalMinutes: 0,
      streakCount: (lastChecklist?.streakCount || 0),
      isCompleted: false
    });
    await checklist.save();
    return checklist;
  }

  const totalMinutes = allItems.reduce((sum, i) => sum + (i.estimatedMinutes || 30), 0);

  // Carry over streak — respect daysPerWeek (don't break streak on planned rest days)
  const daysPerWeek = roadmap.generationContext?.daysPerWeek || 5;
  let streakCount = 0;

  if (lastChecklist?.isCompleted) {
    streakCount = (lastChecklist.streakCount || 0) + 1;
  } else if (!lastChecklist && daysPerWeek < 7) {
    // No checklist yesterday — check if it was a planned rest day
    // Look further back for the most recent checklist to continue streak
    for (let daysBack = 2; daysBack <= (7 - daysPerWeek + 1); daysBack++) {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - daysBack);
      const pastKey = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-${String(pastDate.getDate()).padStart(2, '0')}`;
      const pastChecklist = await DailyChecklist.findOne({ user: userId, dateKey: pastKey });
      if (pastChecklist) {
        streakCount = pastChecklist.isCompleted ? (pastChecklist.streakCount || 0) + 1 : 0;
        break;
      }
    }
  }

  const checklist = new DailyChecklist({
    user: userId,
    roadmap: roadmap._id,
    date: new Date(),
    dateKey: todayKey,
    items: allItems,
    totalMinutes,
    streakCount,
    isCompleted: false
  });

  await checklist.save();
  return checklist;
}

/**
 * Update checklist after a task is completed.
 * - Marks the checklist item as Completed.
 * - ONLY marks the Roadmap Topic as Completed when a Quiz-type item is completed
 *   AND the user has a passing QuizAttempt for it.
 * - Theory/Practical completion does NOT complete the Roadmap topic.
 */
export async function completeChecklistTask(userId, checklistId, taskItemId) {
  const checklist = await DailyChecklist.findOne({ _id: checklistId, user: userId });
  if (!checklist) return null;

  const item = checklist.items.id(taskItemId);
  if (!item) return null;

  item.status = 'Completed';
  item.completedAt = new Date();
  item.actualMinutes = item.startedAt
    ? Math.round((item.completedAt - new Date(item.startedAt)) / 60000)
    : item.estimatedMinutes;

  // Check if all required tasks are done
  const allDone = checklist.items.every(i => i.status === 'Completed' || i.status === 'Skipped');
  if (allDone) {
    checklist.isCompleted = true;
    checklist.completedAt = new Date();
    checklist.completedMinutes = checklist.totalMinutes;
  } else {
    checklist.completedMinutes = checklist.items
      .filter(i => i.status === 'Completed')
      .reduce((sum, i) => sum + (i.estimatedMinutes || 0), 0);
  }

  // ── Unlock dependent checklist items ──────────────────────────────────────
  if (item.contentId) {
    const sameContentItems = checklist.items.filter(
      i => i.contentId?.toString() === item.contentId.toString() && i._id.toString() !== item._id.toString()
    );

    if (item.taskType === 'Theory') {
      const practicalItem = sameContentItems.find(i => i.taskType === 'Practical');
      if (practicalItem) practicalItem.status = 'Available';
      
      // If there is no practical, unlock quiz directly
      if (!practicalItem) {
        const quizItem = sameContentItems.find(i => i.taskType === 'Quiz');
        if (quizItem) quizItem.status = 'Available';
      }
    } else if (item.taskType === 'Practical') {
      const quizItem = sameContentItems.find(i => i.taskType === 'Quiz');
      if (quizItem) quizItem.status = 'Available';
    }
  }

  await checklist.save();

  // ── Only cascade to Roadmap on Quiz completion with a passed attempt ──────
  // Theory and Practical completions do NOT complete the Roadmap topic.
  const isQuizType = item.taskType === 'Quiz';

  if (isQuizType && item.topicRef && item.contentId) {
    // Verify the user actually passed the quiz for this content
    const QuizAttempt = (await import('../models/QuizAttempt.js')).default;
    const passedAttempt = await QuizAttempt.findOne({
      user: userId,
      content: item.contentId,
      passed: true
    });

    if (passedAttempt) {
      const roadmap = await Roadmap.findOne({ user: userId });
      if (roadmap) {
        const { phaseIndex, moduleIndex, topicIndex } = item.topicRef;
        const topic = roadmap.phases?.[phaseIndex]?.modules?.[moduleIndex]?.topics?.[topicIndex];
        if (topic && topic.contentId?.toString() === item.contentId.toString()) {
          topic.status = 'Completed';
          topic.completedAt = new Date();
          topic.score = passedAttempt.percentageScore;
          topic.passed = true;

          // Recalculate roadmap progress
          const totalTopics = roadmap.phases.reduce((s, p) =>
            s + p.modules.reduce((ms, m) => ms + m.topics.length, 0), 0);
          const completedTopics = roadmap.phases.reduce((s, p) =>
            s + p.modules.reduce((ms, m) => ms + m.topics.filter(t => t.status === 'Completed').length, 0), 0);
          roadmap.completedTopics = completedTopics;
          roadmap.totalTopics = totalTopics;
          roadmap.progressPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
          roadmap.isCompleted = completedTopics === totalTopics && totalTopics > 0;
          if (roadmap.isCompleted) roadmap.completedAt = new Date();

          // Unlock next topic in module
          const nextTopic = roadmap.phases[phaseIndex]?.modules[moduleIndex]?.topics[topicIndex + 1];
          if (nextTopic && nextTopic.status === 'Locked') {
            nextTopic.status = 'Available';
          }
          // Unlock next module if all topics in current module are done
          const moduleDone = roadmap.phases[phaseIndex].modules[moduleIndex].topics.every(
            t => t.status === 'Completed' || t.status === 'Skipped'
          );
          if (moduleDone) {
            roadmap.phases[phaseIndex].modules[moduleIndex].status = 'Completed';
            const nextModule = roadmap.phases[phaseIndex].modules[moduleIndex + 1];
            if (nextModule) {
              nextModule.status = 'Active';
              if (nextModule.topics.length > 0) nextModule.topics[0].status = 'Available';
            }
          }
          // Unlock next phase if all modules done
          const phaseDone = roadmap.phases[phaseIndex].modules.every(m => m.status === 'Completed');
          if (phaseDone) {
            roadmap.phases[phaseIndex].status = 'Completed';
            const nextPhase = roadmap.phases[phaseIndex + 1];
            if (nextPhase) {
              nextPhase.status = 'Active';
              if (nextPhase.modules.length > 0) {
                nextPhase.modules[0].status = 'Active';
                if (nextPhase.modules[0].topics.length > 0) {
                  nextPhase.modules[0].topics[0].status = 'Available';
                }
              }
            }
            roadmap.activePhaseIndex = Math.min(phaseIndex + 1, roadmap.phases.length - 1);
          }

          await roadmap.save();

          // Send milestone notifications
          if (moduleDone) {
            await notifyLearningMilestone(userId, {
              type: 'learning_milestone',
              title: 'Module Completed!',
              message: `You completed the "${roadmap.phases[phaseIndex].modules[moduleIndex].title}" module.`,
              link: '/progress',
              metadata: { phase: phaseIndex, module: moduleIndex }
            });
          }
          if (phaseDone) {
            await notifyLearningMilestone(userId, {
              type: 'phase_completed',
              title: 'Phase Completed!',
              message: `You completed the "${roadmap.phases[phaseIndex].title}" phase. ${roadmap.phases[phaseIndex].milestoneTitle || 'Great milestone!'}`,
              link: '/progress',
              metadata: { phase: phaseIndex }
            });
          }
          if (roadmap.isCompleted) {
            await notifyLearningMilestone(userId, {
              type: 'roadmap_completed',
              title: 'Roadmap Complete!',
              message: `Congratulations! You've completed your entire "${roadmap.careerGoalTitle}" learning roadmap!`,
              link: '/progress',
              metadata: {}
            });
          }
        }
      }
    }
  }

  return checklist;
}
