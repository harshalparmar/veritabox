/**
 * routes/progress.js — Real database-backed progress APIs.
 * Progress is ALWAYS calculated from actual DB records, never from frontend.
 */

import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Roadmap from '../models/Roadmap.js';
import ProgressRecord from '../models/ProgressRecord.js';
import DailyChecklist from '../models/DailyChecklist.js';
import QuizAttempt from '../models/QuizAttempt.js';
import LearningActivity from '../models/LearningActivity.js';
import StudentOnboarding from '../models/StudentOnboarding.js';

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/progress/overall — Computed overall progress percentage
// ──────────────────────────────────────────────────────────────────────────────
router.get('/overall', protect, async (req, res) => {
  try {
    const [roadmap, progress, onboarding] = await Promise.all([
      Roadmap.findOne({ user: req.user._id }).populate('careerGoal', 'title'),
      ProgressRecord.findOne({ user: req.user._id }),
      StudentOnboarding.findOne({ user: req.user._id }).populate('careerGoal', 'title')
    ]);

    if (!roadmap) {
      return res.json({
        percentage: 0,
        completedTopics: 0,
        totalTopics: 0,
        currentPhase: null,
        estimatedRemainingDays: null,
        lastActivityDate: null,
        message: 'No roadmap yet'
      });
    }

    // Calculate progress from actual roadmap data (not from frontend)
    let totalTopics = 0;
    let completedTopics = 0;
    let currentPhase = null;
    let currentModule = null;

    for (const phase of roadmap.phases || []) {
      for (const module of phase.modules || []) {
        for (const topic of module.topics || []) {
          totalTopics++;
          if (topic.status === 'Completed') completedTopics++;
        }
        if (module.status === 'Active') {
          currentPhase = phase.title;
          currentModule = module.title;
        }
      }
    }

    const percentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    // Estimate remaining days
    const dailyMinutes = roadmap.generationContext?.dailyMinutes || 60;
    const daysPerWeek = roadmap.generationContext?.daysPerWeek || 5;
    const remainingTopics = totalTopics - completedTopics;
    const avgMinutesPerTopic = totalTopics > 0
      ? roadmap.phases.reduce((s, p) =>
          s + p.modules.reduce((ms, m) =>
            ms + m.topics.reduce((ts, t) => ts + (t.estimatedMinutes || 30), 0), 0), 0) / totalTopics
      : 30;
    const remainingMinutes = remainingTopics * avgMinutesPerTopic;
    const minutesPerDay = dailyMinutes * (daysPerWeek / 7);
    const estimatedRemainingDays = minutesPerDay > 0 ? Math.ceil(remainingMinutes / minutesPerDay) : null;

    // Keep ProgressRecord in sync with computed values
    if (progress) {
      progress.overallCompletionPercentage = percentage;
      progress.currentPhase = currentPhase || progress.currentPhase;
      progress.currentModule = currentModule || progress.currentModule;
      await progress.save();
    }

    res.json({
      percentage,
      completedTopics,
      totalTopics,
      currentPhase: currentPhase || progress?.currentPhase,
      currentModule: currentModule || progress?.currentModule,
      careerGoal: roadmap.careerGoal?.title || roadmap.careerGoalTitle,
      estimatedRemainingDays,
      estimatedCompletionDate: roadmap.estimatedCompletionDate,
      lastActivityDate: progress?.lastActivityDate,
      isCompleted: roadmap.isCompleted,
      generatedBy: roadmap.generatedBy
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching progress: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/progress/skills — Skill progression with real status
// ──────────────────────────────────────────────────────────────────────────────
router.get('/skills', protect, async (req, res) => {
  try {
    const [progress, onboarding] = await Promise.all([
      ProgressRecord.findOne({ user: req.user._id })
        .populate('skills.skillId', 'name category difficulty'),
      StudentOnboarding.findOne({ user: req.user._id })
        .populate('selfReportedSkills.skill', 'name category')
    ]);

    if (!progress || progress.skills.length === 0) {
      // Return self-reported skills from onboarding if no progress record yet
      const skills = (onboarding?.selfReportedSkills || []).map(s => ({
        skillName: s.skill?.name || 'Unknown',
        category: s.skill?.category || 'General',
        proficiency: 0,
        status: s.known ? 'Self-Reported' : 'Not Started',
        isVerified: false,
        lastEvaluated: null,
        history: []
      }));
      return res.json(skills);
    }

    const skills = progress.skills.map(s => ({
      skillId: s.skillId,
      skillName: s.skillName,
      category: s.skillId?.category || 'General',
      difficulty: s.skillId?.difficulty || 'Beginner',
      proficiency: s.proficiency,  // REAL score from assessment
      status: s.status,            // REAL status from verification
      isVerified: s.isVerified,
      verifiedBy: s.verifiedBy,
      lastEvaluated: s.lastEvaluated,
      dateAcquired: s.dateAcquired,
      history: s.history?.slice(-5) || []  // last 5 history entries
    }));

    res.json(skills);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching skill progress: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/progress/journey — Learning journey timeline
// ──────────────────────────────────────────────────────────────────────────────
router.get('/journey', protect, async (req, res) => {
  try {
    const [roadmap, activities, onboarding] = await Promise.all([
      Roadmap.findOne({ user: req.user._id }).populate('careerGoal', 'title'),
      LearningActivity.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('content', 'title')
        .populate('skill', 'name'),
      StudentOnboarding.findOne({ user: req.user._id }).populate('careerGoal', 'title')
    ]);

    // Build journey milestones from roadmap
    const milestones = [];
    let currentPosition = null;

    if (roadmap) {
      for (const phase of roadmap.phases || []) {
        const completed = phase.status === 'Completed';
        const active = phase.status === 'Active';
        milestones.push({
          type: 'phase',
          title: phase.milestoneTitle || phase.title,
          description: phase.milestoneDescription || phase.description,
          status: phase.status,
          completedAt: completed ? phase.modules[phase.modules.length - 1]?.topics.find(t => t.completedAt)?.completedAt : null
        });
        if (active) currentPosition = phase.title;
      }
    }

    // Recent activity events
    const recentEvents = activities.map(a => ({
      eventType: a.eventType,
      title: a.content?.title || a.skill?.name || a.eventType.replace(/_/g, ' '),
      metadata: a.metadata,
      date: a.createdAt
    }));

    res.json({
      startingPoint: onboarding?.createdAt,
      careerGoal: roadmap?.careerGoal?.title || onboarding?.careerGoal?.title,
      currentPhase: currentPosition,
      milestones,
      recentEvents,
      roadmapGeneratedAt: onboarding?.roadmapGeneratedAt,
      estimatedCompletionDate: roadmap?.estimatedCompletionDate,
      isCompleted: roadmap?.isCompleted
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching journey: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/progress/dashboard/daily — Today's dashboard stats
// ──────────────────────────────────────────────────────────────────────────────
router.get('/dashboard/daily', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const [checklist, progress, roadmap] = await Promise.all([
      DailyChecklist.findOne({ user: req.user._id, dateKey: todayKey }),
      ProgressRecord.findOne({ user: req.user._id }),
      Roadmap.findOne({ user: req.user._id }).select('phases progressPercentage careerGoalTitle isCompleted')
    ]);

    const dailyStat = progress?.dailyStats?.find(d => d.dateKey === todayKey);

    // Find current phase from roadmap
    let currentPhase = null;
    for (const phase of roadmap?.phases || []) {
      if (phase.status === 'Active') { currentPhase = phase.title; break; }
    }

    res.json({
      date: today,
      dateKey: todayKey,
      // Checklist stats
      tasksAssigned: checklist?.items?.length || 0,
      tasksCompleted: checklist?.items?.filter(i => i.status === 'Completed').length || 0,
      tasksPending: checklist?.items?.filter(i => i.status !== 'Completed' && i.status !== 'Skipped').length || 0,
      previousIncompleteTasks: checklist?.items?.filter(i => i.isCarriedForward).length || 0,
      checklistCompleted: checklist?.isCompleted || false,
      // Progress
      learningTimeMinutes: dailyStat?.learningTimeMinutes || 0,
      quizScoreAvg: dailyStat?.quizScoreAvg || 0,
      theoryCompleted: dailyStat?.theoryCompleted || 0,
      quizzesCompleted: dailyStat?.quizzesCompleted || 0,
      practicalsCompleted: dailyStat?.practicalsCompleted || 0,
      // Streak
      currentStreak: checklist?.streakCount || 0,
      // Roadmap
      currentRoadmapPhase: currentPhase,
      overallProgress: roadmap?.progressPercentage || 0,
      careerGoal: roadmap?.careerGoalTitle
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching daily dashboard: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/progress/dashboard/weekly — Weekly dashboard stats
// ──────────────────────────────────────────────────────────────────────────────
router.get('/dashboard/weekly', protect, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [checklists, quizAttempts, progress] = await Promise.all([
      DailyChecklist.find({ user: req.user._id, date: { $gte: sevenDaysAgo } }).sort({ date: 1 }),
      QuizAttempt.find({ user: req.user._id, createdAt: { $gte: sevenDaysAgo } }),
      ProgressRecord.findOne({ user: req.user._id })
    ]);

    const totalAssigned = checklists.reduce((s, c) => s + c.items.length, 0);
    const totalCompleted = checklists.reduce((s, c) => s + c.items.filter(i => i.status === 'Completed').length, 0);
    const theoryCompleted = checklists.reduce((s, c) => s + c.items.filter(i => i.status === 'Completed' && i.taskType === 'Theory').length, 0);
    const practicalsCompleted = checklists.reduce((s, c) => s + c.items.filter(i => i.status === 'Completed' && i.taskType === 'Practical').length, 0);
    const quizzesPassed = quizAttempts.filter(a => a.passed).length;
    const avgQuizScore = quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((s, a) => s + a.percentageScore, 0) / quizAttempts.length)
      : 0;
    const totalMinutes = checklists.reduce((s, c) => s + (c.completedMinutes || 0), 0);
    const completedDays = checklists.filter(c => c.isCompleted).length;
    const currentStreak = checklists[checklists.length - 1]?.streakCount || 0;

    // Previous week comparison
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const prevChecklists = await DailyChecklist.find({
      user: req.user._id,
      date: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo }
    });
    const prevCompleted = prevChecklists.reduce((s, c) => s + c.items.filter(i => i.status === 'Completed').length, 0);
    const prevMinutes = prevChecklists.reduce((s, c) => s + (c.completedMinutes || 0), 0);

    res.json({
      period: { from: sevenDaysAgo, to: new Date() },
      totalAssigned,
      totalCompleted,
      completedDays,
      theoryCompleted,
      practicalsCompleted,
      quizzesPassed,
      avgQuizScore,
      totalLearningMinutes: totalMinutes,
      currentStreak,
      weeklyConsistency: checklists.length > 0 ? Math.round((completedDays / Math.min(checklists.length, 7)) * 100) : 0,
      comparison: {
        tasksChange: totalCompleted - prevCompleted,
        minutesChange: totalMinutes - prevMinutes
      },
      dailyBreakdown: checklists.map(c => ({
        dateKey: c.dateKey,
        date: c.date,
        assigned: c.items.length,
        completed: c.items.filter(i => i.status === 'Completed').length,
        minutes: c.completedMinutes || 0,
        isCompleted: c.isCompleted
      }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching weekly dashboard: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/progress/assessments — Test/Assessment Performance
// ──────────────────────────────────────────────────────────────────────────────
router.get('/assessments', protect, async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ user: req.user._id })
      .populate('content', 'title')
      .sort({ completedAt: -1 })
      .limit(10);
      
    if (!attempts || attempts.length === 0) {
      return res.json({ averageScore: 0, totalTaken: 0, recent: [] });
    }

    const totalScore = attempts.reduce((sum, a) => sum + (a.percentageScore || 0), 0);
    const averageScore = Math.round(totalScore / attempts.length);

    res.json({
      averageScore,
      totalTaken: await QuizAttempt.countDocuments({ user: req.user._id }),
      recent: attempts.map(a => ({
        id: a._id,
        topicTitle: a.content?.title || 'Unknown Topic',
        score: a.percentageScore,    // fixed: was a.score, model field is percentageScore
        passed: a.passed,
        date: a.completedAt
      }))
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching assessments: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/progress/weekly-recap — Weekly learning recap
// ──────────────────────────────────────────────────────────────────────────────
router.get('/weekly-recap', protect, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [checklists, quizAttempts, roadmap, activities] = await Promise.all([
      DailyChecklist.find({ user: req.user._id, date: { $gte: sevenDaysAgo } }).sort({ date: 1 }),
      QuizAttempt.find({ user: req.user._id, createdAt: { $gte: sevenDaysAgo } }),
      Roadmap.findOne({ user: req.user._id }),
      LearningActivity.find({ user: req.user._id, createdAt: { $gte: sevenDaysAgo } })
        .populate('content', 'title')
        .sort({ createdAt: -1 })
        .limit(20)
    ]);

    const totalCompleted = checklists.reduce((s, c) => s + c.items.filter(i => i.status === 'Completed').length, 0);
    const totalMinutes = checklists.reduce((s, c) => s + (c.completedMinutes || 0), 0);
    const completedDays = checklists.filter(c => c.isCompleted).length;
    const quizzesPassed = quizAttempts.filter(a => a.passed).length;
    const avgQuizScore = quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((s, a) => s + a.percentageScore, 0) / quizAttempts.length) : 0;
    const currentStreak = checklists[checklists.length - 1]?.streakCount || 0;

    // Achievements this week
    const achievements = [];
    if (completedDays >= 5) achievements.push({ type: 'consistency', label: '5+ active days this week' });
    if (quizzesPassed >= 3) achievements.push({ type: 'quizzes', label: `${quizzesPassed} quizzes passed` });
    if (currentStreak >= 7) achievements.push({ type: 'streak', label: `${currentStreak}-day streak` });
    if (totalMinutes >= 300) achievements.push({ type: 'dedication', label: '5+ hours of learning' });

    // Topics mastered (unique topics with quiz passed)
    const topicsMastered = [...new Set(quizAttempts.filter(a => a.passed).map(a => a.content?.toString()))].length;

    // Phase progress
    let currentPhase = null;
    let phaseProgress = 0;
    if (roadmap) {
      for (const phase of roadmap.phases) {
        if (phase.status === 'Active') {
          currentPhase = phase.title;
          const totalInPhase = phase.modules.reduce((s, m) => s + m.topics.length, 0);
          const doneInPhase = phase.modules.reduce((s, m) => s + m.topics.filter(t => t.status === 'Completed').length, 0);
          phaseProgress = totalInPhase > 0 ? Math.round((doneInPhase / totalInPhase) * 100) : 0;
          break;
        }
      }
    }

    // Highlights from activities
    const highlights = activities.slice(0, 5).map(a => ({
      eventType: a.eventType,
      title: a.content?.title || a.eventType.replace(/_/g, ' '),
      date: a.createdAt
    }));

    res.json({
      period: { from: sevenDaysAgo, to: new Date() },
      tasksCompleted: totalCompleted,
      learningMinutes: totalMinutes,
      activeDays: completedDays,
      quizzesPassed,
      avgQuizScore,
      topicsMastered,
      currentStreak,
      currentPhase,
      phaseProgress,
      achievements,
      highlights,
      overallProgress: roadmap?.progressPercentage || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching weekly recap: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/progress/peer-comparison — Anonymized peer comparison
// ──────────────────────────────────────────────────────────────────────────────
router.get('/peer-comparison', protect, async (req, res) => {
  try {
    const [myRoadmap, myProgress] = await Promise.all([
      Roadmap.findOne({ user: req.user._id }),
      ProgressRecord.findOne({ user: req.user._id })
    ]);

    if (!myRoadmap) return res.json({ available: false });

    // Find all roadmaps with the same career goal
    const peerRoadmaps = await Roadmap.find({
      careerGoal: myRoadmap.careerGoal,
      user: { $ne: req.user._id }
    }).select('progressPercentage completedTopics totalTopics generationContext');

    if (peerRoadmaps.length < 3) {
      return res.json({ available: false, message: 'Not enough peers for comparison yet.' });
    }

    const peerProgressValues = peerRoadmaps.map(r => r.progressPercentage || 0).sort((a, b) => a - b);
    const myProgressVal = myRoadmap.progressPercentage || 0;

    // Calculate percentile
    const belowMe = peerProgressValues.filter(p => p < myProgressVal).length;
    const percentile = Math.round((belowMe / peerProgressValues.length) * 100);

    // Peer stats
    const avgProgress = Math.round(peerProgressValues.reduce((s, p) => s + p, 0) / peerProgressValues.length);
    const medianProgress = peerProgressValues[Math.floor(peerProgressValues.length / 2)];

    // Pace comparison (topics per week)
    const myWeeklyPace = myProgress?.dailyStats?.length > 0
      ? Math.round(myProgress.dailyStats.slice(-7).reduce((s, d) => s + (d.tasksCompleted || 0), 0))
      : 0;

    res.json({
      available: true,
      peerCount: peerRoadmaps.length,
      myProgress: myProgressVal,
      percentile,
      avgPeerProgress: avgProgress,
      medianPeerProgress: medianProgress,
      myWeeklyTasks: myWeeklyPace,
      distribution: {
        below25: peerProgressValues.filter(p => p < 25).length,
        below50: peerProgressValues.filter(p => p >= 25 && p < 50).length,
        below75: peerProgressValues.filter(p => p >= 50 && p < 75).length,
        above75: peerProgressValues.filter(p => p >= 75).length
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching peer comparison: ' + err.message });
  }
});

export default router;
