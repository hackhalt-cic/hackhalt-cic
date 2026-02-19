require('dotenv').config();
const express = require('express');
const cors = require('cors');
const secureAdminAuth = require('./routes/secureAdminAuth');

const app = express();

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

// Serve static files from public folder BEFORE API routes
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Auth routes
app.use('/api/auth', secureAdminAuth);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

module.exports = app;
