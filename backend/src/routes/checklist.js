/**
 * routes/checklist.js — Daily personalized checklist generation and management.
 * Replaces original simple implementation with full personalization.
 */

import express from 'express';
import DailyChecklist from '../models/DailyChecklist.js';
import { protect } from '../middleware/authMiddleware.js';
import { getOrCreateTodaysChecklist, completeChecklistTask, getTodayKey } from '../utils/checklistGenerator.js';
import LearningActivity from '../models/LearningActivity.js';
import ProgressRecord from '../models/ProgressRecord.js';

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/checklist — Get or generate today's checklist
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const checklist = await getOrCreateTodaysChecklist(req.user._id);

    if (!checklist) {
      return res.status(404).json({
        message: 'No roadmap found. Complete onboarding and generate a roadmap first.'
      });
    }

    // Auto-fix: if any practical or quiz task is stuck but completed, auto-complete it
    let modified = false;
    const PracticalSubmission = (await import('../models/PracticalSubmission.js')).default;
    const QuizAttempt = (await import('../models/QuizAttempt.js')).default;
    
    for (const item of checklist.items) {
      if (['Available', 'InProgress', 'Locked', 'Overdue'].includes(item.status) && item.contentId) {
        let shouldComplete = false;
        
        if (item.taskType === 'Practical') {
          const sub = await PracticalSubmission.findOne({ user: req.user._id, content: item.contentId, status: 'Verified' });
          if (sub) shouldComplete = true;
        } else if (item.taskType === 'Quiz') {
          const pass = await QuizAttempt.findOne({ user: req.user._id, content: item.contentId, passed: true });
          if (pass) shouldComplete = true;
        }

        if (shouldComplete) {
          if (item.status === 'Locked') item.status = 'Available'; // unlock first if needed
          await checklist.save();
          await completeChecklistTask(req.user._id, checklist._id, item._id);
          modified = true;
        }
      }
    }

    // Helper: detect rest day for a checklist result
    const addRestDayFlag = async (result) => {
      const obj = result.toObject ? result.toObject() : result;
      const Roadmap = (await import('../models/Roadmap.js')).default;
      const rm = await Roadmap.findOne({ user: req.user._id }).select('generationContext');
      const dpw = rm?.generationContext?.daysPerWeek || 7;
      if (obj.items.length === 0 && dpw < 7) {
        const dayOfWeek = new Date().getDay();
        obj.isRestDay = (dpw <= 5 && (dayOfWeek === 0 || dayOfWeek === 6)) ||
                        (dpw <= 6 && dayOfWeek === 0);
        obj.daysPerWeek = dpw;
      }
      return obj;
    };

    if (modified) {
      const updatedChecklist = await DailyChecklist.findById(checklist._id);
      return res.json(await addRestDayFlag(updatedChecklist));
    }

    res.json(await addRestDayFlag(checklist));
  } catch (err) {
    res.status(500).json({ message: 'Error fetching checklist: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/checklist/pending — Get carried-forward incomplete tasks
// ──────────────────────────────────────────────────────────────────────────────
router.get('/pending', protect, async (req, res) => {
  try {
    const todayKey = getTodayKey();
    const checklist = await DailyChecklist.findOne({ user: req.user._id, dateKey: todayKey });

    if (!checklist) {
      return res.json([]);
    }

    const pending = checklist.items.filter(i =>
      i.isCarriedForward || i.status === 'Overdue'
    );

    res.json(pending);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching pending tasks: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/checklist/task/:itemId/start — Mark task as started
// ──────────────────────────────────────────────────────────────────────────────
router.put('/task/:itemId/start', protect, async (req, res) => {
  try {
    const todayKey = getTodayKey();
    const checklist = await DailyChecklist.findOne({
      user: req.user._id,
      dateKey: todayKey
    });

    if (!checklist) return res.status(404).json({ message: 'Checklist not found for today.' });

    const item = checklist.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Task not found.' });

    // Opening a task does NOT complete it
    if (item.status === 'Available' || item.status === 'Overdue') {
      item.status = 'InProgress';
      item.startedAt = item.startedAt || new Date();
      await checklist.save();
    }

    res.json({ item, message: 'Task started.' });
  } catch (err) {
    res.status(500).json({ message: 'Error starting task: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/checklist/task/:itemId/complete — Backend-validated task completion
// Backend decides if the task meets completion criteria.
// Opening a task alone NEVER marks it complete.
// ──────────────────────────────────────────────────────────────────────────────
router.put('/task/:itemId/complete', protect, async (req, res) => {
  try {
    const todayKey = getTodayKey();
    const checklist = await DailyChecklist.findOne({
      user: req.user._id,
      dateKey: todayKey
    });

    if (!checklist) return res.status(404).json({ message: 'Checklist not found.' });

    const item = checklist.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Task not found.' });

    if (item.status === 'Completed') {
      return res.json({ item, message: 'Task already completed.' });
    }

    const taskType = item.taskType;
    const contentId = item.contentId?.toString();

    // ── Step sequencing enforcement ───────────────────────────────────────
    // For any item with a contentId, we enforce Theory → Practical → Quiz order.
    if (contentId) {
      const sameContentItems = checklist.items.filter(
        i => i.contentId?.toString() === contentId && i._id.toString() !== item._id.toString()
      );

      if (taskType === 'Practical') {
        // Practical requires Theory to be completed first
        const theoryItem = sameContentItems.find(i => i.taskType === 'Theory');
        if (theoryItem && theoryItem.status !== 'Completed') {
          return res.status(403).json({
            message: 'Complete the theory first before submitting the practical task.',
            requiresTheory: true,
            contentId
          });
        }
      }

      if (taskType === 'Quiz') {
        // Quiz requires both Theory AND Practical to be completed first
        const theoryItem = sameContentItems.find(i => i.taskType === 'Theory');
        if (theoryItem && theoryItem.status !== 'Completed') {
          return res.status(403).json({
            message: 'Complete the theory first before taking the assessment.',
            requiresTheory: true,
            contentId
          });
        }

        const practicalItem = sameContentItems.find(i => i.taskType === 'Practical');
        if (practicalItem && practicalItem.status !== 'Completed') {
          return res.status(403).json({
            message: 'Complete the practical task before taking the assessment.',
            requiresPractical: true,
            contentId
          });
        }

        // Quiz also requires a passed quiz attempt
        const LearningContent = (await import('../models/LearningContent.js')).default;
        const Quiz = (await import('../models/Quiz.js')).default;
        
        let requiresPassedQuiz = false;
        let hasPassed = false;

        const content = await LearningContent.findById(contentId);
        if (content && content.quizQuestions && content.quizQuestions.length > 0) {
          requiresPassedQuiz = true;
          const QuizAttempt = (await import('../models/QuizAttempt.js')).default;
          const passedAttempt = await QuizAttempt.findOne({
            user: req.user._id,
            content: contentId,
            passed: true
          });
          if (passedAttempt) hasPassed = true;
        } else {
          // Check if it's a standalone quiz
          const standaloneQuiz = await Quiz.findById(contentId);
          if (standaloneQuiz) {
            requiresPassedQuiz = true;
            const QuizProgress = (await import('../models/QuizProgress.js')).default;
            const prog = await QuizProgress.findOne({ user: req.user._id, quiz: contentId, passed: true });
            if (prog) hasPassed = true;
          }
        }

        if (requiresPassedQuiz && !hasPassed) {
          return res.status(403).json({
            message: 'You must pass the quiz/assessment before completing this topic.',
            requiresQuiz: true,
            contentId
          });
        }
      }
    }

    // ── Legacy: Diagnostic must be completed ─────────────────────────────
    if (taskType === 'Diagnostic' && contentId) {
      const DiagnosticAssessment = (await import('../models/DiagnosticAssessment.js')).default;
      const assessment = await DiagnosticAssessment.findOne({
        user: req.user._id,
        _id: contentId
      });
      if (!assessment || assessment.status !== 'Completed') {
        return res.status(403).json({
          message: 'Diagnostic assessment must be completed first.',
          requiresVerification: true,
          contentId
        });
      }
    }

    // ── Mark complete ─────────────────────────────────────────────────────
    const updated = await completeChecklistTask(req.user._id, checklist._id, req.params.itemId);

    // Compute actual time spent
    const actualMinutes = item.startedAt
      ? Math.round((new Date() - new Date(item.startedAt)) / 60000)
      : item.estimatedMinutes;

    // Update progress record daily stats
    const today = new Date();
    const dateKey = getTodayKey();
    let progress = await ProgressRecord.findOne({ user: req.user._id });
    if (!progress) progress = new ProgressRecord({ user: req.user._id });

    let dailyStat = progress.dailyStats.find(d => d.dateKey === dateKey);
    if (!dailyStat) {
      progress.dailyStats.push({
        date: today,
        dateKey,
        tasksAssigned: checklist.items.length,
        tasksCompleted: 0,
        learningTimeMinutes: 0
      });
      dailyStat = progress.dailyStats[progress.dailyStats.length - 1];
    }
    dailyStat.tasksCompleted = (dailyStat.tasksCompleted || 0) + 1;
    dailyStat.learningTimeMinutes += (actualMinutes || 30);
    if (taskType === 'Theory') {
      dailyStat.theoryCompleted = (dailyStat.theoryCompleted || 0) + 1;
      progress.theoryTopicsCompleted = (progress.theoryTopicsCompleted || 0) + 1;
    } else if (taskType === 'Quiz') {
      dailyStat.quizzesCompleted = (dailyStat.quizzesCompleted || 0) + 1;
      progress.quizzesPassed = (progress.quizzesPassed || 0) + 1;
    } else if (taskType === 'Practical') {
      dailyStat.practicalsCompleted = (dailyStat.practicalsCompleted || 0) + 1;
      progress.practicalTasksCompleted = (progress.practicalTasksCompleted || 0) + 1;
    }
    progress.totalLearningMinutes = (progress.totalLearningMinutes || 0) + (actualMinutes || 30);
    progress.lastActivityDate = today;
    await progress.save();

    // Check streak milestone if checklist is fully completed
    if (updated.isCompleted) {
      const { checkStreakMilestone } = await import('../utils/learningNotifications.js');
      await checkStreakMilestone(req.user._id, updated.streakCount);
    }

    // Log activity
    await LearningActivity.create({
      user: req.user._id,
      eventType: taskType === 'Theory' ? 'theory_completed' : taskType === 'Quiz' ? 'quiz_submitted' : 'practical_submitted',
      content: item.contentId,
      metadata: {
        durationMinutes: item.estimatedMinutes,
        phase: item.phase,
        module: item.module,
        topic: item.topic
      }
    });

    res.json({ checklist: updated, actualMinutes, message: 'Task completed.' });
  } catch (err) {
    res.status(500).json({ message: 'Error completing task: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/checklist/weekly — Weekly dashboard stats
// ──────────────────────────────────────────────────────────────────────────────
router.get('/weekly', protect, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const checklists = await DailyChecklist.find({
      user: req.user._id,
      date: { $gte: sevenDaysAgo }
    }).sort({ date: 1 });

    const stats = {
      totalDays: checklists.length,
      completedDays: checklists.filter(c => c.isCompleted).length,
      totalTasksAssigned: checklists.reduce((s, c) => s + c.items.length, 0),
      totalTasksCompleted: checklists.reduce((s, c) => s + c.items.filter(i => i.status === 'Completed').length, 0),
      totalMinutes: checklists.reduce((s, c) => s + (c.completedMinutes || 0), 0),
      currentStreak: checklists[checklists.length - 1]?.streakCount || 0,
      dailyBreakdown: checklists.map(c => ({
        dateKey: c.dateKey,
        date: c.date,
        assigned: c.items.length,
        completed: c.items.filter(i => i.status === 'Completed').length,
        minutes: c.completedMinutes || 0,
        isCompleted: c.isCompleted
      }))
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching weekly stats: ' + err.message });
  }
});

// Backward-compat: legacy item update endpoint
router.put('/item/:itemId', protect, async (req, res) => {
  // Redirect to new complete endpoint
  req.params.itemId = req.params.itemId;
  if (req.body.status === 'Completed') {
    return res.redirect(307, `/api/checklist/task/${req.params.itemId}/complete`);
  }
  res.status(400).json({ message: 'Use PUT /api/checklist/task/:id/complete or /start instead.' });
});

export default router;
