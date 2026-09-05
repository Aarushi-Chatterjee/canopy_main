/**
 * Canopy Email Dispatch Service
 * Handles transactional emails (verification OTPs, password resets, application notifications, match alerts).
 * 
 * Supports providers:
 * - 'test': Stores messages in an isolated in-memory FIFO queue for test assertions.
 * - 'console': Outputs formatted email previews to stdout (default for development).
 * - 'resend': Dispatches via Resend REST API if RESEND_API_KEY is configured.
 */

const https = require('https');

// In-memory inbox for test assertions
const testInbox = [];

/**
 * Retrieve the active provider name
 */
function getProvider() {
  if (process.env.NODE_ENV === 'test' || process.env.EMAIL_PROVIDER === 'test') {
    return 'test';
  }
  return process.env.EMAIL_PROVIDER || 'console';
}

/**
 * Send an email message
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Subject line
 * @param {string} options.text - Plaintext body
 * @param {string} [options.html] - HTML formatted body
 * @param {Object} [options.metadata] - Extra context (e.g. otp, template, etc.)
 */
async function sendEmail({ to, subject, text, html, metadata = {} }) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new Error('Invalid recipient email address.');
  }

  const from = process.env.EMAIL_FROM || 'Canopy Dispatch <noreply@canopy.earth>';
  const provider = getProvider();
  const timestamp = new Date().toISOString();

  const message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    from,
    to,
    subject,
    text,
    html: html || text,
    metadata,
    sentAt: timestamp,
    provider
  };

  if (provider === 'test') {
    testInbox.push(message);
    return { success: true, messageId: message.id, provider: 'test' };
  }

  if (provider === 'resend' && process.env.RESEND_API_KEY) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: html || text
      });

      const req = https.request(
        {
          hostname: 'api.resend.com',
          port: 443,
          path: '/emails',
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload)
          }
        },
        (res) => {
          let responseData = '';
          res.on('data', (chunk) => { responseData += chunk; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, messageId: message.id, provider: 'resend', data: responseData });
            } else {
              console.error(`[EMAIL:RESEND:ERROR] Status ${res.statusCode}:`, responseData);
              // In dev fallback to console
              resolve({ success: false, error: responseData, provider: 'resend' });
            }
          });
        }
      );

      req.on('error', (err) => {
        console.error('[EMAIL:RESEND:CONN_ERROR]', err.message);
        resolve({ success: false, error: err.message, provider: 'resend' });
      });

      req.write(payload);
      req.end();
    });
  }

  // Console provider (default development fallback)
  console.log('----------------------------------------------------');
  console.log(`[CANOPY DISPATCH] Email to: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Time: ${timestamp}`);
  console.log('Body:');
  console.log(text);
  console.log('----------------------------------------------------');

  return { success: true, messageId: message.id, provider: 'console' };
}

/**
 * Send 6-digit verification code for new user registration or email verification
 */
async function sendVerificationCode(email, code) {
  const subject = `[Canopy] Your Verification Code: ${code}`;
  const text = [
    `Welcome to the Canopy Field Station.`,
    ``,
    `Your single-use 6-digit verification code is: ${code}`,
    ``,
    `This code will expire in 15 minutes.`,
    `If you did not request this code, you can safely disregard this message.`
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background-color: #0c120c; color: #e4e7e4; border: 1px solid #1c2b1e; border-radius: 12px;">
      <h2 style="color: #4ade80; margin-top: 0; font-size: 20px; letter-spacing: -0.02em;">CANOPY // FIELD STATION</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2;">Welcome to the Canopy Field Station. Enter this single-use verification code to authenticate your field credentials:</p>
      <div style="background-color: #142017; border: 1px dashed #22543d; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.25em; color: #68d391;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #718096; line-height: 1.5;">This code expires in <strong>15 minutes</strong> and will lock after 5 unsuccessful attempts. If you did not request this, ignore this email.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
    metadata: { type: 'verification', code }
  });
}

/**
 * Send password reset code
 */
async function sendPasswordResetCode(email, code) {
  const subject = `[Canopy] Password Reset Request: ${code}`;
  const text = [
    `Canopy Field Station - Password Reset`,
    ``,
    `A password reset was requested for your account.`,
    `Your reset verification code is: ${code}`,
    ``,
    `This code will expire in 15 minutes.`,
    `If you did not request a password reset, please secure your account immediately.`
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background-color: #0c120c; color: #e4e7e4; border: 1px solid #1c2b1e; border-radius: 12px;">
      <h2 style="color: #ecc94b; margin-top: 0; font-size: 20px; letter-spacing: -0.02em;">CANOPY // CREDENTIAL RESET</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2;">We received a request to reset your Canopy Field Station pass credentials. Enter the single-use authorization code below:</p>
      <div style="background-color: #1c1c14; border: 1px dashed #744210; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 0.25em; color: #f6e05e;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #718096; line-height: 1.5;">This code is valid for <strong>15 minutes</strong>. If you did not make this request, you can disregard this email.</p>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    text,
    html,
    metadata: { type: 'password_reset', code }
  });
}

/**
 * Send application status notification
 */
async function sendApplicationStatus(email, status, callTitle) {
  const subject = `[Canopy] Application Update: ${callTitle}`;
  const text = `Your application for "${callTitle}" has been updated to: ${status}.`;
  return sendEmail({
    to: email,
    subject,
    text,
    metadata: { type: 'application_status', status, callTitle }
  });
}

/**
 * Send match alert notification
 */
async function sendMatchRequest(email, partnerName, sprintTopic) {
  const subject = `[Canopy] New Sprint Match Invitation: ${sprintTopic}`;
  const text = `${partnerName} invited you to join a sprint on "${sprintTopic}".`;
  return sendEmail({
    to: email,
    subject,
    text,
    metadata: { type: 'match_request', partnerName, sprintTopic }
  });
}

// -------------------------------------------------------------
// Test Suite Utilities
// -------------------------------------------------------------

function getTestInbox() {
  return [...testInbox];
}

function clearTestInbox() {
  testInbox.length = 0;
}

function getLatestEmail(to) {
  const matches = to ? testInbox.filter((m) => m.to.toLowerCase() === to.toLowerCase()) : testInbox;
  return matches.length ? matches[matches.length - 1] : null;
}

module.exports = {
  sendEmail,
  sendVerificationCode,
  sendPasswordResetCode,
  sendApplicationStatus,
  sendMatchRequest,
  getTestInbox,
  clearTestInbox,
  getLatestEmail
};
