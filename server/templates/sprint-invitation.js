/**
 * Canopy Field Station - Sprint Squad Invitation
 * Sender: Canopy <hello@canopy.earth>
 */

function render({ inviteeName, sprintTitle, role, domain }) {
  const subject = `[Canopy] Invitation to Sprint Squad: "${sprintTitle}"`;

  const text = [
    `Hello ${inviteeName || 'Collaborator'},`,
    ``,
    `You have been invited to join the sprint squad for "${sprintTitle}" as ${role || 'a Technical Contributor'}.`,
    ``,
    `Sprint Domain: ${domain || 'Climate'}`,
    `Cycle Timeline: 14 Days`,
    ``,
    `Visit your Sprint Board to review the squad manifest and confirm your seat:`,
    `https://canopy.earth/sprint.html`,
    ``,
    `Canopy Operations — hello@canopy.earth`
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 36px; background-color: #0c120c; color: #e4e7e4; border: 1px solid #1c2b1e; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.2em; color: #4ade80; text-transform: uppercase; margin-bottom: 16px;">CANOPY // SPRINT INVITATION</div>
      <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em;">Squad Seat Opened</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2; margin: 0 0 20px 0;">You have been invited to join the active sprint squad for <strong>"${sprintTitle}"</strong>:</p>
      <div style="background-color: #142017; border-left: 3px solid #4ade80; padding: 16px; margin: 0 0 24px 0; border-radius: 0 6px 6px 0;">
        <div style="font-size: 14px; color: #ffffff;">Assigned Role: <strong>${role || 'Technical Contributor'}</strong></div>
        <div style="font-size: 13px; color: #68d391; margin-top: 4px;">Cycle Duration: 14 Days · Active Stage: Building</div>
      </div>
      <div style="text-align: center; margin: 24px 0;">
        <a href="https://canopy.earth/sprint.html" style="background-color: #22543d; color: #68d391; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Review Squad Manifest →</a>
      </div>
      <div style="border-top: 1px solid #1c2b1e; padding-top: 16px; font-size: 12px; color: #4a5568;">
        Canopy Platform · <a href="https://canopy.earth" style="color: #4ade80; text-decoration: none;">canopy.earth</a> · hello@canopy.earth
      </div>
    </div>
  `;

  return { subject, text, html };
}

module.exports = { render };
