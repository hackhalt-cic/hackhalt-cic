const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }
  
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }

  try {
    // Parse body if not already parsed by Vercel runtime or catch-all handler
    if (!req.body || (typeof req.body === 'object' && Object.keys(req.body).length === 0)) {
      try {
        req.body = await Promise.race([
          new Promise((resolve, reject) => {
            let body = '';
            let size = 0;
            req.on('data', chunk => {
              size += chunk.length;
              if (size > 10240) { reject(new Error('Body too large')); return; }
              body += chunk.toString();
            });
            req.on('end', () => {
              try { resolve(body ? JSON.parse(body) : {}); }
              catch (e) { resolve({}); }
            });
            req.on('error', reject);
          }),
          new Promise((resolve) => setTimeout(() => resolve(req.body || {}), 2000))
        ]);
      } catch (parseErr) { /* use existing body */ }
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'No request body' }));
    }

    const { username, password } = req.body;
    
    if (!username || !password) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'Username and password required' }));
    }

    // Sanitize input
    const cleanUsername = (typeof username === 'string') ? username.replace(/[\${}()]/g, '').trim().substring(0, 100) : '';
    if (!cleanUsername) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'Invalid input' }));
    }
    
    // Ensure database connection
    if (!mongoose.connections[0].readyState) {
      try {
        await Promise.race([
          mongoose.connect(process.env.MONGODB_URI),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), DB_TIMEOUT))
        ]);
      } catch (dbError) {
        console.error('[Login] DB connection failed');
        res.statusCode = 503;
        return res.end(JSON.stringify({ success: false, error: 'Database unavailable' }));
      }
    }

    const admin = await Admin.findOne({ username: cleanUsername }).select('+password +failedLoginAttempts +lastFailedLogin +accountLockedUntil');

    if (!admin) {
      // Timing attack mitigation
      await bcrypt.compare(password, '$2a$12$dummyhashvaluefortimingattak000000000000000000');
      res.statusCode = 401;
      return res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
    }

    // Check account lockout
    if (admin.isAccountLocked && admin.isAccountLocked()) {
      res.statusCode = 423;
      return res.end(JSON.stringify({ success: false, error: 'Account locked. Try again later.' }));
    }

    if (!admin.isActive) {
      res.statusCode = 401;
      return res.end(JSON.stringify({ success: false, error: 'Account is inactive. Contact administrator.' }));
    }

    // Check email verification
    if (!admin.isEmailVerified && admin.role !== 'super-admin') {
      res.statusCode = 403;
      return res.end(JSON.stringify({ success: false, error: 'Please verify your email before logging in.' }));
    }

    // Check approval
    if (!admin.isApproved && admin.role !== 'super-admin') {
      res.statusCode = 403;
      return res.end(JSON.stringify({ success: false, error: 'Account pending approval by administrator.' }));
    }

    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      admin.lastFailedLogin = new Date();
      if (admin.failedLoginAttempts >= 10) {
        admin.isActive = false;
      } else if (admin.failedLoginAttempts >= 5) {
        admin.lockAccount(30);
      }
      await admin.save();
      res.statusCode = 401;
      return res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
    }

    // Reset failed attempts on successful login
    admin.failedLoginAttempts = 0;
    admin.accountLockedUntil = undefined;
    admin.lastLogin = new Date();
    await admin.save();

    // Require JWT_SECRET in environment
    if (!process.env.JWT_SECRET) {
      console.error('[Login] CRITICAL: JWT_SECRET not set');
      res.statusCode = 500;
      return res.end(JSON.stringify({ success: false, error: 'Server configuration error' }));
    }

    const accessToken = jwt.sign(
      { id: admin._id, username: admin.username, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'hackhalt-cic', audience: 'hackhalt-admin' }
    );

    const refreshToken = jwt.sign(
      { id: admin._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: '7d', issuer: 'hackhalt-cic' }
    );

    res.setHeader('Set-Cookie', [
      `adminToken=${accessToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=900`,
      `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800`
    ]);

    res.statusCode = 200;
    return res.end(JSON.stringify({
      success: true,
      message: 'Login successful',
      accessToken,
      admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role }
    }));
    
  } catch (error) {
    console.error('[Login] Error:', error.message);
    res.statusCode = 500;
    return res.end(JSON.stringify({ success: false, error: 'Server error' }));
  }
};
