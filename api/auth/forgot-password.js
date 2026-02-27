const mongoose = require('mongoose');
const crypto = require('crypto');
const Admin = require('../../models/Admin');
const { sendPasswordResetEmail } = require('../../services/emailService');

const DB_TIMEOUT = 5000;

module.exports = async function handler(req, res) {
  const origin = (req.headers.origin || '').trim();
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }

  try {
    // Parse body if needed
    if (!req.body || Object.keys(req.body).length === 0) {
      try {
        req.body = await new Promise((resolve) => {
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', () => { resolve(body ? JSON.parse(body) : {}); });
          setTimeout(() => resolve(req.body || {}), 2000);
        });
      } catch (e) { /* use existing body */ }
    }

    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'Email address is required' }));
    }

    const cleanEmail = email.replace(/[\${}()]/g, '').trim().toLowerCase().substring(0, 200);

    // Generic response to prevent email enumeration
    const genericResponse = JSON.stringify({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });

    // Ensure DB connection
    if (!mongoose.connections[0].readyState) {
      await Promise.race([
        mongoose.connect(process.env.MONGODB_URI),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), DB_TIMEOUT))
      ]);
    }

    const admin = await Admin.findOne({ email: cleanEmail }).select('+resetPasswordToken +resetPasswordExpires');

    if (!admin || !admin.isActive) {
      res.statusCode = 200;
      return res.end(genericResponse);
    }

    const resetToken = admin.generateResetToken();
    await admin.save({ validateBeforeSave: false });

    try {
      await sendPasswordResetEmail(admin.email, admin.username, resetToken);
    } catch (emailError) {
      console.error('[ForgotPassword] Email send failed:', emailError.message);
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpires = undefined;
      await admin.save({ validateBeforeSave: false });
      res.statusCode = 500;
      return res.end(JSON.stringify({ success: false, error: 'Failed to send reset email. Please try again.' }));
    }

    res.statusCode = 200;
    return res.end(genericResponse);

  } catch (error) {
    console.error('[ForgotPassword] Error:', error.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ success: false, error: 'Server error' }));
  }
};
