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

// Database connection function
const connectDB = async (retries = 5) => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables.');
    }

    console.log('🔄 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 15000,
      family: 4,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 10,
      minPoolSize: 5,
      maxIdleTimeMS: 45000
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    
    if (retries > 0) {
      const delayMs = (6 - retries) * 3000;
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

// Middleware to ensure database is connected on first request
app.use(async (req, res, next) => {
  if (!mongodbConnected) {
    try {
      console.log('[MIDDLEWARE] First request - connecting to MongoDB...');
      await connectDB(1); // Only 1 retry to avoid Vercel timeout
      mongodbConnected = true;
      console.log('[MIDDLEWARE] Database connected successfully');
    } catch (error) {
      console.error('[MIDDLEWARE] Database connection failed:', error.message);
      // Continue anyway - Auth endpoint will handle the error
    }
  }
  next();
});

// API Request logging and validation middleware - ENSURES API ROUTES GET JSON RESPONSES
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[API REQUEST] ${req.method} ${req.path}`);
    
    // Override res.sendFile for API routes to prevent HTML files from being sent
    const originalSendFile = res.sendFile;
    res.sendFile = function(filepath, options, callback) {
      console.error(`[API ERROR] Attempted to sendFile for API endpoint: ${filepath}`);
      return res.status(500).json({
        success: false,
        error: 'Internal server error - invalid response type'
      });
    };
    
    // Set JSON content type for all API responses
    res.set('Content-Type', 'application/json; charset=utf-8');
  }
  next();
});

// Auth routes MUST come before static file serving
app.use('/api/auth', secureAdminAuth);

// Submissions routes for admin dashboard
app.use('/api/submissions', submissionsRouter);

// Blog routes for admin dashboard
app.use('/api/blog', blogRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Serve static files from public folder AFTER API routes
app.use(express.static(path.join(__dirname, 'public')));

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

// 404 Handler - must be after all routes but before error handler
app.use((req, res, next) => {
  // For API requests, ALWAYS return JSON
  if (req.path.startsWith('/api/')) {
    console.warn(`[404] API route not found: ${req.method} ${req.path}`);
    res.status(404);
    res.set('Content-Type', 'application/json; charset=utf-8');
    return res.json({
      success: false,
      error: 'API endpoint not found',
      path: req.path,
      method: req.method
    });
  }
  
  // For web pages, try to serve 404.html
  const notFoundPath = path.join(__dirname, 'public', '404.html');
  if (require('fs').existsSync(notFoundPath)) {
    return res.status(404).sendFile(notFoundPath);
  }
  
  // Fallback if 404.html doesn't exist
  res.status(404).send('<h1>404 - Page Not Found</h1>');
});

// Error handler - MUST be last and handle all errors
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message, err.stack);
  
  // For API requests, ALWAYS return JSON with proper headers
  if (req.path.startsWith('/api/')) {
    res.status(err.status || 500);
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('X-Content-Type-Options', 'nosniff');
    
    return res.json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      message: 'Server error'
    });
  }
  
  // For web pages, return error page
  res.status(err.status || 500).set('Content-Type', 'text/html').send(`
    <html>
      <head><title>Error - HackHalt</title></head>
      <body><h1>${err.status || 500} - ${err.message || 'Error'}</h1></body>
    </html>
  `);
});

// Export app for Vercel and module usage
module.exports = app;

// Start server locally if this file is executed directly
if (require.main === module) {
  const startServer = async () => {
    try {
      // Connect to database
      await connectDB();
      
      // Start listening
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`\n🚀 Server running on port ${PORT}`);
        console.log(`📝 Admin Login: http://localhost:${PORT}/admin-login.html`);
      });
    } catch (error) {
      console.error('🚨 Failed to start server:', error.message);
      process.exit(1);
    }
  };

  startServer();
}
