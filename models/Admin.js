const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide username'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username cannot exceed 50 characters'],
    match: [/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, underscores, dots, and hyphens']
  },
  email: {
    type: String,
    required: [true, 'Please provide email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: [12, 'Password must be at least 12 characters'],
    select: false // Don't return password by default
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super-admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    select: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  },
  lastLoginIP: {
    type: String
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  lastFailedLogin: {
    type: Date,
    select: false
  },
  accountLockedUntil: {
    type: Date,
    select: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpires: {
    type: Date,
    select: false
  },
  passwordChangedAt: {
    type: Date
  },
  passwordHistory: {
    type: [String],
    select: false,
    default: []
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  isApproved: {
    type: Boolean,
    default: false
  }
});

// Index for faster lookups
adminSchema.index({ resetPasswordToken: 1 });
adminSchema.index({ emailVerificationToken: 1 });
adminSchema.index({ username: 1, email: 1 });

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Store old password hash in history (max 5)
    if (this.password && this.isModified('password') && !this.isNew) {
      const currentHash = this.password;
      if (!this.passwordHistory) this.passwordHistory = [];
      this.passwordHistory.unshift(currentHash);
      if (this.passwordHistory.length > 5) {
        this.passwordHistory = this.passwordHistory.slice(0, 5);
      }
    }

    const salt = await bcrypt.genSalt(12); // Increased from 10 to 12 rounds
    this.password = await bcrypt.hash(this.password, salt);
    this.passwordChangedAt = new Date();
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
adminSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Check if password was used before (in last 5 passwords)
adminSchema.methods.isPasswordInHistory = async function(newPassword) {
  if (!this.passwordHistory || this.passwordHistory.length === 0) return false;
  for (const oldHash of this.passwordHistory) {
    const isMatch = await bcrypt.compare(newPassword, oldHash);
    if (isMatch) return true;
  }
  return false;
};

// Generate password reset token (cryptographically secure)
adminSchema.methods.generateResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  // Store hashed version in DB (never store raw tokens)
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
  return resetToken; // Return raw token (sent via email)
};

// Generate email verification token
adminSchema.methods.generateEmailVerificationToken = function() {
  const verifyToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return verifyToken;
};

// Check if account is locked
adminSchema.methods.isAccountLocked = function() {
  if (this.accountLockedUntil && this.accountLockedUntil > Date.now()) {
    return true;
  }
  return false;
};

// Lock account for a duration
adminSchema.methods.lockAccount = function(durationMinutes = 30) {
  this.accountLockedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
};

module.exports = mongoose.model('Admin', adminSchema);
