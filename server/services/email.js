/**
 * Canopy Email Dispatch Service
 * Handles transactional emails across founder operations, access, matching, and moderation.
 * 
 * Supports providers:
 * - 'test': Stores messages in an isolated in-memory FIFO queue for test assertions.
 * - 'console': Outputs formatted email previews to stdout (default for development).
 * - 'resend': Dispatches via Resend REST API if RESEND_API_KEY is configured.
 */

const https = require('https');
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  // Graceful fallback if nodemailer is not installed
}

// Cached SMTP transporter
let smtpTransporter = null;
function getSmtpTransporter() {
  if (!smtpTransporter && nodemailer) {
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const rawUser = process.env.SMTP_USER || '';
    const user = rawUser.replace(/^["']|["']$/g, '').trim();
    const rawPass = process.env.SMTP_PASS || '';
    // Gmail app passwords can be copied with spaces (e.g. 4x4) or surrounded with quotes
    const pass = rawPass.replace(/^["']|["']$/g, '').replace(/\s+/g, '');

    if (user && pass) {
      smtpTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass }
      });
    }
  }
  return smtpTransporter;
}

// Import branded templates
const verifyAccountTemplate = require('../templates/verify-account');
const passwordResetTemplate = require('../templates/password-reset');
const appReceivedTemplate = require('../templates/application-received');
const appDecisionTemplate = require('../templates/application-decision');
const buildCallReviewTemplate = require('../templates/build-call-review');
const matchRequestTemplate = require('../templates/match-request');
const curatorIntroTemplate = require('../templates/curator-introduction');
const sprintInviteTemplate = require('../templates/sprint-invitation');

// In-memory inbox for test assertions
const testInbox = [];

/**
 * Sender Address Matrix
 */
const defaultFrom = process.env.MAIL_FROM || 'Canopy Dispatch <hello@canopy.earth>';
const SENDERS = {
  DEFAULT: defaultFrom,
  ACCESS: process.env.MAIL_FROM_ACCESS || (process.env.MAIL_FROM ? process.env.MAIL_FROM : 'Canopy Access <access@canopy.earth>'),
  HELLO: process.env.MAIL_FROM_HELLO || (process.env.MAIL_FROM ? process.env.MAIL_FROM : 'Canopy Dispatch <hello@canopy.earth>'),
  SUPPORT: process.env.MAIL_FROM_SUPPORT || (process.env.MAIL_FROM ? process.env.MAIL_FROM : 'Canopy Operations <support@canopy.earth>'),
  PRIVACY: process.env.MAIL_FROM_PRIVACY || (process.env.MAIL_FROM ? process.env.MAIL_FROM : 'Canopy Privacy <privacy@canopy.earth>')
};

/**
 * Retrieve active email provider name
 */
function getProvider() {
  if (process.env.NODE_ENV === 'test' || process.env.EMAIL_PROVIDER === 'test') {
    return 'test';
  }
  if (process.env.EMAIL_PROVIDER) {
    return process.env.EMAIL_PROVIDER.toLowerCase();
  }
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return 'smtp';
  }
  if (process.env.RESEND_API_KEY) {
    return 'resend';
  }
  return 'console';
}

/**
 * Core sendEmail dispatcher
 */
async function sendEmail({ to, subject, text, html, from = SENDERS.DEFAULT, metadata = {} }) {
  if (!to || typeof to !== 'string' || !to.includes('@')) {
    throw new Error('Invalid recipient email address.');
  }

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
    return new Promise((resolve) => {
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

  if (provider === 'smtp') {
    const transporter = getSmtpTransporter();
    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from,
          to,
          subject,
          text,
          html: html || text
        });
        return { success: true, messageId: info.messageId || message.id, provider: 'smtp' };
      } catch (err) {
        console.error('[EMAIL:SMTP:ERROR]', err.message);
        return { success: false, error: err.message, provider: 'smtp' };
      }
    } else {
      console.warn('[EMAIL:SMTP:WARN] SMTP credentials missing in environment. Falling back to console dispatch.');
    }
  }

  // Console provider (default development fallback)
  console.log('----------------------------------------------------');
  console.log(`[CANOPY DISPATCH] From: ${from} | To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Time: ${timestamp}`);
  console.log('Body:');
  console.log(text);
  console.log('----------------------------------------------------');

  return { success: true, messageId: message.id, provider: 'console' };
}

// -------------------------------------------------------------
// Transactional Methods using Branded Templates
// -------------------------------------------------------------

async function sendVerificationCode(email, code) {
  const { subject, text, html } = verifyAccountTemplate.render({ code });
  return sendEmail({
    to: email,
    subject,
    text,
    html,
    from: SENDERS.ACCESS,
    metadata: { 
      type: 'verification',
      ...(process.env.NODE_ENV === 'test' || getProvider() === 'test' ? { code } : {})
    }
  });
}

async function sendPasswordResetCode(email, code) {
  const { subject, text, html } = passwordResetTemplate.render({ code });
  return sendEmail({
    to: email,
    subject,
    text,
    html,
    from: SENDERS.ACCESS,
    metadata: { 
      type: 'password_reset',
      ...(process.env.NODE_ENV === 'test' || getProvider() === 'test' ? { code } : {})
    }
  });
}

async function sendApplicationReceipt({ email, applicantName, role, domain, applicationId }) {
  const { subject, text, html } = appReceivedTemplate.render({ applicantName, role, domain, applicationId });
  return sendEmail({
    to: email,
    subject,
    text,
    html,
    from: SENDERS.HELLO,
    metadata: { type: 'application_receipt', applicationId }
  });
}

async function sendApplicationDecision({ email, applicantName, role, status, note }) {
  const { subject, text, html } = appDecisionTemplate.render({ applicantName, role, status, note });
  return sendEmail({
    to: email,
    subject,
    text,
    html,
    from: SENDERS.ACCESS,
    metadata: { type: 'application_decision', status, note }
  });
}

async function sendBuildCallReviewUpdate({ email, title, status, decisionNote }) {
  const { subject, text, html } = buildCallReviewTemplate.render({ title, status, decisionNote });
  return sendEmail({
    to: email,
    subject,
    text,
    html,
    from: SENDERS.HELLO,
    metadata: { type: 'build_call_review', status, title }
  });
}

async function sendMatchRequest({ email, recipientName, senderName, intentNote, callTitle }) {
  const { subject, text, html } = matchRequestTemplate.render({ recipientName, senderName, intentNote, callTitle });
  return sendEmail({
    to: email,
    subject,
    text,
    html,
    from: SENDERS.HELLO,
    metadata: { type: 'match_request', senderName, intentNote }
  });
}

async function sendCuratorIntroduction({ requesterName, requesterEmail, recipientName, recipientEmail, sprintTopic, contextNotes }) {
  const { subject, text, html } = curatorIntroTemplate.render({
    requesterName,
    requesterEmail,
    recipientName,
    recipientEmail,
    sprintTopic,
    contextNotes
  });
  return sendEmail({
    to: recipientEmail,
    subject,
    text,
    html,
    from: SENDERS.HELLO,
    metadata: { type: 'curator_intro', requesterEmail, recipientEmail }
  });
}

async function sendSprintInvitation({ email, inviteeName, sprintTitle, role, domain }) {
  const { subject, text, html } = sprintInviteTemplate.render({ inviteeName, sprintTitle, role, domain });
  return sendEmail({
    to: email,
    subject,
    text,
    html,
    from: SENDERS.HELLO,
    metadata: { type: 'sprint_invitation', sprintTitle }
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
  SENDERS,
  sendEmail,
  sendVerificationCode,
  sendPasswordResetCode,
  sendApplicationReceipt,
  sendApplicationDecision,
  sendBuildCallReviewUpdate,
  sendMatchRequest,
  sendCuratorIntroduction,
  sendSprintInvitation,
  getTestInbox,
  clearTestInbox,
  getLatestEmail
};
