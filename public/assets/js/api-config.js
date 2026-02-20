/**
 * API Configuration
 * Production frontend (Hostinger) -> Backend (Vercel)
 */

const BACKEND_API_URL = 'https://hackhalt-cic-lemon.vercel.app';

console.log('[API CONFIG] Backend URL:', BACKEND_API_URL);
console.log('[API CONFIG] Frontend origin:', window.location.origin);

function getApiUrl(endpoint) {
  if (!endpoint.startsWith('/')) {
    endpoint = '/' + endpoint;
  }
  return BACKEND_API_URL + endpoint;
}