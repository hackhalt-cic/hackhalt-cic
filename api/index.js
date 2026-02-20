console.log('[API Init] Starting...');

const serverless = require('serverless-http');
const app = require('../server-minimal');

console.log('[API Init] App loaded, wrapping with serverless-http');

// Create serverless handler
const handler = serverless(app);

console.log('[API Init] Handler ready');

// Export handler
module.exports = handler;