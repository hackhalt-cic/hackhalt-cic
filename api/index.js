const serverless = require('serverless-http');
const app = require('../server');

// Wrap with error handling
const handler = serverless(app, {
  request: (request, event, context) => {
    console.log('[Serverless] Incoming request:', {
      method: request.method,
      path: request.url,
      headers: Object.keys(request.headers)
    });
  },
  response: (response, event, context) => {
    console.log('[Serverless] Sending response:', {
      statusCode: response.statusCode,
      headers: Object.keys(response.headers)
    });
  }
});

// Error handler wrapper
module.exports = async (req, event, context) => {
  console.log('[API] Function invoked');
  try {
    const result = await handler(req, event, context);
    console.log('[API] Function completed successfully');
    return result;
  } catch (error) {
    console.error('[API] Function error:', error);
    // Return a proper error response
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