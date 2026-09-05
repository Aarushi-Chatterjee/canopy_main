/**
 * Canopy Field Station - Application Received Confirmation
 * Sender: Canopy <hello@canopy.earth>
 */

function render({ applicantName, role, domain, applicationId }) {
  const subject = `[Canopy] Application Received: ${role} (${domain})`;
  const text = [
    `Hello ${applicantName || 'Collaborator'},`,
    ``,
    `Thank you for applying to join the Canopy Field Station beta cohort as a ${role} in ${domain}.`,
    ``,
    `Application Reference: ${applicationId}`,
    `Status: Queued for review`,
    ``,
    `Our team reviews submissions on a rolling basis. You will receive a follow-up directly at this address once your application has been evaluated.`,
    ``,
    `Best regards,`,
    `Aarushi Chatterjee & The Canopy Operations Team`,
    `hello@canopy.earth`
  ].join('\n');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 36px; background-color: #0c120c; color: #e4e7e4; border: 1px solid #1c2b1e; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.2em; color: #4ade80; text-transform: uppercase; margin-bottom: 16px;">CANOPY // INTAKE CONFIRMATION</div>
      <h2 style="color: #ffffff; margin: 0 0 16px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em;">Application Successfully Queued</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2; margin: 0 0 20px 0;">Hello ${applicantName || 'Collaborator'},</p>
      <p style="font-size: 15px; line-height: 1.6; color: #a1a8a2; margin: 0 0 24px 0;">We have received your application to join Canopy's initial beta cohort as a <strong>${role}</strong> focusing on <strong>${domain}</strong>.</p>
      <div style="background-color: #142017; border-left: 3px solid #4ade80; padding: 16px; margin: 0 0 24px 0; border-radius: 0 6px 6px 0;">
        <div style="font-size: 12px; color: #68d391; margin-bottom: 4px;">REFERENCE ID</div>
        <div style="font-family: monospace; font-size: 16px; color: #ffffff;">${applicationId}</div>
      </div>
      <p style="font-size: 14px; line-height: 1.6; color: #718096; margin: 0 0 24px 0;">Our operations team evaluates submissions manually on a rolling basis. You will receive an update once your credentials have been reviewed.</p>
      <div style="border-top: 1px solid #1c2b1e; padding-top: 16px; font-size: 12px; color: #4a5568;">
        Canopy Platform · <a href="https://canopy.earth" style="color: #4ade80; text-decoration: none;">canopy.earth</a> · hello@canopy.earth
      </div>
    </div>
  `;

  return { subject, text, html };
}

module.exports = { render };
