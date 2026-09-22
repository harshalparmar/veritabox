/**
 * fallbackRoadmapGenerator.js
 * Database-driven fallback when AI is unavailable.
 * Selects and sequences real published content from DB — no hardcoding.
 */

import LearningContent from '../models/LearningContent.js';
import Skill from '../models/Skill.js';
import CareerGoal from '../models/CareerGoal.js';

/**
 * Generate a fallback roadmap using DB content only.
 * @param {Object} params
 * @param {string} params.careerGoalId
 * @param {string} params.level - 'Beginner' | 'Intermediate' | 'Advanced'
 * @param {string[]} params.verifiedSkillIds  - IDs of already-verified skills
 * @param {number} params.dailyMinutes
 * @param {number} params.daysPerWeek
 * @param {number} params.targetDurationDays
 * @returns {Object} - structured roadmap phases
 */
export async function generateFallbackRoadmap({
  careerGoalId,
  level,
  verifiedSkillIds = [],
  dailyMinutes = 60,
  daysPerWeek = 5,
  targetDurationDays = 90
}) {
  // Total available learning minutes
  const totalWeeks = Math.ceil(targetDurationDays / 7);
  const totalMinutes = totalWeeks * daysPerWeek * dailyMinutes;

  // Get career goal and its skills
  const careerGoal = await CareerGoal.findById(careerGoalId)
    .populate('skills')
    .populate('coreSkills');

  if (!careerGoal) {
    return buildEmptyRoadmap('Unknown Goal');
  }

  // Get all published content for this career goal
  const allContent = await LearningContent.find({
    careerGoals: careerGoalId,
    status: 'Published'
  }).populate('skill').populate('prerequisites').sort({ order: 1 });

  if (allContent.length === 0) {
    return buildEmptyRoadmap(careerGoal.title);
  }

  // Filter out content for already-verified skills (unless Advanced level)
  const verifiedSet = new Set(verifiedSkillIds.map(id => id.toString()));
  
  let eligibleContent = allContent.filter(c => {
    const skillId = c.skill?._id?.toString();
    // Keep content even for verified skills at Advanced level (review/advanced topics)
    if (verifiedSet.has(skillId) && level !== 'Advanced') return false;
    return true;
  });

  // Difficulty filter based on level
  const difficultyOrder = { 'Beginner': ['Beginner', 'Intermediate', 'Advanced'],
                            'Intermediate': ['Intermediate', 'Beginner', 'Advanced'],
                            'Advanced': ['Advanced', 'Intermediate', 'Beginner'] };
  const preferredDifficulties = difficultyOrder[level] || ['Beginner', 'Intermediate', 'Advanced'];

  // Sort content by difficulty preference, then by order
  eligibleContent.sort((a, b) => {
    const aRank = preferredDifficulties.indexOf(a.difficulty);
    const bRank = preferredDifficulties.indexOf(b.difficulty);
    if (aRank !== bRank) return aRank - bRank;
    return a.order - b.order;
  });

  // Build phases (group by difficulty, then skills)
  const phases = [];
  
  // Phase 1: Foundation (Beginner content)
  const beginnerContent = eligibleContent.filter(c => c.difficulty === 'Beginner');
  const intermediateContent = eligibleContent.filter(c => c.difficulty === 'Intermediate');
  const advancedContent = eligibleContent.filter(c => c.difficulty === 'Advanced');

  let minutesUsed = 0;
  const minutesPerPhase = totalMinutes / 3;

  if (beginnerContent.length > 0) {
    const phase = buildPhase('Foundation', 'Core fundamentals and essential concepts', beginnerContent, minutesPerPhase, 1);
    phases.push(phase);
    minutesUsed += phase.modules.reduce((sum, m) => sum + m.topics.reduce((s, t) => s + t.estimatedMinutes, 0), 0);
  }

  if (intermediateContent.length > 0) {
    const phase = buildPhase('Development', 'Intermediate skills and applied knowledge', intermediateContent, minutesPerPhase, 2);
    phases.push(phase);
  }

  if (advancedContent.length > 0) {
    const phase = buildPhase('Mastery', 'Advanced concepts and professional practices', advancedContent, minutesPerPhase, 3);
    phases.push(phase);
  }

  // Activate first phase
  if (phases.length > 0) {
    phases[0].status = 'Active';
    if (phases[0].modules.length > 0) {
      phases[0].modules[0].status = 'Active';
      if (phases[0].modules[0].topics.length > 0) {
        phases[0].modules[0].topics[0].status = 'Available';
      }
    }
  }

  // Count total topics
  const totalTopics = phases.reduce((sum, p) =>
    sum + p.modules.reduce((ms, m) => ms + m.topics.length, 0), 0);

  return {
    phases,
    totalTopics,
    careerGoalTitle: careerGoal.title,
    generatedBy: 'fallback'
  };
}

function buildPhase(title, description, contentItems, maxMinutes, order) {
  // Group content by skill
  const bySkill = new Map();
  for (const item of contentItems) {
    const skillId = item.skill?._id?.toString() || 'general';
    const skillName = item.skill?.name || 'General';
    if (!bySkill.has(skillId)) {
      bySkill.set(skillId, { skillId, skillName, items: [] });
    }
    bySkill.get(skillId).items.push(item);
  }

  const modules = [];
  let phaseMinutes = 0;

  for (const [, { skillId, skillName, items }] of bySkill) {
    if (phaseMinutes >= maxMinutes) break;

    const topics = [];
    for (const item of items) {
      if (phaseMinutes >= maxMinutes) break;
      
      // Theory topic
      topics.push({
        contentId: item._id,
        title: item.title,
        type: 'Theory',
        status: 'Locked',
        estimatedMinutes: item.estimatedMinutes || 30,
        difficulty: item.difficulty,
        order: topics.length
      });
      phaseMinutes += item.estimatedMinutes || 30;

      // Quiz topic (if quiz questions exist)
      if (item.quizQuestions && item.quizQuestions.length > 0) {
        topics.push({
          contentId: item._id,
          title: `${item.title} — Quiz`,
          type: 'Quiz',
          status: 'Locked',
          estimatedMinutes: Math.max(15, Math.round(item.quizQuestions.length * 2)),
          difficulty: item.difficulty,
          order: topics.length
        });
        phaseMinutes += Math.max(15, Math.round(item.quizQuestions.length * 2));
      }

      // Practical topic
      if (item.practiceTask) {
        topics.push({
          contentId: item._id,
          title: `${item.title} — Practice`,
          type: 'Practical',
          status: 'Locked',
          estimatedMinutes: item.practiceTask.estimatedMinutes || 30,
          difficulty: item.difficulty,
          order: topics.length
        });
        phaseMinutes += item.practiceTask.estimatedMinutes || 30;
      }
    }

    if (topics.length > 0) {
      modules.push({
        title: skillName,
        description: `Master ${skillName}`,
        skillId,
        status: 'Locked',
        topics,
        order: modules.length,
        estimatedHours: Math.ceil(phaseMinutes / 60)
      });
    }
  }

  return {
    title,
    description,
    status: 'Locked',
    modules,
    order,
    milestoneTitle: `${title} Complete`,
    milestoneDescription: `You have completed the ${title} phase!`
  };
}

function buildEmptyRoadmap(goalTitle) {
  return {
    phases: [],
    totalTopics: 0,
    careerGoalTitle: goalTitle,
    generatedBy: 'fallback',
    warning: 'No published content available for this career goal. Please ask an admin to add learning content.'
  };
}
