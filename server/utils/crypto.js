const crypto = require('crypto');

/**
 * Canopy Cryptographic Utilities Module
 * Encapsulates password hashing, OTP verification, and constant-time comparisons.
 */

// Cryptographic Salted Hashing (scrypt)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derivedKey, 'hex'));
}

// Cryptographic Token Hashing (SHA-256 for OTP & Password Reset codes - SEC-01)
function hashToken(token) {
  if (!token) return null;
  return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
}

function verifyTokenHash(candidate, storedValue) {
  if (!candidate || !storedValue) return false;
  const candidateStr = String(candidate).trim();
  const storedStr = String(storedValue).trim();

  // If stored as 64-char SHA-256 hex hash
  if (storedStr.length === 64 && /^[0-9a-fA-F]+$/.test(storedStr)) {
    const candidateHash = hashToken(candidateStr);
    try {
      return crypto.timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(storedStr, 'hex'));
    } catch (_) {
      return false;
    }
  }

  // Graceful fallback for legacy plaintext fixtures (dev/test backward compatibility)
  return candidateStr === storedStr;
}

// Constant-time key comparison to prevent character-by-character timing side-channel attacks (SEC-02, CWE-208)
function timingSafeMatch(candidate, expected) {
  if (!candidate || !expected || typeof candidate !== 'string' || typeof expected !== 'string') {
    return false;
  }
  const h1 = crypto.createHash('sha256').update(candidate).digest();
  const h2 = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(h1, h2);
}

// Generate secure numeric OTP
function generateNumericOtp(digits = 6) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

module.exports = {
  hashPassword,
  verifyPassword,
  hashToken,
  verifyTokenHash,
  timingSafeMatch,
  generateNumericOtp
};
