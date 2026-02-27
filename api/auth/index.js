/**
 * Auth API Endpoint Handler for Vercel
 * Handles all authentication routes with proper CORS
 */

const crypto = require('crypto');

// ============================================
// Body Parser (with size limit)
// ============================================
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    const MAX_BODY_SIZE = 10 * 1024; // 10KB max

    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error('Request body too large'));
        return;
      }
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (error) {
        reject(new Error('Invalid JSON in request body'));
      }
    });

    req.on('error', reject);
  });
}

// ============================================
// CORS Configuration
// ============================================
const ALLOWED_ORIGINS = [
  'https://hackhalt.org',
  'https://www.hackhalt.org',
  'https://hackhalt-cic-lemon.vercel.app',
  'https://hackhalt-cic.vercel.app',
  'http://localhost:5000',
  'http://localhost:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:3000'
];

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;

  const regexPatterns = [
    /^https:\/\/[\w-]+\.vercel\.app$/,
    /^https:\/\/[\w-]+\.hostinger\.\w+$/
  ];

  return regexPatterns.some(pattern => pattern.test(origin));
}

// ============================================
// Main Handler
// ============================================
module.exports = async (req, res) => {
  const origin = req.headers.origin || req.headers.Origin || '';

  // SET CORS HEADERS IMMEDIATELY
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    // Reject disallowed origins
    res.statusCode = 403;
    return res.end(JSON.stringify({ success: false, error: 'Origin not allowed' }));
  }

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    const urlPath = req.url.split('?')[0];

    // Route: POST /api/auth/login
    if (urlPath === '/api/auth/login' && req.method === 'POST') {
      req.body = await parseBody(req);
      const loginHandler = require('./login');
      return await loginHandler(req, res);
    }

    // Route: POST /api/auth/register
    if (urlPath === '/api/auth/register' && req.method === 'POST') {
      req.body = await parseBody(req);
      const registerHandler = require('./register');
      return await registerHandler(req, res);
    }

    // Route: POST /api/auth/forgot-password
    if (urlPath === '/api/auth/forgot-password' && req.method === 'POST') {
      req.body = await parseBody(req);
      const forgotPasswordHandler = require('./forgot-password');
      return await forgotPasswordHandler(req, res);
    }

    // Route: POST /api/auth/reset-password
    if (urlPath === '/api/auth/reset-password' && req.method === 'POST') {
      req.body = await parseBody(req);
      const resetPasswordHandler = require('./reset-password');
      return await resetPasswordHandler(req, res);
    }

    // Route: POST /api/auth/verify-email
    if (urlPath === '/api/auth/verify-email' && req.method === 'POST') {
      req.body = await parseBody(req);
      const verifyEmailHandler = require('./verify-email');
      return await verifyEmailHandler(req, res);
    }

    // Not found
    res.statusCode = 404;
    res.end(JSON.stringify({ success: false, error: 'Not found', path: urlPath }));

  } catch (error) {
    console.error(`[Auth API] Error: ${error.message}`);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
    }
  }
};
