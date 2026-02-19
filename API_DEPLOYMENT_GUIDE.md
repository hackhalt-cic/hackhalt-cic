# API Deployment Configuration Guide

## CRITICAL: Update Backend URL

Your frontend is hosted on **hackhalt.org** (static Hostinger)  
Your backend MUST be on a separate server with Node.js/Express support

### Current Setup
- **Frontend**: https://hackhalt.org (Hostinger static hosting)
- **Backend**: https://hackhalt-cic.vercel.app (Vercel Node.js)

---

## ✅ Files Modified

### 1. **Created: `/public/assets/js/api-config.js`**
Central API configuration file for all requests.

**UPDATE THIS URL BASED ON YOUR BACKEND DEPLOYMENT:**
```javascript
const BACKEND_API_URL = 'https://hackhalt-cic.vercel.app';
// For local dev: const BACKEND_API_URL = 'http://localhost:5000';
```

### 2. **Updated: `/public/admin-login.html`**
```html
<!-- Load config first -->
<script src="assets/js/api-config.js"></script>

<!-- In form handler -->
const apiUrl = getApiUrl('/api/auth/login');
fetch(apiUrl, {...})
```

### 3. **Updated: `/public/contact.html`**
```html
<script src="assets/js/api-config.js"></script>
<!-- contact.js now uses: const apiUrl = getApiUrl('/api/contact'); -->
```

### 4. **Updated: `/public/community.html`**
```html
<script src="assets/js/api-config.js"></script>
<!-- membership form uses: const apiUrl = getApiUrl('/api/submissions/membership'); -->
```

### 5. **Updated: `/public/blog-admin.html`**
```javascript
const BACKEND_API_URL = 'https://hackhalt-cic.vercel.app';
function getApiUrl(endpoint) { ... }
// All fetch calls use: fetch(getApiUrl('/api/...'), {...})
```

### 6. **Test Files Updated**
- `/public/form-test.html` → Uses BACKEND_API_URL
- `/public/direct-contact-test.html` → Uses BACKEND_API_URL
- `/public/book-session.html` → Uses BACKEND_API_URL

---

## 🔧 Configuration Steps

### Step 1: Update All Backend URLs
Find and replace `"https://hackhalt-cic.vercel.app"` with your actual backend URL in:
- `public/assets/js/api-config.js` (PRIMARY)
- `public/blog-admin.html`
- `public/book-session.html`
- `public/direct-contact-test.html`
- `public/form-test.html`

### Step 2: Verify Backend Routes Exist
Backend MUST have these endpoints:
```
POST /api/auth/login
POST /api/contact
POST /api/submissions/membership
POST /api/book-session
GET  /api/admin/profile
GET  /api/submissions/blogs
etc.
```

### Step 3: Enable CORS on Backend
Backend must allow cross-origin requests FROM hackhalt.org:
```javascript
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://hackhalt.org',
    'https://www.hackhalt.org',
    'http://localhost:3000'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  // ... rest of CORS setup
});
```

### Step 4: Test Login
1. Open https://hackhalt.org/admin-login.html
2. Open Browser DevTools Console
3. Check logs:
   ```
   [DEBUG] Sending login request to: https://hackhalt-cic.vercel.app/api/auth/login
   [DEBUG] Frontend domain: https://hackhalt.org
   [DEBUG] Backend API: https://hackhalt-cic.vercel.app
   ```
4. Verify response is JSON (not HTML)

---

## 🚨 Common Issues

### ❌ "Server error: Expected JSON but got <"
**Cause**: Calling relative `/api/auth/login` which hits frontend (404 HTML)
**Fix**: Use absolute URL from `api-config.js`

### ❌ CORS Error
**Cause**: Backend not configured for cross-origin requests
**Fix**: Add frontend domain to CORS allowedOrigins

### ❌ Cannot POST to /api/...
**Cause**: Backend route doesn't exist
**Fix**: Verify backend has all required API endpoints

---

## 📋 Architecture

```
Frontend (hackhalt.org) - Static hosting (Hostinger)
    ↓ fetch() with absolute URLs
Backend (hackhalt-cic.vercel.app) - Node.js/Express (Vercel)
    ↓ Returns JSON
Frontend parses JSON and updates UI
```

**DO NOT** use relative paths like `/api/...` on static hosting.

---

## 🎯 Deployment Checklist

- [ ] Update `BACKEND_API_URL` in all files
- [ ] Deploy frontend to Hostinger
- [ ] Deploy backend to Vercel
- [ ] Test login at https://hackhalt.org/admin-login.html
- [ ] Check browser console for debug logs
- [ ] Verify response is valid JSON (DevTools Network tab)
- [ ] No HTML 404 errors
- [ ] No CORS errors
