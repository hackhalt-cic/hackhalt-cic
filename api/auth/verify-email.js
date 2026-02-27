const mongoose = require('mongoose');
const crypto = require('crypto');
const Admin = require('../../models/Admin');

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

    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'Verification token is required' }));
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
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!admin) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'Invalid or expired verification token' }));
    }

    admin.isEmailVerified = true;
    admin.emailVerificationToken = undefined;
    admin.emailVerificationExpires = undefined;
    await admin.save();

    console.log(`[VerifyEmail] Email verified: ${admin.username}`);

    res.statusCode = 200;
    return res.end(JSON.stringify({
      success: true,
      message: 'Email verified successfully. Your account is pending admin approval.'
    }));

  } catch (error) {
    console.error('[VerifyEmail] Error:', error.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ success: false, error: 'Verification failed' }));
  }
};
