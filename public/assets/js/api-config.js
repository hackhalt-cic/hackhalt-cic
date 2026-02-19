/**
 * API Configuration
 * Central point for managing backend API URL across all frontend pages
 * Automatically detects environment based on current origin
 */

// Detect environment automatically
const BACKEND_API_URL = (() => {
  const origin = window.location.origin;
  // Local development
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
    return 'http://localhost:5000';
  }
  // Hostinger (static frontend) should use Vercel backend
  if (origin.includes('hackhalt.org') || origin.includes('hostinger')) {
    return 'https://hackhalt-cic.vercel.app'; // <-- Replace with your actual Vercel backend URL
  }
  // Default: use same domain as frontend
  return origin;
})();

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
console.log('[API CONFIG] Frontend origin:', window.location.origin);
