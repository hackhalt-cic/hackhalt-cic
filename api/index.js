const serverless = require('serverless-http');

// Create a simple health check app first
const express = require('express');
const basicApp = express();

// Basic health check without any dependencies
basicApp.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Try to load the full app, fallback to basic app if it fails
let app;
try {
  console.log('[API] Loading main app...');
  app = require('../server');
  console.log('[API] Main app loaded successfully');
} catch (error) {
  console.error('[API] Error loading main app:', error.message);
  console.error('[API] Stack:', error.stack);
  // Fallback to basic app
  app = basicApp;
}

// Wrap with error handling
const handler = serverless(app, {
  request: (request, event, context) => {
    try {
      console.log('[Serverless] Request:', request.method, request.url);
    } catch (e) {
      console.error('[Serverless] Request logging error:', e.message);
    }
  }
});

// Main handler
module.exports = async (req, event, context) => {
  console.log('[API Handler] Invoked');
  try {
    const result = await handler(req, event, context);
    console.log('[API Handler] Success');
    return result;
  } catch (error) {
    console.error('[API Handler] Error:', error.message);
    console.error('[API Handler] Stack:', error.stack);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};