/**
 * API Configuration
 * Central point for managing backend API URL across all frontend pages
 * Automatically detects environment based on current origin
 */

// Detect environment automatically
const BACKEND_API_URL = (() => {
  const origin = window.location.origin;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  console.log('[API CONFIG DEBUG] Origin:', origin);
  console.log('[API CONFIG DEBUG] Hostname:', hostname);
  console.log('[API CONFIG DEBUG] Protocol:', protocol);
  
  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('[API CONFIG] Using local backend');
    return 'http://localhost:5000';
  }
  
 const BACKEND_API_URL = 'https://hackhalt-cic-lemon.vercel.app';

function getApiUrl(endpoint) {
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  return BACKEND_API_URL + endpoint;
}
})();

// Helper function to build full API URLs
function getApiUrl(endpoint) {
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  const fullUrl = `${BACKEND_API_URL}${endpoint}`;
  console.log('[API URL] Endpoint:', endpoint, '-> Full URL:', fullUrl);
  return fullUrl;
}

// Export for module systems (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BACKEND_API_URL, getApiUrl };
}

console.log('[API CONFIG] ✅ Backend URL:', BACKEND_API_URL);
console.log('[API CONFIG] ✅ Frontend origin:', window.location.origin);
