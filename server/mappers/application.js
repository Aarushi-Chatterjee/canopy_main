/**
 * Mapper for Applications
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    fullName: raw.full_name ?? raw.fullName ?? '',
    email: raw.email || '',
    role: raw.role || 'builder',
    domain: raw.domain || 'climate',
    proofOfWorkLink: raw.proof_of_work_link ?? raw.proofOfWorkLink ?? '',
    motivationNote: raw.motivation_note ?? raw.motivationNote ?? raw.cover_note ?? raw.coverNote ?? '',
    coverNote: raw.cover_note ?? raw.coverNote ?? raw.motivation_note ?? raw.motivationNote ?? '',
    status: raw.status || 'pending_review',
    reviewerNotes: raw.reviewer_notes ?? raw.reviewerNotes ?? '',
    reviewedBy: raw.reviewed_by ?? raw.reviewedBy ?? null,
    reviewedAt: raw.reviewed_at ?? raw.reviewedAt ?? null,
    callId: raw.call_id ?? raw.callId ?? null,
    builderId: raw.builder_id ?? raw.builderId ?? null,
    appliedAt: raw.applied_at ?? raw.appliedAt ?? raw.submitted_at ?? raw.submittedAt ?? raw.created_at ?? new Date().toISOString(),
    submittedAt: raw.submitted_at ?? raw.submittedAt ?? raw.applied_at ?? raw.appliedAt ?? raw.created_at ?? new Date().toISOString(),
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null
  };
}

function toDatabase(domain) {
  if (!domain) return null;
  const dbRecord = {
    id: domain.id
  };
  if (domain.fullName !== undefined) dbRecord.full_name = domain.fullName;
  if (domain.email !== undefined) dbRecord.email = domain.email;
  if (domain.role !== undefined) dbRecord.role = domain.role.toLowerCase();
  if (domain.domain !== undefined) dbRecord.domain = domain.domain.toLowerCase();
  if (domain.proofOfWorkLink !== undefined) dbRecord.proof_of_work_link = domain.proofOfWorkLink;
  if (domain.motivationNote !== undefined) dbRecord.motivation_note = domain.motivationNote;
  if (domain.coverNote !== undefined && !dbRecord.motivation_note) dbRecord.motivation_note = domain.coverNote;
  if (domain.status !== undefined) dbRecord.status = domain.status;
  if (domain.reviewerNotes !== undefined) dbRecord.reviewer_notes = domain.reviewerNotes;
  if (domain.reviewedBy !== undefined) dbRecord.reviewed_by = domain.reviewedBy;
  if (domain.reviewedAt !== undefined) dbRecord.reviewed_at = domain.reviewedAt;
  if (domain.callId !== undefined) dbRecord.call_id = domain.callId;
  if (domain.builderId !== undefined) dbRecord.builder_id = domain.builderId;
  if (domain.appliedAt !== undefined) {
    dbRecord.applied_at = domain.appliedAt;
    dbRecord.submitted_at = domain.appliedAt;
  }
  if (domain.submittedAt !== undefined) dbRecord.submitted_at = domain.submittedAt;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) dbRecord.updated_at = domain.updatedAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
