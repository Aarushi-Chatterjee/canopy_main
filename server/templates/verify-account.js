/**
 * Canopy Field Station - Account Verification Template
 * Sender: Canopy Access <access@canopy.earth>
 */

function render({ code, expiresInMinutes = 15 }) {
  const subject = `[Canopy] Your Verification Passcode: ${code}`;
  const text = [
    `Welcome to the Canopy Field Station.`,
    ``,
    `Your single-use 6-digit verification code is: ${code}`,
    ``,
    `This code will expire in ${expiresInMinutes} minutes and lock after 5 unsuccessful attempts.`,
    `If you did not request this verification, you can safely disregard this message.`,
    ``,
    `Canopy Operations — access@canopy.earth`
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 36px; background-color: #0c120c; color: #e4e7e4; border: 1px solid #1c2b1e; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.2em; color: #4ade80; text-transform: uppercase; margin-bottom: 16px;">CANOPY // FIELD STATION PASS</div>
      <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em;">Authenticate Your Field Credentials</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2; margin: 0 0 24px 0;">Enter this single-use verification code to activate your collaborator account:</p>
      <div style="background-color: #142017; border: 1px dashed #22543d; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
        <span style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.25em; color: #68d391;">${code}</span>
      </div>
      <p style="font-size: 13px; color: #718096; line-height: 1.5; margin: 0 0 24px 0;">This code expires in <strong>${expiresInMinutes} minutes</strong>. If you did not initiate this request, no action is needed.</p>
      <div style="border-top: 1px solid #1c2b1e; padding-top: 16px; font-size: 12px; color: #4a5568;">
        Canopy Platform · <a href="https://canopy.earth" style="color: #4ade80; text-decoration: none;">canopy.earth</a> · access@canopy.earth
      </div>
    </div>
  `;

  return { subject, text, html };
}

module.exports = { render };
