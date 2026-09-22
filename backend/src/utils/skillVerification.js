/**
 * skillVerification.js
 * Maps diagnostic/quiz scores to skill status enum values.
 * Updates ProgressRecord with real scores — never arbitrary defaults.
 */

import ProgressRecord from '../models/ProgressRecord.js';

// Score → status mapping (thresholds based on percentage)
export function scoreToSkillStatus(percentageScore) {
  if (percentageScore >= 90) return 'Mastered';
  if (percentageScore >= 75) return 'Proficient';
  if (percentageScore >= 60) return 'Verified';
  if (percentageScore >= 40) return 'Partially Verified';
  return 'Needs Learning';
}

/**
 * Update a student's skill status in ProgressRecord based on assessment result.
 * @param {string} userId
 * @param {string} skillId
 * @param {string} skillName
 * @param {number} percentageScore  - Real score from assessment (0-100)
 * @param {string} sourceType       - 'Diagnostic' | 'Quiz' | 'Practical'
 * @param {ObjectId} sourceId       - Reference to the assessment/quiz record
 */
export async function updateSkillStatus(userId, skillId, skillName, percentageScore, sourceType, sourceId) {
  const status = scoreToSkillStatus(percentageScore);
  const isVerified = percentageScore >= 60;

  let progress = await ProgressRecord.findOne({ user: userId });
  if (!progress) {
    progress = new ProgressRecord({ user: userId });
  }

  const existingSkill = progress.skills.find(
    s => s.skillId?.toString() === skillId?.toString() || s.skillName === skillName
  );

  const historyEntry = {
    score: percentageScore,
    status,
    date: new Date(),
    sourceType,
    sourceId
  };

  if (existingSkill) {
    // Only improve status, never downgrade from Verified/Proficient/Mastered
    // unless the new assessment score is from a fresh diagnostic
    const shouldUpgrade = shouldUpgradeStatus(existingSkill.status, status);
    if (shouldUpgrade) {
      existingSkill.proficiency = percentageScore;
      existingSkill.status = status;
      existingSkill.isVerified = isVerified;
      existingSkill.lastEvaluated = new Date();
      existingSkill.verifiedBy = sourceType;
      existingSkill.verificationRef = sourceId;
      if (isVerified && !existingSkill.dateAcquired) {
        existingSkill.dateAcquired = new Date();
      }
    }
    existingSkill.history.push(historyEntry);
  } else {
    progress.skills.push({
      skillId,
      skillName,
      proficiency: percentageScore,
      status,
      isVerified,
      lastEvaluated: new Date(),
      verifiedBy: sourceType,
      verificationRef: sourceId,
      dateAcquired: isVerified ? new Date() : undefined,
      history: [historyEntry]
    });
  }

  await progress.save();
  return { status, proficiency: percentageScore, isVerified };
}

/**
 * Mark a skill as Self-Reported (never auto-verified).
 * Call this when student says "I know X" during onboarding.
 */
export async function markSkillSelfReported(userId, skillId, skillName) {
  let progress = await ProgressRecord.findOne({ user: userId });
  if (!progress) {
    progress = new ProgressRecord({ user: userId });
  }

  const existing = progress.skills.find(
    s => s.skillId?.toString() === skillId?.toString() || s.skillName === skillName
  );

  if (!existing) {
    progress.skills.push({
      skillId,
      skillName,
      proficiency: 0,      // Never assign arbitrary % for self-reported
      status: 'Self-Reported',
      isVerified: false,
      verifiedBy: 'None',
      history: []
    });
    await progress.save();
  } else if (existing.status === 'Not Started') {
    existing.status = 'Self-Reported';
    await progress.save();
  }
}

/**
 * Mark a skill as "Assessment Started"
 */
export async function markAssessmentStarted(userId, skillId, skillName) {
  let progress = await ProgressRecord.findOne({ user: userId });
  if (!progress) {
    progress = new ProgressRecord({ user: userId });
  }

  const existing = progress.skills.find(
    s => s.skillId?.toString() === skillId?.toString() || s.skillName === skillName
  );

  if (existing && ['Self-Reported', 'Not Started', 'Needs Learning'].includes(existing.status)) {
    existing.status = 'Assessment Started';
    await progress.save();
  } else if (!existing) {
    progress.skills.push({
      skillId,
      skillName,
      proficiency: 0,
      status: 'Assessment Started',
      isVerified: false,
      history: []
    });
    await progress.save();
  }
}

// Helper: determine if new status is an improvement
function shouldUpgradeStatus(currentStatus, newStatus) {
  const statusRank = {
    'Not Started': 0,
    'Self-Reported': 1,
    'Assessment Started': 2,
    'Needs Learning': 2,
    'Partially Verified': 3,
    'Verified': 4,
    'Proficient': 5,
    'Mastered': 6
  };
  return (statusRank[newStatus] || 0) > (statusRank[currentStatus] || 0);
}
