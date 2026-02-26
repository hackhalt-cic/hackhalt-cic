require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Lazy require routes only when needed
const getSecureAdminAuth = () => require('./routes/secureAdminAuth');
const getSubmissionsRouter = () => require('./routes/submissions');
const getBlogRouter = () => require('./routes/blog');
const getHallOfFameRouter = () => require('./routes/hallOfFame');

const app = express();

// Connection state tracking for serverless
let isConnecting = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 5;

// Database connection function with faster Vercel optimization
const connectDB = async (retries = MAX_CONNECTION_ATTEMPTS) => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      console.warn('⚠️ MONGODB_URI is not defined - running without database');
      return null;
    }

    // Skip if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('✅ Already connected to MongoDB');
      return mongoose.connection;
    }

    console.log('🔄 Connecting to MongoDB...');
    
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 3000,
      family: 4,
      retryWrites: true,
      w: 'majority',
      maxPoolSize: 1,
      minPoolSize: 0,
      maxIdleTimeMS: 5000,
      waitQueueTimeoutMS: 2000,
      autoCreate: true
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    isConnecting = false;
    connectionAttempts = 0;
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    isConnecting = false;
    
    if (retries > 0) {
      const delayMs = 1000;
      console.log(`⏳ Retrying connection (${retries} attempts left)...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return connectDB(retries - 1);
    }
    
    console.error('❌ Max connection attempts reached - API will work without database');
    return null;
  }
};

// Lazy connect function - only attempt to connect if not already connected or connecting
const ensureDBConnection = async () => {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    return true;
  }
  
  // If currently connecting or max attempts reached, don't retry
  if (isConnecting || connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
    return false;
  }
  
  // Try to connect
  isConnecting = true;
  connectionAttempts++;
  try {
    const result = await connectDB(1); // Only 1 retry attempt in middleware
    return result !== null;
  } catch (error) {
    console.error('[DB] Failed to connect:', error.message);
    return false;
  }
};

// Middleware to ensure DB connection before processing requests that need it
const ensureDBMiddleware = (req, res, next) => {
  // Always skip health check
  if (req.path === '/api/health') {
    return next();
  }
  
  // For other routes, attempt connection in background without blocking
  if (mongoose.connection.readyState !== 1 && !isConnecting && connectionAttempts < MAX_CONNECTION_ATTEMPTS) {
    // Fire and forget - don't await or block the request
    connectDB(1).catch(err => {
      console.error('[DB Background] Connection error:', err.message);
    });
  }
  
  next();
};

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
      // Hostinger domains - both with and without www
      /https:\/\/.*\.hostinger\..*$/,
      'https://hackhalt-cic.hostinger.com',
      'https://www.hackhalt-cic.hostinger.com',
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
      console.log(`[CORS] ✅ Allowed origin: ${origin || 'no-origin'}`);
      callback(null, true);
    } else {
      // For development, allow all origins. For production, restrict.
      if (process.env.NODE_ENV === 'production') {
        console.warn(`[CORS] ❌ Rejected origin: ${origin}`);
        callback(new Error('CORS policy violation'));
      } else {
        console.log(`[CORS] ⚠️ Allowing origin in development: ${origin}`);
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

// Middleware to ensure DB connection for routes that need it
app.use(ensureDBMiddleware);

// Health check endpoint - MUST be first and before all middleware that requires DB
app.get('/api/health', (req, res) => {
  try {
    res.set('Content-Type', 'application/json');
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    return res.status(200).json({ 
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus
    });
  } catch (error) {
    console.error('[Health] Error:', error.message);
    res.set('Content-Type', 'application/json');
    return res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'error',
      error: error.message
    });
  }
});

// Auth routes MUST come before static file serving
console.log('[INIT] Mounting /api/auth routes...');
try {
  app.use('/api/auth', getSecureAdminAuth());
} catch (error) {
  console.error('[ERROR] Failed to load auth routes:', error.message);
}

// Submissions routes for admin dashboard
console.log('[INIT] Mounting /api/submissions routes...');
try {
  app.use('/api/submissions', getSubmissionsRouter());
} catch (error) {
  console.error('[ERROR] Failed to load submissions routes:', error.message);
}

// Blog routes for admin dashboard
console.log('[INIT] Mounting /api/blog routes...');
try {
  app.use('/api/blog', getBlogRouter());
} catch (error) {
  console.error('[ERROR] Failed to load blog routes:', error.message);
}

// Hall of Fame routes
console.log('[INIT] Mounting /api/hall-of-fame routes...');
try {
  app.use('/api/hall-of-fame', getHallOfFameRouter());
} catch (error) {
  console.error('[ERROR] Failed to load hall-of-fame routes:', error.message);
}

// Direct contact form endpoint (redirects to submissions)
app.post('/api/contact', async (req, res) => {
  try {
    const ContactSubmission = require('./models/ContactSubmission');
    const { purpose, name, email, phone, subject, message, organization, interests, region, linkedin, experience } = req.body;

    // Validation
    if (!purpose || !name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Purpose, name, and email are required'
      });
    }

    // Create new contact submission
    const newSubmission = new ContactSubmission({
      purpose,
      name,
      email,
      phone,
      subject,
      message,
      organization,
      interests,
      region,
      linkedin,
      experience
    });

    await newSubmission.save();
    console.log('[CONTACT] New submission saved:', newSubmission._id);

    res.status(201).json({
      success: true,
      message: 'Contact submission saved successfully',
      data: newSubmission
    });
  } catch (error) {
    console.error('[ERROR] Failed to save contact submission:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to save contact submission',
      message: error.message
    });
  }
});

// Direct booking session endpoint
app.post('/api/book-session', async (req, res) => {
  try {
    const BookingSession = require('./models/BookingSession');
    const { name, email, organisation, package: pkg, dates, message } = req.body;

    // Validation
    if (!name || !email || !pkg) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and package are required'
      });
    }

    // Create new booking
    const newBooking = new BookingSession({
      name,
      email,
      organisation,
      package: pkg,
      dates,
      message
    });

    await newBooking.save();
    console.log('[BOOKING] New session booked:', newBooking._id);

    res.status(201).json({
      success: true,
      message: 'Booking request submitted successfully',
      data: newBooking
    });
  } catch (error) {
    console.error('[ERROR] Failed to save booking:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to save booking',
      message: error.message
    });
  }
});

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

app.get('/hall-of-fame', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'hall-of-fame.html'));
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

// Start server for local development
const PORT = process.env.PORT || 3000;

// Only start server if not being imported as a module
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
    
    // Attempt database connection in background
    connectDB().catch(err => {
      console.error('Database connection failed:', err.message);
    });
  });
}

// Export app for Vercel and module usage
module.exports = app;
