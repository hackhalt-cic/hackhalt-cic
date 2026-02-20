const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Admin = require('../../models/Admin');

module.exports = async function handler(req, res) {
  // CRITICAL: Set JSON content type FIRST to prevent HTML responses
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // CORS headers - Allow all origins for public login endpoint
  // The origin check happens in server.js for full CORS control
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      // Ensure database connection
      if (!mongoose.connections[0].readyState) {
        await mongoose.connect(process.env.MONGODB_URI);
      }

      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required" });
      }

      const admin = await Admin.findOne({ username: username.trim() }).select('+password');

      if (!admin) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      if (!admin.isActive) {
        return res.status(401).json({ success: false, message: "Account is inactive" });
      }

      const isPasswordValid = await admin.comparePassword(password);

      if (!isPasswordValid) {
        admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
        admin.lastFailedLogin = new Date();
        await admin.save();
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      admin.failedLoginAttempts = 0;
      admin.lastLogin = new Date();
      await admin.save();

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

      // Set cookies individually for proper serverless handling
      res.setHeader('Set-Cookie', `adminToken=${accessToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=900`);
      res.appendHeader('Set-Cookie', `refreshToken=${refreshToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`);

      return res.status(200).json({
        success: true,
        message: "Login successful",
        accessToken: accessToken,
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        }
      });
    } catch (error) {
      console.error('[ERROR]', error);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
};
