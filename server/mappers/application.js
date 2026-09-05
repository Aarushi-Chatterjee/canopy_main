/**
 * Mapper for Applications
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    callId: raw.call_id ?? raw.callId ?? null,
    builderId: raw.builder_id ?? raw.builderId ?? null,
    status: raw.status || 'pending',
    coverNote: raw.cover_note ?? raw.coverNote ?? '',
    appliedAt: raw.applied_at ?? raw.appliedAt ?? raw.created_at ?? new Date().toISOString(),
    reviewedAt: raw.reviewed_at ?? raw.reviewedAt ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString()
  };
}

function toDatabase(domain) {
  if (!domain) return null;
  const dbRecord = {
    id: domain.id
  };
  if (domain.callId !== undefined) dbRecord.call_id = domain.callId;
  if (domain.builderId !== undefined) dbRecord.builder_id = domain.builderId;
  if (domain.status !== undefined) dbRecord.status = domain.status;
  if (domain.coverNote !== undefined) dbRecord.cover_note = domain.coverNote;
  if (domain.appliedAt !== undefined) dbRecord.applied_at = domain.appliedAt;
  if (domain.reviewedAt !== undefined) dbRecord.reviewed_at = domain.reviewedAt;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
