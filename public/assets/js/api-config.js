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
  
  // Vercel frontend - use same origin for API
  if (hostname.includes('vercel.app')) {
    console.log('[API CONFIG] Detected Vercel - using same origin');
    return origin;
  }
  
  // Any other deployment (Hostinger, custom domain, etc) - use Vercel backend
  // This handles: hackhalt.org, *.hostinger.com, custom domains, etc.
  console.log('[API CONFIG] Detected external frontend - using Vercel backend as universal API');
  return 'https://hackhalt-7r1o55kjo-hackhalts-projects.vercel.app';
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
