// Vercel serverless entry for Express app
const serverless = require('serverless-http');
require('dotenv').config();

// Import the Express app directly (not wrapped)
const app = require('../server.js');

// Wrap Express app for Vercel serverless
module.exports = serverless(app);
