# Hostinger Frontend Deployment Guide

## Overview
This guide explains how to deploy the HackHalt frontend on Hostinger while using the Vercel backend API.

## Prerequisites
- Hostinger account with active hosting
- Access to Hostinger File Manager or cPanel
- Git installed locally (optional, for easier deployment)
- Domain/subdomain configured on Hostinger

## Deployment Steps

### 1. Prepare Frontend Only
The frontend deployment includes ONLY the contents of the `public/` directory:
- HTML files
- CSS files in `assets/css/`
- JavaScript files in `assets/js/`
- Images in `images/`

### 2. Upload to Hostinger

#### Option A: Using File Manager (recommended for beginners)

1. Go to Hostinger > My Websites > File Manager
2. Navigate to the `public_html` or your domain's root directory
3. Delete all existing files (backup if needed)
4. Upload all contents of the `public/` directory to the root

```
public/
├── assets/
│   ├── css/
│   ├── js/
│   └── fonts/
├── images/
├── index.html
├── admin-login.html
├── admin.html
├── about.html
├── blogs.html
└── ... (all other HTML files)
```

#### Option B: Using Git (recommended for developers)

1. Create a repository on GitHub/GitLab
2. Push only the `public/` directory contents:

```bash
# Create a deployment branch with only public folder
git subtree split --prefix public -b hostinger-deploy

# Push to your deployment repository
git push -u hostinger-repo hostinger-deploy:main
```

3. On Hostinger, use their Git integration (if available) or:
```bash
cd ~/public_html
git clone https://github.com/your-username/hackhalt-frontend.git .
```

### 3. Configure .htaccess

Create a `.htaccess` file in the root directory for proper routing:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Skip rewriting for actual files and directories
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Route all requests to index.html (for SPA-like behavior)
  RewriteRule ^(.*)$ index.html [QSA,L]
  
  # Enable CORS headers to Vercel backend
  Header add Access-Control-Allow-Origin "*"
  Header add Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
  Header add Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>

# Disable directory listing
Options -Indexes

# Enable compression
<IfModule mod_gzip.c>
  mod_gzip_on Yes
  mod_gzip_comp_level 9
  mod_gzip_item_include file \.(html?|txt|css|js|json)$
</IfModule>

# Set proper cache headers
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/html "access plus 1 hour"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  ExpiresByType image/png "access plus 1 month"
  ExpiresByType image/jpg "access plus 1 month"
  ExpiresByType image/jpeg "access plus 1 month"
  ExpiresByType image/gif "access plus 1 month"
</IfModule>

# Security headers
Header set X-Frame-Options "SAMEORIGIN"
Header set X-Content-Type-Options "nosniff"
Header set X-XSS-Protection "1; mode=block"
```

### 4. Configure SSL/TLS

1. Go to Hostinger > Security
2. Enable AutoSSL (automatic HTTPS)
3. Verify SSL certificate is active
4. Update `http://` URLs to `https://` in your HTML files

### 5. Update API Configuration

Ensure `public/assets/js/api-config.js` has:

```javascript
// For Hostinger production deployment
const BACKEND_API_URL = 'https://hackhalt-cic-lemon.vercel.app';
```

The script automatically detects Hostinger domains and uses the Vercel backend.

### 6. Enable GZIP Compression

1. In Hostinger > Performance > Compression
2. Enable GZIP compression for better performance

### 7. Configure DNS Records (if using custom domain)

1. Point your domain to Hostinger nameservers
2. Or add CNAME/A records pointing to Hostinger servers
3. Wait 24-48 hours for propagation

## Verification Checklist

- [ ] All HTML files uploaded to `public_html`
- [ ] CSS files in `assets/css/` are accessible
- [ ] JavaScript files in `assets/js/` are accessible
- [ ] Images in `images/` are accessible
- [ ] `.htaccess` file created for routing
- [ ] SSL/TLS certificate enabled
- [ ] GZIP compression enabled
- [ ] API calls return 200 status with JSON
- [ ] No 404 errors in browser console
- [ ] Admin login page loads correctly

## Troubleshooting

### Issue: "Backend not responding"
**Solution:**
1. Check Vercel deployment is active: https://hackhalt-cic-lemon.vercel.app/api/health
2. Verify CORS headers in browser DevTools Network tab
3. Check server logs on Vercel dashboard

### Issue: 404 errors on non-root pages
**Solution:**
1. Verify `.htaccess` file is in `public_html` root
2. Enable mod_rewrite in Hostinger (usually enabled by default)
3. Clear browser cache (Ctrl+Shift+Delete)

### Issue: CSS/JS not loading
**Solution:**
1. Verify file paths are correct (case-sensitive on Linux servers)
2. Check file permissions (644 for files, 755 for directories)
3. Verify compression isn't breaking files

### Issue: Mixed Content Error (HTTPS page loading HTTP)
**Solution:**
1. Update all URLs from `http://` to `https://`
2. Update CSP headers in `.htaccess`
3. Clear browser cache

## Performance Optimization

1. **Enable Caching:**
   - Static content: 1 month
   - HTML: 1 hour
   - API responses: 5 minutes (if applicable)

2. **Optimize Images:**
   - Use WebP format where possible
   - Compress PNG/JPG files
   - Use proper image dimensions

3. **Minimize CSS/JavaScript:**
   - Combine files where possible
   - Remove unused CSS
   - Use minified versions

## Maintenance

1. **Regular Backups:**
   - Hostinger > Backups > Enable automatic backups
   - Download monthly backups locally

2. **Monitor Logs:**
   - Check error logs in Hostinger > Logs
   - Monitor 404 errors
   - Check API response times

3. **Update Content:**
   - Edit HTML files directly in File Manager
   - Or use SFTP to update files locally
   - Verify changes are reflected on live site

## Advanced: Automatic Deployments

### Using Hostinger Git Integration
If available in your Hostinger plan:

1. Connect GitHub repository
2. Set deployment branch to `main` (or your branch)
3. Configure automatic deployments on push
4. Each push will auto-deploy to your site

### Using Deployment Scripts

Create a `deploy.sh` script:

```bash
#!/bin/bash
# Deploy to Hostinger via SFTP

USER="your-cpanel-username"
HOST="your-domain.com"
LOCALDIR="./public/*"
REMOTEDIR="/public_html"

scp -r $LOCALDIR $USER@$HOST:$REMOTEDIR

echo "Deployment complete!"
```

Then run: `bash deploy.sh`

## Security Best Practices

1. ✅ Always use HTTPS
2. ✅ Enable security headers via `.htaccess`
3. ✅ Disable directory listing
4. ✅ Keep backup of production files
5. ✅ Store sensitive data in environment variables (backend only)
6. ✅ Regular security audits
7. ✅ Monitor for suspicious activities

## Support

For Hostinger-specific issues:
- Visit Hostinger Help Center: https://support.hostinger.com
- Contact Hostinger Support Chat
- Check feature availability in your hosting plan

For HackHalt issues:
- Backend API: https://hackhalt-cic-lemon.vercel.app
- Check Vercel logs: https://vercel.com/dashboard
