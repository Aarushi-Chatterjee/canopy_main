/**
 * Mapper for Matches
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  const requesterId = raw.requester_id ?? raw.requesterId ?? raw.user_id ?? raw.userId ?? null;
  const recipientId = raw.recipient_id ?? raw.recipientId ?? raw.match_user_id ?? raw.matchUserId ?? null;
  const callId = raw.build_call_id ?? raw.buildCallId ?? raw.call_id ?? raw.callId ?? null;

  return {
    id: raw.id,
    requesterId,
    recipientId,
    userId: requesterId,
    matchUserId: recipientId,
    buildCallId: callId,
    callId,
    intentNote: raw.intent_note ?? raw.intentNote ?? raw.match_metadata?.intentNote ?? '',
    proposedRole: raw.proposed_role ?? raw.proposedRole ?? raw.match_metadata?.proposedRole ?? 'Collaborator',
    status: raw.status || 'pending',
    stage: raw.stage ?? (raw.status === 'connected' ? 'introduced' : 'proposed'),
    assignedCuratorId: raw.assigned_curator_id ?? raw.assignedCuratorId ?? null,
    curatorNotes: raw.curator_notes ?? raw.curatorNotes ?? '',
    internalFitScore: raw.internal_fit_score ?? raw.internalFitScore ?? raw.score ?? 85,
    score: raw.score ?? raw.internal_fit_score ?? 85,
    mutualConsent: Boolean(raw.mutual_consent ?? raw.mutualConsent),
    revealedContact: raw.revealed_contact ?? raw.revealedContact ?? raw.match_metadata?.revealedContact ?? null,
    matchMetadata: raw.match_metadata ?? raw.matchMetadata ?? {
      intentNote: raw.intent_note || '',
      proposedRole: raw.proposed_role || 'Collaborator',
      revealedContact: raw.revealed_contact || null
    },
    recipientConsentAt: raw.recipient_consent_at ?? raw.recipientConsentAt ?? null,
    requesterConsentAt: raw.requester_consent_at ?? raw.requesterConsentAt ?? null,
    contactReleasedAt: raw.contact_released_at ?? raw.contactReleasedAt ?? null,
    contactReleasedBy: raw.contact_released_by ?? raw.contactReleasedBy ?? null,
    introductionSentAt: raw.introduction_sent_at ?? raw.introductionSentAt ?? null,
    expiresAt: raw.expires_at ?? raw.expiresAt ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null
  };
}

function toDatabase(domain) {
  if (!domain) return null;
  const requesterId = domain.requesterId || domain.userId;
  const recipientId = domain.recipientId || domain.matchUserId;
  const buildCallId = domain.buildCallId || domain.callId;

  const dbRecord = {
    id: domain.id
  };
  if (requesterId !== undefined) {
    dbRecord.requester_id = requesterId;
  }
  if (recipientId !== undefined) {
    dbRecord.recipient_id = recipientId;
  }
  if (buildCallId !== undefined) {
    dbRecord.build_call_id = buildCallId;
  }
  if (domain.intentNote !== undefined || domain.matchMetadata?.intentNote !== undefined) {
    dbRecord.intent_note = domain.intentNote || domain.matchMetadata?.intentNote || '';
  }
  if (domain.proposedRole !== undefined || domain.matchMetadata?.proposedRole !== undefined) {
    dbRecord.proposed_role = domain.proposedRole || domain.matchMetadata?.proposedRole || 'Collaborator';
  }
  if (domain.status !== undefined) dbRecord.status = domain.status;
  if (domain.revealedContact !== undefined || domain.matchMetadata?.revealedContact !== undefined) {
    dbRecord.revealed_contact = domain.revealedContact || domain.matchMetadata?.revealedContact || null;
  }
  if (domain.assignedCuratorId !== undefined) dbRecord.assigned_curator_id = domain.assignedCuratorId;
  if (domain.curatorNotes !== undefined) dbRecord.curator_notes = domain.curatorNotes;
  if (domain.internalFitScore !== undefined || domain.score !== undefined) {
    dbRecord.internal_fit_score = domain.internalFitScore || domain.score || 85;
  }
  if (domain.recipientConsentAt !== undefined) dbRecord.recipient_consent_at = domain.recipientConsentAt;
  if (domain.requesterConsentAt !== undefined) dbRecord.requester_consent_at = domain.requesterConsentAt;
  if (domain.contactReleasedAt !== undefined) dbRecord.contact_released_at = domain.contactReleasedAt;
  if (domain.contactReleasedBy !== undefined) dbRecord.contact_released_by = domain.contactReleasedBy;
  if (domain.introductionSentAt !== undefined) dbRecord.introduction_sent_at = domain.introductionSentAt;
  if (domain.expiresAt !== undefined) dbRecord.expires_at = domain.expiresAt;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) dbRecord.updated_at = domain.updatedAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
