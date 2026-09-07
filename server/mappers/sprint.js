/**
 * Mapper for Sprints
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  const callId = raw.build_call_id ?? raw.buildCallId ?? raw.call_id ?? raw.callId ?? null;
  const members = raw.members ?? raw.participants ?? [];

  return {
    id: raw.id,
    buildCallId: callId,
    callId,
    creatorId: raw.creator_id ?? raw.creatorId ?? null,
    title: raw.title || '',
    description: raw.description || '',
    domain: raw.domain || 'climate',
    stage: raw.stage || 'forming',
    status: raw.status || (raw.stage === 'building' ? 'active' : raw.stage === 'shipped' ? 'completed' : 'planning'),
    teamCapacity: raw.team_capacity ?? raw.teamCapacity ?? 3,
    members,
    participants: members,
    skillTags: raw.skill_tags ?? raw.skillTags ?? [raw.domain || 'climate'],
    startDate: raw.start_date ?? raw.startDate ?? raw.started_at ?? raw.startedAt ?? null,
    endDate: raw.end_date ?? raw.endDate ?? raw.ended_at ?? raw.endedAt ?? null,
    startedAt: raw.started_at ?? raw.startedAt ?? raw.start_date ?? raw.startDate ?? null,
    endedAt: raw.ended_at ?? raw.endedAt ?? raw.end_date ?? raw.endDate ?? null,
    daysTotal: raw.days_total ?? raw.daysTotal ?? 14,
    daysLeft: raw.days_left ?? raw.daysLeft ?? 14,
    progressPct: raw.progress_pct ?? raw.progressPct ?? 0,
    statusHint: raw.status_hint ?? raw.statusHint ?? '',
    shippedArtifactUrl: raw.shipped_artifact_url ?? raw.shippedArtifactUrl ?? '',
    isIllustrative: Boolean(raw.is_illustrative ?? raw.isIllustrative ?? false),
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null
  };
}

function toDatabase(domain) {
  if (!domain) return null;
  const callId = domain.buildCallId || domain.callId;
  const members = domain.members || domain.participants || [];

  const dbRecord = {
    id: domain.id
  };
  if (callId !== undefined) dbRecord.build_call_id = callId;
  if (domain.title !== undefined) dbRecord.title = domain.title;
  if (domain.description !== undefined) dbRecord.description = domain.description;
  if (domain.domain !== undefined) dbRecord.domain = domain.domain.toLowerCase();
  if (domain.stage !== undefined) dbRecord.stage = domain.stage;
  if (domain.teamCapacity !== undefined) dbRecord.team_capacity = domain.teamCapacity;
  if (members !== undefined) dbRecord.members = members;
  if (domain.skillTags !== undefined) dbRecord.skill_tags = domain.skillTags;
  if (domain.startDate !== undefined || domain.startedAt !== undefined) {
    dbRecord.start_date = (domain.startDate || domain.startedAt || '').split('T')[0] || null;
  }
  if (domain.endDate !== undefined || domain.endedAt !== undefined) {
    dbRecord.end_date = (domain.endDate || domain.endedAt || '').split('T')[0] || null;
  }
  if (domain.daysTotal !== undefined) dbRecord.days_total = domain.daysTotal;
  if (domain.daysLeft !== undefined) dbRecord.days_left = domain.daysLeft;
  if (domain.progressPct !== undefined) dbRecord.progress_pct = domain.progressPct;
  if (domain.statusHint !== undefined) dbRecord.status_hint = domain.statusHint;
  if (domain.shippedArtifactUrl !== undefined) dbRecord.shipped_artifact_url = domain.shippedArtifactUrl;
  if (domain.isIllustrative !== undefined) dbRecord.is_illustrative = domain.isIllustrative;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) dbRecord.updated_at = domain.updatedAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
