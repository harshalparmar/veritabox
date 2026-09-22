/**
 * routes/roadmap.js — Personalized roadmap generation and management.
 * Replaces the original mock roadmap implementation.
 */

import express from 'express';
import Roadmap from '../models/Roadmap.js';
import User from '../models/User.js';
import CareerGoal from '../models/CareerGoal.js';
import Skill from '../models/Skill.js';
import StudentOnboarding from '../models/StudentOnboarding.js';
import ProgressRecord from '../models/ProgressRecord.js';
import DiagnosticAssessment from '../models/DiagnosticAssessment.js';
import LearningActivity from '../models/LearningActivity.js';
import DailyChecklist from '../models/DailyChecklist.js';
import { protect } from '../middleware/authMiddleware.js';
import { generateAIRoadmap } from '../utils/aiRoadmapGenerator.js';
import { generateFallbackRoadmap } from '../utils/fallbackRoadmapGenerator.js';
import { markSkillSelfReported } from '../utils/skillVerification.js';

const router = express.Router();

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/roadmaps/career-goals — List active career goals (for onboarding)
// ──────────────────────────────────────────────────────────────────────────────
router.get('/career-goals', protect, async (req, res) => {
  try {
    const goals = await CareerGoal.find({ status: 'Active' })
      .select('title slug description icon tags suggestedDurationDays')
      .sort({ order: 1, title: 1 });
    res.json(goals);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching career goals: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/roadmaps/skills/:goalId — Skills for a career goal
// ──────────────────────────────────────────────────────────────────────────────
router.get('/skills/:goalId', protect, async (req, res) => {
  try {
    const skills = await Skill.find({
      careerGoals: req.params.goalId,
      status: 'Active'
    })
      .select('name slug description category difficulty estimatedHours icon')
      .sort({ order: 1, name: 1 });
    res.json(skills);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching skills: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/roadmaps/onboarding — Get student's onboarding profile
// ──────────────────────────────────────────────────────────────────────────────
router.get('/onboarding', protect, async (req, res) => {
  try {
    const onboarding = await StudentOnboarding.findOne({ user: req.user._id })
      .populate('careerGoal', 'title slug description icon')
      .populate('selfReportedSkills.skill', 'name slug category');
    res.json(onboarding || null);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching onboarding: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/roadmaps/onboarding — Save onboarding profile
// ──────────────────────────────────────────────────────────────────────────────
router.post('/onboarding', protect, async (req, res) => {
  try {
    const {
      careerGoalId,
      currentLevel,
      selfReportedSkills,
      dailyMinutes,
      daysPerWeek,
      targetDurationDays,
      previousExperience,
      preferredStyle,
      targetJobRole,
      previousProjects,
      areasNeedingHelp
    } = req.body;

    // Validate required fields
    if (!careerGoalId || !currentLevel || !dailyMinutes || !daysPerWeek) {
      return res.status(400).json({ message: 'Career goal, level, daily minutes, and days per week are required.' });
    }

    // Validate career goal exists and is active
    const goal = await CareerGoal.findOne({ _id: careerGoalId, status: 'Active' });
    if (!goal) return res.status(404).json({ message: 'Career goal not found or inactive.' });

    // Upsert onboarding profile
    const onboarding = await StudentOnboarding.findOneAndUpdate(
      { user: req.user._id },
      {
        careerGoal: careerGoalId,
        currentLevel,
        selfReportedSkills: (selfReportedSkills || []).map(s => ({
          skill: s.skillId,
          known: s.known
        })),
        dailyMinutes: Math.min(480, Math.max(15, parseInt(dailyMinutes))),
        daysPerWeek: Math.min(7, Math.max(1, parseInt(daysPerWeek))),
        targetDurationDays: [30, 60, 90, 180].includes(parseInt(targetDurationDays)) ? parseInt(targetDurationDays) : 90,
        previousExperience,
        preferredStyle,
        targetJobRole,
        previousProjects,
        areasNeedingHelp,
        isComplete: true
      },
      { upsert: true, new: true }
    );

    // Update user's careerGoal field for AI context
    await User.findByIdAndUpdate(req.user._id, {
      careerGoal: goal.title,
      onboardingCompleted: true
    });

    // Mark self-reported skills in ProgressRecord (NOT verified)
    for (const s of (selfReportedSkills || [])) {
      if (s.known) {
        const skill = await Skill.findById(s.skillId).select('name');
        if (skill) {
          await markSkillSelfReported(req.user._id, s.skillId, skill.name);
        }
      }
    }

    res.json({ onboarding, message: 'Onboarding saved. Ready to generate roadmap.' });
  } catch (err) {
    res.status(500).json({ message: 'Error saving onboarding: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/roadmaps — Get student's roadmap
// ──────────────────────────────────────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const roadmap = await Roadmap.findOne({ user: req.user._id })
      .populate('careerGoal', 'title slug description icon');
    if (!roadmap) {
      return res.status(404).json({ message: 'No roadmap found. Complete onboarding to generate one.' });
    }
    res.json(roadmap);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching roadmap: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/roadmaps/generate — Generate AI-powered personalized roadmap
// ──────────────────────────────────────────────────────────────────────────────
router.post('/generate', protect, async (req, res) => {
  try {
    // Prevent duplicate generation (unless explicitly regenerating)
    const existing = await Roadmap.findOne({ user: req.user._id });
    if (existing && !req.body.regenerate) {
      return res.status(409).json({
        message: 'Roadmap already exists. Pass regenerate: true to create a new one.',
        roadmap: existing
      });
    }

    // Load onboarding profile
    const onboarding = await StudentOnboarding.findOne({ user: req.user._id });
    if (!onboarding || !onboarding.isComplete) {
      return res.status(400).json({ message: 'Complete onboarding before generating a roadmap.' });
    }

    // Load verified skills from ProgressRecord
    const progressRecord = await ProgressRecord.findOne({ user: req.user._id });
    const verifiedSkills = (progressRecord?.skills || []).map(s => ({
      skillId: s.skillId,
      skillName: s.skillName,
      proficiency: s.proficiency,
      status: s.status
    }));

    // Load diagnostic scores
    const diagnostics = await DiagnosticAssessment.find({
      user: req.user._id,
      status: 'Completed'
    }).select('skill percentageScore result');

    const diagnosticScores = {};
    for (const d of diagnostics) {
      diagnosticScores[d.skill.toString()] = d.percentageScore;
    }

    // Self-reported skills
    const selfReportedSkills = onboarding.selfReportedSkills.map(s => ({
      skillId: s.skill,
      skillName: s.skill?.name || '',
      known: s.known
    }));

    // Get already-completed content (for regeneration)
    const completedContentIds = existing ? getCompletedContentIds(existing) : [];

    // ── Generate AI roadmap ───────────────────────────────────────────
    const generated = await generateAIRoadmap({
      careerGoalId: onboarding.careerGoal,
      level: onboarding.currentLevel,
      selfReportedSkills,
      verifiedSkills,
      dailyMinutes: onboarding.dailyMinutes,
      daysPerWeek: onboarding.daysPerWeek,
      targetDurationDays: onboarding.targetDurationDays,
      diagnosticScores,
      completedContentIds,
      preferredStyle: onboarding.preferredStyle || 'Mixed'
    });

    // ── Calculate estimated completion date ───────────────────────────
    const totalDays = Math.ceil(generated.totalTopics * 30 / (onboarding.dailyMinutes * onboarding.daysPerWeek / 7) / 60);
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + Math.min(totalDays, onboarding.targetDurationDays * 2));

    // ── Save or update roadmap ────────────────────────────────────────
    const roadmapData = {
      user: req.user._id,
      careerGoal: onboarding.careerGoal,
      careerGoalTitle: generated.careerGoalTitle,
      generationContext: {
        level: onboarding.currentLevel,
        selfReportedSkills: selfReportedSkills.filter(s => s.known).map(s => s.skillName),
        verifiedSkills: verifiedSkills.filter(s => ['Verified', 'Proficient', 'Mastered'].includes(s.status)).map(s => s.skillName),
        dailyMinutes: onboarding.dailyMinutes,
        daysPerWeek: onboarding.daysPerWeek,
        targetDurationDays: onboarding.targetDurationDays,
        diagnosticScores
      },
      phases: generated.phases,
      activePhaseIndex: 0,
      activeModuleIndex: 0,
      totalTopics: generated.totalTopics,
      completedTopics: completedContentIds.length > 0 ? countMatchingCompleted(generated.phases, completedContentIds) : 0,
      progressPercentage: 0,
      isCompleted: false,
      generatedBy: generated.generatedBy,
      lastAdaptedAt: new Date(),
      generationVersion: existing ? (existing.generationVersion || 1) + 1 : 1,
      estimatedCompletionDate: estimatedCompletion
    };

    let roadmap;
    if (existing && req.body.regenerate) {
      // Preserve completed topics when regenerating
      Object.assign(existing, roadmapData);
      roadmap = await existing.save();
    } else {
      roadmap = await Roadmap.create(roadmapData);
    }

    // Update onboarding with generation timestamp
    onboarding.roadmapGeneratedAt = new Date();
    await onboarding.save();

    // Log activity
    await LearningActivity.create({
      user: req.user._id,
      eventType: 'roadmap_generated',
      roadmap: roadmap._id,
      metadata: { phase: roadmapData.generatedBy }
    });

    res.status(201).json(roadmap);
  } catch (err) {
    console.error('[Roadmap Generate]', err);
    res.status(500).json({ message: 'Error generating roadmap: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/roadmaps/adapt — Adapt roadmap based on performance
// ──────────────────────────────────────────────────────────────────────────────
router.post('/adapt', protect, async (req, res) => {
  try {
    const [roadmap, progress, checklists] = await Promise.all([
      Roadmap.findOne({ user: req.user._id }),
      ProgressRecord.findOne({ user: req.user._id }),
      DailyChecklist.find({ user: req.user._id }).sort({ date: -1 }).limit(14)
    ]);

    if (!roadmap) return res.status(404).json({ message: 'No roadmap found.' });

    const adaptations = [];

    // Analyze pace: avg actual vs estimated completion time
    const recentItems = checklists.flatMap(c => c.items.filter(i => i.status === 'Completed' && i.startedAt && i.completedAt));
    if (recentItems.length >= 5) {
      const avgActual = recentItems.reduce((s, i) => {
        const actual = (new Date(i.completedAt) - new Date(i.startedAt)) / 60000;
        return s + actual;
      }, 0) / recentItems.length;
      const avgEstimated = recentItems.reduce((s, i) => s + (i.estimatedMinutes || 30), 0) / recentItems.length;

      const ratio = avgActual / avgEstimated;

      if (ratio < 0.6) {
        // Student is finishing much faster than estimated — can increase daily load
        const newDaily = Math.min(roadmap.generationContext.dailyMinutes * 1.25, 240);
        if (newDaily !== roadmap.generationContext.dailyMinutes) {
          roadmap.generationContext.dailyMinutes = Math.round(newDaily);
          adaptations.push({ type: 'pace_increase', message: `Daily target increased to ${Math.round(newDaily)} minutes (you're completing tasks faster than estimated)` });
        }
      } else if (ratio > 1.5) {
        // Student is taking much longer — reduce daily load
        const newDaily = Math.max(roadmap.generationContext.dailyMinutes * 0.8, 15);
        if (newDaily !== roadmap.generationContext.dailyMinutes) {
          roadmap.generationContext.dailyMinutes = Math.round(newDaily);
          adaptations.push({ type: 'pace_decrease', message: `Daily target adjusted to ${Math.round(newDaily)} minutes (taking more time to absorb content is okay)` });
        }
      }
    }

    // Analyze quiz performance per skill
    const QuizAttempt = (await import('../models/QuizAttempt.js')).default;
    const recentQuizzes = await QuizAttempt.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
    const failedQuizzes = recentQuizzes.filter(q => !q.passed);

    if (failedQuizzes.length > recentQuizzes.length * 0.5 && recentQuizzes.length >= 4) {
      adaptations.push({ type: 'difficulty_warning', message: 'You\'re struggling with recent quizzes. Consider reviewing the theory content more carefully before attempting quizzes.' });
    }

    // Consistency check
    const completedDays = checklists.filter(c => c.isCompleted).length;
    const totalDays = checklists.length;
    if (totalDays >= 7 && completedDays < totalDays * 0.3) {
      const newDays = Math.max(roadmap.generationContext.daysPerWeek - 1, 1);
      if (newDays < roadmap.generationContext.daysPerWeek) {
        roadmap.generationContext.daysPerWeek = newDays;
        adaptations.push({ type: 'schedule_adjust', message: `Schedule adjusted to ${newDays} days/week to match your availability` });
      }
    }

    // Recalculate estimated completion date
    if (adaptations.length > 0) {
      const remainingTopics = roadmap.totalTopics - roadmap.completedTopics;
      const dailyMinutes = roadmap.generationContext.dailyMinutes;
      const daysPerWeek = roadmap.generationContext.daysPerWeek;
      const avgMinPerTopic = 30;
      const totalRemainingMin = remainingTopics * avgMinPerTopic;
      const effectiveDailyMin = dailyMinutes * (daysPerWeek / 7);
      const remainingDays = effectiveDailyMin > 0 ? Math.ceil(totalRemainingMin / effectiveDailyMin) : 999;
      roadmap.estimatedCompletionDate = new Date(Date.now() + remainingDays * 86400000);
      roadmap.lastAdaptedAt = new Date();
      await roadmap.save();
    }

    res.json({
      adapted: adaptations.length > 0,
      adaptations,
      updatedContext: {
        dailyMinutes: roadmap.generationContext.dailyMinutes,
        daysPerWeek: roadmap.generationContext.daysPerWeek,
        estimatedCompletionDate: roadmap.estimatedCompletionDate
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error adapting roadmap: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// Helper functions
// ──────────────────────────────────────────────────────────────────────────────

function getCompletedContentIds(roadmap) {
  const ids = [];
  for (const phase of roadmap.phases || []) {
    for (const module of phase.modules || []) {
      for (const topic of module.topics || []) {
        if (topic.status === 'Completed' && topic.contentId) {
          ids.push(topic.contentId.toString());
        }
      }
    }
  }
  return ids;
}

function countMatchingCompleted(phases, completedIds) {
  const completedSet = new Set(completedIds.map(id => id.toString()));
  let count = 0;
  for (const phase of phases || []) {
    for (const module of phase.modules || []) {
      for (const topic of module.topics || []) {
        if (topic.contentId && completedSet.has(topic.contentId.toString())) {
          topic.status = 'Completed';
          count++;
        }
      }
    }
  }
  return count;
}

export default router;
