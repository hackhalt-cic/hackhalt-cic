require('dotenv').config();
const express = require('express');
const cors = require('cors');
const secureAdminAuth = require('./routes/secureAdminAuth');

const app = express();

// CORS MUST be first - before all other middleware
app.use(cors({
  origin: 'https://hackhalt.org',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Preflight requests
app.options('*', cors({
  origin: 'https://hackhalt.org',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth routes
app.use('/api/auth', secureAdminAuth);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

module.exports = app;
