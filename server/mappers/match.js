/**
 * Mapper for Matches
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    callId: raw.call_id ?? raw.callId ?? null,
    userId: raw.user_id ?? raw.userId ?? null,
    matchUserId: raw.match_user_id ?? raw.matchUserId ?? null,
    status: raw.status || 'pending',
    stage: raw.stage ?? (raw.status === 'connected' ? 'introduced' : 'proposed'),
    assignedCuratorId: raw.assigned_curator_id ?? raw.assignedCuratorId ?? null,
    curatorNotes: raw.curator_notes ?? raw.curatorNotes ?? '',
    mutualConsent: Boolean(raw.mutual_consent ?? raw.mutualConsent),
    introductionSentAt: raw.introduction_sent_at ?? raw.introductionSentAt ?? null,
    initiatedBy: raw.initiated_by ?? raw.initiatedBy ?? null,
    score: raw.score ?? 0,
    matchMetadata: raw.match_metadata ?? raw.matchMetadata ?? {},
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString()
  };
}

function toDatabase(domain) {
  if (!domain) return null;
  const dbRecord = {
    id: domain.id
  };
  if (domain.callId !== undefined) dbRecord.call_id = domain.callId;
  if (domain.userId !== undefined) dbRecord.user_id = domain.userId;
  if (domain.matchUserId !== undefined) dbRecord.match_user_id = domain.matchUserId;
  if (domain.status !== undefined) dbRecord.status = domain.status;
  if (domain.stage !== undefined) dbRecord.stage = domain.stage;
  if (domain.assignedCuratorId !== undefined) dbRecord.assigned_curator_id = domain.assignedCuratorId;
  if (domain.curatorNotes !== undefined) dbRecord.curator_notes = domain.curatorNotes;
  if (domain.mutualConsent !== undefined) dbRecord.mutual_consent = domain.mutualConsent;
  if (domain.introductionSentAt !== undefined) dbRecord.introduction_sent_at = domain.introductionSentAt;
  if (domain.initiatedBy !== undefined) dbRecord.initiated_by = domain.initiatedBy;
  if (domain.score !== undefined) dbRecord.score = domain.score;
  if (domain.matchMetadata !== undefined) dbRecord.match_metadata = domain.matchMetadata;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
