/**
 * API Configuration
 * Central point for managing backend API URL across all frontend pages
 * Update BACKEND_API_URL based on deployment environment
 */

// PRODUCTION: Change this to your Vercel backend URL
const BACKEND_API_URL = 'https://hackhalt-cic.vercel.app';

// DEVELOPMENT: Uncomment for local testing
// const BACKEND_API_URL = 'http://localhost:5000';

// Helper function to build full API URLs
function getApiUrl(endpoint) {
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  return `${BACKEND_API_URL}${endpoint}`;
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BACKEND_API_URL, getApiUrl };
}

console.log('[API CONFIG] Backend URL:', BACKEND_API_URL);
