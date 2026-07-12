/**
 * Email Service. Sends OTP verification and welcome emails via Brevo v6 SDK.
 */

const { BrevoClient } = require('@getbrevo/brevo')

const getClient = () => {
  return new BrevoClient({ token: process.env.BREVO_API_KEY })
}

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const sendOTPEmail = async (email, fullName, otp, orgName) => {
  const client = getClient()

  await client.transactionalEmails.sendTransacEmail({
    sender: {
      name: 'SQL Intelligence',
      email: process.env.BREVO_FROM_EMAIL
    },
    to: [{ email, name: fullName }],
    subject: `${otp} — Your SQL Intelligence verification code`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#0a0e17;font-family:Inter,sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:#0f1623;border:1px solid #1e2d45;border-radius:14px;overflow:hidden;">
          <div style="background:#141c2e;padding:24px 32px;border-bottom:1px solid #1e2d45;">
            <p style="margin:0;font-family:monospace;font-size:15px;font-weight:600;color:#f0f6ff;">
              ⊞ SQL Intelligence
            </p>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#f0f6ff;font-size:20px;font-weight:600;margin:0 0 8px;">
              Verify your email
            </h2>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Hi ${fullName}, you're creating <strong style="color:#f0f6ff;">${orgName}</strong> 
              on SQL Intelligence. Enter this code to verify your email:
            </p>
            <div style="background:#0a0e17;border:1px solid #1e2d45;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
              <span style="font-family:monospace;font-size:40px;font-weight:700;letter-spacing:12px;color:#06b6d4;">
                ${otp}
              </span>
            </div>
            <p style="color:#475569;font-size:13px;margin:0 0 8px;">
              ⏱ This code expires in <strong style="color:#94a3b8;">10 minutes</strong>.
            </p>
            <p style="color:#475569;font-size:13px;margin:0;">
              🔒 If you didn't request this, you can safely ignore this email.
            </p>
          </div>
          <div style="background:#141c2e;padding:16px 32px;border-top:1px solid #1e2d45;">
            <p style="margin:0;color:#334155;font-size:12px;">
              SQL Intelligence Platform — Secure Database Management
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  })
}

const sendWelcomeEmail = async (email, fullName, orgName, role) => {
  const client = getClient()

  await client.transactionalEmails.sendTransacEmail({
    sender: {
      name: 'SQL Intelligence',
      email: process.env.BREVO_FROM_EMAIL
    },
    to: [{ email, name: fullName }],
    subject: `Welcome to SQL Intelligence — ${orgName}`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#0a0e17;font-family:Inter,sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:#0f1623;border:1px solid #1e2d45;border-radius:14px;overflow:hidden;">
          <div style="background:#141c2e;padding:24px 32px;border-bottom:1px solid #1e2d45;">
            <p style="margin:0;font-family:monospace;font-size:15px;font-weight:600;color:#f0f6ff;">
              ⊞ SQL Intelligence
            </p>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#f0f6ff;font-size:20px;font-weight:600;margin:0 0 8px;">
              Welcome, ${fullName}!
            </h2>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 16px;">
              Your organisation <strong style="color:#f0f6ff;">${orgName}</strong> 
              has been created successfully. You are now the <strong style="color:#10b981;">Admin</strong>.
            </p>
            <div style="background:#0a0e17;border:1px solid #1e2d45;border-radius:8px;padding:16px;margin-bottom:24px;">
              <p style="margin:0 0 6px;color:#475569;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">
                Your access
              </p>
              <p style="margin:0;color:#10b981;font-size:14px;font-family:monospace;font-weight:600;">
                Role: ADMIN — Full platform access
              </p>
            </div>
            <a href="${process.env.FRONTEND_URL}/login" 
               style="display:block;text-align:center;background:linear-gradient(135deg,#2563eb,#06b6d4);color:white;text-decoration:none;padding:12px;border-radius:8px;font-weight:600;font-size:14px;">
              Sign In to Your Dashboard →
            </a>
          </div>
        </div>
      </body>
      </html>
    `
  })
}

const sendPasswordResetEmail = async (email, fullName, otp) => {
  const client = getClient()

  await client.transactionalEmails.sendTransacEmail({
    sender: {
      name: 'SQL Intelligence',
      email: process.env.BREVO_FROM_EMAIL
    },
    to: [{ email, name: fullName || 'User' }],
    subject: `${otp} — Reset your SQL Intelligence password`,
    htmlContent: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#0a0e17;font-family:Inter,sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:#0f1623;border:1px solid #1e2d45;border-radius:14px;overflow:hidden;">
          <div style="background:#141c2e;padding:24px 32px;border-bottom:1px solid #1e2d45;">
            <p style="margin:0;font-family:monospace;font-size:15px;font-weight:600;color:#f0f6ff;">
              ⊞ SQL Intelligence
            </p>
          </div>
          <div style="padding:32px;">
            <h2 style="color:#f0f6ff;font-size:20px;font-weight:600;margin:0 0 8px;">
              Reset your password
            </h2>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
              Hi ${fullName || 'there'}, we received a request to reset your password.
              Enter this code to continue:
            </p>
            <div style="background:#0a0e17;border:1px solid #1e2d45;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
              <span style="font-family:monospace;font-size:40px;font-weight:700;letter-spacing:12px;color:#f43f5e;">
                ${otp}
              </span>
            </div>
            <p style="color:#475569;font-size:13px;margin:0 0 8px;">
              ⏱ This code expires in <strong style="color:#94a3b8;">10 minutes</strong>.
            </p>
            <p style="color:#475569;font-size:13px;margin:0;">
              🔒 If you didn't request this, ignore this email. Your password won't change.
            </p>
          </div>
          <div style="background:#141c2e;padding:16px 32px;border-top:1px solid #1e2d45;">
            <p style="margin:0;color:#334155;font-size:12px;">
              SQL Intelligence Platform — Secure Database Management
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  })
}

module.exports = { generateOTP, sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail }
