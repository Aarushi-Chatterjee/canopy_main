/**
 * Mapper for Build Calls
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    creatorId: raw.creator_id ?? raw.creatorId ?? raw.created_by ?? raw.createdBy ?? null,
    createdBy: raw.created_by ?? raw.createdBy ?? raw.creator_id ?? raw.creatorId ?? null,
    title: raw.title || '',
    orgName: raw.org_name ?? raw.orgName ?? raw.organization ?? '',
    organization: raw.organization ?? raw.org_name ?? raw.orgName ?? '',
    problemStatement: raw.problem_statement ?? raw.problemStatement ?? '',
    domain: raw.domain || 'climate',
    targetDeliverable: raw.target_deliverable ?? raw.targetDeliverable ?? (Array.isArray(raw.target_outcomes) ? raw.target_outcomes[0] : ''),
    targetOutcomes: raw.target_outcomes ?? (raw.target_deliverable ? [raw.target_deliverable] : []),
    pilotBudget: raw.pilot_budget ?? raw.pilotBudget ?? raw.reward_pool ?? raw.rewardPool ?? '',
    rewardPool: raw.reward_pool ?? raw.rewardPool ?? raw.pilot_budget ?? raw.pilotBudget ?? '',
    timeline: raw.timeline || '6 weeks',
    contactChannel: raw.contact_channel ?? raw.contactChannel ?? raw.dataset_access_url ?? raw.datasetAccessUrl ?? '',
    datasetAccessUrl: raw.dataset_access_url ?? raw.datasetAccessUrl ?? raw.contact_channel ?? raw.contactChannel ?? '',
    neededSkills: raw.needed_skills ?? raw.neededSkills ?? [],
    status: raw.status || 'open',
    moderationStatus: raw.moderation_status ?? raw.moderationStatus ?? 'approved',
    isIllustrative: Boolean(raw.is_illustrative ?? raw.isIllustrative ?? false),
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
  if (domain.orgName !== undefined || domain.organization !== undefined) {
    dbRecord.org_name = domain.orgName || domain.organization || 'Open Lab';
  }
  if (domain.problemStatement !== undefined) dbRecord.problem_statement = domain.problemStatement;
  if (domain.domain !== undefined) dbRecord.domain = domain.domain.toLowerCase();
  if (domain.targetDeliverable !== undefined || domain.targetOutcomes !== undefined) {
    dbRecord.target_deliverable = domain.targetDeliverable || (Array.isArray(domain.targetOutcomes) ? domain.targetOutcomes[0] : 'Prototype and report');
  }
  if (domain.pilotBudget !== undefined || domain.rewardPool !== undefined) {
    dbRecord.pilot_budget = domain.pilotBudget || domain.rewardPool || 'Grant Pool';
  }
  if (domain.datasetAccessUrl !== undefined || domain.contactChannel !== undefined) {
    dbRecord.dataset_access_url = domain.datasetAccessUrl || domain.contactChannel || '';
  }
  if (domain.neededSkills !== undefined) dbRecord.needed_skills = domain.neededSkills;
  if (domain.status !== undefined) dbRecord.status = domain.status;
  if (domain.moderationStatus !== undefined) dbRecord.moderation_status = domain.moderationStatus;
  if (domain.isIllustrative !== undefined) dbRecord.is_illustrative = domain.isIllustrative;
  if (domain.creatorId !== undefined || domain.createdBy !== undefined) {
    dbRecord.creator_id = domain.creatorId || domain.createdBy;
  }
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) dbRecord.updated_at = domain.updatedAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
