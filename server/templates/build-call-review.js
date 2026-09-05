/**
 * Canopy Field Station - Build Call Review Status Update
 * Sender: Canopy <hello@canopy.earth>
 */

function render({ title, status, decisionNote }) {
  const isApproved = status === 'open' || status === 'approved';
  const subject = `[Canopy] Build Call Review: "${title}" is ${isApproved ? 'Approved & Live' : 'Under Review'}`;

  const text = [
    `Build Call Update: "${title}"`,
    ``,
    `Status: ${isApproved ? 'Approved for Public Matching' : status.toUpperCase()}`,
    decisionNote ? `Reviewer Note: ${decisionNote}\n` : '',
    isApproved 
      ? `Your challenge is now live in the Canopy directory. Builders can submit collaboration inquiries.` 
      : `Your challenge submission has been reviewed by Canopy operations.`,
    ``,
    `Canopy Operations — hello@canopy.earth`
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 36px; background-color: #0c120c; color: #e4e7e4; border: 1px solid #1c2b1e; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.2em; color: ${isApproved ? '#4ade80' : '#ecc94b'}; text-transform: uppercase; margin-bottom: 16px;">CANOPY // BUILD CALL MODERATION</div>
      <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em;">${isApproved ? 'Build Call Published' : 'Build Call Status Update'}</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2; margin: 0 0 20px 0;">Your submitted challenge <strong>"${title}"</strong> has been reviewed:</p>
      <div style="background-color: #142017; border-left: 3px solid ${isApproved ? '#4ade80' : '#ecc94b'}; padding: 16px; margin: 0 0 24px 0; border-radius: 0 6px 6px 0;">
        <div style="font-size: 12px; color: ${isApproved ? '#4ade80' : '#ecc94b'}; margin-bottom: 4px;">CURRENT STATUS</div>
        <div style="font-size: 16px; font-weight: 600; color: #ffffff;">${isApproved ? 'Live in Matching Directory' : status}</div>
        ${decisionNote ? `<div style="margin-top: 8px; font-size: 13px; color: #a1a8a2;">${decisionNote}</div>` : ''}
      </div>
      <div style="border-top: 1px solid #1c2b1e; padding-top: 16px; font-size: 12px; color: #4a5568;">
        Canopy Platform · <a href="https://canopy.earth" style="color: #4ade80; text-decoration: none;">canopy.earth</a> · hello@canopy.earth
      </div>
    </div>
  `;

  return { subject, text, html };
}

module.exports = { render };
