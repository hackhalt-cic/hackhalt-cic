/**
 * Auth API Endpoint Handler for Vercel
 * Handles all authentication routes with proper CORS
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
// CORS Configuration - GLOBAL
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
// Main Handler
// ============================================
module.exports = async (req, res) => {
  // Get the origin EARLY
  const origin = req.headers.origin || req.headers.Origin || '';
  
  console.log(`\n[Auth API] ========================================`);
  console.log(`[Auth API] ${req.method} ${req.url}`);
  console.log(`[Auth API] Origin: ${origin || 'NO ORIGIN'}`);
  console.log(`[Auth API] Headers: ${JSON.stringify(Object.keys(req.headers))}`);
  
  // SET CORS HEADERS IMMEDIATELY - BEFORE ANYTHING ELSE
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, HEAD, PUT, DELETE, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  // Always set origin - browser will decide if it's allowed
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`[Auth API] ✅ Set Access-Control-Allow-Origin: ${origin}`);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    console.log(`[Auth API] ℹ️ No origin, using *`);
  }
  
  // Handle OPTIONS preflight immediately
  if (req.method === 'OPTIONS') {
    console.log(`[Auth API] Responding to OPTIONS preflight`);
    res.statusCode = 204;
    res.end();
    console.log(`[Auth API] ✅ OPTIONS response sent with CORS headers`);
    return;
  }
  
  try {
    // Route based on path
    const urlPath = req.url.split('?')[0];
    console.log(`[Auth API] URL Path: ${urlPath}`);
    
    // Handle login endpoint
    if (urlPath === '/api/auth/login' && req.method === 'POST') {
      console.log(`[Auth API] Routing to login handler...`);
      
      // Parse body
      req.body = await parseBody(req);
      console.log(`[Auth API] Body parsed. Username: ${req.body.username || 'MISSING'}`);
      
      // Load and execute login handler
      const loginHandler = require('./login');
      return await loginHandler(req, res);
    }
    
    // Handle other auth endpoints
    if (req.method === 'POST') {
      // Assume it's a login if method is POST but path doesn't match
      console.log(`[Auth API] POST to ${urlPath} - treating as login`);
      
      req.body = await parseBody(req);
      const loginHandler = require('./login');
      return await loginHandler(req, res);
    }
    
    // Not found
    console.log(`[Auth API] No handler for ${req.method} ${urlPath}`);
    res.statusCode = 404;
    res.end(JSON.stringify({ 
      success: false, 
      message: 'Not found',
      path: urlPath
    }));
    
  } catch (error) {
    console.error(`[Auth API] ❌ CAUGHT ERROR: ${error.message}`);
    console.error(`[Auth API] Stack: ${error.stack}`);
    
    // Ensure CORS headers are still set
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
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
