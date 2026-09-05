/**
 * Canopy Mail Dispatch Verification Utility
 * Usage: node scripts/test-mail.js [recipient@example.com]
 */
require('dotenv').config();
const emailService = require('../server/services/email');

async function main() {
  const recipient = process.argv[2] || process.env.FOUNDER_EMAILS?.split(',')[0] || 'founder@canopy.earth';
  console.log('\n🌿 Canopy Transactional Mail Tester');
  console.log('--------------------------------------------------');
  console.log(`Configured Provider : ${process.env.EMAIL_PROVIDER || (process.env.RESEND_API_KEY ? 'resend' : 'console')}`);
  console.log(`Resend API Key      : ${process.env.RESEND_API_KEY ? 'Present (re_...)' : 'Not configured (using console mock)'}`);
  console.log(`Default Sender      : ${process.env.MAIL_FROM || 'Canopy Dispatch <hello@canopy.earth>'}`);
  console.log(`Target Recipient    : ${recipient}`);
  console.log('--------------------------------------------------');
  console.log('Dispatching test verification pass email...\n');

  try {
    const result = await emailService.sendVerificationCode(recipient, '784920');
    console.log('✅ Dispatch Result:');
    console.log(result);
    console.log('\n✨ Test completed successfully.');
    if (result.provider === 'console') {
      console.log('💡 Note: Provider is currently set to "console" (printed above).');
      console.log('   To send real emails to inboxes, add RESEND_API_KEY=re_... in .env');
    }
  } catch (err) {
    console.error('❌ Dispatch Error:', err.message);
  }
}

main();
