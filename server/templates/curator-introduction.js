/**
 * Canopy Field Station - Founder / Curator Manual Introduction
 * Sender: Canopy <hello@canopy.earth>
 */

function render({ requesterName, requesterEmail, recipientName, recipientEmail, sprintTopic, contextNotes }) {
  const subject = `[Canopy Intro] ${requesterName} <> ${recipientName} — ${sprintTopic || 'Collaboration'}`;

  const text = [
    `Hello ${requesterName} and ${recipientName},`,
    ``,
    `I'm following up from Canopy to personally introduce the two of you to collaborate on ${sprintTopic || 'your shared challenge'}.`,
    ``,
    contextNotes ? `Context from Canopy Curator:\n"${contextNotes}"\n\n` : '',
    `You both indicated mutual interest in teaming up. You can reply directly to this thread to coordinate your sprint scoping and workspace access.`,
    ``,
    `Best regards,`,
    `Aarushi Chatterjee`,
    `Founder, Canopy Earth`,
    `hello@canopy.earth`
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 36px; background-color: #0c120c; color: #e4e7e4; border: 1px solid #1c2b1e; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.2em; color: #4ade80; text-transform: uppercase; margin-bottom: 16px;">CANOPY // FOUNDER INTRODUCTION</div>
      <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em;">Introducing ${requesterName} & ${recipientName}</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2; margin: 0 0 20px 0;">Hello ${requesterName} and ${recipientName},</p>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2; margin: 0 0 20px 0;">I am connecting you both following your mutual collaboration match on Canopy for <strong>${sprintTopic || 'your challenge workspace'}</strong>.</p>
      ${contextNotes ? `
        <div style="background-color: #142017; border-left: 3px solid #4ade80; padding: 16px; margin: 0 0 24px 0; border-radius: 0 6px 6px 0; font-size: 14px; color: #e4e7e4; line-height: 1.6;">
          <strong>Curator Scoping Notes:</strong><br>${contextNotes}
        </div>
      ` : ''}
      <div style="background-color: #111a13; border: 1px solid #1f3323; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
        <div style="margin-bottom: 12px; font-size: 14px;">
          <strong style="color: #68d391;">${requesterName}:</strong> <span style="color: #cbd5e1;">${requesterEmail}</span>
        </div>
        <div style="font-size: 14px;">
          <strong style="color: #68d391;">${recipientName}:</strong> <span style="color: #cbd5e1;">${recipientEmail}</span>
        </div>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #718096; margin: 0 0 24px 0;">You can reply directly to this email to coordinate your initial sync, deliverables, and repo access.</p>
      <div style="border-top: 1px solid #1c2b1e; padding-top: 16px; font-size: 12px; color: #4a5568;">
        Canopy Platform · Aarushi Chatterjee, Founder · <a href="https://canopy.earth" style="color: #4ade80; text-decoration: none;">canopy.earth</a>
      </div>
    </div>
  `;

  return { subject, text, html };
}

module.exports = { render };
