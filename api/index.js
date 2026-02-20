const serverless = require('serverless-http');

// Try to load minimal app (doesn't require problematic imports)
let app;
try {
  console.log('[API] Loading minimal app...');
  app = require('../server-minimal');
  console.log('[API] Minimal app loaded');
} catch (error) {
  console.error('[API] Failed to load app:', error.message, error.stack);
  // Create absolute minimal app
  const express = require('express');
  app = express();
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', error: 'App failed to initialize' });
  });
}

// Wrap with serverless-http
const handler = serverless(app);

// Main export
module.exports = async (req, event, context) => {
  try {
    console.log('[Handler] Invoked:', req.method, req.url);
    const result = await handler(req, event, context);
    console.log('[Handler] Success');
    return result;
  } catch (error) {
    console.error('[Handler] Error:', error.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message })
    };
  }
};