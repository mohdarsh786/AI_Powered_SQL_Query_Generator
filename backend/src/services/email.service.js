require('dotenv').config()
const { BrevoClient } = require('@getbrevo/brevo')

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString()

const createClient = () => new BrevoClient({ apiKey: process.env.BREVO_API_KEY })

const sendOTPEmail = async (email, fullName, otp, orgName) => {
  const client = createClient()
  await client.transactionalEmails.sendTransacEmail({
    sender: { name: 'SQL Intelligence', email: process.env.BREVO_FROM_EMAIL },
    to: [{ email, name: fullName }],
    subject: `${otp} — Your SQL Intelligence verification code`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2>Verify your email</h2>
        <p>Hi ${fullName}, you're creating <strong>${orgName}</strong> on SQL Intelligence.</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;padding:24px;background:#f0f0f0;border-radius:8px;margin:24px 0;">
          ${otp}
        </div>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#666;font-size:13px;">If you didn't request this, ignore this email.</p>
      </div>
    `
  })
}

const sendWelcomeEmail = async (email, fullName, orgName) => {
  const client = createClient()
  await client.transactionalEmails.sendTransacEmail({
    sender: { name: 'SQL Intelligence', email: process.env.BREVO_FROM_EMAIL },
    to: [{ email, name: fullName }],
    subject: `Welcome to SQL Intelligence — ${orgName}`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2>Welcome, ${fullName}!</h2>
        <p>Your organisation <strong>${orgName}</strong> has been created. You are now the Admin.</p>
        <a href="${process.env.FRONTEND_URL}/login" style="display:block;text-align:center;background:#2563eb;color:white;text-decoration:none;padding:12px;border-radius:8px;margin-top:24px;">
          Sign In to Your Dashboard →
        </a>
      </div>
    `
  })
}

const sendPasswordResetEmail = async (email, fullName, otp) => {
  const client = createClient()
  await client.transactionalEmails.sendTransacEmail({
    sender: { name: 'SQL Intelligence', email: process.env.BREVO_FROM_EMAIL },
    to: [{ email, name: fullName || 'User' }],
    subject: `${otp} — Reset your SQL Intelligence password`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <h2>Reset your password</h2>
        <p>Hi ${fullName || 'there'}, enter this code to reset your password:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;text-align:center;padding:24px;background:#f0f0f0;border-radius:8px;margin:24px 0;">
          ${otp}
        </div>
        <p>This code expires in <strong>10 minutes</strong>.</p>
        <p style="color:#666;font-size:13px;">If you didn't request this, ignore this email.</p>
      </div>
    `
  })
}

const sendTempPasswordEmail = async (email, username, tempPassword, orgName) => {
  const client = createClient()
  await client.transactionalEmails.sendTransacEmail({
    sender: { name: 'SQL Intelligence', email: process.env.BREVO_FROM_EMAIL },
    to: [{ email, name: username }],
    subject: `Your SQL Intelligence account credentials`,
    htmlContent: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f1623;color:#e2e8f0;border-radius:12px;overflow:hidden;border:1px solid #1e2d45;">
        <div style="background:linear-gradient(135deg,#1e3a5f,#0f2744);padding:32px 32px 24px;">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;">SQL Intelligence</h1>
          <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">Powered by your organisation</p>
        </div>
        <div style="padding:32px;">
          <h2 style="margin:0 0 8px;font-size:18px;font-weight:600;color:#f1f5f9;">Welcome, ${username}!</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;line-height:1.6;">
            An admin from <strong style="color:#e2e8f0;">${orgName || 'your organisation'}</strong> has created an account for you on SQL Intelligence. Use the credentials below to sign in.
          </p>
          <div style="background:#0a0e17;border:1px solid #1e2d45;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
            <div style="margin-bottom:16px;">
              <div style="font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">Username</div>
              <div style="font-family:monospace;font-size:18px;font-weight:700;color:#4cd7f6;letter-spacing:0.05em;">${username}</div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:6px;">Temporary Password</div>
              <div style="font-family:monospace;font-size:18px;font-weight:700;color:#34d399;letter-spacing:0.1em;word-break:break-all;">${tempPassword}</div>
            </div>
          </div>
          <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-radius:8px;padding:12px 14px;font-size:12px;color:#fbbf24;line-height:1.6;margin-bottom:24px;">
            ⚠ &nbsp;You will be required to <strong>change this password</strong> on your first login. Do not share these credentials with anyone.
          </div>
          <a href="${process.env.FRONTEND_URL}/login" style="display:block;text-align:center;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;text-decoration:none;padding:13px 24px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.02em;">
            Sign In to Your Dashboard →
          </a>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #1e2d45;font-size:11px;color:#475569;text-align:center;">
          © 2026 SQL Intelligence Inc. &nbsp;·&nbsp; This email was sent by your organisation's admin.
        </div>
      </div>
    `
  })
}

module.exports = { generateOTP, sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail, sendTempPasswordEmail }