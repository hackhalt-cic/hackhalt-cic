/**
 * API Configuration
 * Production frontend (Hostinger) -> Backend (Vercel)
 * Maintains compatibility across different deployment scenarios
 */

// Detect current environment
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isHostinger = window.location.hostname.includes('hostinger') || window.location.origin.includes('hackhalt.org');

// Determine backend API URL based on environment
// IMPORTANT: Use var (not let/const) so it's on window object and avoidable by other scripts
var BACKEND_API_URL;

if (isDevelopment) {
  // Local development - use the current port (matches PORT in .env)
  BACKEND_API_URL = window.location.origin;
} else if (isHostinger) {
  // Production: Frontend on Hostinger, Backend on Vercel
  BACKEND_API_URL = 'https://hackhalt-cic-lemon.vercel.app';
} else {
  // Default to Vercel backend
  BACKEND_API_URL = 'https://hackhalt-cic-lemon.vercel.app';
}

console.log('[API CONFIG] ════════════════════════════════════════');
console.log('[API CONFIG] Environment detected:', isDevelopment ? 'development' : 'production');
console.log('[API CONFIG] Backend URL:', BACKEND_API_URL);
console.log('[API CONFIG] Frontend origin:', window.location.origin);
console.log('[API CONFIG] Frontend hostname:', window.location.hostname);
console.log('[API CONFIG] ════════════════════════════════════════');

function getApiUrl(endpoint) {
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  // Add cache buster for API calls
  const separator = endpoint.includes('?') ? '&' : '?';
  const cacheBuster = `_t=${Date.now()}`;
  const fullUrl = BACKEND_API_URL + endpoint + separator + cacheBuster;
  console.log('[API CONFIG] Full API URL:', fullUrl);
  return fullUrl;
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BACKEND_API_URL, getApiUrl };
}