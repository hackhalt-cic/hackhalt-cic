/**
 * Auth API Endpoint Handler
 * Handles all authentication routes
 */

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

function setCORSHeaders(req, res) {
  const origin = req.headers.origin || req.headers.Origin;
  
  console.log(`[Auth CORS] Origin: ${origin}`);
  
  // Always set these headers
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Set origin
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
}

// ============================================
// Main Handler
// ============================================
module.exports = async (req, res) => {
  try {
    // Set CORS headers FIRST - before anything else
    setCORSHeaders(req, res);
    
    console.log(`[Auth] ${req.method} ${req.url}`);
    
    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      console.log('[Auth] Handling OPTIONS preflight');
      res.statusCode = 200;
      return res.end();
    }
    
    // Route to login endpoint
    if (req.url === '/api/auth/login' || req.url.startsWith('/api/auth/login?')) {
      if (req.method === 'POST') {
        // Parse the request body
        req.body = await parseBody(req);
        const loginHandler = require('./login');
        return await loginHandler(req, res);
      } else {
        res.statusCode = 405;
        return res.end(JSON.stringify({ success: false, message: 'Method not allowed' }));
      }
    }
    
    // Unknown auth endpoint
    res.statusCode = 404;
    return res.end(JSON.stringify({ success: false, message: 'Not found' }));
    
  } catch (error) {
    console.error('[Auth] Unhandled error:', error.message);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    return res.end(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error.message
    }));
  }
};
