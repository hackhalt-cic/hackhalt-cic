/**
 * Catch-all API Handler for Vercel
 * Handles all /api/* routes with proper CORS
 * This file uses Vercel's [...].js syntax to capture all paths
 */

const mongoose = require('mongoose');
const ContactSubmission = require('../models/ContactSubmission');
const BlogSubmission = require('../models/BlogSubmission');

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
  
  console.log('');
  console.log('═════════════════════════════════════════════════════');
  console.log('[API] 🎯 RECEIVED REQUEST');
  console.log('[API] Method:', method);
  console.log('[API] URL:', url);
  console.log('[API] Origin:', origin || 'NONE');
  console.log('═════════════════════════════════════════════════════');
  
  // CRITICAL: Set CORS headers FIRST, BEFORE anything else
  // This must happen for every single response
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  // Handle OPTIONS immediately with headers set
  if (method === 'OPTIONS') {
    console.log('[API] OPTIONS preflight response');
    res.statusCode = 200;
    return res.end();
  }
  
  try {
    // Parse URL path (strip query params)
    let urlPath = url.split('?')[0];
    // Ensure path starts with /
    if (!urlPath.startsWith('/')) {
      urlPath = '/' + urlPath;
    }
    
    // Normalize: remove /api prefix if present so we can check paths consistently
    let normalizedPath = urlPath.startsWith('/api/') ? urlPath.substring(4) : urlPath;
    if (normalizedPath === '') normalizedPath = '/';
    
    console.log('[API] Raw URL Path:', urlPath);
    console.log('[API] Normalized Path:', normalizedPath, '| Full URL:', url);
    
    // Health check
    if (normalizedPath === '/health') {
      console.log('[API] → Health check');
      res.statusCode = 200;
      return res.end(JSON.stringify({ 
        status: 'OK', 
        time: new Date().toISOString() 
      }));
    }
    
    // CORS test endpoint
    if (normalizedPath === '/cors-test') {
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
    if ((normalizedPath === '/auth/login') && method === 'POST') {
      console.log('[API] → Delegating to login handler');
      
      // Parse body first
      req.body = await parseBodySync(req);
      
      const loginHandler = require('../api/auth/login');
      return await loginHandler(req, res);
    }
    
    // Submissions endpoints - Direct handling
    if (normalizedPath.startsWith('/submissions')) {
      console.log('[API] ✅ MATCHED: submissions endpoint');
      console.log('[API] Normalized Path:', normalizedPath);
      console.log('[API] Method:', method);
      console.log('[API] Full URL:', url);
      
      // Initialize database if needed
      if (mongoose.connections[0].readyState === 0) {
        console.log('[API] 🔌 Connecting to MongoDB');
        try {
          await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 5000
          });
          console.log('[API] ✅ MongoDB connected');
        } catch (dbError) {
          console.error('[API] ❌ Database connection failed:', dbError.message);
          res.statusCode = 503;
          return res.end(JSON.stringify({
            success: false,
            error: 'Database unavailable',
            message: dbError.message
          }));
        }
      } else {
        console.log('[API] ✅ MongoDB already connected (state:', mongoose.connections[0].readyState, ')');
      }
      
      // GET /submissions/contact
      if ((normalizedPath === '/submissions/contact') && method === 'GET') {
        console.log('[API] 📋 GET /submissions/contact');
        try {
          const { purpose } = Object.fromEntries(new URL(`http://dummy${url}`).searchParams);
          console.log('[API] Purpose filter:', purpose);
          
          const query = {};
          if (purpose) {
            query.purpose = purpose;
          }
          
          console.log('[API] 🔍 Querying ContactSubmission with:', query);
          const submissions = await ContactSubmission.find(query)
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();
          
          console.log('[API] ✅ Found', submissions.length, 'submissions');
          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            submissions: submissions,
            data: submissions,
            count: submissions.length
          }));
        } catch (error) {
          console.error('[API] ❌ Contact submissions error:', error.message);
          console.error('[API] Stack:', error.stack);
          res.statusCode = 500;
          return res.end(JSON.stringify({
            success: false,
            error: 'Failed to fetch contact submissions',
            message: error.message
          }));
        }
      }
      
      // GET /api/submissions/contact/:id
      if ((normalizedPath.match(/^\/submissions\/contact\/[^\/]+$/)) && method === 'GET') {
        try {
          const id = normalizedPath.split('/').pop();
          console.log('[API] Fetching single contact submission:', id);
          
          const submission = await ContactSubmission.findById(id).lean();
          
          if (!submission) {
            res.statusCode = 404;
            return res.end(JSON.stringify({
              success: false,
              error: 'Contact submission not found'
            }));
          }
          
          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            data: submission
          }));
        } catch (error) {
          console.error('[API] Contact submission error:', error.message);
          res.statusCode = 500;
          return res.end(JSON.stringify({
            success: false,
            error: 'Failed to fetch contact submission',
            message: error.message
          }));
        }
      }
      
      // GET /api/submissions/blogs
      if ((normalizedPath === '/submissions/blogs') && method === 'GET') {
        try {
          const { status } = Object.fromEntries(new URL(`http://dummy${url}`).searchParams);
          
          const query = {};
          if (status) {
            query.status = status;
          }
          
          console.log('[API] Fetching blog submissions with query:', query);
          const blogs = await BlogSubmission.find(query)
            .sort({ createdAt: -1 })
            .limit(1000)
            .lean();
          
          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            submissions: blogs,
            blogs: blogs,
            data: blogs,
            count: blogs.length
          }));
        } catch (error) {
          console.error('[API] Blog submissions error:', error.message);
          res.statusCode = 500;
          return res.end(JSON.stringify({
            success: false,
            error: 'Failed to fetch blog submissions',
            message: error.message
          }));
        }
      }
      
      // GET /api/submissions/blogs/:id
      if ((normalizedPath.match(/^\/submissions\/blogs\/[^\/]+$/)) && method === 'GET') {
        try {
          const id = normalizedPath.split('/').pop();
          console.log('[API] Fetching single blog submission:', id);
          
          const blog = await BlogSubmission.findById(id).lean();
          
          if (!blog) {
            res.statusCode = 404;
            return res.end(JSON.stringify({
              success: false,
              error: 'Blog submission not found'
            }));
          }
          
          res.statusCode = 200;
          return res.end(JSON.stringify({
            success: true,
            data: blog
          }));
        } catch (error) {
          console.error('[API] Blog submission error:', error.message);
          res.statusCode = 500;
          return res.end(JSON.stringify({
            success: false,
            error: 'Failed to fetch blog submission',
            message: error.message
          }));
        }
      }
      
      // Unknown submissions route
      res.statusCode = 404;
      return res.end(JSON.stringify({
        success: false,
        message: 'Submissions endpoint not found',
        path: normalizedPath
      }));
    }
    
    // 404 - No route matched
    console.log('[API] ⚠️ No matching route found for:', method, normalizedPath);
    res.statusCode = 404;
    return res.end(JSON.stringify({ 
      success: false, 
      message: 'API endpoint not found',
      method: method,
      path: normalizedPath,
      fullUrl: url
    }));
    
  } catch (error) {
    console.error('[API] ❌ UNCAUGHT ERROR:', error.message);
    console.error('[API] Stack:', error.stack);
    
    res.statusCode = 500;
    return res.end(JSON.stringify({ 
      success: false, 
      message: 'Server error',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }));
  }
};
