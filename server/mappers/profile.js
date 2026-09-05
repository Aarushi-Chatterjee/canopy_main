/**
 * Mapper for Profiles
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    userId: raw.user_id ?? raw.userId ?? null,
    displayName: raw.display_name ?? raw.displayName ?? '',
    headline: raw.headline || '',
    bio: raw.bio || '',
    primaryDomain: raw.primary_domain ?? raw.primaryDomain ?? 'climate',
    skillTags: raw.skill_tags ?? raw.skillTags ?? [],
    avatarUrl: raw.avatar_url ?? raw.avatarUrl ?? '/avatars/avatar-builders.png',
    hoursPerWeek: raw.hours_per_week ?? raw.hoursPerWeek ?? 10,
    proofOfWork: raw.proof_of_work ?? raw.proofOfWork ?? [],
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null
  };
}

function toDatabase(domain) {
  if (!domain) return null;
  const dbRecord = {
    id: domain.id
  };
  if (domain.userId !== undefined) dbRecord.user_id = domain.userId;
  if (domain.displayName !== undefined) dbRecord.display_name = domain.displayName;
  if (domain.headline !== undefined) dbRecord.headline = domain.headline;
  if (domain.bio !== undefined) dbRecord.bio = domain.bio;
  if (domain.primaryDomain !== undefined) dbRecord.primary_domain = domain.primaryDomain;
  if (domain.skillTags !== undefined) dbRecord.skill_tags = domain.skillTags;
  if (domain.avatarUrl !== undefined) dbRecord.avatar_url = domain.avatarUrl;
  if (domain.hoursPerWeek !== undefined) dbRecord.hours_per_week = domain.hoursPerWeek;
  if (domain.proofOfWork !== undefined) dbRecord.proof_of_work = domain.proofOfWork;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) dbRecord.updated_at = domain.updatedAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
