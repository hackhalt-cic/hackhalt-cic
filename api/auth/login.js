const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Admin = require('../../models/Admin');

// Connection timeout protection
const DB_TIMEOUT = 5000; // 5 seconds

module.exports = async function handler(req, res) {
  // Set CORS headers (safe to set even if already set by catch-all handler)
  const origin = (req.headers.origin || req.headers.Origin || '').trim();
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }
  
  console.log('[Login] Starting login handler...');
  
  if (req.method !== 'POST') {
    console.log('[Login] Invalid method:', req.method);
    res.statusCode = 405;
    return res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
  }

  try {
    // Parse body if not already parsed (when called directly by Vercel, not via catch-all)
    if (!req.body) {
      req.body = await new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try { resolve(body ? JSON.parse(body) : {}); }
          catch (e) { resolve({}); }
        });
        req.on('error', reject);
      });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('[Login] No body provided');
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, message: 'No request body' }));
    }

    const { username, password } = req.body;
    
    if (!username || !password) {
      console.log('[Login] Missing credentials');
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, message: 'Username and password required' }));
    }

    console.log('[Login] Attempt for user:', username);
    
    // Ensure database connection with timeout
    if (!mongoose.connections[0].readyState) {
      console.log('[Login] Connecting to MongoDB (timeout:', DB_TIMEOUT, 'ms)');
      try {
        await Promise.race([
          mongoose.connect(process.env.MONGODB_URI),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB connection timeout')), DB_TIMEOUT))
        ]);
        console.log('[Login] MongoDB connected');
      } catch (dbError) {
        console.error('[Login] Database connection failed:', dbError.message);
        res.statusCode = 503;
        return res.end(JSON.stringify({ 
          success: false, 
          message: 'Database unavailable', 
          error: dbError.message 
        }));
      }
    } else {
      console.log('[Login] MongoDB already connected');
    }

    // Query admin user
    const admin = await Admin.findOne({ username: username.trim() }).select('+password');

    if (!admin) {
      console.log('[Login] User not found:', username);
      res.statusCode = 401;
      return res.end(JSON.stringify({ success: false, message: 'Invalid credentials' }));
    }

    if (!admin.isActive) {
      console.log('[Login] Account inactive:', username);
      res.statusCode = 401;
      return res.end(JSON.stringify({ success: false, message: 'Account is inactive' }));
    }

    // Verify password
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      console.log('[Login] Invalid password for user:', username);
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      admin.lastFailedLogin = new Date();
      await admin.save();
      res.statusCode = 401;
      return res.end(JSON.stringify({ success: false, message: 'Invalid credentials' }));
    }

    console.log('[Login] Password valid for user:', username);
    
    // Update login info
    admin.failedLoginAttempts = 0;
    admin.lastLogin = new Date();
    await admin.save();

    // Create tokens
    const accessToken = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET || 'your-secure-secret-key-change-in-production',
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { id: admin._id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET || 'your-secure-refresh-secret-key',
      { expiresIn: '7d' }
    );

    // Set cookies - use SameSite=None for cross-domain (Hostinger -> Vercel)
    res.setHeader('Set-Cookie', `adminToken=${accessToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=900`);
    res.appendHeader('Set-Cookie', `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800`);

    console.log('[Login] ✅ Login successful for user:', username);
    res.statusCode = 200;
    return res.end(JSON.stringify({
      success: true,
      message: 'Login successful',
      accessToken: accessToken,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    }));
    
  } catch (error) {
    console.error('[Login] ❌ Handler error:', error.message);
    console.error('[Login] Stack:', error.stack);
    
    res.statusCode = 500;
    return res.end(JSON.stringify({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    }));
  }
};
