/**
 * Mapper for Users
 * Translates between DB snake_case and API camelCase / safe domain representation
 */

function toDomain(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    email: raw.email || '',
    role: raw.role || 'builder',
    displayName: raw.display_name ?? raw.displayName ?? (raw.email ? raw.email.split('@')[0] : ''),
    passwordHash: raw.password_hash ?? raw.passwordHash ?? null,
    isVerified: Boolean(raw.is_verified ?? raw.isVerified),
    verificationToken: raw.verification_token ?? raw.verificationToken ?? null,
    verificationExpiresAt: raw.verification_expires_at ?? raw.verificationExpiresAt ?? null,
    verificationAttempts: raw.verification_attempts ?? raw.verificationAttempts ?? 0,
    lastVerificationSentAt: raw.last_verification_sent_at ?? raw.lastVerificationSentAt ?? null,
    resetToken: raw.reset_token ?? raw.resetToken ?? null,
    resetExpiresAt: raw.reset_expires_at ?? raw.resetExpiresAt ?? null,
    resetAttempts: raw.reset_attempts ?? raw.resetAttempts ?? 0,
    createdAt: raw.created_at ?? raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null
  };
}

function toDatabase(domain) {
  if (!domain) return null;
  const dbRecord = {
    id: domain.id
  };
  if (domain.email !== undefined) dbRecord.email = domain.email;
  if (domain.role !== undefined) dbRecord.role = domain.role;
  if (domain.displayName !== undefined) dbRecord.display_name = domain.displayName;
  if (domain.passwordHash !== undefined) dbRecord.password_hash = domain.passwordHash;
  if (domain.isVerified !== undefined) dbRecord.is_verified = domain.isVerified;
  if (domain.verificationToken !== undefined) dbRecord.verification_token = domain.verificationToken;
  if (domain.verificationExpiresAt !== undefined) dbRecord.verification_expires_at = domain.verificationExpiresAt;
  if (domain.verificationAttempts !== undefined) dbRecord.verification_attempts = domain.verificationAttempts;
  if (domain.lastVerificationSentAt !== undefined) dbRecord.last_verification_sent_at = domain.lastVerificationSentAt;
  if (domain.resetToken !== undefined) dbRecord.reset_token = domain.resetToken;
  if (domain.resetExpiresAt !== undefined) dbRecord.reset_expires_at = domain.resetExpiresAt;
  if (domain.resetAttempts !== undefined) dbRecord.reset_attempts = domain.resetAttempts;
  if (domain.createdAt !== undefined) dbRecord.created_at = domain.createdAt;
  if (domain.updatedAt !== undefined) dbRecord.updated_at = domain.updatedAt;
  return dbRecord;
}

function toSafeUser(user) {
  if (!user) return null;
  const domain = toDomain(user);
  const {
    passwordHash,
    verificationToken,
    verificationExpiresAt,
    verificationAttempts,
    resetToken,
    resetExpiresAt,
    resetAttempts,
    ...safeUser
  } = domain;
  return safeUser;
}

module.exports = { toDomain, toDatabase, toSafeUser };
