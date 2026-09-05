/**
 * Canopy Field Station - New Match Inquiry
 * Sender: Canopy <hello@canopy.earth>
 */

function render({ recipientName, senderName, intentNote, callTitle }) {
  const subject = `[Canopy] New Collaboration Inquiry from ${senderName || 'a fellow builder'}`;

  const text = [
    `Hello ${recipientName || 'Collaborator'},`,
    ``,
    `${senderName || 'A peer'} initiated a high-context collaboration handshake on Canopy${callTitle ? ` regarding "${callTitle}"` : ''}.`,
    ``,
    `Written Intent Note:`,
    `"${intentNote}"`,
    ``,
    `To review their credentials and accept or decline the handshake, sign in to your Canopy Match Sandbox:`,
    `https://canopy.earth/match.html`,
    ``,
    `Direct contact information remains private until you choose to accept.`,
    ``,
    `Canopy Operations — hello@canopy.earth`
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 36px; background-color: #0c120c; color: #e4e7e4; border: 1px solid #1c2b1e; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.2em; color: #4ade80; text-transform: uppercase; margin-bottom: 16px;">CANOPY // MATCH INQUIRY</div>
      <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em;">New Peer Collaboration Request</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2; margin: 0 0 20px 0;">Hello ${recipientName || 'Collaborator'},</p>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2; margin: 0 0 24px 0;"><strong>${senderName}</strong> sent you a collaboration inquiry${callTitle ? ` for the challenge <em>"${callTitle}"</em>` : ''}:</p>
      <div style="background-color: #142017; border-left: 3px solid #4ade80; padding: 18px; margin: 0 0 24px 0; border-radius: 0 6px 6px 0; font-style: italic; color: #e4e7e4; line-height: 1.6;">
        "${intentNote}"
      </div>
      <p style="font-size: 13px; color: #718096; line-height: 1.5; margin: 0 0 24px 0;">🔒 Privacy Protection: Your direct email is withheld until you accept the handshake.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://canopy.earth/match.html" style="background-color: #22543d; color: #68d391; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Review Handshake in Sandbox →</a>
      </div>
      <div style="border-top: 1px solid #1c2b1e; padding-top: 16px; font-size: 12px; color: #4a5568;">
        Canopy Platform · <a href="https://canopy.earth" style="color: #4ade80; text-decoration: none;">canopy.earth</a> · hello@canopy.earth
      </div>
    </div>
  `;

  return { subject, text, html };
}

module.exports = { render };
