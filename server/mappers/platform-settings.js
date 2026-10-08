/**
 * Mapper for Platform Settings
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  return {
    key: raw.key,
    value: raw.value ?? {},
    description: raw.description || '',
    updatedBy: raw.updated_by ?? raw.updatedBy ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? new Date().toISOString()
  };
}

function toDatabase(domain) {
  if (!domain) return null;
  const dbRecord = {
    key: domain.key
  };
  if (domain.value !== undefined) dbRecord.value = domain.value;
  if (domain.description !== undefined) dbRecord.description = domain.description;
  if (domain.updatedBy !== undefined) dbRecord.updated_by = domain.updatedBy;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) dbRecord.updated_at = domain.updatedAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
