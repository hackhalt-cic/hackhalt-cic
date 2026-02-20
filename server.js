require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const secureAdminAuth = require('./routes/secureAdminAuth');
const submissionsRouter = require('./routes/submissions');
const blogRouter = require('./routes/blog');

const app = express();



// Database connection function with faster Vercel optimization
const connectDB = async (retries = 5) => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables.');
    }

    console.log('🔄 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 10000,
      connectTimeoutMS: 5000,
      family: 4,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 2,
      minPoolSize: 0,
      maxIdleTimeMS: 10000,
      waitQueueTimeoutMS: 3000,
      autoCreate: true
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    
    if (retries > 0) {
      const delayMs = (6 - retries) * 2000;
      console.log(`⏳ Retrying connection (${retries} attempts left) in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return connectDB(retries - 1);
    }
    
    throw error;
  }
};


// Connect once when serverless initializes
connectDB().catch(err => {
  console.error('Initial MongoDB connection failed:', err.message);
});

// CORS MUST be first - before all other middleware
const corsOptions = {
  origin: function(origin, callback) {
    // List of allowed origins - includes all production domains
    const allowedOrigins = [
      // Production domains
      'https://hackhalt.org',
      'https://www.hackhalt.org',
      'https://hackhalt-cic-lemon.vercel.app',
      'https://hackhalt-cic.vercel.app',
      // Any Vercel deployment
      /https:\/\/.*\.vercel\.app$/,
      // Hostinger domains
      /https:\/\/.*\.hostinger\.com$/,
      // Local development
      'http://localhost:5000',
      'http://localhost:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:3000'
    ];
    
    // Check if origin is in whitelist
    const isAllowed = !origin || allowedOrigins.some(o => {
      if (o instanceof RegExp) return o.test(origin);
      return o === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // For development, allow all origins. For production, restrict.
      if (process.env.NODE_ENV === 'production') {
        console.warn(`[CORS] Rejected origin: ${origin}`);
        callback(new Error('CORS policy violation'));
      } else {
        console.log(`[CORS] Allowing origin in development: ${origin}`);
        callback(null, true);
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400
};

app.use(cors(corsOptions));

// Preflight requests
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// CRITICAL: Protect all API routes to ensure JSON responses BEFORE any static middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[API] ${req.method} ${req.path} from ${req.ip}`);
    
    // MUST be set FIRST to prevent content negotiation issues
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff'); // Prevent MIME sniffing
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Track if response has been sent
    let responseSent = false;
    
    // Override send to prevent any non-JSON output
    const originalSend = res.send;
    res.send = function(data) {
      if (responseSent) return;
      responseSent = true;
      console.error(`[API ERROR] Attempted to use res.send() on API route - converting to JSON`);
      res.status(res.statusCode || 500);
      return res.json({
        success: false,
        error: 'Internal server error'
      });
    };
    
    // Override sendFile to prevent HTML from being returned on API routes
    const originalSendFile = res.sendFile;
    res.sendFile = function(filepath, options, callback) {
      if (responseSent) return;
      responseSent = true;
      console.error(`[API ERROR] Attempted sendFile on API route: ${filepath}`);
      res.status(500);
      return res.json({
        success: false,
        error: 'Internal server error'
      });
    };
    
    // Track original end method
    const originalEnd = res.end;
    res.end = function(...args) {
      if (responseSent) return;
      responseSent = true;
      return originalEnd.apply(res, args);
    };
  }
  next();
});

// Health check endpoint - MUST be before router mounts
app.get('/api/health', (req, res) => {
  res.set('Content-Type', 'application/json');
  return res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Auth routes MUST come before static file serving
console.log('[INIT] Mounting /api/auth routes...');
app.use('/api/auth', secureAdminAuth);

// Submissions routes for admin dashboard
console.log('[INIT] Mounting /api/submissions routes...');
app.use('/api/submissions', submissionsRouter);

// Blog routes for admin dashboard
console.log('[INIT] Mounting /api/blog routes...');
app.use('/api/blog', blogRouter);

// Serve static files from public folder AFTER API routes but BEFORE catch-all handlers
// Prevent static file serving for API paths
app.use((req, res, next) => {
  // Skip static file serving for API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  express.static(path.join(__dirname, 'public'))(req, res, next);
});

// Route handlers for admin pages (without .html extension)
app.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/blog-admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blog-admin.html'));
});

app.get('/add-blog', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'add-blog.html'));
});

// 404 Handler - MUST be after all routes but before error handler
app.use((req, res, next) => {
  // For API requests, ALWAYS return JSON - NEVER send HTML
  if (req.path.startsWith('/api/')) {
    console.warn(`[404 API] Route not found: ${req.method} ${req.path}`);
    res.status(404);
    res.set('Content-Type', 'application/json; charset=utf-8');
    return res.json({
      success: false,
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
  
  // For web pages, try to serve 404.html
  const notFoundPath = path.join(__dirname, 'public', '404.html');
  if (fs.existsSync(notFoundPath)) {
    return res.status(404).sendFile(notFoundPath);
  }
  
  // Fallback if 404.html doesn't exist
  res.status(404).send('<h1>404 - Page Not Found</h1>');
});

// Error handler - MUST be last and handle all errors
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  console.error('[ERROR STACK]', err.stack);
  
  // For API requests, ALWAYS return JSON with proper headers - NEVER return HTML
  if (req.path.startsWith('/api/')) {
    res.status(err.status || err.statusCode || 500);
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('X-Content-Type-Options', 'nosniff');
    
    const errorResponse = {
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      message: 'Server error',
      timestamp: new Date().toISOString()
    };
    
    console.log('[API ERROR RESPONSE]', errorResponse);
    return res.json(errorResponse);
  }
  
  // For web pages, return error page - but check content negotiation
  res.status(err.status || err.statusCode || 500);
  
  // Check if client wants JSON
  if (req.accepts(['json', 'html']) === 'json' || req.get('Accept')?.includes('application/json')) {
    res.set('Content-Type', 'application/json; charset=utf-8');
    return res.json({
      success: false,
      error: err.message || 'Error'
    });
  }
  
  res.set('Content-Type', 'text/html');
  res.send(`
    <html>
      <head><title>Error - HackHalt</title></head>
      <body><h1>${err.status || err.statusCode || 500} - ${err.message || 'Error'}</h1></body>
    </html>
  `);
});

// Export app for Vercel and module usage
module.exports = app;
