/**
 * Mapper for Sprints
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    callId: raw.call_id ?? raw.callId ?? null,
    title: raw.title || '',
    status: raw.status || 'planning',
    objectives: raw.objectives ?? [],
    participants: raw.participants ?? [],
    startedAt: raw.started_at ?? raw.startedAt ?? null,
    endedAt: raw.ended_at ?? raw.endedAt ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString()
  };
}

function toDatabase(domain) {
  if (!domain) return null;
  const dbRecord = {
    id: domain.id
  };
  if (domain.callId !== undefined) dbRecord.call_id = domain.callId;
  if (domain.title !== undefined) dbRecord.title = domain.title;
  if (domain.status !== undefined) dbRecord.status = domain.status;
  if (domain.objectives !== undefined) dbRecord.objectives = domain.objectives;
  if (domain.participants !== undefined) dbRecord.participants = domain.participants;
  if (domain.startedAt !== undefined) dbRecord.started_at = domain.startedAt;
  if (domain.endedAt !== undefined) dbRecord.ended_at = domain.endedAt;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
