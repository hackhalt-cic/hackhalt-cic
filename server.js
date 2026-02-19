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

// CORS MUST be first - before all other middleware
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://hackhalt.org',
      'https://www.hackhalt.org',
      'https://hackhalt-cic.vercel.app',
      'https://hackhalt-7r1o55kjo-hackhalts-projects.vercel.app',
      /vercel\.app$/,
      /hostinger\.com$/,
      'http://localhost:5000',
      'http://localhost:3000',
      'http://127.0.0.1:5000'
    ];
    
    if (!origin || allowedOrigins.some(o => {
      if (o instanceof RegExp) return o.test(origin);
      return o === origin;
    })) {
      callback(null, true);
    } else {
      callback(null, true); // Allow in production - browsers will enforce
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Preflight requests
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection state
let mongodbConnected = false;

// Middleware to ensure database is connected on first request (non-blocking)
app.use(async (req, res, next) => {
  if (!mongodbConnected && req.path.startsWith('/api/')) {
    try {
      console.log('[MIDDLEWARE] First API request - attempting MongoDB connection...');
      await connectDB(1); // Only 1 rapid retry on Vercel
      mongodbConnected = true;
      console.log('[MIDDLEWARE] Database connected successfully');
    } catch (error) {
      console.error('[MIDDLEWARE] Database connection failed:', error.message);
      // For API requests, continue to let the route handle the error
      if (req.path.startsWith('/api/')) {
        console.warn('[MIDDLEWARE] Proceeding with API request despite DB connection failure');
      }
    }
  }
  next();
});

// CRITICAL: Protect all API routes to ensure JSON responses BEFORE any static middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[API] ${req.method} ${req.path} from ${req.ip}`);
    
    // MUST be set FIRST to prevent content negotiation
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Prevent Express from trying to serve files for API routes
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Override send to prevent any non-JSON output
    res.send = function(data) {
      console.error(`[API ERROR] res.send() called on API route - data:`, typeof data, data?.toString?.().substring?.(0, 100));
      if (responseSent) return;
      responseSent = true;
      res.status(500);
      return originalJson.call(res, {
        success: false,
        error: 'Internal server error - invalid response handler'
      });
    };
    
    // Override sendFile to prevent HTML from being returned on API routes
    const originalSendFile = res.sendFile;
    res.sendFile = function(filepath, options, callback) {
      console.error(`[API ERROR] Attempted sendFile on API route: ${filepath}`);
      if (responseSent) return;
      responseSent = true;
      res.status(500);
      return originalJson.call(res, {
        success: false,
        error: 'Internal server error - invalid response handling'
      });
    };
    
    let responseSent = false;
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
  
  // For API requests, ALWAYS return JSON with proper headers
  if (req.path.startsWith('/api/')) {
    res.status(err.status || err.statusCode || 500);
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('X-Content-Type-Options', 'nosniff');
    
    return res.json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      message: 'Server error',
      timestamp: new Date().toISOString()
    });
  }
  
  // For web pages, return error page
  res.status(err.status || err.statusCode || 500);
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
