import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import LearningContent from '../models/LearningContent.js';

const router = express.Router();

// Rate limit for AI topic explanation (Dhriti) — 15 requests/min per user
const dhritiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.user?._id?.toString() || 'anonymous',
  message: { message: 'Too many AI requests. Please wait a moment before asking Dhriti again.' }
});

import ProgressRecord from '../models/ProgressRecord.js';
import Roadmap from '../models/Roadmap.js';
import DailyChecklist from '../models/DailyChecklist.js';
import JobApplication from '../models/JobApplication.js';
import Project from '../models/Project.js';
import HackathonRegistration from '../models/HackathonRegistration.js';
import BountySubmission from '../models/BountySubmission.js';
import ReputationLog from '../models/ReputationLog.js';
import ChallengeSubmission from '../models/ChallengeSubmission.js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Real AI Service function using OpenAI
const generateAIResponse = async (systemPrompt, userPrompt, options = {}) => {
  try {
    const payload = {
      model: "gpt-4o-mini", // or gpt-3.5-turbo
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      ...options
    };
    const response = await openai.chat.completions.create(payload);
    return response.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI Error:", error);
    return "Error communicating with AI Core: " + (error.message || "Unknown error");
  }
};

// Allowed pages for Dhriti chat — validated server-side
const DHRITI_ALLOWED_PAGES = ['dashboard', 'roadmaps', 'checklist', 'progress'];

// POST /api/ai/chat - Dhriti AI Mentor Chat
router.post('/chat', protect, dhritiLimiter, async (req, res) => {
  try {
    const { message, page, pageContext } = req.body;
    if (!message || typeof message !== 'string' || message.length > 2000) {
      return res.status(400).json({ message: 'Message is required (max 2000 chars).' });
    }

    if (page && !DHRITI_ALLOWED_PAGES.includes(page)) {
      return res.status(403).json({ message: 'Dhriti is not available on this page.' });
    }

    const user = await User.findById(req.user._id).select('-password');
    const progress = await ProgressRecord.findOne({ user: req.user._id });
    const roadmap = await Roadmap.findOne({ user: req.user._id });
    const { default: QuizProgress } = await import('../models/QuizProgress.js');
    const quizProgress = await QuizProgress.find({ user: req.user._id }).populate("quiz", "title topic");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checklist = await DailyChecklist.findOne({ user: req.user._id, date: { $gte: today } });

    const applications = await JobApplication.find({ candidate: req.user._id }).populate('job', 'title company');

    const projects = await Project.find({ 'members.user': req.user._id }).select('title status');
    const hackathons = await HackathonRegistration.find({ user: req.user._id }).populate('hackathon', 'title');
    const bounties = await BountySubmission.find({ user: req.user._id }).populate('bounty', 'title');
    const repLogs = await ReputationLog.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5);
    const codeForge = await ChallengeSubmission.find({ userId: req.user._id }).populate('challengeId', 'title difficulty').sort({ createdAt: -1 }).limit(3);

    const skillsContext = progress?.skills?.length ? progress.skills.map(s => `${s.skillName} (${s.proficiency}%)`).join(', ') : "No verified skills yet.";
    const checklistContext = checklist
      ? `Today: ${checklist.items.filter(i=>i.status==='Completed').length}/${checklist.items.length} tasks done. Streak: ${checklist.streakCount} days.
Pending tasks: ${checklist.items.filter(i=>i.status!=='Completed').map(i=>`"${i.title}" (${i.taskType}, ${i.estimatedMinutes}min)`).slice(0,5).join(', ') || 'All done!'}`
      : "No checklist generated today.";
    const appsContext = applications.length ? applications.map(a => `${a.job?.title} at ${a.job?.company} (${a.status})`).join(', ') : "No job applications.";

    const activitiesContext = [
      `Projects: ${projects.length ? projects.map(p => `${p.title} (${p.status})`).join(', ') : 'None'}`,
      `Hackathons: ${hackathons.length ? hackathons.map(h => h.hackathon?.title).filter(Boolean).join(', ') : 'None'}`,
      `Bounties: ${bounties.length ? bounties.map(b => `${b.bounty?.title} (${b.status})`).join(', ') : 'None'}`,
      `Recent XP: ${repLogs.length ? repLogs.map(r => `+${r.points} (${r.reason})`).join(', ') : 'None'}`,
      `CodeForge: ${codeForge.length ? codeForge.map(c => `${c.challengeId?.title} [${c.language}] ${c.status}`).join(' | ') : 'None'}`,
    ].join('\n');

    let quizContext = "None";
    if (quizProgress?.length) {
      quizContext = quizProgress.map(qp =>
        `${qp.quiz?.title || '?'} (${qp.quiz?.topic || '?'}) — ${qp.highestPercentage}% — ${qp.status}`
      ).join(' | ');
    }

    // Build detailed roadmap context
    let roadmapDetail = "No roadmap generated yet.";
    if (roadmap) {
      const activePhase = roadmap.phases?.[roadmap.activePhaseIndex];
      const activeModule = activePhase?.modules?.[roadmap.activeModuleIndex];
      const upcomingTopics = activeModule?.topics
        ?.filter(t => t.status !== 'Completed')
        ?.slice(0, 5)
        ?.map(t => `"${t.title}" (${t.type}, ${t.status})`) || [];
      roadmapDetail = `Career Goal: ${roadmap.careerGoal}
Overall: ${roadmap.completedTopics}/${roadmap.totalTopics} topics (${roadmap.progressPercentage || 0}%)
Active Phase: ${activePhase?.title || 'None'} (Phase ${(roadmap.activePhaseIndex || 0) + 1}/${roadmap.phases?.length || 0})
Active Module: ${activeModule?.title || 'None'}
Upcoming Topics: ${upcomingTopics.length ? upcomingTopics.join(', ') : 'None — module complete'}
Completed: ${roadmap.isCompleted ? 'Yes' : 'No'}`;
    }

    // Page-specific context sent by the frontend
    const livePageContext = pageContext ? `\n--- LIVE PAGE DATA (what the user currently sees) ---\n${typeof pageContext === 'string' ? pageContext.slice(0, 3000) : JSON.stringify(pageContext).slice(0, 3000)}` : '';

    const systemPrompt = `You are Dhriti — the AI study mentor built into the VeritaBox learning platform.
You help students navigate their learning roadmap, daily tasks, skill progress, and career goals.
You speak in a warm but direct tone. You use the student's name naturally.

--- STUDENT PROFILE ---
Name: ${user.name}
Role: ${user.role}
Career Goal: ${user.careerGoal || 'Not set yet'}
Reputation: ${user.reputationPoints || 0} XP
Skills: ${skillsContext}

--- LEARNING ROADMAP ---
${roadmapDetail}

--- TODAY'S CHECKLIST ---
${checklistContext}

--- ASSESSMENTS ---
${quizContext}

--- CAREER & ACTIVITIES ---
Jobs: ${appsContext}
${activitiesContext}
${livePageContext}

--- CURRENT PAGE: ${page || 'unknown'} ---

=== RULES YOU MUST FOLLOW ===

1. NEVER SOLVE CODE OR GIVE DIRECT ANSWERS.
   If the user asks you to write code, solve a problem, or give a direct answer to a question:
   → Give a HINT or a guiding question instead
   → Point them to the relevant concept in their roadmap
   → Encourage them to try it themselves first
   → Only after 2+ follow-ups from the same user on the same question, give a more detailed explanation (still not the complete solution)

2. STRICTLY PLATFORM-ONLY.
   You ONLY discuss topics related to:
   • The user's learning roadmap, phases, modules, and topics
   • Their daily checklist tasks and how to approach them
   • Their skill progress, quiz scores, and assessments
   • Career goals, job applications, and professional development
   • VeritaBox platform features and navigation
   • Technical concepts that are part of their current learning path

   If the user asks about ANYTHING ELSE — cooking, movies, politics, general trivia, weather, jokes, personal advice, or any topic not directly related to their learning journey on VeritaBox — you MUST refuse politely:
   "I'm your study mentor on VeritaBox — I can only help with your learning roadmap, checklist, progress, and career goals. What would you like to work on?"

   DO NOT engage with off-topic requests even if they say "just this once" or "it's quick."

3. PERSONALIZE every response using their actual data. Reference their career goal, current phase, today's pending tasks, or skill gaps when relevant.

4. BE PROACTIVE on the current page:
   - On /dashboard: summarize what needs attention today (pending tasks, streak, upcoming deadlines)
   - On /roadmaps: help them understand their current phase and next steps
   - On /checklist: help them plan which task to tackle next and how to approach it
   - On /progress: help them interpret their skill data and identify gaps

5. NEVER hallucinate. Only reference data, skills, topics, or resources from the context above. If you don't have the data, say so.

6. Keep responses CONCISE — 2-4 sentences for simple questions, up to a short paragraph for explanations. Use markdown formatting for readability (bold, lists, code backticks for technical terms).`;

    const reply = await generateAIResponse(systemPrompt, message);

    res.json({ reply });
  } catch (error) {
    console.error('Dhriti chat error:', error);
    res.status(500).json({ message: 'Failed to get a response from Dhriti.' });
  }
});

// POST /api/ai/resume - Resume Parsing & Recommendations
router.post('/resume', protect, async (req, res) => {
  try {
    const { resumeText } = req.body;
    const user = await User.findById(req.user._id).select('-password');
    const progress = await ProgressRecord.findOne({ user: req.user._id });
    const projects = await Project.find({ 'members.user': req.user._id }).select('title description role');
    
    let skillsContext = "No skills recorded yet.";
    if (progress && progress.skills.length > 0) {
      skillsContext = progress.skills.map(s => `${s.skillName}: ${s.proficiency}%`).join(', ');
    }

    let projectsContext = "No platform projects recorded.";
    if (projects && projects.length > 0) {
      projectsContext = projects.map(p => `${p.title} (Role: ${p.members.find(m => m.user.toString() === req.user._id.toString())?.role})`).join(', ');
    }
    
    const systemPrompt = `You are an expert technical recruiter and AI resume analyzer.
    The user (${user.name}) is aiming for a ${user.careerGoal || 'technology'} role.
    They have verified the following skills on our platform: ${skillsContext}.
    They have worked on the following platform projects: ${projectsContext}.
    
    Analyze the provided resume against their career goal. You MUST respond in pure JSON format (do not wrap in markdown blocks like \`\`\`json).
    The JSON structure MUST exactly match:
    {
      "score": <number 0-100>,
      "addToResume": [<array of strings: missing skills/projects found on platform but missing from resume>],
      "addToProfile": [<array of strings: skills/projects found in resume but missing from platform>],
      "formattingImprovements": [<array of strings: action verbs, phrasing, grammar, layout suggestions>],
      "missingKeywords": [<array of strings: industry keywords missing based on their career goal>],
      "skillBreakdown": [{"subject": "Skill Category Name", "A": <score 0-100>, "fullMark": 100}]
    }`;
    
    const recommendationsText = await generateAIResponse(systemPrompt, `Here is my resume text: \n\n${resumeText}`, { response_format: { type: "json_object" } });
    
    let jsonResponse;
    try {
      jsonResponse = JSON.parse(recommendationsText);
    } catch(e) {
      jsonResponse = {
        score: 0,
        addToResume: ["Failed to parse AI response"],
        addToProfile: [],
        formattingImprovements: [],
        missingKeywords: [],
        skillBreakdown: []
      };
    }

    res.json(jsonResponse);
  } catch (error) {
    res.status(500).json({ message: 'Error analyzing resume: ' + error.message });
  }
});

// POST /api/ai/mock-interview - AI Mock Interview
router.post('/mock-interview', protect, async (req, res) => {
  try {
    const { question, answer } = req.body;
    
    const systemPrompt = "You are a strict technical interviewer. Evaluate the user's answer to the question. Provide a short, constructive critique and state whether they 'Passed' or 'Failed' the question.";
    const userPrompt = `Question: ${question}\n\nMy Answer: ${answer}`;
    
    const feedback = await generateAIResponse(systemPrompt, userPrompt);
    
    res.json({ feedback, passed: feedback.toLowerCase().includes('passed') });
  } catch (error) {
    res.status(500).json({ message: 'Error in mock interview: ' + error.message });
  }
});

// POST /api/ai/explain-topic - Dhriti AI explanation for a theory topic
// Rate limited, level-aware, never invents resources
router.post('/explain-topic', protect, dhritiLimiter, async (req, res) => {
  try {
    const { topicId, question, level } = req.body;
    if (!topicId && !question) {
      return res.status(400).json({ message: 'topicId or question is required.' });
    }

    const user = await User.findById(req.user._id).select('name careerGoal');
    const onboarding = await (await import('../models/StudentOnboarding.js')).default
      .findOne({ user: req.user._id }).select('currentLevel careerGoal');
    const studentLevel = level || onboarding?.currentLevel || 'Beginner';

    let topicTitle = 'your current topic';
    let topicContext = '';
    if (topicId) {
      const content = await LearningContent.findOne({ _id: topicId, status: 'Published' })
        .select('title theoryContent conceptSummary commonMistakes bestPractices skill quizQuestions practiceTask')
        .populate('skill', 'name');
      if (content) {
        topicTitle = content.title;
        const hasQuiz = content.quizQuestions && content.quizQuestions.length > 0;
        const hasPractical = !!content.practiceTask?.title;
        topicContext = `
--- CURRENT TOPIC CONTEXT ---
Topic: ${content.title}
Skill: ${content.skill?.name || 'General'}
Has Quiz: ${hasQuiz}
Has Practical Task: ${hasPractical}
Concept Summary: ${content.conceptSummary || '(none)'}
Theory Excerpt (first 2000 chars): ${(content.theoryContent || '').slice(0, 2000)}
Common Mistakes: ${(content.commonMistakes || []).join(', ') || 'None listed'}
Best Practices: ${(content.bestPractices || []).join(', ') || 'None listed'}`;
      }
    }

    const systemPrompt = `You are Dhriti, an expert AI learning guide on the VeritaBox platform.
Student: ${user.name} | Level: ${studentLevel} | Career Goal: ${user.careerGoal || 'Not set'}
${topicContext}

BEHAVIORAL RULES:
1. LEVEL ADAPTATION: Adapt explanations to ${studentLevel} level. Simpler language for Beginners, technical depth for Advanced.
2. HINT-FIRST (MOST IMPORTANT): When the user asks about a concept from the current topic:
   - Start with a focused hint, clue, or thought-provoking question — NOT a full answer
   - Encourage them to think and try first
   - If they ask again or show they are still stuck, give one more concrete example/hint
   - Only provide full explanations after the user explicitly asks for more help
3. TOPIC GUARDRAIL: You ONLY help with topics related to "${topicTitle}". If the user asks about anything unrelated (different tech topics, recipes, news, general chat), politely decline and redirect: "I'm here to help you with ${topicTitle}. What specific part would you like a hint on?"
4. NO HALLUCINATION: Do NOT invent URLs, courses, resources, platform features, or data not in this context.
5. CONCISE: Keep answers focused. No lengthy introductions.
6. PLATFORM AWARENESS: If the user asks how to complete the topic, remind them: Theory → Practical Task → Quiz Assessment must all be completed.`;

    const reply = await generateAIResponse(systemPrompt, question || `Give me a brief introduction to ${topicTitle} at ${studentLevel} level.`);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ message: 'Error with AI explanation: ' + err.message });
  }
});

export default router;
