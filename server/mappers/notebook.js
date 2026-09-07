/**
 * Mapper for Field Notebook Entries
 * Translates between DB snake_case and API camelCase
 */

function toDomain(raw) {
  if (!raw) return null;
  const authorId = raw.author_id ?? raw.authorId ?? raw.user_id ?? raw.userId ?? null;

  return {
    id: raw.id,
    authorId,
    userId: authorId,
    authorName: raw.author_name ?? raw.authorName ?? 'Field Contributor',
    sprintId: raw.sprint_id ?? raw.sprintId ?? null,
    parentEntryId: raw.parent_entry_id ?? raw.parentEntryId ?? null,
    grownFromLabel: raw.grown_from_label ?? raw.grownFromLabel ?? 'Independent Field Note',
    title: raw.title || '',
    content: raw.content || raw.body_markdown || raw.bodyMarkdown || '',
    bodyMarkdown: raw.body_markdown ?? raw.bodyMarkdown ?? raw.content ?? '',
    summarySnippet: raw.summary_snippet ?? raw.summarySnippet ?? raw.teaser ?? (raw.content ? raw.content.slice(0, 140) : ''),
    teaser: raw.teaser ?? raw.summary_snippet ?? raw.summarySnippet ?? '',
    domain: raw.domain || 'climate',
    entryType: raw.entry_type ?? raw.entryType ?? 'field-report',
    tags: raw.tags ?? [],
    branches: raw.branches ?? [],
    moderationStatus: raw.moderation_status ?? raw.moderationStatus ?? 'approved',
    isPublic: Boolean(raw.is_public ?? raw.isPublic ?? (raw.moderation_status === 'approved')),
    isIllustrative: Boolean(raw.is_illustrative ?? raw.isIllustrative ?? false),
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null
  };
}

function toDatabase(domain) {
  if (!domain) return null;
  const authorId = domain.authorId || domain.userId;
  const content = domain.bodyMarkdown || domain.content || '';

  const dbRecord = {
    id: domain.id
  };
  if (authorId !== undefined) {
    dbRecord.author_id = authorId;
  }
  if (domain.authorName !== undefined) dbRecord.author_name = domain.authorName;
  if (domain.sprintId !== undefined) dbRecord.sprint_id = domain.sprintId;
  if (domain.parentEntryId !== undefined) dbRecord.parent_entry_id = domain.parentEntryId;
  if (domain.grownFromLabel !== undefined) dbRecord.grown_from_label = domain.grownFromLabel;
  if (domain.title !== undefined) dbRecord.title = domain.title;
  if (domain.domain !== undefined) dbRecord.domain = domain.domain.toLowerCase();
  if (domain.entryType !== undefined) dbRecord.entry_type = domain.entryType.toLowerCase();
  if (domain.summarySnippet !== undefined || domain.teaser !== undefined) {
    dbRecord.summary_snippet = domain.summarySnippet || domain.teaser || (content ? content.slice(0, 140) : '');
  }
  if (domain.bodyMarkdown !== undefined || domain.content !== undefined) {
    dbRecord.body_markdown = content;
  }
  if (domain.teaser !== undefined) dbRecord.teaser = domain.teaser;
  if (domain.tags !== undefined) dbRecord.tags = domain.tags;
  if (domain.branches !== undefined) dbRecord.branches = domain.branches;
  if (domain.moderationStatus !== undefined) dbRecord.moderation_status = domain.moderationStatus;
  if (domain.isIllustrative !== undefined) dbRecord.is_illustrative = domain.isIllustrative;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) dbRecord.updated_at = domain.updatedAt;
  return dbRecord;
}

module.exports = { toDomain, toDatabase };
