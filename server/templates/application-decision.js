/**
 * Canopy Field Station - Application Decision Notification
 * Sender: Canopy Access <access@canopy.earth>
 */

function render({ applicantName, role, status, note }) {
  const isApproved = status === 'approved' || status === 'accepted';
  const isWaitlisted = status === 'waitlisted';
  const subject = `[Canopy] Application Update: ${isApproved ? 'Access Approved' : isWaitlisted ? 'Waitlist Status' : 'Application Status'}`;

  const statusHeadline = isApproved 
    ? 'Welcome to Canopy: Field Station Access Approved' 
    : isWaitlisted 
      ? 'Canopy Beta Cohort: Application Waitlisted' 
      : 'Canopy Beta Cohort: Application Update';

  const statusColor = isApproved ? '#4ade80' : isWaitlisted ? '#ecc94b' : '#f87171';

  const text = [
    `Hello ${applicantName || 'Collaborator'},`,
    ``,
    `Your application for Canopy Field Station (${role}) has been reviewed: ${status.toUpperCase()}.`,
    ``,
    note ? `Curator Note: ${note}\n` : '',
    isApproved ? `You can now sign in with your verified email to participate in Matches, Sprint Squads, and Lab Notebook entries.` : `Thank you for your interest in Canopy. We will reach out when the next cohort opens.`,
    ``,
    `Canopy Operations — access@canopy.earth`
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 36px; background-color: #0c120c; color: #e4e7e4; border: 1px solid #1c2b1e; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.2em; color: ${statusColor}; text-transform: uppercase; margin-bottom: 16px;">CANOPY // APPLICATION STATUS</div>
      <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em;">${statusHeadline}</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2; margin: 0 0 20px 0;">Hello ${applicantName || 'Collaborator'},</p>
      <div style="background-color: #142017; border-left: 3px solid ${statusColor}; padding: 16px; margin: 0 0 24px 0; border-radius: 0 6px 6px 0;">
        <div style="font-size: 12px; color: ${statusColor}; margin-bottom: 4px;">CURRENT STATUS</div>
        <div style="font-size: 16px; font-weight: 600; color: #ffffff; text-transform: capitalize;">${status.replace('_', ' ')}</div>
        ${note ? `<div style="margin-top: 8px; font-size: 13px; color: #a1a8a2;">${note}</div>` : ''}
      </div>
      ${isApproved ? `
        <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2; margin: 0 0 24px 0;">Your Field Station credentials have been enabled. You can now access the full Match Sandbox, join active Sprint Squads, and contribute to the Lab Notebook.</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://canopy.earth/login.html" style="background-color: #22543d; color: #68d391; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">Sign In to Field Station →</a>
        </div>
      ` : `
        <p style="font-size: 14px; line-height: 1.6; color: #718096; margin: 0 0 24px 0;">We appreciate your dedication to high-impact technical work. We will keep your portfolio on file as new opportunities unlock.</p>
      `}
      <div style="border-top: 1px solid #1c2b1e; padding-top: 16px; font-size: 12px; color: #4a5568;">
        Canopy Platform · <a href="https://canopy.earth" style="color: #4ade80; text-decoration: none;">canopy.earth</a> · access@canopy.earth
      </div>
    </div>
  `;

  return { subject, text, html };
}

module.exports = { render };
