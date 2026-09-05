/**
 * Mapper for Field Notebook Entries
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    userId: raw.user_id ?? raw.userId ?? null,
    title: raw.title || '',
    content: raw.content || '',
    tags: raw.tags ?? [],
    isPublic: raw.is_public ?? raw.isPublic ?? false,
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
  if (domain.title !== undefined) dbRecord.title = domain.title;
  if (domain.content !== undefined) dbRecord.content = domain.content;
  if (domain.tags !== undefined) dbRecord.tags = domain.tags;
  if (domain.isPublic !== undefined) dbRecord.is_public = domain.isPublic;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) dbRecord.updated_at = domain.updatedAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
