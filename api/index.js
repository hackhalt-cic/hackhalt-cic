/**
 * Ultra-Minimal CORS-First Handler
 * No dependencies, no complications - just set headers and respond
 */

// Simple synchronous body parser for small payloads
function parseBodySync(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const origin = (req.headers.origin || req.headers.Origin || '').trim();
  const method = req.method;
  const url = req.url;
  
  // CRITICAL: Set CORS headers FIRST, BEFORE anything else
  // This must happen for every single response
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  console.log(`[API] ${method} ${url} | Origin: ${origin || 'NONE'}`);
  
  // Handle OPTIONS immediately with headers set
  if (method === 'OPTIONS') {
    console.log('[API] OPTIONS preflight response');
    res.statusCode = 200;
    return res.end();
  }
  
  try {
    const urlPath = url.split('?')[0];
    
    // Health check
    if (urlPath === '/api/health') {
      console.log('[API] → Health check');
      res.statusCode = 200;
      return res.end(JSON.stringify({ 
        status: 'OK', 
        time: new Date().toISOString() 
      }));
    }
    
    // CORS test endpoint
    if (urlPath === '/api/cors-test') {
      console.log('[API] → CORS test endpoint');
      res.statusCode = 200;
      return res.end(JSON.stringify({
        message: 'CORS test - if you see this, CORS is working!',
        origin: origin || 'NONE',
        method: method,
        headers: {
          'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
          'Access-Control-Allow-Credentials': res.getHeader('Access-Control-Allow-Credentials'),
          'Access-Control-Allow-Methods': res.getHeader('Access-Control-Allow-Methods')
        }
      }));
    }
    
    // Login endpoint
    if (urlPath === '/api/auth/login' && method === 'POST') {
      console.log('[API] → Delegating to login handler');
      
      // Parse body first
      req.body = await parseBodySync(req);
      
      const loginHandler = require('./auth/login');
      return await loginHandler(req, res);
    }
    
    // 404
    res.statusCode = 404;
    return res.end(JSON.stringify({ 
      success: false, 
      message: 'Not found',
      path: urlPath
    }));
    
  } catch (error) {
    console.error('[API] ERROR:', error.message);
    
    res.statusCode = 500;
    return res.end(JSON.stringify({ 
      success: false, 
      message: 'Server error',
      error: error.message 
    }));
  }
};