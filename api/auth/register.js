const mongoose = require('mongoose');
const Admin = require('../../models/Admin');
const { validatePassword } = require('../../utils/passwordPolicy');
const { sendVerificationEmail } = require('../../services/emailService');

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

    const { username, email, password, confirmPassword, role } = req.body;

    // Input validation
    if (!username || !email || !password || !confirmPassword) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'All fields are required' }));
    }

    if (password !== confirmPassword) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'Passwords do not match' }));
    }

    // Sanitize
    const cleanUsername = username.replace(/[\${}()]/g, '').trim().substring(0, 50);
    const cleanEmail = email.replace(/[\${}()]/g, '').trim().toLowerCase().substring(0, 200);

    if (cleanUsername.length < 3) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'Username must be at least 3 characters' }));
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'Username can only contain letters, numbers, underscores, dots, and hyphens' }));
    }

    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(cleanEmail)) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ success: false, error: 'Invalid email format' }));
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.statusCode = 400;
      return res.end(JSON.stringify({
        success: false,
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors
      }));
    }

    const requestedRole = (role === 'admin') ? 'admin' : 'user';

    // Ensure DB connection
    if (!mongoose.connections[0].readyState) {
      await Promise.race([
        mongoose.connect(process.env.MONGODB_URI),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), DB_TIMEOUT))
      ]);
    }

    const existingUser = await Admin.findOne({ $or: [{ username: cleanUsername }, { email: cleanEmail }] });
    if (existingUser) {
      res.statusCode = 409;
      return res.end(JSON.stringify({ success: false, error: 'An account with these details already exists' }));
    }

    const newAdmin = new Admin({
      username: cleanUsername,
      email: cleanEmail,
      password,
      role: requestedRole,
      isActive: true,
      isEmailVerified: false,
      isApproved: false
    });

    const verifyToken = newAdmin.generateEmailVerificationToken();
    await newAdmin.save();

    try {
      await sendVerificationEmail(cleanEmail, cleanUsername, verifyToken);
    } catch (emailError) {
      console.error('[Register] Failed to send verification email:', emailError.message);
    }

    console.log(`[Register] New ${requestedRole} registered: ${cleanUsername}`);

    res.statusCode = 201;
    return res.end(JSON.stringify({
      success: true,
      message: `Account created successfully. Please check your email (${cleanEmail}) to verify your account. Admin accounts require approval before access is granted.`
    }));

  } catch (error) {
    console.error('[Register] Error:', error.message);
    if (error.code === 11000) {
      res.statusCode = 409;
      return res.end(JSON.stringify({ success: false, error: 'An account with these details already exists' }));
    }
    res.statusCode = 500;
    return res.end(JSON.stringify({ success: false, error: 'Registration failed' }));
  }
};
