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
  const origin = req.headers.origin || req.headers.referer;
  
  // For preflight, be permissive to allow the browser to proceed
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Set the origin - if it's in our whitelist, echo it back; otherwise use wildcard
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    console.log(`[CORS] ✅ Allowed origin: ${origin || 'no-origin'}`);
  } else {
    // Still allow the request but without credentials
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(`[CORS] ⚠️ Non-whitelisted origin: ${origin}`);
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
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
}

function handleHealth(req, res) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'production',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
}

function handleNotFound(req, res) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(404).json({
    success: false,
    message: 'Not found',
    path: req.url
  });
}

function handleOptions(req, res) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).end();
}

// ============================================
// Main Handler
// ============================================

async function handler(req, res) {
  try {
    console.log(`[API] ${req.method} ${req.url}`);
    
    // Always set CORS headers FIRST
    setCORSHeaders(req, res);
    
    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      console.log('[API] Handling OPTIONS preflight request');
      return handleOptions(req, res);
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
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}

module.exports = handler;