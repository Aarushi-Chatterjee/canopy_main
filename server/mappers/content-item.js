/**
 * Mapper for Content Studio Items
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    contentKey: raw.content_key ?? raw.contentKey ?? '',
    contentType: raw.content_type ?? raw.contentType ?? 'statement',
    page: raw.page ?? 'index',
    section: raw.section ?? 'main',
    title: raw.title || '',
    summary: raw.summary || '',
    body: raw.body || '',
    imageUrl: raw.image_url ?? raw.imageUrl ?? null,
    mediaUrl: raw.media_url ?? raw.mediaUrl ?? raw.image_url ?? raw.imageUrl ?? null,
    altText: raw.alt_text ?? raw.altText ?? null,
    linkUrl: raw.link_url ?? raw.linkUrl ?? null,
    status: raw.status || 'draft',
    visibility: raw.visibility || 'public',
    isIllustrative: Boolean(raw.is_illustrative ?? raw.isIllustrative),
    sortOrder: raw.sort_order ?? raw.sortOrder ?? 0,
    version: raw.version ?? 1,
    publishedAt: raw.published_at ?? raw.publishedAt ?? null,
    scheduledAt: raw.scheduled_at ?? raw.scheduledAt ?? null,
    expiresAt: raw.expires_at ?? raw.expiresAt ?? null,
    createdBy: raw.created_by ?? raw.createdBy ?? null,
    updatedBy: raw.updated_by ?? raw.updatedBy ?? null,
    approvedBy: raw.approved_by ?? raw.approvedBy ?? null,
    approvedAt: raw.approved_at ?? raw.approvedAt ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? new Date().toISOString()
  };
}

function toDatabase(domain) {
  if (!domain) return null;
  const dbRecord = { id: domain.id };
  if (domain.contentKey !== undefined) dbRecord.content_key = domain.contentKey;
  if (domain.contentType !== undefined) dbRecord.content_type = domain.contentType;
  if (domain.page !== undefined) dbRecord.page = domain.page;
  if (domain.section !== undefined) dbRecord.section = domain.section;
  if (domain.title !== undefined) dbRecord.title = domain.title;
  if (domain.summary !== undefined) dbRecord.summary = domain.summary;
  if (domain.body !== undefined) dbRecord.body = domain.body;
  if (domain.imageUrl !== undefined) dbRecord.image_url = domain.imageUrl;
  if (domain.mediaUrl !== undefined) dbRecord.media_url = domain.mediaUrl;
  if (domain.altText !== undefined) dbRecord.alt_text = domain.altText;
  if (domain.linkUrl !== undefined) dbRecord.link_url = domain.linkUrl;
  if (domain.status !== undefined) dbRecord.status = domain.status;
  if (domain.visibility !== undefined) dbRecord.visibility = domain.visibility;
  if (domain.isIllustrative !== undefined) dbRecord.is_illustrative = domain.isIllustrative;
  if (domain.sortOrder !== undefined) dbRecord.sort_order = domain.sortOrder;
  if (domain.version !== undefined) dbRecord.version = domain.version;
  if (domain.publishedAt !== undefined) dbRecord.published_at = domain.publishedAt;
  if (domain.scheduledAt !== undefined) dbRecord.scheduled_at = domain.scheduledAt;
  if (domain.expiresAt !== undefined) dbRecord.expires_at = domain.expiresAt;
  if (domain.createdBy !== undefined) dbRecord.created_by = domain.createdBy;
  if (domain.updatedBy !== undefined) dbRecord.updated_by = domain.updatedBy;
  if (domain.approvedBy !== undefined) dbRecord.approved_by = domain.approvedBy;
  if (domain.approvedAt !== undefined) dbRecord.approved_at = domain.approvedAt;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) dbRecord.updated_at = domain.updatedAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
