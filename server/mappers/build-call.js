/**
 * Mapper for Build Calls
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    title: raw.title || '',
    organization: raw.organization || '',
    problemStatement: raw.problem_statement ?? raw.problemStatement ?? '',
    status: raw.status || 'pending_review',
    targetOutcomes: raw.target_outcomes ?? raw.targetOutcomes ?? [],
    timeline: raw.timeline || '',
    rewardPool: raw.reward_pool ?? raw.rewardPool ?? '',
    contactChannel: raw.contact_channel ?? raw.contactChannel ?? '',
    submissionDeadline: raw.submission_deadline ?? raw.submissionDeadline ?? '',
    createdBy: raw.created_by ?? raw.createdBy ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null
  };
}

function toDatabase(domain) {
  if (!domain) return null;
  const dbRecord = {
    id: domain.id
  };
  if (domain.title !== undefined) dbRecord.title = domain.title;
  if (domain.organization !== undefined) dbRecord.organization = domain.organization;
  if (domain.problemStatement !== undefined) dbRecord.problem_statement = domain.problemStatement;
  if (domain.status !== undefined) dbRecord.status = domain.status;
  if (domain.targetOutcomes !== undefined) dbRecord.target_outcomes = domain.targetOutcomes;
  if (domain.timeline !== undefined) dbRecord.timeline = domain.timeline;
  if (domain.rewardPool !== undefined) dbRecord.reward_pool = domain.rewardPool;
  if (domain.contactChannel !== undefined) dbRecord.contact_channel = domain.contactChannel;
  if (domain.submissionDeadline !== undefined) dbRecord.submission_deadline = domain.submissionDeadline;
  if (domain.createdBy !== undefined) dbRecord.created_by = domain.createdBy;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) dbRecord.updated_at = domain.updatedAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
