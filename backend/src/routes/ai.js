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

// POST /api/ai/chat - AI Mentor Chat
router.post('/chat', protect, async (req, res) => {
  try {
    const { message } = req.body;
    
    // 1. Fetch Complete User Database
    const user = await User.findById(req.user._id).select('-password');
    const progress = await ProgressRecord.findOne({ user: req.user._id });
    const roadmap = await Roadmap.findOne({ user: req.user._id });
    const { default: QuizProgress } = await import('../models/QuizProgress.js');
    const quizProgress = await QuizProgress.find({ user: req.user._id }).populate("quiz", "title topic");
    
    // Fetch today's checklist
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checklist = await DailyChecklist.findOne({ user: req.user._id, date: { $gte: today } });
    
    // Fetch job applications
    const applications = await JobApplication.find({ candidate: req.user._id }).populate('job', 'title company');
    
    // Fetch complete platform activities
    const projects = await Project.find({ 'members.user': req.user._id }).select('title status');
    const hackathons = await HackathonRegistration.find({ user: req.user._id }).populate('hackathon', 'title');
    const bounties = await BountySubmission.find({ user: req.user._id }).populate('bounty', 'title');
    const repLogs = await ReputationLog.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(5);
    const codeForge = await ChallengeSubmission.find({ userId: req.user._id }).populate('challengeId', 'title difficulty').sort({ createdAt: -1 }).limit(3);

    // 2. Format Context
    const skillsContext = progress?.skills?.length ? progress.skills.map(s => `${s.skillName} (${s.proficiency}%)`).join(', ') : "No verified skills.";
    const roadmapContext = roadmap ? `Goal: ${roadmap.careerGoal}. Active Phase: ${roadmap.phases[roadmap.activePhaseIndex]?.title || 'None'}. Completed: ${roadmap.isCompleted}` : "No roadmap.";
    const checklistContext = checklist ? `${checklist.items.filter(i=>i.status==='Completed').length}/${checklist.items.length} tasks done today. Streak: ${checklist.streakCount}` : "No checklist today.";
    const appsContext = applications.length ? applications.map(a => `${a.job.title} at ${a.job.company} (${a.status})`).join(', ') : "No job applications.";
    
    const activitiesContext = `
      Projects: ${projects.length ? projects.map(p => `${p.title} (${p.status})`).join(', ') : 'None'}
      Hackathons: ${hackathons.length ? hackathons.map(h => h.hackathon?.title).join(', ') : 'None'}
      Bounties: ${bounties.length ? bounties.map(b => `${b.bounty?.title} (${b.status})`).join(', ') : 'None'}
      Recent Rep Gains: ${repLogs.length ? repLogs.map(r => `+${r.points} (${r.reason})`).join(', ') : 'None'}
      CodeForge (Recent): ${codeForge.length ? codeForge.map(c => `${c.challengeId?.title} [${c.language}] - ${c.status}`).join(' | ') : 'None'}
    `;

    let quizContext = "None";
    if (quizProgress && quizProgress.length > 0) {
      quizContext = quizProgress.map(qp => 
        `Quiz: ${qp.quiz?.title || 'Unknown'} (Topic: ${qp.quiz?.topic || 'Unknown'}) - Score: ${qp.highestPercentage}% - Status: ${qp.status}`
      ).join(' | ');
    }
    
    // Construct System Prompt
    const systemPrompt = `You are Dhriti, the elite AI Mentor of the VeritaBox Platform.

    --- USER DATABASE RECORD ---
    Name: ${user.name}
    Role: ${user.role}
    Career Goal: ${user.careerGoal || 'Not set'}
    Reputation Points: ${user.reputationPoints || 0}
    Roadmap Completion: ${roadmap ? roadmap.completionPercentage + '%' : 'None'}
    Verified Skills: ${skillsContext}
    Daily Execution: ${checklistContext}
    Assessments & Quizzes: ${quizContext}
    Job Pipeline: ${appsContext}
    
    --- PLATFORM ACTIVITIES ---
    ${activitiesContext.trim()}
    
    --- VeritaBox PLATFORM GUIDE ---
    You understand all VeritaBox platform features and can guide users to the right place:
    - Roadmap: /roadmaps — Shows their career roadmap, phases, modules, topics and completion status
    - Daily Checklist: /checklist — Today's learning tasks: Theory → Practical → Assessment
    - Progress: /progress — Analytics of their learning, skills, assessment scores, streak
    - Jobs: /jobs — Career opportunities matched to their skills; Apply button is functional
    - Learning: /learning/topic/:id — Theory content, practice tasks, quiz assessments
    - VeritaBox Pulse: visible on Dashboard — Platform announcements, events, workshops, hackathons
    - CodeForge: /forge — Coding challenges
    - Competitions & Hackathons: /competitions, /hackathons
    - Chapters: /chapters — Community and collaboration
    
    --- BEHAVIORAL RULES (MUST FOLLOW) ---
    
    1. TOPIC-AWARE HINTS FIRST: If the user asks about a concept related to their current roadmap phase or topic, DO NOT immediately give the complete answer. Instead:
       - First: Give a focused hint or clue
       - Ask them to think about it or try it
       - If they still need help, give another hint with a concrete example
       - Only on explicit follow-up requests: provide the complete explanation
    
    2. TOPIC RELEVANCE: Only answer questions related to:
       - Their current learning topics and roadmap
       - Technical concepts in their career goal area  
       - Career development and job search
       - VeritaBox platform navigation and features
       If the user asks about completely unrelated topics (recipes, politics, general trivia, etc.), politely decline and redirect them back to their learning journey.
    
    3. PERSONALIZATION: Always connect your answers back to their specific career goal: "${user.careerGoal || 'not yet set'}" and their current roadmap phase.
    
    4. ACCURACY: Do not hallucinate data that isn't in the user's profile. Do not invent resources, URLs, or course names.
    
    5. CONCISE: Keep responses focused and actionable. Avoid lengthy preambles.`;
    
    const reply = await generateAIResponse(systemPrompt, message);
    
    res.json({ reply });
  } catch (error) {
    res.status(500).json({ message: 'Error in AI chat: ' + error.message });
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
