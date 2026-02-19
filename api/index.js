// Vercel serverless entry for Express app
const serverless = require('serverless-http');
require('dotenv').config();
const app = require('../server.js');

module.exports = serverless(app);
