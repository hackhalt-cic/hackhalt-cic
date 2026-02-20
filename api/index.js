// Vercel API handler with proper routing and CORS
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// ============================================
// CORS Configuration - MUST be first
// ============================================
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      // Production domains
      'https://hackhalt.org',
      'https://www.hackhalt.org',
      'https://hackhalt-cic-lemon.vercel.app',
      'https://hackhalt-cic.vercel.app',
      // Any Vercel deployment
      /https:\/\/.*\.vercel\.app$/,
      // Hostinger domains
      /https:\/\/.*\.hostinger\..*$/,
      'https://hackhalt-cic.hostinger.com',
      'https://www.hackhalt-cic.hostinger.com',
      // Local development
      'http://localhost:5000',
      'http://localhost:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:3000'
    ];
    
    const isAllowed = !origin || allowedOrigins.some(o => {
      if (o instanceof RegExp) return o.test(origin);
      return o === origin;
    });
    
    if (isAllowed) {
      console.log(`[CORS] ✅ Allowed origin: ${origin || 'no-origin'}`);
      callback(null, true);
    } else {
      console.warn(`[CORS] Allowed origin (development mode): ${origin}`);
      callback(null, true); // Allow all in Vercel during development
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400
};

// Apply CORS middleware FIRST
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// Routes
// ============================================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'production'
  });
});

// Login endpoint - import and use the login handler
app.post('/api/auth/login', async (req, res) => {
  try {
    const loginHandler = require('./auth/login');
    return await loginHandler(req, res);
  } catch (error) {
    console.error('[API] Login endpoint error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// OPTIONS handler for preflight
app.options('/api/auth/login', cors(corsOptions), (req, res) => {
  res.status(200).end();
});

// 404 handler
app.use((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    message: 'Not found'
  });
});

// Export handler for Vercel
module.exports = app;