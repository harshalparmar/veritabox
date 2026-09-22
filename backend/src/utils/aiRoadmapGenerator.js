/**
 * aiRoadmapGenerator.js
 * AI-powered personalized roadmap generator using OpenAI.
 * Validates every AI-selected item against DB before accepting.
 * Falls back to fallbackRoadmapGenerator on any failure.
 */

import OpenAI from 'openai';
import LearningContent from '../models/LearningContent.js';
import Skill from '../models/Skill.js';
import CareerGoal from '../models/CareerGoal.js';
import { generateFallbackRoadmap } from './fallbackRoadmapGenerator.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const AI_TIMEOUT_MS = 30000;     // 30 second timeout
const AI_MAX_RETRIES = 2;

/**
 * Generate an AI-personalized roadmap.
 * All content IDs in the output are validated against DB before returning.
 *
 * @param {Object} studentProfile
 * @param {string} studentProfile.careerGoalId
 * @param {string} studentProfile.level
 * @param {Object[]} studentProfile.selfReportedSkills  - [{skillId, skillName, known}]
 * @param {Object[]} studentProfile.verifiedSkills      - [{skillId, skillName, proficiency, status}]
 * @param {number} studentProfile.dailyMinutes
 * @param {number} studentProfile.daysPerWeek
 * @param {number} studentProfile.targetDurationDays
 * @param {Object} studentProfile.diagnosticScores      - {skillId: percentageScore}
 * @param {string[]} studentProfile.completedContentIds - Already completed content
 * @returns {Object} - validated roadmap structure
 */
export async function generateAIRoadmap(studentProfile) {
  const {
    careerGoalId,
    level = 'Beginner',
    selfReportedSkills = [],
    verifiedSkills = [],
    dailyMinutes = 60,
    daysPerWeek = 5,
    targetDurationDays = 90,
    diagnosticScores = {},
    completedContentIds = [],
    preferredStyle = 'Mixed'
  } = studentProfile;

  // ── 1. Load DB content catalog ────────────────────────────────────
  let careerGoal, allContent;
  try {
    [careerGoal, allContent] = await Promise.all([
      CareerGoal.findById(careerGoalId).populate('skills'),
      LearningContent.find({
        careerGoals: careerGoalId,
        status: 'Published'
      }).populate('skill').lean()
    ]);
  } catch (dbErr) {
    console.error('[AI Roadmap] DB load failed, using fallback:', dbErr.message);
    return generateFallbackRoadmap({
      careerGoalId, level, verifiedSkillIds: verifiedSkills.map(s => s.skillId),
      dailyMinutes, daysPerWeek, targetDurationDays
    });
  }

  if (!careerGoal || allContent.length === 0) {
    return generateFallbackRoadmap({
      careerGoalId, level, verifiedSkillIds: verifiedSkills.map(s => s.skillId),
      dailyMinutes, daysPerWeek, targetDurationDays
    });
  }

  // ── 2. Build DB content map for validation ────────────────────────
  const contentById = new Map(allContent.map(c => [c._id.toString(), c]));
  const completedSet = new Set(completedContentIds.map(id => id.toString()));

  // ── 3. Build prompt context ───────────────────────────────────────
  const contentCatalog = allContent.map(c => ({
    id: c._id.toString(),
    title: c.title,
    skill: c.skill?.name || 'General',
    difficulty: c.difficulty,
    estimatedMinutes: c.estimatedMinutes,
    hasQuiz: (c.quizQuestions?.length || 0) > 0,
    hasPractical: !!c.practiceTask,
    order: c.order,
    prerequisites: c.prerequisites?.map(p => p.toString()) || []
  }));

  const verifiedSkillNames = verifiedSkills
    .filter(s => s.status === 'Verified' || s.status === 'Proficient' || s.status === 'Mastered')
    .map(s => s.skillName);

  const partialSkillNames = verifiedSkills
    .filter(s => s.status === 'Partially Verified')
    .map(s => `${s.skillName} (${s.proficiency}% verified)`);

  const selfReportedKnown = selfReportedSkills
    .filter(s => s.known)
    .map(s => `${s.skillName} (self-reported, NOT verified yet)`);

  const totalAvailableMinutes = Math.ceil(targetDurationDays / 7) * daysPerWeek * dailyMinutes;

  const systemPrompt = `You are an expert learning path architect for the VeritaBox platform.
Your job is to create a personalized learning roadmap for a student.
You MUST ONLY select content items from the provided catalog using their exact IDs.
Do NOT invent new content, courses, topics, quizzes, or resources.
Do NOT include content IDs that are not in the catalog.
Respond ONLY with valid JSON in the exact format specified.`;

  const userPrompt = `Create a personalized roadmap for this student:

STUDENT PROFILE:
- Career Goal: ${careerGoal.title}
- Current Level: ${level}
- Verified Skills (can skip basic content): ${verifiedSkillNames.join(', ') || 'None'}
- Partially Verified Skills (needs review): ${partialSkillNames.join(', ') || 'None'}
- Self-Reported Skills (must NOT auto-skip, must verify first): ${selfReportedKnown.join(', ') || 'None'}
- Preferred Learning Style: ${preferredStyle} (Visual = favor diagrammatic/visual content; ReadWrite = favor text-heavy theory; Hands-on = favor practical tasks; Mixed = balanced)
- Daily Learning Time: ${dailyMinutes} minutes/day
- Days Available per Week: ${daysPerWeek} days/week
- Target Duration: ${targetDurationDays} days
- Total Available Minutes: ${totalAvailableMinutes}

AVAILABLE CONTENT CATALOG (use ONLY these IDs):
${JSON.stringify(contentCatalog, null, 2)}

IMPORTANT RULES:
1. For self-reported skills, ALWAYS include a Diagnostic assessment topic BEFORE theory content.
2. For verified skills (score >= 60%), you MAY skip beginner content for that skill.
3. For partially verified skills (40-59%), include targeted review content.
4. Respect prerequisites - don't schedule content before its prerequisites.
5. Distribute content across phases based on difficulty: Foundation (Beginner) → Development (Intermediate) → Mastery (Advanced).
6. Each topic should include the type: "Theory", "Quiz" (only if hasQuiz=true), "Practical" (only if hasPractical=true), or "Diagnostic".
7. Stay within the total available minutes budget.
8. Different students with different skill levels MUST receive different orderings.

OUTPUT FORMAT (respond with ONLY this JSON, no other text):
{
  "phases": [
    {
      "title": "Phase title",
      "description": "Phase description",
      "milestoneTitle": "Milestone name",
      "modules": [
        {
          "title": "Skill/Module name",
          "description": "Module description",
          "topics": [
            {
              "contentId": "exact_id_from_catalog",
              "title": "Topic title",
              "type": "Theory|Quiz|Practical|Diagnostic",
              "estimatedMinutes": 30,
              "rationale": "why this is included"
            }
          ]
        }
      ]
    }
  ],
  "personalizationSummary": "Brief explanation of personalization decisions made"
}`;

  // ── 4. Call OpenAI with retry and timeout ─────────────────────────
  let aiResponse = null;
  for (let attempt = 0; attempt < AI_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

      const response = await openai.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,    // Lower temp for more consistent structured output
          response_format: { type: 'json_object' }
        },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      aiResponse = response.choices[0]?.message?.content;
      if (aiResponse) break;
    } catch (err) {
      console.error(`[AI Roadmap] Attempt ${attempt + 1} failed:`, err.message);
      if (attempt === AI_MAX_RETRIES - 1) {
        // All retries exhausted — use fallback
        console.warn('[AI Roadmap] All retries failed, using DB fallback.');
        return generateFallbackRoadmap({
          careerGoalId, level, verifiedSkillIds: verifiedSkills.map(s => s.skillId),
          dailyMinutes, daysPerWeek, targetDurationDays
        });
      }
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1))); // exponential backoff
    }
  }

  // ── 5. Parse AI response ──────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(aiResponse);
  } catch {
    console.error('[AI Roadmap] Invalid JSON from AI, using fallback.');
    return generateFallbackRoadmap({
      careerGoalId, level, verifiedSkillIds: verifiedSkills.map(s => s.skillId),
      dailyMinutes, daysPerWeek, targetDurationDays
    });
  }

  if (!parsed.phases || !Array.isArray(parsed.phases)) {
    console.error('[AI Roadmap] Missing phases array, using fallback.');
    return generateFallbackRoadmap({
      careerGoalId, level, verifiedSkillIds: verifiedSkills.map(s => s.skillId),
      dailyMinutes, daysPerWeek, targetDurationDays
    });
  }

  // ── 6. Validate every content ID against DB ───────────────────────
  let totalTopics = 0;
  const validatedPhases = [];

  for (let pi = 0; pi < parsed.phases.length; pi++) {
    const phase = parsed.phases[pi];
    const validatedModules = [];

    for (const module of (phase.modules || [])) {
      const validatedTopics = [];

      for (const topic of (module.topics || [])) {
        const contentId = topic.contentId?.toString();

        // Reject any content ID not in DB
        if (!contentId || !contentById.has(contentId)) {
          console.warn(`[AI Roadmap] Rejected hallucinated contentId: ${contentId}`);
          continue;
        }

        // Reject already-completed content (unless it's a review/quiz)
        if (completedSet.has(contentId) && topic.type === 'Theory') {
          continue;
        }

        const dbContent = contentById.get(contentId);

        // Validate type constraints
        let type = topic.type || 'Theory';
        if (type === 'Quiz' && (!dbContent.quizQuestions || dbContent.quizQuestions.length === 0)) {
          type = 'Theory'; // Downgrade to theory if no quiz exists
        }
        if (type === 'Practical' && !dbContent.practiceTask) {
          continue; // Skip invalid practical reference
        }

        validatedTopics.push({
          contentId,
          title: topic.title || dbContent.title,
          type,
          status: 'Locked',
          estimatedMinutes: topic.estimatedMinutes || dbContent.estimatedMinutes || 30,
          difficulty: dbContent.difficulty,
          order: validatedTopics.length
        });
        totalTopics++;
      }

      if (validatedTopics.length > 0) {
        validatedModules.push({
          title: module.title || 'Module',
          description: module.description || '',
          status: 'Locked',
          topics: validatedTopics,
          order: validatedModules.length,
          estimatedHours: Math.ceil(validatedTopics.reduce((s, t) => s + t.estimatedMinutes, 0) / 60)
        });
      }
    }

    if (validatedModules.length > 0) {
      validatedPhases.push({
        title: phase.title || `Phase ${pi + 1}`,
        description: phase.description || '',
        status: 'Locked',
        modules: validatedModules,
        order: validatedPhases.length,
        milestoneTitle: phase.milestoneTitle || `${phase.title} Complete`,
        milestoneDescription: `You have completed the ${phase.title} phase!`
      });
    }
  }

  // ── 7. Activate first phase/module/topic ─────────────────────────
  if (validatedPhases.length > 0) {
    validatedPhases[0].status = 'Active';
    if (validatedPhases[0].modules.length > 0) {
      validatedPhases[0].modules[0].status = 'Active';
      if (validatedPhases[0].modules[0].topics.length > 0) {
        validatedPhases[0].modules[0].topics[0].status = 'Available';
      }
    }
  }

  // ── 8. Final validation: fall back if no valid content ────────────
  if (validatedPhases.length === 0 || totalTopics === 0) {
    console.warn('[AI Roadmap] All AI content was invalid, using fallback.');
    return generateFallbackRoadmap({
      careerGoalId, level, verifiedSkillIds: verifiedSkills.map(s => s.skillId),
      dailyMinutes, daysPerWeek, targetDurationDays
    });
  }

  return {
    phases: validatedPhases,
    totalTopics,
    careerGoalTitle: careerGoal.title,
    generatedBy: 'ai',
    personalizationSummary: parsed.personalizationSummary || ''
  };
}
