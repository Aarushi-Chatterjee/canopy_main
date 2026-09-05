/**
 * Canopy Field Station - Password Reset Template
 * Sender: Canopy Access <access@canopy.earth>
 */

function render({ code, expiresInMinutes = 15 }) {
  const subject = `[Canopy] Passcode Reset Request: ${code}`;
  const text = [
    `Canopy Field Station — Credential Reset`,
    ``,
    `We received a request to update your Field Station Pass credentials.`,
    `Your single-use passcode reset code is: ${code}`,
    ``,
    `This code will expire in ${expiresInMinutes} minutes.`,
    `If you did not request this update, please contact access@canopy.earth immediately.`
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 36px; background-color: #0c120c; color: #e4e7e4; border: 1px solid #1c2b1e; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.2em; color: #ecc94b; text-transform: uppercase; margin-bottom: 16px;">CANOPY // CREDENTIAL RESET</div>
      <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em;">Reset Field Passcode</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2; margin: 0 0 24px 0;">Enter this authorization code to set a new password for your account:</p>
      <div style="background-color: #1c1c14; border: 1px dashed #744210; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
        <span style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.25em; color: #f6e05e;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #718096; line-height: 1.5; margin: 0 0 24px 0;">Valid for <strong>${expiresInMinutes} minutes</strong>. If you did not make this request, your account remains secure.</p>
      <div style="border-top: 1px solid #1c2b1e; padding-top: 16px; font-size: 12px; color: #4a5568;">
        Canopy Platform · <a href="https://canopy.earth" style="color: #4ade80; text-decoration: none;">canopy.earth</a> · access@canopy.earth
      </div>
    </div>
  `;

  return { subject, text, html };
}

module.exports = { render };
