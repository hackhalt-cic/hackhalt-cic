# Deployment Verification and Testing Guide

## Overview

This guide helps you verify that both the Vercel backend and Hostinger frontend are properly deployed and communicating.

## Pre-Deployment Checklist

### Backend (Vercel)
- [ ] All MongoDB URI set in Vercel environment variables
- [ ] JWT_SECRET set in Vercel environment variables
- [ ] JWT_REFRESH_SECRET set in Vercel environment variables
- [ ] Node.js version compatible (14+ recommended)
- [ ] vercel.json routes configured correctly
- [ ] All dependencies in package.json

### Frontend (Hostinger)
- [ ] All files in `public/` uploaded
- [ ] `.htaccess` file placed in root
- [ ] SSL/HTTPS enabled
- [ ] DNS configured for your domain
- [ ] api-config.js points to correct backend URL

## Test Steps

### Step 1: Test Backend Health Check

```bash
# Test the Vercel backend is running and responding with JSON
curl -v https://hackhalt-cic-lemon.vercel.app/api/health

# Expected response:
# HTTP/1.1 200 OK
# Content-Type: application/json
# {
#   "status": "OK",
#   "timestamp": "2026-02-20T...",
#   "environment": "production"
# }
```

**What to check:**
- Status code should be `200 OK`
- Content-Type should be `application/json`
- Response should be valid JSON, not HTML

### Step 2: Test CORS Headers

```bash
# Test CORS headers from Hostinger domain
curl -v -H "Origin: https://your-domain.hostinger.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://hackhalt-cic-lemon.vercel.app/api/auth/login

# Expected response headers:
# Access-Control-Allow-Origin: https://your-domain.hostinger.com (or *)
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
# Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With
```

### Step 3: Test Login Endpoint

**From Browser Console on Hostinger Frontend:**

```javascript
// Test login endpoint
fetch('https://hackhalt-cic-lemon.vercel.app/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'admin',
    password: 'test-password'
  })
})
.then(response => {
  console.log('Status:', response.status);
  console.log('Headers:', response.headers);
  return response.json();
})
.then(data => console.log('Response:', data))
.catch(error => console.error('Error:', error));
```

**Expected Response:**
```json
{
  "success": true or false,
  "message": "Login successful" or "Invalid credentials",
  "admin": {
    "id": "...",
    "username": "admin",
    "email": "...",
    "role": "..."
  }
}
```

### Step 4: Test Frontend Static Files

**In Browser:**

```javascript
// Check if all assets are loading correctly
const assets = [
  '/assets/css/style.css',
  '/assets/js/main.js',
  '/assets/js/api-config.js',
  '/images/' // Check that images exist
];

assets.forEach(url => {
  fetch(url)
    .then(res => console.log(url, res.status))
    .catch(err => console.error(url, err));
});
```

### Step 5: Test Page Navigation

**Manual Testing:**
1. Go to https://your-hostinger-domain.com
2. Click through all pages (Home, About, Blogs, Community, Events, Contact)
3. Check browser DevTools for any errors
4. Verify CSS and images load correctly

### Step 6: Test Admin Login Flow

1. Navigate to `/admin-login`
2. Enter admin credentials
3. Check for errors in browser console
4. Monitor Network tab for API calls
5. Verify JSON responses are received

## Troubleshooting

### Issue: "404 Not Found" on non-root pages

**Cause:** .htaccess not working or not present
**Solution:**
```bash
1. SSH into Hostinger: ssh username@your-domain.com
2. Navigate to public_html: cd ~/public_html
3. Check if .htaccess exists: ls -la | grep .htaccess
4. If missing, upload it
5. Check permissions: chmod 644 .htaccess
6. Verify mod_rewrite is enabled: a2enmod rewrite
```

### Issue: "Backend not responding" error

**Cause:** API URL is incorrect, backend is down, or CORS is blocking
**Solution:**
```bash
# 1. Check backend status
curl https://hackhalt-cic-lemon.vercel.app/api/health

# 2. Verify API URL in api-config.js
# Should be: https://hackhalt-cic-lemon.vercel.app

# 3. Check Vercel deployment logs
# Go to: https://vercel.com/dashboard > Your Project > Deployments

# 4. Verify MongoDB connection
# Check Vercel environment variables in dashboard
```

### Issue: CORS Error in Browser Console

```
Access to XMLHttpRequest at 'https://hackhalt-cic-lemon.vercel.app/...' 
from origin 'https://your-domain.com' has been blocked by CORS policy
```

**Solution:**
```bash
# 1. Verify CORS headers are set in server.js
# Should include your Hostinger domain

# 2. Re-deploy to Vercel
git add -A
git commit -m "Fix CORS for Hostinger domain"
git push

# 3. Clear browser cache (Ctrl+Shift+Delete)

# 4. Test again with incognito window
```

### Issue: Blank Page or 500 Error

**Cause:** Frontend HTML files not accessible or server error
**Solution:**
```bash
# 1. Check if index.html exists
curl -I https://your-domain.com/

# 2. Check file permissions
# SSH into Hostinger and run:
find ~/public_html -type f -exec chmod 644 {} \;
find ~/public_html -type d -exec chmod 755 {} \;

# 3. Check error logs
# Go to Hostinger > Logs > Error Log
```

### Issue: Mixed Content Warning (HTTPS page loading HTTP)

**Cause:** Some resources are loading via HTTP
**Solution:**
```bash
# 1. Update all URLs from http:// to https://
grep -r "http://" ~/public_html

# 2. Ensure api-config.js uses https://
# Should be: const BACKEND_API_URL = 'https://hackhalt-cic-lemon.vercel.app'
```

## Browser DevTools Debugging

### Check Network Tab for API Calls

1. Open DevTools (F12)
2. Go to Network tab
3. Perform action (e.g., click login)
4. Check the API request:
   - Method: POST/GET
   - Status: 200 (success) or 4xx/5xx (error)
   - Response: Should be JSON, not HTML
   - CORS headers: Should allow your origin

### Check Console for Errors

```javascript
// Common errors and solutions:

// 1. Uncaught SyntaxError in api-config.js
// → Check JavaScript syntax in api-config.js

// 2. Fetch failed: bad-gateway
// → Backend is down or route doesn't exist

// 3. Access-Control-Allow-Origin missing
// → CORS not configured correctly

// 4. TypeError: BACKEND_API_URL is undefined
// → api-config.js not loaded, check file path
```

### Monitor Network Timing

```javascript
// Measure API response time
const startTime = performance.now();

fetch('https://hackhalt-cic-lemon.vercel.app/api/health')
  .then(res => res.json())
  .then(() => {
    const endTime = performance.now();
    console.log(`Response time: ${(endTime - startTime).toFixed(2)}ms`);
  });
```

## Performance Testing

### Lighthouse Audit

1. Open DevTools
2. Go to Lighthouse tab
3. Click "Analyze page load"
4. Check:
   - Performance score
   - Accessibility score
   - Best Practices score
   - SEO score

### Measure API Performance

```bash
# Using curl to measure response time
time curl -w "\n%{time_total}s total time\n" \
  https://hackhalt-cic-lemon.vercel.app/api/health

# Expected: < 2 seconds for health check
```

## Security Verification

### Check Security Headers

```bash
# Check that security headers are present
curl -I https://your-hostinger-domain.com

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: SAMEORIGIN
# X-XSS-Protection: 1; mode=block
```

### Verify HTTPS/SSL

```bash
# Check SSL certificate
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443

# Should show:
# Verify return code: 0 (ok)
```

### Test CSRF Protection

CSRF tokens should be automatically handled by the server's secure auth middleware.

## Monitoring and Logging

### Vercel Logs

1. Go to https://vercel.com > Dashboard > Your Project
2. Click "Deployments"
3. Select the latest deployment
4. Check "Build Logs" and "Runtime Logs"
5. Look for any errors or warnings

### Hostinger Logs

1. Go to Hostinger > Logs
2. Check "Error Log" for any PHP/server errors
3. Check "Access Log" for HTTP requests

### Browser Console

Always check the browser console for JavaScript errors:

```javascript
// Example: checking for API config errors
console.log('API URL:', BACKEND_API_URL);
console.log('Frontend origin:', window.location.origin);
console.log('Is development?', window.location.hostname === 'localhost');
```

## Final Checklist

Before considering deployment complete:

- [ ] Backend health check returns 200 OK with JSON
- [ ] CORS headers are present in responses
- [ ] Login endpoint returns valid JSON
- [ ] Frontend pages load without 404 errors
- [ ] CSS and JavaScript files are loading
- [ ] Images are displaying correctly
- [ ] Admin login flow works end-to-end
- [ ] No JavaScript errors in console
- [ ] HTTPS is enabled on both frontend and backend
- [ ] Security headers are present
- [ ] Performance is acceptable (< 3 seconds for page load)

## Support Resources

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Documentation:** https://vercel.com/docs
- **Hostinger Help Center:** https://support.hostinger.com
- **MDN CORS Guide:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- **Express.js CORS:** https://expressjs.com/en/resources/middleware/cors.html

## Quick Commands

```bash
# Test all endpoints
curl -X GET https://hackhalt-cic-lemon.vercel.app/api/health
curl -X POST https://hackhalt-cic-lemon.vercel.app/api/submissions/contact

# Monitor deployment
npm run dev  # Local development

# Deploy to Vercel
git push origin main

# Deploy to Hostinger
# 1. File Manager: Upload public/ contents
# OR
# 2. SFTP: scp -r public/* user@hostname:/public_html/
```
