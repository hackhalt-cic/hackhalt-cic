// Vercel serverless function wrapper for Express app
require('dotenv').config();
const app = require('../server.js');

// The app will handle database connection via middleware on first request
module.exports = app;
