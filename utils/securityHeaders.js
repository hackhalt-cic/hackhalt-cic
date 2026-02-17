/**
 * Security headers middleware for production
 * Prevents common web vulnerabilities like XSS, Clickjacking, etc.
 */

const helmet = require('helmet');

const securityHeaders = helmet({
  // Prevent clickjacking attacks
  frameguard: {
    action: 'deny' // Can also be 'sameorigin'
  },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // Enable XSS protection in older browsers
  xssFilter: true,
  
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'fonts.googleapis.com', 'cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com', 'cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https:'],
      // Block form submissions to external domains
      formAction: ["'self'"]
    }
  },
  
  // Prevent leaking referrer information
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // HTTP Strict Transport Security - forces HTTPS
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Prevent unauthorized DNS prefetching
  dnsPrefetchControl: true,
  
  // Disable powered-by header
  hidePoweredBy: true
});

module.exports = securityHeaders;
