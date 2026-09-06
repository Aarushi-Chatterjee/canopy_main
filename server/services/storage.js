const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { supabase, isConfigured } = require('../config/supabase');

// Magic Byte Signatures
const SIGNATURES = {
  PNG: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
  JPEG: [0xFF, 0xD8, 0xFF],
  GIF: [0x47, 0x49, 0x46, 0x38],
  WEBP_RIFF: [0x52, 0x49, 0x46, 0x46],
  WEBP_WEBP: [0x57, 0x45, 0x42, 0x50]
};

function matchesBytes(buffer, signature, offset = 0) {
  if (buffer.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) return false;
  }
  return true;
}

function detectMimeType(buffer) {
  if (matchesBytes(buffer, SIGNATURES.PNG)) return 'image/png';
  if (matchesBytes(buffer, SIGNATURES.JPEG)) return 'image/jpeg';
  if (matchesBytes(buffer, SIGNATURES.GIF)) return 'image/gif';
  if (matchesBytes(buffer, SIGNATURES.WEBP_RIFF, 0) && matchesBytes(buffer, SIGNATURES.WEBP_WEBP, 8)) {
    return 'image/webp';
  }
  
  // Safe SVG inspection
  const head = buffer.slice(0, 1024).toString('utf-8').trim().toLowerCase();
  if (head.includes('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) {
    // Prevent XSS script injection in SVG
    if (head.includes('<script') || head.includes('javascript:') || head.includes('onerror=') || head.includes('onload=')) {
      return null; // Malicious payload detected
    }
    return 'image/svg+xml';
  }

  return null;
}

const storageService = {
  /**
   * Validate file buffer, check magic-bytes, and store in durable object storage
   */
  async uploadMedia({ fileName, mimeType, base64Data, userId = 'system' }) {
    if (!base64Data) {
      throw new Error('No media buffer provided for upload.');
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // 1. File size limit: 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      const err = new Error('File exceeds maximum allowable size limit (5MB).');
      err.statusCode = 400;
      throw err;
    }

    // 2. Deep Magic-Byte Inspection (P1-6)
    const detectedMime = detectMimeType(buffer);
    if (!detectedMime) {
      const err = new Error('File validation failed: Magic byte signature does not match an allowed image format (PNG, JPEG, WebP, SVG). Disguised executables or script payloads are prohibited.');
      err.statusCode = 400;
      throw err;
    }

    // 3. Sanitize file name
    const ext = detectedMime === 'image/png' ? '.png'
      : detectedMime === 'image/jpeg' ? '.jpg'
      : detectedMime === 'image/webp' ? '.webp'
      : detectedMime === 'image/svg+xml' ? '.svg'
      : path.extname(fileName || '').toLowerCase() || '.bin';

    const cleanBaseName = path.basename(fileName || 'asset', path.extname(fileName || ''))
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 32);

    const storageKey = `content/${Date.now()}_${cleanBaseName}${ext}`;

    // 4. Production Storage: Supabase Object Storage Bucket 'canopy-media'
    if (process.env.NODE_ENV === 'production' || isConfigured()) {
      if (supabase) {
        try {
          const { data, error } = await supabase.storage
            .from('canopy-media')
            .upload(storageKey, buffer, {
              contentType: detectedMime,
              upsert: true
            });

          if (!error && data?.path) {
            const { data: publicUrlData } = supabase.storage
              .from('canopy-media')
              .getPublicUrl(data.path);

            return {
              url: publicUrlData?.publicUrl || `/storage/v1/object/public/canopy-media/${data.path}`,
              storageKey: data.path,
              mimeType: detectedMime,
              sizeBytes: buffer.length,
              storageProvider: 'supabase_storage'
            };
          }
        } catch (storageErr) {
          if (process.env.NODE_ENV === 'production') {
            const err = new Error(`Failed to persist file in Supabase object storage: ${storageErr.message}`);
            err.statusCode = 503;
            throw err;
          }
        }
      }
    }

    // 5. Development/Test Fallback Storage
    const localUploadsDir = path.join(__dirname, '../../public/uploads/content');
    try {
      if (!fs.existsSync(localUploadsDir)) {
        fs.mkdirSync(localUploadsDir, { recursive: true });
      }
      const localFilePath = path.join(localUploadsDir, path.basename(storageKey));
      fs.writeFileSync(localFilePath, buffer);
    } catch (e) {
      // Ephemeral fallback
    }

    return {
      url: `/uploads/content/${path.basename(storageKey)}`,
      storageKey,
      mimeType: detectedMime,
      sizeBytes: buffer.length,
      storageProvider: 'local'
    };
  }
};

module.exports = storageService;
