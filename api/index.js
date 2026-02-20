/**
 * Main API Handler for Vercel - CORS-First Approach
 * All routes go through this handler with CORS headers set immediately
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
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  
  const regexPatterns = [
    /https:\/\/.*\.vercel\.app$/,
    /https:\/\/.*\.hostinger\..*/
  ];
  
  return regexPatterns.some(pattern => pattern.test(origin));
}

// ============================================
// Body Parser
// ============================================
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
// MAIN HANDLER ENTRY POINT
// ============================================
module.exports = async (req, res) => {
  const origin = req.headers.origin || req.headers.Origin || '';
  const method = req.method;
  const url = req.url;
  
  console.log(`\n[API] ═══════════════════════════════════════`);
  console.log(`[API] ${method} ${url}`);
  console.log(`[API] Origin: ${origin || 'NONE'}`);
  
  // =========================================
  // CRITICAL: SET CORS HEADERS IMMEDIATELY
  // =========================================
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, HEAD, POST, PUT, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  // Always set the origin header
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`[API] ✅ CORS Allow-Origin: ${origin}`);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(`[API] ✅ CORS Allow-Origin: *`);
  }
  
  // =========================================
  // HANDLE OPTIONS PREFLIGHT IMMEDIATELY
  // =========================================
  if (method === 'OPTIONS') {
    console.log('[API] OPTIONS preflight - returning 204');
    res.statusCode = 204;
    res.end();
    return;
  }
  
  try {
    // Parse request path
    const urlPath = url.split('?')[0];
    
    // =========================================
    // ROUTE HANDLER
    // =========================================
    
    // Health check endpoint
    if (urlPath === '/api/health') {
      console.log('[API] → Health endpoint');
      res.statusCode = 200;
      res.end(JSON.stringify({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: 'production',
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      }));
      return;
    }
    
    // Login endpoint
    if (urlPath === '/api/auth/login' && method === 'POST') {
      console.log('[API] → Login endpoint');
      
      // Parse body
      req.body = await parseBody(req);
      
      // Load and execute login handler
      const loginHandler = require('./auth/login');
      return await loginHandler(req, res);
    }
    
    // Catch-all 404
    console.log('[API] → 404 Not Found');
    res.statusCode = 404;
    res.end(JSON.stringify({
      success: false,
      message: 'API endpoint not found',
      path: urlPath,
      method: method
    }));
    
  } catch (error) {
    console.error('[API] ❌ ERROR:', error.message);
    console.error('[API] Stack:', error.stack);
    
    // Ensure headers are still set in error case
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
    }
    
    res.statusCode = 500;
    res.end(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error.message
    }));
  }
};