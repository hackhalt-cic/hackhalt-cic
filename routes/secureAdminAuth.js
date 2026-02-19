/**
 * Secure Admin Authentication Routes
 * Production-ready with:
 * - HTTP-only secure cookies
 * - Password hashing with bcrypt
 * - JWT tokens with expiration
 * - Rate limiting
 * - CSRF protection
 * - Audit logging
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { loginLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { secureAuthMiddleware, requireRole } = require('../middleware/secureAuthMiddleware');
const { validatePassword } = require('../utils/passwordPolicy');
const Admin = require('../models/Admin');

// ============================================
// POST /api/auth/login - Secure login endpoint
// ============================================
router.post('/login', loginLimiter, async (req, res) => {
  const startTime = Date.now();
  
  // CRITICAL: Force JSON headers BEFORE try block
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.removeHeader('X-Powered-By');
  
  try {
    const { username, password } = req.body;

    // 1. Input validation
    if (!username || !password) {
      console.warn(`[SECURITY] Login attempt with missing credentials from ${req.ip}`);
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
        message: 'Missing credentials'
      });
    }

    // 2. Sanitize input (prevent NoSQL injection)
    if (typeof username !== 'string' || username.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input format',
        message: 'Username must be a string'
      });
    }

    // 3. Find admin by username
    let admin;
    try {
      admin = await Admin.findOne({ username: username.trim() }).select('+password');
    } catch (dbError) {
      console.error('[ERROR] Database error finding admin:', dbError.message);
      return res.status(500).json({
        success: false,
        error: 'Database error. Please try again.',
        message: 'Server error'
      });
    }

    if (!admin) {
      // Timing attack mitigation: always perform password hash comparison
      // This prevents attackers from knowing if username exists
      try {
        await bcrypt.compare(password, '$2a$10$dummy');
      } catch (e) {
        // Ignore bcrypt errors during timing attack mitigation
      }
      
      console.warn(`[SECURITY] Login attempt with non-existent user: ${username} from ${req.ip}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Authentication failed'
      });
    }

    // 4. Verify admin is active
    if (!admin.isActive) {
      console.warn(`[SECURITY] Login attempt on inactive account: ${username} from ${req.ip}`);
      return res.status(401).json({
        success: false,
        error: 'Account is inactive',
        message: 'Account disabled'
      });
    }

    // 5. Compare password (timing-safe comparison)
    let isPasswordValid = false;
    try {
      isPasswordValid = await admin.comparePassword(password);
    } catch (compareError) {
      console.error('[ERROR] Password comparison error:', compareError.message);
      return res.status(500).json({
        success: false,
        error: 'Authentication service error',
        message: 'Server error'
      });
    }

    if (!isPasswordValid) {
      // Log failed attempt for security monitoring
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      admin.lastFailedLogin = new Date();

      // Lock account after 5 failed attempts
      if (admin.failedLoginAttempts >= 5) {
        admin.isActive = false;
        try {
          await admin.save();
        } catch (saveError) {
          console.error('[ERROR] Failed to save admin on lockout:', saveError.message);
        }
        console.warn(`[SECURITY] Account locked due to failed attempts: ${username} from ${req.ip}`);
        return res.status(401).json({
          success: false,
          error: 'Too many failed attempts. Account locked. Contact administrator.',
          message: 'Account locked'
        });
      }

      try {
        await admin.save();
      } catch (saveError) {
        console.error('[ERROR] Failed to save failed login attempt:', saveError.message);
      }
      console.warn(`[SECURITY] Failed login attempt for ${username} from ${req.ip} (attempt ${admin.failedLoginAttempts})`);
      
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Authentication failed'
      });
    }

    // 6. Reset failed login attempts on successful login
    admin.failedLoginAttempts = 0;
    admin.lastLogin = new Date();
    admin.lastLoginIP = req.ip;
    try {
      await admin.save();
    } catch (saveError) {
      console.error('[ERROR] Failed to save admin on successful login:', saveError.message);
      return res.status(500).json({
        success: false,
        error: 'Failed to update login status',
        message: 'Server error'
      });
    }

    // 7. Generate JWT token (short-lived)
    let accessToken;
    try {
      accessToken = jwt.sign(
        {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        },
        process.env.JWT_SECRET || 'your-secure-secret-key-change-in-production',
        { expiresIn: '15m' } // Short expiration for security
      );
    } catch (tokenError) {
      console.error('[ERROR] Failed to generate access token:', tokenError.message);
      return res.status(500).json({
        success: false,
        error: 'Token generation failed',
        message: 'Server error'
      });
    }

    // 8. Generate refresh token (long-lived, stored in secure cookie)
    let refreshToken;
    try {
      refreshToken = jwt.sign(
        { id: admin._id, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || 'your-secure-refresh-secret-key',
        { expiresIn: '7d' }
      );
    } catch (tokenError) {
      console.error('[ERROR] Failed to generate refresh token:', tokenError.message);
      return res.status(500).json({
        success: false,
        error: 'Token generation failed',
        message: 'Server error'
      });
    }

    // 9. Set HTTP-only secure cookie (prevents XSS attacks)
    res.cookie('adminToken', accessToken, {
      httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // CSRF protection
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined
    });

    // 9b. Set refresh token cookie (longer expiration)
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    });

    // 11. Return success response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('[ERROR] Login endpoint error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Authentication service error',
      message: 'Server error'
    });
  }
});

// ============================================
// POST /api/auth/refresh - Token refresh endpoint
// ============================================
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token not found'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Fetch fresh admin data
    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Admin not found or inactive'
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Set new token cookie
    res.cookie('adminToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });

    return res.json({
      success: true,
      message: 'Token refreshed'
    });

  } catch (error) {
    console.error('[ERROR] Token refresh error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// ============================================
// POST /api/auth/logout - Secure logout
// ============================================
router.post('/logout', secureAuthMiddleware, (req, res) => {
  // Clear authentication cookies with correct paths
  res.clearCookie('adminToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });

  console.log(`[AUDIT] Logout: ${req.admin.username}`);

  return res.json({
    success: true,
    message: 'Logout successful'
  });
});

// ============================================
// GET /api/auth/profile - Get current admin profile (protected)
// ============================================
router.get('/profile', secureAuthMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    return res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        lastLogin: admin.lastLogin
      }
    });

  } catch (error) {
    console.error('[ERROR] Profile fetch error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// ============================================
// POST /api/auth/change-password - Change password (protected)
// ============================================
router.post('/change-password', secureAuthMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'New passwords do not match'
      });
    }

    // Validate password policy
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Password does not meet security requirements',
        details: validation.errors
      });
    }

    // Fetch admin with password
    const admin = await Admin.findById(req.admin.id).select('+password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        error: 'Admin not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Prevent using same password
    const isSamePassword = await admin.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        error: 'New password must be different from current password'
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    console.log(`[AUDIT] Password changed: ${req.admin.username}`);

    return res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('[ERROR] Password change error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

module.exports = router;
