import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const AWS_REGION = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
const FROM_EMAIL = 'shipits.notify@velroi.com';

export const sesClient = new SESClient({ region: AWS_REGION });

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
};

export async function sendEmailViaSES(params: SendEmailParams): Promise<void> {
  const toAddresses = Array.isArray(params.to) ? params.to : [params.to];
  const command = new SendEmailCommand({
    Destination: { ToAddresses: toAddresses },
    Source: params.from || FROM_EMAIL,
    Message: {
      Subject: { Data: params.subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: params.html, Charset: 'UTF-8' },
        ...(params.text ? { Text: { Data: params.text, Charset: 'UTF-8' } } : {}),
      },
    },
  });
  await sesClient.send(command);
}

export function buildVerificationEmailHtml(options: {
  fullName: string;
  username: string;
  email: string;
  verifyUrl: string;
}): string {
  const { fullName, username, verifyUrl } = options;
  // Elegant, executive-grade HTML email
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Verify your email</title>
  <style>
    :root { --brand:#7b1e26; --dark:#0f1115; --muted:#6b7280; --card:#ffffff; }
    body { margin:0; background:#f5f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; color:#0f1115; }
    .container { max-width:680px; margin:0 auto; padding:40px 24px; }
    .card { background:var(--card); border-radius:16px; box-shadow: 0 10px 30px rgba(15,17,21,0.06); overflow:hidden; }
    .header { background:linear-gradient(135deg, var(--brand), #b23b45); padding:28px 28px; color:#fff; }
    .brand { display:flex; align-items:center; gap:12px; font-weight:700; letter-spacing:0.4px; }
    .brand-badge { width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; font-weight:800; }
    .content { padding:32px 28px 8px; }
    h1 { font-size:24px; margin:0 0 8px; letter-spacing:-0.3px; }
    p { margin:0 0 14px; line-height:1.6; color:#1f2937; }
    .muted { color:var(--muted); }
    .btn { display:inline-block; background:var(--brand); color:#fff !important; padding:14px 22px; border-radius:12px; text-decoration:none; font-weight:600; box-shadow:0 8px 20px rgba(123,30,38,0.25); }
    .btn:hover { filter:brightness(1.02); }
    .divider { height:1px; background:#eef0f5; margin:24px 0; }
    .code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; background:#0f1115; color:#fff; padding:10px 12px; border-radius:10px; display:inline-block; letter-spacing:0.6px; font-weight:700; }
    .footer { padding:18px 28px 28px; color:var(--muted); font-size:12px; }
    .kpi { display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; margin-top:10px; }
    .kpi-item { background:#f9fafb; border-radius:12px; padding:12px; text-align:center; }
    .kpi-title { color:#6b7280; font-size:12px; letter-spacing:0.3px; }
    .kpi-value { font-weight:800; font-size:14px; color:#111827; margin-top:4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="brand">
          <div class="brand-badge">O</div>
          <div>Osprey @ CMU</div>
        </div>
      </div>
      <div class="content">
        <h1>Welcome to Osprey @ CMU, ${fullName || username}</h1>
        <p>To complete your account setup, please verify your email address. This keeps your account secure and ensures you receive important updates about your projects and discussions.</p>
        <p class="muted">Your account is almost ready. Click the button below to verify your email and enter the community.</p>
        <p style="margin:22px 0;">
          <a href="${verifyUrl}" class="btn" target="_blank" rel="noopener">Verify email</a>
        </p>
        <p class="muted">If the button doesn't work, copy and paste this link into your browser:</p>
        <p><span class="code">${verifyUrl}</span></p>

        <div class="divider"></div>
        <p><strong>Why verify?</strong></p>
        <ul class="muted" style="margin:10px 0 0 20px; padding:0;">
          <li>Unlock posting and collaboration features</li>
          <li>Get notifications for replies, mentions, and updates</li>
          <li>Elevated trust and credibility across Osprey @ CMU</li>
        </ul>

        <div class="kpi">
          <div class="kpi-item"><div class="kpi-title">Members</div><div class="kpi-value">Elite</div></div>
          <div class="kpi-item"><div class="kpi-title">Design</div><div class="kpi-value">Executive</div></div>
          <div class="kpi-item"><div class="kpi-title">Platform</div><div class="kpi-value">Osprey @ CMU</div></div>
        </div>
      </div>
      <div class="footer">
        <div>Sent by Osprey @ CMU Notifications</div>
        <div>If you didn’t request this, you can safely ignore this email.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildCommentNotificationEmailHtml(options: {
  projectTitle: string;
  viewUrl: string;
}): string {
  const { projectTitle, viewUrl } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New comment on your post</title>
  <style>
    :root { --brand:#7b1e26; --dark:#0f1115; --muted:#6b7280; --card:#ffffff; }
    body { margin:0; background:#f6f7fb; font-family:-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#0f1115; }
    .container { max-width:680px; margin:0 auto; padding:40px 24px; }
    .card { background:var(--card); border-radius:16px; box-shadow: 0 10px 30px rgba(15,17,21,0.06); overflow:hidden; }
    .header { background:linear-gradient(135deg, var(--brand), #b23b45); padding:24px 28px; color:#fff; }
    .brand { display:flex; align-items:center; gap:12px; font-weight:700; letter-spacing:0.4px; }
    .brand-badge { width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; font-weight:800; }
    .content { padding:28px; }
    h1 { font-size:22px; margin:0 0 8px; letter-spacing:-0.3px; }
    p { margin:0 0 12px; line-height:1.6; color:#1f2937; }
    .muted { color:var(--muted); }
    .btn { display:inline-block; background:var(--brand); color:#fff !important; padding:12px 20px; border-radius:12px; text-decoration:none; font-weight:600; box-shadow:0 8px 20px rgba(123,30,38,0.25); }
    .divider { height:1px; background:#eef0f5; margin:22px 0; }
    .footer { padding:18px 28px 28px; color:var(--muted); font-size:12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="brand">
          <div class="brand-badge">O</div>
          <div>Osprey @ CMU</div>
        </div>
      </div>
      <div class="content">
        <h1>Someone commented on your post</h1>
        <p class="muted">Your post just received a new comment.</p>
        <p><strong>Post</strong>: ${projectTitle}</p>
        <p style="margin:18px 0;">
          <a href="${viewUrl}" class="btn" target="_blank" rel="noopener">View comment</a>
        </p>
        <div class="divider"></div>
        <p class="muted">You’re receiving this email because you own this post on Osprey @ CMU.</p>
      </div>
      <div class="footer">
        <div>Sent by Osprey @ CMU Notifications</div>
        <div>If you didn’t expect this message, you can ignore it.</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildPasswordResetEmailHtml(options: {
  fullNameOrUsername: string;
  resetUrl: string;
}): string {
  const { fullNameOrUsername, resetUrl } = options;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reset your password</title>
  <style>
    :root { --brand:#7b1e26; --dark:#0f1115; --muted:#6b7280; --card:#ffffff; }
    body { margin:0; background:#f5f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', Helvetica, Arial, sans-serif; color:#0f1115; }
    .container { max-width:680px; margin:0 auto; padding:40px 24px; }
    .card { background:var(--card); border-radius:16px; box-shadow: 0 10px 30px rgba(15,17,21,0.06); overflow:hidden; }
    .header { background:linear-gradient(135deg, var(--brand), #b23b45); padding:28px 28px; color:#fff; }
    .brand { display:flex; align-items:center; gap:12px; font-weight:700; letter-spacing:0.4px; }
    .brand-badge { width:36px; height:36px; border-radius:8px; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; font-weight:800; }
    .content { padding:32px 28px 8px; }
    h1 { font-size:24px; margin:0 0 8px; letter-spacing:-0.3px; }
    p { margin:0 0 14px; line-height:1.6; color:#1f2937; }
    .muted { color:var(--muted); }
    .btn { display:inline-block; background:var(--brand); color:#fff !important; padding:14px 22px; border-radius:12px; text-decoration:none; font-weight:600; box-shadow:0 8px 20px rgba(123,30,38,0.25); }
    .divider { height:1px; background:#eef0f5; margin:24px 0; }
    .code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas; background:#0f1115; color:#fff; padding:10px 12px; border-radius:10px; display:inline-block; letter-spacing:0.6px; font-weight:700; }
    .footer { padding:18px 28px 28px; color:var(--muted); font-size:12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="brand">
          <div class="brand-badge">O</div>
          <div>Osprey @ CMU</div>
        </div>
      </div>
      <div class="content">
        <h1>Reset your password</h1>
        <p>Hello ${fullNameOrUsername}, we received a request to reset your password.</p>
        <p class="muted">Click the button below to securely set a new password. This link will expire for your protection.</p>
        <p style="margin:22px 0;">
          <a href="${resetUrl}" class="btn" target="_blank" rel="noopener">Set new password</a>
        </p>
        <p class="muted">If the button doesn't work, copy and paste this link into your browser:</p>
        <p><span class="code">${resetUrl}</span></p>
        <div class="divider"></div>
        <p class="muted">If you didn’t request this, you can safely ignore this email. Your account remains secure.</p>
      </div>
      <div class="footer">
        <div>Sent by Osprey @ CMU Security</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}


