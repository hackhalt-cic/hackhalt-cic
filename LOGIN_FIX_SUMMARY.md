# LOGIN FIX - VERIFICATION CHECKLIST

## ROOT CAUSE FIXED ✅
- **Problem**: Frontend (hackhalt.org) was calling `/api/auth/login` → got HTML 404 from Hostinger
- **Solution**: Now calls `https://hackhalt-cic.vercel.app/api/auth/login` → gets JSON from backend

## FILES CHANGED

### Core Config
- ✅ Created: `public/assets/js/api-config.js`
  - Exports: `BACKEND_API_URL`, `getApiUrl(endpoint)`
  - **UPDATE URL HERE FOR PRODUCTION**

### Pages Updated
- ✅ `public/admin-login.html` - Uses `getApiUrl('/api/auth/login')`
- ✅ `public/contact.html` - Includes api-config.js
- ✅ `public/assets/js/contact.js` - Uses `getApiUrl('/api/contact')`
- ✅ `public/community.html` - Uses `getApiUrl('/api/submissions/membership')`
- ✅ `public/blog-admin.html` - Uses `BACKEND_API_URL + getApiUrl()`
- ✅ `public/book-session.html` - Uses absolute BACKEND_API_URL
- ✅ `public/form-test.html` - Uses absolute BACKEND_API_URL
- ✅ `public/direct-contact-test.html` - Uses absolute BACKEND_API_URL

## VERIFICATION STEPS

### Step 1: Verify Backend Is Running
```bash
# Backend should be deployed to Vercel and return JSON, not HTML
curl -X POST https://hackhalt-cic.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"test"}'

# Should return JSON response (not HTML <html> tag)
```

### Step 2: Test Login in Browser Console
1. Open https://hackhalt.org/admin-login.html
2. Open DevTools (F12)
3. Go to Console tab
4. You should see:
   ```
   [API CONFIG] Backend URL: https://hackhalt-cic.vercel.app
   [DEBUG] Sending login request to: https://hackhalt-cic.vercel.app/api/auth/login
   [DEBUG] Frontend domain: https://hackhalt.org
   [DEBUG] Backend API: https://hackhalt-cic.vercel.app
   ```

### Step 3: Check Network Tab
1. Open DevTools Network tab
2. Enter credentials and submit
3. Look for POST request to `https://hackhalt-cic.vercel.app/api/auth/login`
4. Click it and check:
   - ✅ Status should be 200 or 401 (not 404)
   - ✅ Response should start with `{` (JSON, not `<` HTML)
   - ✅ Content-Type should be `application/json`

### Step 4: Error Messages
If you see:
- ❌ "Unexpected token '<'" → Backend returned HTML (404 page)
- ❌ "Failed to parse JSON" → Backend not responding with JSON
- ❌ CORS error → Backend missing CORS config
- ✅ "Invalid credentials" → SUCCESS! Endpoint works, just wrong password

## DEPLOYMENT CHECKLIST

**Before going live:**

1. [ ] Update `BACKEND_API_URL` in `public/assets/js/api-config.js`
2. [ ] Deploy frontend changes to Hostinger
3. [ ] Verify backend is running on Vercel
4. [ ] Test login endpoint responds with JSON (not HTML)
5. [ ] Check CORS headers allow hackhalt.org
6. [ ] Test in browser console before user rollout

## Configuration Changes Needed

### IN: `public/assets/js/api-config.js`
```javascript
// Update this to your actual backend URL
const BACKEND_API_URL = 'https://hackhalt-cic.vercel.app';
```

### IN: Other files with hardcoded URLs
- `public/blog-admin.html` line ~1125
- `public/book-session.html` line ~257
- `public/form-test.html` line ~140
- `public/direct-contact-test.html` line ~92

Search for: `'https://hackhalt-cic` and replace with correct backend URL

## Environment Variables (Optional)
If using Vercel environment variables, update to:
```javascript
const BACKEND_API_URL = process.env.REACT_APP_API_URL || 'https://hackhalt-cic.vercel.app';
```
(Note: This requires server-side rendering or a build step)

## Testing with Local Backend

For local development:
1. Update api-config.js:
   ```javascript
   const BACKEND_API_URL = 'http://localhost:5000';
   ```
2. Start backend: `npm start`
3. Open http://localhost or https://hackhalt.org
4. Should work if backend is accessible

## Support
See `API_DEPLOYMENT_GUIDE.md` for full setup instructions.
