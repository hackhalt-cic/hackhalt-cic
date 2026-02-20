require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();

// ===== DATABASE CONNECTION =====
let dbConnecting = false;
let dbConnectionAttempts = 0;
const MAX_DB_ATTEMPTS = 3;

const connectDB = async (retries = 1) => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.warn('⚠️ MONGODB_URI not configured');
      return null;
    }

    if (mongoose.connection.readyState === 1) {
      console.log('✅ DB already connected');
      return mongoose.connection;
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 3000,
      family: 4,
      maxPoolSize: 1,
      minPoolSize: 0
    });

    console.log('✅ MongoDB connected');
    return mongoose.connection;
  } catch (error) {
    console.error('❌ DB Error:', error.message);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return connectDB(retries - 1);
    }
    return null;
  }
};

// ===== CORS CONFIGURATION =====
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://hackhalt.org',
      'https://www.hackhalt.org',
      'https://hackhalt-cic-lemon.vercel.app',
      'https://hackhalt-cic.vercel.app',
      /https:\/\/.*\.vercel\.app$/,
      /https:\/\/.*\.hostinger\..*$/,
      'http://localhost:5000',
      'http://localhost:3000'
    ];
    
    const isAllowed = !origin || allowedOrigins.some(o => {
      if (o instanceof RegExp) return o.test(origin);
      return o === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('CORS blocked'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
};

// ===== MIDDLEWARE =====
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== HEALTH CHECK  =====
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus
  });
});

// ===== API ROUTES (LAZY LOADED) =====
app.use('/api/auth', (req, res, next) => {
  try {
    const secureAdminAuth = require('./routes/secureAdminAuth');
    secureAdminAuth(req, res, next);
  } catch(e) {
    console.error('[Auth] Error:', e.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

app.use('/api/submissions', (req, res, next) => {
  try {
    const submissionsRouter = require('./routes/submissions');
    submissionsRouter(req, res, next);
  } catch(e) {
    console.error('[Submissions] Error:', e.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

app.use('/api/blog', (req, res, next) => {
  try {
    const blogRouter = require('./routes/blog');
    blogRouter(req, res, next);
  } catch(e) {
    console.error('[Blog] Error:', e.message);
    res.status(503).json({ error: 'Service unavailable' });
  }
});

// ===== STATIC FILES =====
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) {
    express.static(path.join(__dirname, 'public'))(req, res, next);
  } else {
    next();
  }
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      error: 'API endpoint not found',
      path: req.path,
      timestamp: new Date().toISOString()
    });
  } else {
    const notFoundPath = path.join(__dirname, 'public', '404.html');
    if (fs.existsSync(notFoundPath)) {
      res.status(404).sendFile(notFoundPath);
    } else {
      res.status(404).send('<h1>404 - Page Not Found</h1>');
    }
  }
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  
  if (req.path.startsWith('/api/')) {
    res.status(err.status || 500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(err.status || 500).send(`
      <html>
        <head><title>Error</title></head>
        <body><h1>Error: ${err.message}</h1></body>
      </html>
    `);
  }
});

// ===== EXPORTS =====
module.exports = app;
