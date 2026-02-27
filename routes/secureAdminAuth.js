/**
 * Secure Admin Authentication Routes
 * Production-ready with:
 * - HTTP-only secure cookies
 * - Password hashing with bcrypt (12 rounds)
 * - JWT tokens with short expiration
 * - Rate limiting on all sensitive endpoints
 * - CSRF protection
 * - Account lockout after failed attempts
 * - Password reset via email with crypto tokens
 * - Account registration with email verification
 * - Password history enforcement
 * - Input validation & NoSQL injection prevention
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { loginLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { secureAuthMiddleware, requireRole } = require('../middleware/secureAuthMiddleware');
const { validatePassword } = require('../utils/passwordPolicy');
const Admin = require('../models/Admin');
const { sendPasswordResetEmail, sendVerificationEmail, sendAccountApprovedEmail } = require('../services/emailService');

const router = express.Router();

// ============================================
// Input sanitization helper
// ============================================
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  // Strip MongoDB operators and dangerous characters
  return input.replace(/[\${}()]/g, '').trim().substring(0, 200);
};

// ============================================
// POST /api/auth/login - Secure login endpoint
// ============================================
router.post('/login', loginLimiter, async (req, res) => {
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  
  const origin = req.get('Origin');
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  let responseSent = false;
  const startTime = Date.now();
  
  const sendJsonResponse = (statusCode, data) => {
    if (responseSent) return;
    responseSent = true;
    clearTimeout(requestTimeout);
    res.status(statusCode).json(data);
  };
  
  const requestTimeout = setTimeout(() => {
    if (!responseSent) {
      sendJsonResponse(504, { success: false, error: 'Request timeout. Please try again.' });
    }
  }, 25000);
  
  try {
    const { username, password } = req.body;

    // 1. Input validation
    if (!username || !password) {
      return sendJsonResponse(400, { success: false, error: 'Username and password are required' });
    }

    // 2. Sanitize input (prevent NoSQL injection)
    const cleanUsername = sanitizeInput(username);
    if (typeof username !== 'string' || username.length > 100 || cleanUsername !== username.trim()) {
      return sendJsonResponse(400, { success: false, error: 'Invalid input format' });
    }

    // 3. Find admin by username
    let admin;
    try {
      admin = await Admin.findOne({ username: cleanUsername }).select('+password +failedLoginAttempts +lastFailedLogin +accountLockedUntil');
    } catch (dbError) {
      console.error('[AUTH] Database error:', dbError.message);
      return sendJsonResponse(500, { success: false, error: 'Database error. Please try again.' });
    }

    if (!admin) {
      // Timing attack mitigation
      await bcrypt.compare(password, '$2a$12$dummyhashvaluefortimingattak000000000000000000');
      return sendJsonResponse(401, { success: false, error: 'Invalid credentials' });
    }

    // 4. Check account lockout
    if (admin.isAccountLocked && admin.isAccountLocked()) {
      const remainingMs = admin.accountLockedUntil - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60000);
      return sendJsonResponse(423, { 
        success: false, 
        error: `Account locked. Try again in ${remainingMin} minute(s).` 
      });
    }

    // 5. Verify admin is active
    if (!admin.isActive) {
      return sendJsonResponse(401, { success: false, error: 'Account is inactive. Contact administrator.' });
    }

    // 6. Check email verification for non-super-admins
    if (!admin.isEmailVerified && admin.role !== 'super-admin') {
      return sendJsonResponse(403, { success: false, error: 'Please verify your email before logging in.' });
    }

    // 7. Check approval for admin/user roles
    if (!admin.isApproved && admin.role !== 'super-admin') {
      return sendJsonResponse(403, { success: false, error: 'Account pending approval by administrator.' });
    }

    // 8. Compare password
    let isPasswordValid = false;
    try {
      isPasswordValid = await admin.comparePassword(password);
    } catch (compareError) {
      console.error('[AUTH] Password comparison error:', compareError.message);
      return sendJsonResponse(500, { success: false, error: 'Authentication service error' });
    }

    if (!isPasswordValid) {
      admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
      admin.lastFailedLogin = new Date();

      // Progressive lockout: 5 attempts = 30 min lock, 10 attempts = deactivate
      if (admin.failedLoginAttempts >= 10) {
        admin.isActive = false;
        await admin.save();
        console.warn(`[SECURITY] Account deactivated due to 10+ failed attempts: ${cleanUsername}`);
        return sendJsonResponse(401, { 
          success: false, 
          error: 'Account has been locked permanently. Contact administrator.' 
        });
      } else if (admin.failedLoginAttempts >= 5) {
        admin.lockAccount(30); // Lock for 30 minutes
        await admin.save();
        console.warn(`[SECURITY] Account locked for 30min: ${cleanUsername} (${admin.failedLoginAttempts} attempts)`);
        return sendJsonResponse(423, { 
          success: false, 
          error: 'Too many failed attempts. Account locked for 30 minutes.' 
        });
      }

      await admin.save();
      return sendJsonResponse(401, { success: false, error: 'Invalid credentials' });
    }

    // 9. Reset failed login attempts on success
    admin.failedLoginAttempts = 0;
    admin.accountLockedUntil = undefined;
    admin.lastLogin = new Date();
    admin.lastLoginIP = req.ip;
    await admin.save();

    // 10. Generate JWT (short-lived)
    if (!process.env.JWT_SECRET) {
      console.error('[AUTH] CRITICAL: JWT_SECRET not set in environment');
      return sendJsonResponse(500, { success: false, error: 'Server configuration error' });
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

    // 11. Set HTTP-only secure cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined
    };

    res.cookie('adminToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return sendJsonResponse(200, {
      success: true,
      message: 'Login successful',
      accessToken,
      admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role }
    });

  } catch (error) {
    console.error('[AUTH] Login error:', error.message);
    return sendJsonResponse(500, { success: false, error: 'Authentication service error' });
  }
});

// ============================================
// POST /api/auth/register - Account registration
// ============================================
router.post('/register', loginLimiter, async (req, res) => {
  try {
    const { username, email, password, confirmPassword, role } = req.body;

    // 1. Input validation
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }

    // 2. Sanitize inputs
    const cleanUsername = sanitizeInput(username);
    const cleanEmail = sanitizeInput(email).toLowerCase();

    if (cleanUsername.length < 3 || cleanUsername.length > 50) {
      return res.status(400).json({ success: false, error: 'Username must be 3-50 characters' });
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
      return res.status(400).json({ success: false, error: 'Username can only contain letters, numbers, underscores, dots, and hyphens' });
    }

    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }

    // 3. Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors 
      });
    }

    // 4. Determine role (only allow 'user' or 'admin', never 'super-admin' via registration)
    const requestedRole = (role === 'admin') ? 'admin' : 'user';

    // 5. Check for existing user
    const existingUser = await Admin.findOne({ $or: [{ username: cleanUsername }, { email: cleanEmail }] });
    if (existingUser) {
      // Generic message to prevent username/email enumeration
      return res.status(409).json({ success: false, error: 'An account with these details already exists' });
    }

    // 6. Create new account
    const newAdmin = new Admin({
      username: cleanUsername,
      email: cleanEmail,
      password,
      role: requestedRole,
      isActive: true,
      isEmailVerified: false,
      isApproved: false // Requires admin approval
    });

    // 7. Generate email verification token
    const verifyToken = newAdmin.generateEmailVerificationToken();
    await newAdmin.save();

    // 8. Send verification email
    try {
      await sendVerificationEmail(cleanEmail, cleanUsername, verifyToken);
    } catch (emailError) {
      console.error('[AUTH] Failed to send verification email:', emailError.message);
      // Don't fail registration if email fails, but inform user
    }

    console.log(`[AUDIT] New ${requestedRole} account registered: ${cleanUsername} (${cleanEmail})`);

    return res.status(201).json({
      success: true,
      message: `Account created successfully. Please check your email (${cleanEmail}) to verify your account. Admin accounts require approval before access is granted.`
    });

  } catch (error) {
    console.error('[AUTH] Registration error:', error.message);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, error: 'An account with these details already exists' });
    }
    return res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
});

// ============================================
// POST /api/auth/verify-email - Email verification
// ============================================
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ success: false, error: 'Verification token is required' });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await Admin.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!admin) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification token' });
    }

    // Mark email as verified
    admin.isEmailVerified = true;
    admin.emailVerificationToken = undefined;
    admin.emailVerificationExpires = undefined;
    await admin.save();

    console.log(`[AUDIT] Email verified: ${admin.username} (${admin.email})`);

    return res.json({ 
      success: true, 
      message: 'Email verified successfully. Your account is pending admin approval.' 
    });

  } catch (error) {
    console.error('[AUTH] Email verification error:', error.message);
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// ============================================
// POST /api/auth/forgot-password - Request password reset
// ============================================
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Email address is required' });
    }

    const cleanEmail = sanitizeInput(email).toLowerCase();

    // Always respond with the same message to prevent email enumeration
    const genericResponse = { 
      success: true, 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    };

    const admin = await Admin.findOne({ email: cleanEmail }).select('+resetPasswordToken +resetPasswordExpires');

    if (!admin) {
      // Don't reveal that the email doesn't exist - return same response
      return res.json(genericResponse);
    }

    if (!admin.isActive) {
      return res.json(genericResponse); // Same response for inactive accounts
    }

    // Generate reset token
    const resetToken = admin.generateResetToken();
    await admin.save({ validateBeforeSave: false });

    // Send reset email
    try {
      await sendPasswordResetEmail(admin.email, admin.username, resetToken);
    } catch (emailError) {
      console.error('[AUTH] Failed to send reset email:', emailError.message);
      // Rollback token if email fails
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpires = undefined;
      await admin.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, error: 'Failed to send reset email. Please try again.' });
    }

    console.log(`[AUDIT] Password reset requested: ${admin.username} (${admin.email})`);
    return res.json(genericResponse);

  } catch (error) {
    console.error('[AUTH] Forgot password error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

// ============================================
// POST /api/auth/reset-password - Reset password with token
// ============================================
router.post('/reset-password', passwordResetLimiter, async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password does not meet security requirements',
        details: passwordValidation.errors 
      });
    }

    // Hash token to find in DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await Admin.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires +password +passwordHistory');

    if (!admin) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset token. Please request a new one.' });
    }

    // Check password history
    const isReused = await admin.isPasswordInHistory(newPassword);
    if (isReused) {
      return res.status(400).json({ 
        success: false, 
        error: 'This password has been used recently. Please choose a different password.' 
      });
    }

    // Also check current password
    const isSameAsCurrent = await admin.comparePassword(newPassword);
    if (isSameAsCurrent) {
      return res.status(400).json({ success: false, error: 'New password must be different from current password' });
    }

    // Set new password
    admin.password = newPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    admin.failedLoginAttempts = 0;
    admin.accountLockedUntil = undefined;
    await admin.save();

    console.log(`[AUDIT] Password reset completed: ${admin.username}`);

    return res.json({ success: true, message: 'Password reset successful. You can now log in with your new password.' });

  } catch (error) {
    console.error('[AUTH] Reset password error:', error.message);
    return res.status(500).json({ success: false, error: 'Password reset failed' });
  }
});

// ============================================
// POST /api/auth/refresh - Token refresh endpoint
// ============================================
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ success: false, error: 'Refresh token not found' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    const admin = await Admin.findById(decoded.id);
    if (!admin || !admin.isActive) {
      return res.status(401).json({ success: false, error: 'Admin not found or inactive' });
    }

    // Check if password was changed after token was issued
    if (admin.passwordChangedAt) {
      const changedTimestamp = parseInt(admin.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({ success: false, error: 'Password recently changed. Please log in again.' });
      }
    }

    const newAccessToken = jwt.sign(
      { id: admin._id, username: admin.username, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '15m', issuer: 'hackhalt-cic', audience: 'hackhalt-admin' }
    );

    res.cookie('adminToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });

    return res.json({ success: true, message: 'Token refreshed', accessToken: newAccessToken });

  } catch (error) {
    console.error('[AUTH] Token refresh error:', error.message);
    return res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
});

// ============================================
// POST /api/auth/logout - Secure logout
// ============================================
router.post('/logout', secureAuthMiddleware, (req, res) => {
  res.clearCookie('adminToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  console.log(`[AUDIT] Logout: ${req.admin.username}`);
  return res.json({ success: true, message: 'Logout successful' });
});

// ============================================
// GET /api/auth/profile - Get current admin profile (protected)
// ============================================
router.get('/profile', secureAuthMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    return res.json({
      success: true,
      admin: { id: admin._id, username: admin.username, email: admin.email, role: admin.role, lastLogin: admin.lastLogin }
    });

  } catch (error) {
    console.error('[AUTH] Profile fetch error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

// ============================================
// POST /api/auth/change-password - Change password (protected)
// ============================================
router.post('/change-password', secureAuthMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'New passwords do not match' });
    }

    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, error: 'Password does not meet security requirements', details: validation.errors });
    }

    const admin = await Admin.findById(req.admin.id).select('+password +passwordHistory');
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    const isCurrentPasswordValid = await admin.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }

    const isSamePassword = await admin.comparePassword(newPassword);
    if (isSamePassword) {
      return res.status(400).json({ success: false, error: 'New password must be different from current password' });
    }

    // Check password history
    const isReused = await admin.isPasswordInHistory(newPassword);
    if (isReused) {
      return res.status(400).json({ success: false, error: 'This password has been used recently. Choose a different one.' });
    }

    admin.password = newPassword;
    await admin.save();

    console.log(`[AUDIT] Password changed: ${req.admin.username}`);
    return res.json({ success: true, message: 'Password changed successfully' });

  } catch (error) {
    console.error('[AUTH] Password change error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// ============================================
// POST /api/auth/approve-account - Approve a pending account (super-admin only)
// ============================================
router.post('/approve-account', secureAuthMiddleware, async (req, res) => {
  try {
    // Only super-admins can approve accounts
    if (req.admin.role !== 'super-admin') {
      return res.status(403).json({ success: false, error: 'Only super-admins can approve accounts' });
    }

    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ success: false, error: 'Account ID is required' });
    }

    const account = await Admin.findById(accountId);
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    if (account.isApproved) {
      return res.status(400).json({ success: false, error: 'Account is already approved' });
    }

    account.isApproved = true;
    account.approvedBy = req.admin.id;
    await account.save();

    // Send approval notification email
    try {
      await sendAccountApprovedEmail(account.email, account.username, account.role);
    } catch (emailErr) {
      console.error('[AUTH] Failed to send approval email:', emailErr.message);
    }

    console.log(`[AUDIT] Account approved: ${account.username} by ${req.admin.username}`);
    return res.json({ success: true, message: `Account ${account.username} approved successfully` });

  } catch (error) {
    console.error('[AUTH] Account approval error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to approve account' });
  }
});

// ============================================
// GET /api/auth/pending-accounts - List pending accounts (super-admin only)
// ============================================
router.get('/pending-accounts', secureAuthMiddleware, async (req, res) => {
  try {
    if (req.admin.role !== 'super-admin') {
      return res.status(403).json({ success: false, error: 'Only super-admins can view pending accounts' });
    }

    const pending = await Admin.find({ isApproved: false, isEmailVerified: true })
      .select('username email role createdAt isActive')
      .sort({ createdAt: -1 });

    return res.json({ success: true, accounts: pending });

  } catch (error) {
    console.error('[AUTH] Pending accounts error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch pending accounts' });
  }
});

// ============================================
// DELETE /api/auth/reject-account/:id - Reject/delete a pending account (super-admin only)
// ============================================
router.delete('/reject-account/:id', secureAuthMiddleware, async (req, res) => {
  try {
    if (req.admin.role !== 'super-admin') {
      return res.status(403).json({ success: false, error: 'Only super-admins can reject accounts' });
    }

    const account = await Admin.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    // Prevent deleting super-admin accounts
    if (account.role === 'super-admin') {
      return res.status(403).json({ success: false, error: 'Cannot delete super-admin accounts' });
    }

    await Admin.findByIdAndDelete(req.params.id);
    console.log(`[AUDIT] Account rejected/deleted: ${account.username} by ${req.admin.username}`);
    return res.json({ success: true, message: `Account ${account.username} rejected and removed` });

  } catch (error) {
    console.error('[AUTH] Account rejection error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to reject account' });
  }
});

module.exports = router;
