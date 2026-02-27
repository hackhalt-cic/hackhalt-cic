const mongoose = require('mongoose');
const crypto = require('crypto');
const Admin = require('../../models/Admin');
const { validatePassword } = require('../../utils/passwordPolicy');

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

    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'All fields are required' }));
    }

    if (newPassword !== confirmPassword) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'Passwords do not match' }));
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      res.statusCode = 400;
      return res.end(JSON.stringify({
        success: false,
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      }));
    }

    // Ensure DB connection
    if (!mongoose.connections[0].readyState) {
      await Promise.race([
        mongoose.connect(process.env.MONGODB_URI),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), DB_TIMEOUT))
      ]);
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await Admin.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires +password +passwordHistory');

    if (!admin) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'Invalid or expired reset token. Please request a new one.' }));
    }

    // Check password history
    const isReused = await admin.isPasswordInHistory(newPassword);
    if (isReused) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'This password has been used recently. Please choose a different one.' }));
    }

    const isSameAsCurrent = await admin.comparePassword(newPassword);
    if (isSameAsCurrent) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'New password must be different from current password' }));
    }

    admin.password = newPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    admin.failedLoginAttempts = 0;
    admin.accountLockedUntil = undefined;
    await admin.save();

    console.log(`[ResetPassword] Password reset completed: ${admin.username}`);

    res.statusCode = 200;
    return res.end(JSON.stringify({ success: true, message: 'Password reset successful. You can now log in with your new password.' }));

  } catch (error) {
    console.error('[ResetPassword] Error:', error.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ success: false, error: 'Server error' }));
  }
};
