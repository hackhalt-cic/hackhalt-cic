const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Admin = require('../../models/Admin');

module.exports = async function handler(req, res) {
  // Set JSON content type (if not already set)
  if (!res.getHeader('Content-Type')) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
  }
  
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "POST") {
    try {
      // Ensure database connection
      if (!mongoose.connections[0].readyState) {
        console.log('[Login] Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
      }

      const { username, password } = req.body;
      console.log('[Login] Attempt for user:', username);

      if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required" });
      }

      const admin = await Admin.findOne({ username: username.trim() }).select('+password');

      if (!admin) {
        console.log('[Login] User not found:', username);
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      if (!admin.isActive) {
        console.log('[Login] Account inactive:', username);
        return res.status(401).json({ success: false, message: "Account is inactive" });
      }

      const isPasswordValid = await admin.comparePassword(password);

      if (!isPasswordValid) {
        console.log('[Login] Invalid password for user:', username);
        admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
        admin.lastFailedLogin = new Date();
        await admin.save();
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      console.log('[Login] Valid password for user:', username);
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

      console.log('[Login] Success for user:', username);
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
      console.error('[Login] Error:', error.message);
      return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
};
