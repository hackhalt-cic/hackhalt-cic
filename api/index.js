/**
 * Main API Handler for Vercel
 * Routes requests and handles CORS directly
 */

const mongoose = require('mongoose');

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
  if (!origin) return true; // Allow requests without origin header
  
  // Check exact matches
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  // Check regex patterns
  const regexPatterns = [
    /https:\/\/.*\.vercel\.app$/,
    /https:\/\/.*\.hostinger\..*/,
    /https:\/\/hackhalt-cic.*\.hostinger\.com$/
  ];
  
  return regexPatterns.some(pattern => pattern.test(origin));
}

function setCORSHeaders(req, res) {
  // Get origin - Node.js normalizes header names to lowercase
  const origin = req.headers.origin || req.headers.Origin;
  
  console.log(`[CORS] Incoming origin: ${origin}`);
  console.log(`[CORS] Request method: ${req.method}`);
  
  // Set standard CORS methods and headers that apply to all responses
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Always include credentials support
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Set the origin - if it's in our whitelist, echo it back; otherwise use wildcard
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`[CORS] ✅ Allowed origin: ${origin}`);
  } else if (origin) {
    // For any origin, still allow it to see if it's a legitimate request
    // The browser will handle the decision based on Access-Control-Allow-Origin
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`[CORS] ℹ️ Origin ${origin} allowed to test`);
  } else {
    // No origin header - this is a same-origin or non-browser request
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(`[CORS] ℹ️ No origin header provided, using *`);
  }
  
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    
    req.on('data', chunk => {
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
// Handler Functions
// ============================================

async function handleLogin(req, res) {
  try {
    // Parse request body if not already parsed
    if (!req.body) {
      req.body = await parseBody(req);
    }
    
    const loginHandler = require('./auth/login');
    return await loginHandler(req, res);
  } catch (error) {
    console.error('[Login] Error:', error.message);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    return res.end(JSON.stringify({
      success: false,
      message: 'Server error',
      error: error.message
    }));
  }
}

function handleHealth(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  return res.end(JSON.stringify({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'production',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  }));
}

function handleNotFound(req, res) {
  res.statusCode = 404;
  return res.end(JSON.stringify({
    success: false,
    message: 'Not found',
    path: req.url
  }) path: req.url
  });
}

function handleOptions(req, res) {
  console.log('[API] OPTIONS request - sending CORS preflight response');
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(200);
  return res.end();
}

// ============================================
// Main Handler
// ============================================

async function handler(req, res) {
  try {
    console.log(`[API] ${req.method} ${req.url}`);
    console.log(`[API] Origin header: ${req.headers.origin}`);
    
    // Always set CORS headers FIRST
    setCORSHeaders(req, res);
    
    // Handle preflight OPTIONS requests immediately
    if (req.method === 'OPTIONS') {
      cos.statusCode = 200;
      return res.end();
    }
    
    // Parse URL and route appropriately
    const urlPath = req.url.split('?')[0];
    
    if (urlPath === '/api/health' && req.method === 'GET') {
      return handleHealth(req, res);
    }
    
    if (urlPath === '/api/auth/login' && req.method === 'POST') {
      return handleLogin(req, res);
    }
    
    // 404 for unknown routes
    return handleNotFound(req, res);
    
  } catch (error) {
    console.error('[API] Unhandled error:', error);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    return res.end(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error.message
    }) error: error.message
    });
  }
}

module.exports = handler;