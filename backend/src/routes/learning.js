/**
 * routes/learning.js — Theory learning, quizzes, practicals, diagnostics.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import LearningContent from '../models/LearningContent.js';
import DiagnosticAssessment from '../models/DiagnosticAssessment.js';
import QuizAttempt from '../models/QuizAttempt.js';
import PracticalSubmission from '../models/PracticalSubmission.js';
import LearningActivity from '../models/LearningActivity.js';
import ProgressRecord from '../models/ProgressRecord.js';
import Skill from '../models/Skill.js';
import { protect } from '../middleware/authMiddleware.js';
import { updateSkillStatus, markAssessmentStarted } from '../utils/skillVerification.js';

const router = express.Router();

// Rate limit for AI topic explanation
const aiExplainLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: 'Too many AI requests. Please wait a moment.' }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/learning/topic/:id — Get topic with theory, resources
// ──────────────────────────────────────────────────────────────────────────────
router.get('/topic/:id', protect, async (req, res) => {
  try {
    const content = await LearningContent.findOne({
      _id: req.params.id,
      status: 'Published'
    })
      .populate('skill', 'name category')
      .populate('prerequisites', 'title slug difficulty')
      .select('-quizQuestions.correctAnswer -quizQuestions.correctAnswers'); // Don't expose answers

    if (!content) return res.status(404).json({ message: 'Topic not found.' });

    // Check if student has a quiz attempt for this
    const latestAttempt = await QuizAttempt.findOne({
      user: req.user._id,
      content: content._id
    }).sort({ attemptNumber: -1 });

    // Check if student has a practical submission
    const practicalSub = await PracticalSubmission.findOne({
      user: req.user._id,
      content: content._id
    }).sort({ createdAt: -1 });

    // Log theory view
    await LearningActivity.create({
      user: req.user._id,
      eventType: 'theory_viewed',
      content: content._id,
      metadata: { topic: content.title }
    });

    res.json({
      content,
      studentProgress: {
        quizAttempts: latestAttempt ? latestAttempt.attemptNumber : 0,
        quizPassed: latestAttempt?.passed || false,
        quizScore: latestAttempt?.percentageScore || null,
        practicalSubmitted: !!practicalSub,
        practicalStatus: practicalSub?.status || null
      }
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching topic: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/learning/topic/:id/resources — Resources for a topic
// ──────────────────────────────────────────────────────────────────────────────
router.get('/topic/:id/resources', protect, async (req, res) => {
  try {
    const content = await LearningContent.findOne({
      _id: req.params.id,
      status: 'Published'
    }).select('resources title');

    if (!content) return res.status(404).json({ message: 'Topic not found.' });
    res.json(content.resources || []);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching resources: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/learning/topic/:id/complete — Mark theory as completed (backend-validated)
// ──────────────────────────────────────────────────────────────────────────────
router.post('/topic/:id/complete', protect, async (req, res) => {
  try {
    const content = await LearningContent.findOne({ _id: req.params.id, status: 'Published' });
    if (!content) return res.status(404).json({ message: 'Topic not found.' });

    await LearningActivity.create({
      user: req.user._id,
      eventType: 'theory_completed',
      content: content._id,
      metadata: { topic: content.title }
    });

    // Update progress
    let progress = await ProgressRecord.findOne({ user: req.user._id });
    if (!progress) progress = new ProgressRecord({ user: req.user._id });
    progress.theoryTopicsCompleted = (progress.theoryTopicsCompleted || 0) + 1;
    progress.lastActivityDate = new Date();
    await progress.save();

    res.json({ message: 'Theory marked as completed.' });
  } catch (err) {
    res.status(500).json({ message: 'Error completing theory: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/learning/quiz/:contentId — Get quiz questions (without answers)
// ──────────────────────────────────────────────────────────────────────────────
router.get('/quiz/:contentId', protect, async (req, res) => {
  try {
    const content = await LearningContent.findOne({
      _id: req.params.contentId,
      status: 'Published'
    }).select('title quizQuestions quizPassScore maxQuizAttempts');

    if (!content) return res.status(404).json({ message: 'Topic not found.' });
    if (!content.quizQuestions || content.quizQuestions.length === 0) {
      return res.status(404).json({ message: 'No quiz available for this topic.' });
    }

    // Check attempt count
    const attemptCount = await QuizAttempt.countDocuments({
      user: req.user._id,
      content: content._id
    });

    if (attemptCount >= (content.maxQuizAttempts || 3)) {
      return res.status(429).json({
        message: `Maximum attempts (${content.maxQuizAttempts || 3}) reached for this quiz.`,
        attemptsUsed: attemptCount
      });
    }

    // Strip correct answers from response
    const safeQuestions = content.quizQuestions.map((q, idx) => ({
      _id: q._id,
      index: idx,
      questionText: q.questionText,
      type: q.type,
      options: q.options,
      points: q.points,
      difficulty: q.difficulty
      // correctAnswer and correctAnswers intentionally omitted
    }));

    res.json({
      contentId: content._id,
      title: content.title,
      questions: safeQuestions,
      questionCount: safeQuestions.length,
      passScore: content.quizPassScore || 60,
      attemptsUsed: attemptCount,
      maxAttempts: content.maxQuizAttempts || 3
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching quiz: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/learning/quiz/:contentId/submit — Submit quiz answers, get score
// Backend validates answers — never trusts frontend score
// ──────────────────────────────────────────────────────────────────────────────
router.post('/quiz/:contentId/submit', protect, async (req, res) => {
  try {
    const { answers } = req.body;  // [{ questionIndex, selectedAnswer, selectedAnswers }]
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers array is required.' });
    }

    const content = await LearningContent.findOne({
      _id: req.params.contentId,
      status: 'Published'
    });
    if (!content) return res.status(404).json({ message: 'Topic not found.' });

    // Prevent duplicate submission if already passed
    const alreadyPassed = await QuizAttempt.findOne({
      user: req.user._id,
      content: content._id,
      passed: true
    });
    if (alreadyPassed) {
      return res.status(409).json({
        message: 'You have already passed this quiz.',
        attempt: alreadyPassed
      });
    }

    // Check attempt limit
    const attemptCount = await QuizAttempt.countDocuments({
      user: req.user._id,
      content: content._id
    });
    const maxAttempts = content.maxQuizAttempts || 3;
    if (attemptCount >= maxAttempts) {
      return res.status(429).json({
        message: `Maximum ${maxAttempts} attempts reached.`
      });
    }

    // ── Grade answers server-side ─────────────────────────────────────
    const scoredAnswers = [];
    let totalScore = 0;
    let maxScore = 0;

    for (let i = 0; i < content.quizQuestions.length; i++) {
      const question = content.quizQuestions[i];
      const studentAnswer = answers.find(a => a.questionIndex === i);
      const points = question.points || 10;
      maxScore += points;

      let isCorrect = false;
      const selected = studentAnswer?.selectedAnswer || '';
      const selectedArr = studentAnswer?.selectedAnswers || [];

      if (question.type === 'MultiSelect') {
        const correct = new Set((question.correctAnswers || []).map(s => s.trim().toLowerCase()));
        const student = new Set(selectedArr.map(s => s.trim().toLowerCase()));
        isCorrect = correct.size === student.size && [...correct].every(s => student.has(s));
      } else {
        isCorrect = selected.trim().toLowerCase() === (question.correctAnswer || '').trim().toLowerCase();
      }

      if (isCorrect) totalScore += points;

      scoredAnswers.push({
        questionIndex: i,
        selectedAnswer: selected,
        selectedAnswers: selectedArr,
        isCorrect,
        points: isCorrect ? points : 0,
        // Include correct answer in response (for feedback)
        correctAnswer: question.correctAnswer,
        correctAnswers: question.correctAnswers,
        explanation: question.explanation
      });
    }

    const percentageScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentageScore >= (content.quizPassScore || 60);

    // Save attempt
    const attempt = await QuizAttempt.create({
      user: req.user._id,
      content: content._id,
      attemptNumber: attemptCount + 1,
      answers: scoredAnswers.map(a => ({
        questionIndex: a.questionIndex,
        selectedAnswer: a.selectedAnswer,
        selectedAnswers: a.selectedAnswers,
        isCorrect: a.isCorrect,
        points: a.points
      })),
      totalScore,
      maxScore,
      percentageScore,
      passed,
      questionsSnapshot: content.quizQuestions.map(q => ({
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        correctAnswers: q.correctAnswers,
        explanation: q.explanation,
        points: q.points
      })),
      completedAt: new Date()
    });

    // Update skill status if quiz is for a skill assessment
    if (content.skill) {
      const skill = await Skill.findById(content.skill).select('name');
      if (skill) {
        await updateSkillStatus(
          req.user._id,
          content.skill,
          skill.name,
          percentageScore,
          'Quiz',
          attempt._id
        );
      }
    }

    // Log activity
    await LearningActivity.create({
      user: req.user._id,
      eventType: passed ? 'quiz_passed' : 'quiz_failed',
      content: content._id,
      metadata: {
        score: percentageScore,
        passed,
        attemptNumber: attemptCount + 1,
        topic: content.title
      }
    });

    // Update progress
    let progress = await ProgressRecord.findOne({ user: req.user._id });
    if (!progress) progress = new ProgressRecord({ user: req.user._id });
    if (passed) progress.quizzesPassed = (progress.quizzesPassed || 0) + 1;
    await progress.save();

    // Auto-complete the quiz task on the checklist if passed
    if (passed) {
      const DailyChecklist = (await import('../models/DailyChecklist.js')).default;
      const { completeChecklistTask } = await import('../utils/checklistGenerator.js');
      
      const checklists = await DailyChecklist.find({
        user: req.user._id,
        'items.contentId': content._id,
        'items.taskType': 'Quiz',
        'items.status': { $in: ['Available', 'InProgress', 'Locked', 'Overdue'] }
      });

      for (const checklist of checklists) {
        const item = checklist.items.find(i => 
          i.contentId?.toString() === content._id.toString() && 
          i.taskType === 'Quiz' &&
          ['Available', 'InProgress', 'Locked', 'Overdue'].includes(i.status)
        );
        
        if (item) {
          if (item.status === 'Locked') item.status = 'Available';
          await checklist.save();
          await completeChecklistTask(req.user._id, checklist._id, item._id);
        }
      }
    }

    // Send quiz passed notification
    if (passed) {
      const { notifyLearningMilestone } = await import('../utils/learningNotifications.js');
      await notifyLearningMilestone(req.user._id, {
        type: 'quiz_passed',
        title: 'Quiz Passed!',
        message: `You scored ${percentageScore}% on "${content.title}". Great work!`,
        link: '/checklist',
        metadata: { score: percentageScore, contentId: content._id.toString() }
      });
    }

    // Compute weak areas for failed attempts
    const weakAreas = [];
    if (!passed) {
      const wrongByDifficulty = { Easy: 0, Medium: 0, Hard: 0 };
      scoredAnswers.forEach((a, i) => {
        if (!a.isCorrect) {
          const diff = content.quizQuestions[i]?.difficulty || 'Medium';
          wrongByDifficulty[diff] = (wrongByDifficulty[diff] || 0) + 1;
        }
      });

      const wrongCount = scoredAnswers.filter(a => !a.isCorrect).length;
      if (wrongCount > 0) {
        weakAreas.push({
          type: 'review_theory',
          message: `Review the theory for "${content.title}" — you got ${wrongCount} of ${scoredAnswers.length} questions wrong.`,
          link: `/learning/topic/${content._id}`
        });
      }

      if (wrongByDifficulty.Easy > 0) {
        weakAreas.push({
          type: 'fundamentals',
          message: `${wrongByDifficulty.Easy} basic question(s) were wrong. Focus on the fundamentals before retrying.`,
        });
      }
    }

    res.json({
      attempt: {
        _id: attempt._id,
        attemptNumber: attempt.attemptNumber,
        percentageScore,
        passed,
        totalScore,
        maxScore
      },
      scoredAnswers,
      weakAreas,
      message: passed ? `Quiz passed with ${percentageScore}%!` : `Quiz failed with ${percentageScore}%. Passing score: ${content.quizPassScore || 60}%.`
    });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting quiz: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/learning/quiz/:contentId/attempts — Get attempt history
// ──────────────────────────────────────────────────────────────────────────────
router.get('/quiz/:contentId/attempts', protect, async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({
      user: req.user._id,
      content: req.params.contentId
    }).sort({ attemptNumber: 1 }).select('-questionsSnapshot');

    res.json(attempts);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching attempts: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/learning/practical/:contentId/submit — Submit practical work
// ──────────────────────────────────────────────────────────────────────────────
router.post('/practical/:contentId/submit', protect, async (req, res) => {
  try {
    const { submissionType, submissionText, submissionCode, submissionUrl, language } = req.body;

    const content = await LearningContent.findOne({
      _id: req.params.contentId,
      status: 'Published'
    }).select('title practiceTask skill');

    if (!content) return res.status(404).json({ message: 'Topic not found.' });
    if (!content.practiceTask) return res.status(400).json({ message: 'No practical task for this topic.' });

    // Check for duplicate submission
    const existingPending = await PracticalSubmission.findOne({
      user: req.user._id,
      content: content._id,
      status: { $in: ['Pending', 'UnderReview', 'Verified'] }
    });
    if (existingPending) {
      return res.status(409).json({
        message: 'You already have a pending or verified submission for this task.',
        submission: existingPending
      });
    }

    // Count attempts
    const attemptCount = await PracticalSubmission.countDocuments({
      user: req.user._id,
      content: content._id
    });

    const submission = await PracticalSubmission.create({
      user: req.user._id,
      content: content._id,
      submissionType: submissionType || 'Text',
      submissionText,
      submissionCode,
      submissionUrl,
      language,
      status: 'Pending',
      attemptNumber: attemptCount + 1
    });

    // Log activity
    await LearningActivity.create({
      user: req.user._id,
      eventType: 'practical_submitted',
      content: content._id,
      metadata: { topic: content.title }
    });

    // Update progress
    let progress = await ProgressRecord.findOne({ user: req.user._id });
    if (!progress) progress = new ProgressRecord({ user: req.user._id });
    progress.practicalTasksCompleted = (progress.practicalTasksCompleted || 0) + 1;
    await progress.save();

    res.status(201).json({
      submission,
      message: 'Practical submission received. It will be reviewed.'
    });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting practical: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/learning/diagnostic/start — Start diagnostic assessment for a skill
// ──────────────────────────────────────────────────────────────────────────────
router.post('/diagnostic/start', protect, async (req, res) => {
  try {
    const { skillId } = req.body;
    if (!skillId) return res.status(400).json({ message: 'skillId is required.' });

    const skill = await Skill.findOne({ _id: skillId, status: 'Active' });
    if (!skill) return res.status(404).json({ message: 'Skill not found.' });

    // Check for existing incomplete assessment
    const existing = await DiagnosticAssessment.findOne({
      user: req.user._id,
      skill: skillId,
      status: { $in: ['Pending', 'InProgress'] }
    });
    if (existing) return res.json({ assessment: existing, message: 'Assessment already in progress.' });

    // Get diagnostic-eligible content for this skill
    const content = await LearningContent.find({
      skill: skillId,
      status: 'Published',
      isDiagnosticEligible: true,
      'quizQuestions.0': { $exists: true }  // must have at least 1 quiz question
    }).select('quizQuestions title difficulty');

    if (content.length === 0) {
      return res.status(404).json({ message: 'No diagnostic questions available for this skill.' });
    }

    // Sample up to 10 questions from available content
    const allQuestions = content.flatMap(c => c.quizQuestions);
    const shuffled = allQuestions.sort(() => Math.random() - 0.5).slice(0, 10);

    const assessment = await DiagnosticAssessment.create({
      user: req.user._id,
      skill: skillId,
      questionsSnapshot: shuffled.map(q => ({
        questionText: q.questionText,
        type: q.type,
        options: q.options,
        correctAnswer: q.correctAnswer,
        correctAnswers: q.correctAnswers,
        explanation: q.explanation,
        points: q.points || 10
      })),
      status: 'InProgress',
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)  // 24h expiry
    });

    // Mark skill as Assessment Started
    await markAssessmentStarted(req.user._id, skillId, skill.name);

    // Log activity
    await LearningActivity.create({
      user: req.user._id,
      eventType: 'diagnostic_started',
      skill: skillId
    });

    // Return questions without answers
    const safeQuestions = assessment.questionsSnapshot.map((q, idx) => ({
      index: idx,
      questionText: q.questionText,
      type: q.type,
      options: q.options,
      points: q.points
    }));

    res.status(201).json({
      assessmentId: assessment._id,
      skillName: skill.name,
      questions: safeQuestions,
      expiresAt: assessment.expiresAt
    });
  } catch (err) {
    res.status(500).json({ message: 'Error starting diagnostic: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/learning/diagnostic/:id/submit — Submit diagnostic answers
// ──────────────────────────────────────────────────────────────────────────────
router.post('/diagnostic/:id/submit', protect, async (req, res) => {
  try {
    const { answers } = req.body;
    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers array is required.' });
    }

    const assessment = await DiagnosticAssessment.findOne({
      _id: req.params.id,
      user: req.user._id
    });
    if (!assessment) return res.status(404).json({ message: 'Assessment not found.' });
    if (assessment.status === 'Completed') {
      return res.status(409).json({ message: 'Assessment already submitted.' });
    }
    if (assessment.status === 'Expired' || (assessment.expiresAt && new Date() > assessment.expiresAt)) {
      assessment.status = 'Expired';
      await assessment.save();
      return res.status(410).json({ message: 'Assessment has expired.' });
    }

    // Grade answers server-side using stored snapshot
    const scoredAnswers = [];
    let totalScore = 0;
    let maxScore = 0;

    for (let i = 0; i < assessment.questionsSnapshot.length; i++) {
      const question = assessment.questionsSnapshot[i];
      const studentAnswer = answers.find(a => a.questionIndex === i);
      const points = question.points || 10;
      maxScore += points;

      const selected = studentAnswer?.selectedAnswer || '';
      const selectedArr = studentAnswer?.selectedAnswers || [];
      let isCorrect = false;

      if (question.type === 'MultiSelect') {
        const correct = new Set((question.correctAnswers || []).map(s => s.trim().toLowerCase()));
        const student = new Set(selectedArr.map(s => s.trim().toLowerCase()));
        isCorrect = correct.size === student.size && [...correct].every(s => student.has(s));
      } else {
        isCorrect = selected.trim().toLowerCase() === (question.correctAnswer || '').trim().toLowerCase();
      }

      if (isCorrect) totalScore += points;

      scoredAnswers.push({
        questionIndex: i,
        questionText: question.questionText,
        selectedAnswer: selected,
        selectedAnswers: selectedArr,
        isCorrect,
        points: isCorrect ? points : 0,
        maxPoints: points
      });
    }

    const percentageScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // Determine result
    let result;
    if (percentageScore >= 75) result = 'Proficient';
    else if (percentageScore >= 60) result = 'Verified';
    else if (percentageScore >= 40) result = 'PartiallyVerified';
    else result = 'NeedsLearning';

    // Save assessment results
    assessment.answers = scoredAnswers;
    assessment.totalScore = totalScore;
    assessment.maxScore = maxScore;
    assessment.percentageScore = percentageScore;
    assessment.result = result;
    assessment.status = 'Completed';
    assessment.completedAt = new Date();
    await assessment.save();

    // Update skill status in ProgressRecord
    const skill = await Skill.findById(assessment.skill).select('name');
    if (skill) {
      await updateSkillStatus(
        req.user._id,
        assessment.skill,
        skill.name,
        percentageScore,
        'Diagnostic',
        assessment._id
      );
    }

    // Log activity
    await LearningActivity.create({
      user: req.user._id,
      eventType: 'diagnostic_completed',
      skill: assessment.skill,
      metadata: { score: percentageScore, passed: percentageScore >= 60 }
    });

    res.json({
      result,
      percentageScore,
      totalScore,
      maxScore,
      scoredAnswers,
      skillStatus: result,
      message: `Diagnostic complete. Result: ${result} (${percentageScore}%)`
    });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting diagnostic: ' + err.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/learning/diagnostic/:id — Get diagnostic assessment status/result
// ──────────────────────────────────────────────────────────────────────────────
router.get('/diagnostic/:id', protect, async (req, res) => {
  try {
    const assessment = await DiagnosticAssessment.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('skill', 'name');

    if (!assessment) return res.status(404).json({ message: 'Assessment not found.' });
    res.json(assessment);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching diagnostic: ' + err.message });
  }
});

export default router;
