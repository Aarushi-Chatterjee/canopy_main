/**
 * Mapper for Moderation Queue and Audit Events
 * Translates between DB snake_case and API camelCase
 */

function toModerationDomain(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    entityType: raw.entity_type ?? raw.entityType ?? 'build_call',
    entityId: raw.entity_id ?? raw.entityId ?? '',
    status: raw.status || 'pending',
    flaggedReason: raw.flagged_reason ?? raw.flaggedReason ?? 'new_submission',
    submittedBy: raw.submitted_by ?? raw.submittedBy ?? null,
    reviewedBy: raw.reviewed_by ?? raw.reviewedBy ?? null,
    decisionNote: raw.decision_note ?? raw.decisionNote ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    reviewedAt: raw.reviewed_at ?? raw.reviewedAt ?? null
  };
}

function toModerationDatabase(domain) {
  if (!domain) return null;
  const dbRecord = { id: domain.id };
  if (domain.entityType !== undefined) dbRecord.entity_type = domain.entityType;
  if (domain.entityId !== undefined) dbRecord.entity_id = domain.entityId;
  if (domain.status !== undefined) dbRecord.status = domain.status;
  if (domain.flaggedReason !== undefined) dbRecord.flagged_reason = domain.flaggedReason;
  if (domain.submittedBy !== undefined) dbRecord.submitted_by = domain.submittedBy;
  if (domain.reviewedBy !== undefined) dbRecord.reviewed_by = domain.reviewedBy;
  if (domain.decisionNote !== undefined) dbRecord.decision_note = domain.decisionNote;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  if (domain.reviewedAt !== undefined) dbRecord.reviewed_at = domain.reviewedAt;
  return dbRecord;
}

function toAuditDomain(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    eventType: raw.event_type ?? raw.eventType ?? '',
    actorId: raw.actor_id ?? raw.actorId ?? null,
    actorRole: raw.actor_role ?? raw.actorRole ?? null,
    targetEntityType: raw.target_entity_type ?? raw.targetEntityType ?? '',
    targetEntityId: raw.target_entity_id ?? raw.targetEntityId ?? '',
    payload: raw.payload ?? {},
    ipAddress: raw.ip_address ?? raw.ipAddress ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString()
  };
}

function toAuditDatabase(domain) {
  if (!domain) return null;
  const dbRecord = { id: domain.id };
  if (domain.eventType !== undefined) dbRecord.event_type = domain.eventType;
  if (domain.actorId !== undefined) dbRecord.actor_id = domain.actorId;
  if (domain.actorRole !== undefined) dbRecord.actor_role = domain.actorRole;
  if (domain.targetEntityType !== undefined) dbRecord.target_entity_type = domain.targetEntityType;
  if (domain.targetEntityId !== undefined) dbRecord.target_entity_id = domain.targetEntityId;
  if (domain.payload !== undefined) dbRecord.payload = domain.payload;
  if (domain.ipAddress !== undefined) dbRecord.ip_address = domain.ipAddress;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  return dbRecord;
}

module.exports = {
  toModerationDomain,
  toModerationDatabase,
  toAuditDomain,
  toAuditDatabase
};
