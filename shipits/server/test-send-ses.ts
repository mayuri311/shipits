import { config } from 'dotenv';
config();
import { sendEmailViaSES, buildVerificationEmailHtml } from './services/sesEmail';

async function main() {
  const to = process.env.TEST_EMAIL_TO || 'thomas@velroi.com';
  const baseUrl = process.env.PUBLIC_BASE_URL || 'https://shipits.velroi.com';
  const verifyUrl = `${baseUrl}/api/auth/verify?token=TEST-TOKEN`;
  const html = buildVerificationEmailHtml({
    fullName: 'Thomas',
    username: 'thomas',
    email: to,
    verifyUrl,
  });
  console.log('Sending SES email to', to);
  await sendEmailViaSES({
    to,
    subject: 'ShipIts Email Verification — Test Message',
    html,
    text: `Please verify your email: ${verifyUrl}`,
  });
  console.log('✅ Test email sent via SES');
}

main().catch((err) => {
  console.error('❌ Failed to send SES test email:', err);
  process.exit(1);
});


