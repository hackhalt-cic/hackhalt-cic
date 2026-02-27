/**
 * Email Service - Handles sending transactional emails
 * Uses Nodemailer with SMTP transport
 * 
 * Required environment variables:
 * - SMTP_HOST (e.g., smtp.gmail.com)
 * - SMTP_PORT (e.g., 587)
 * - SMTP_USER (your email)
 * - SMTP_PASS (app-specific password)
 * - SMTP_FROM (sender email address)
 * - FRONTEND_URL (e.g., https://hackhalt.org)
 */

const nodemailer = require('nodemailer');

// Create transporter (lazy initialization)
let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[EMAIL] SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in environment.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
    tls: {
      rejectUnauthorized: true // Enforce valid SSL certificates
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    rateLimit: 5 // max 5 messages per second
  });

  return transporter;
};

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'https://hackhalt.org';
const FROM_EMAIL = () => process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@hackhalt.org';

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email, username, resetToken) => {
  const transport = getTransporter();
  if (!transport) {
    console.error('[EMAIL] Cannot send reset email - SMTP not configured');
    throw new Error('Email service not configured. Contact administrator.');
  }

  const resetUrl = `${FRONTEND_URL()}/admin-login.html?action=reset-password&token=${resetToken}`;

  const mailOptions = {
    from: `"HackHalt CIC Security" <${FROM_EMAIL()}>`,
    to: email,
    subject: 'Password Reset Request - HackHalt CIC',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
          <tr><td align="center">
            <table width="500" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#3b82f6,#2563eb);padding:30px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:24px;">🔒 Password Reset</h1>
                  <p style="color:#e2e8f0;margin:8px 0 0;font-size:14px;">HackHalt - Cyber Intelligence Council</p>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;">
                  <p style="color:#e2e8f0;font-size:16px;margin:0 0 15px;">Hello <strong>${username}</strong>,</p>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 20px;">
                    We received a request to reset your password. Click the button below to set a new password.
                    This link expires in <strong style="color:#f59e0b;">15 minutes</strong>.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td align="center" style="padding:10px 0 25px;">
                      <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:16px;">
                        Reset Password
                      </a>
                    </td></tr>
                  </table>
                  <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0 0 15px;">
                    If the button doesn't work, copy and paste this URL into your browser:
                  </p>
                  <p style="color:#3b82f6;font-size:11px;word-break:break-all;background:#0f172a;padding:10px;border-radius:6px;margin:0 0 20px;">${resetUrl}</p>
                  <div style="border-top:1px solid #334155;padding-top:20px;">
                    <p style="color:#ef4444;font-size:13px;margin:0;line-height:1.6;">
                      ⚠️ <strong>Security Notice:</strong> If you did not request this reset, please ignore this email. 
                      Your password will remain unchanged. If you suspect unauthorized access, contact us immediately.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background:#0f172a;padding:20px;text-align:center;">
                  <p style="color:#475569;font-size:11px;margin:0;">© ${new Date().getFullYear()} HackHalt CIC. All rights reserved.</p>
                  <p style="color:#475569;font-size:11px;margin:5px 0 0;">This is an automated security email. Do not reply.</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
    text: `Password Reset Request\n\nHello ${username},\n\nWe received a request to reset your password. Visit this link to set a new password (expires in 15 minutes):\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\n- HackHalt CIC Security Team`
  };

  await transport.sendMail(mailOptions);
  console.log(`[EMAIL] Password reset email sent to ${email}`);
};

/**
 * Send email verification email
 */
const sendVerificationEmail = async (email, username, verifyToken) => {
  const transport = getTransporter();
  if (!transport) {
    console.error('[EMAIL] Cannot send verification email - SMTP not configured');
    throw new Error('Email service not configured. Contact administrator.');
  }

  const verifyUrl = `${FRONTEND_URL()}/admin-login.html?action=verify-email&token=${verifyToken}`;

  const mailOptions = {
    from: `"HackHalt CIC" <${FROM_EMAIL()}>`,
    to: email,
    subject: 'Verify Your Email - HackHalt CIC',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
          <tr><td align="center">
            <table width="500" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:12px;border:1px solid #334155;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#22c55e,#16a34a);padding:30px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:24px;">✉️ Verify Your Email</h1>
                  <p style="color:#e2e8f0;margin:8px 0 0;font-size:14px;">HackHalt - Cyber Intelligence Council</p>
                </td>
              </tr>
              <tr>
                <td style="padding:30px;">
                  <p style="color:#e2e8f0;font-size:16px;margin:0 0 15px;">Welcome <strong>${username}</strong>!</p>
                  <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 20px;">
                    Your account has been created. Please verify your email address by clicking the button below.
                    This link expires in <strong style="color:#f59e0b;">24 hours</strong>.
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td align="center" style="padding:10px 0 25px;">
                      <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-weight:600;font-size:16px;">
                        Verify Email
                      </a>
                    </td></tr>
                  </table>
                  <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0 0 15px;">
                    If the button doesn't work, copy and paste this URL:
                  </p>
                  <p style="color:#22c55e;font-size:11px;word-break:break-all;background:#0f172a;padding:10px;border-radius:6px;margin:0 0 20px;">${verifyUrl}</p>
                  <div style="border-top:1px solid #334155;padding-top:20px;">
                    <p style="color:#94a3b8;font-size:13px;margin:0;line-height:1.6;">
                      📌 <strong>Note:</strong> Admin accounts require approval from an existing super-admin before you can access the dashboard.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background:#0f172a;padding:20px;text-align:center;">
                  <p style="color:#475569;font-size:11px;margin:0;">© ${new Date().getFullYear()} HackHalt CIC. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
    text: `Email Verification\n\nWelcome ${username}!\n\nVerify your email by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.\n\nNote: Admin accounts require super-admin approval.\n\n- HackHalt CIC`
  };

  await transport.sendMail(mailOptions);
  console.log(`[EMAIL] Verification email sent to ${email}`);
};

/**
 * Send account approved notification
 */
const sendAccountApprovedEmail = async (email, username, role) => {
  const transport = getTransporter();
  if (!transport) return; // Non-critical, silently skip

  const loginUrl = `${FRONTEND_URL()}/admin-login.html`;

  const mailOptions = {
    from: `"HackHalt CIC" <${FROM_EMAIL()}>`,
    to: email,
    subject: 'Account Approved - HackHalt CIC',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;background:#0f172a;padding:40px 20px;">
        <div style="max-width:500px;margin:0 auto;background:#1e293b;border-radius:12px;border:1px solid #334155;padding:30px;">
          <h2 style="color:#22c55e;margin:0 0 15px;">✅ Account Approved</h2>
          <p style="color:#e2e8f0;">Hello <strong>${username}</strong>,</p>
          <p style="color:#94a3b8;line-height:1.6;">Your <strong style="color:#3b82f6;">${role}</strong> account has been approved. You can now log in.</p>
          <a href="${loginUrl}" style="display:inline-block;background:#3b82f6;color:#fff;text-decoration:none;padding:12px 30px;border-radius:8px;font-weight:600;margin:15px 0;">Log In Now</a>
          <p style="color:#475569;font-size:12px;margin-top:20px;">- HackHalt CIC Security Team</p>
        </div>
      </div>
    `,
    text: `Account Approved\n\nHello ${username},\n\nYour ${role} account has been approved. Log in at: ${loginUrl}\n\n- HackHalt CIC`
  };

  try {
    await transport.sendMail(mailOptions);
    console.log(`[EMAIL] Account approved email sent to ${email}`);
  } catch (error) {
    console.error(`[EMAIL] Failed to send approved email to ${email}:`, error.message);
  }
};

module.exports = {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendAccountApprovedEmail
};
