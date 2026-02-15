const rateLimit = require('express-rate-limit');

/**
 * Rate limiting middleware to prevent brute force attacks
 * This prevents attackers from trying multiple passwords quickly
 */

// Login rate limiter: 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: false, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Store in memory (use Redis for production with multiple server instances)
  store: new rateLimit.MemoryStore(),
  // Custom handler
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: 15 * 60
    });
  },
  skip: (req) => {
    // Don't rate limit in development
    return process.env.NODE_ENV !== 'production';
  }
});

// Stricter limiter for password reset: 3 attempts per hour
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts',
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again in 1 hour.',
      retryAfter: 60 * 60
    });
  }
});

// General API rate limiter: 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: false,
  legacyHeaders: false
});

module.exports = {
  loginLimiter,
  passwordResetLimiter,
  apiLimiter
};
