const jwt = require('jsonwebtoken');

/**
 * Enhanced authentication middleware with production-level security
 * - Validates JWT tokens
 * - Checks token expiration
 * - Ensures HTTPS in production
 * - Prevents CSRF attacks
 */
const secureAuthMiddleware = (req, res, next) => {
  try {
    // 1. HTTPS check in production
    if (process.env.NODE_ENV === 'production' && req.get('X-Forwarded-Proto') !== 'https') {
      return res.status(403).json({
        success: false,
        error: 'HTTPS required'
      });
    }

    // 2. Extract token from HTTP-only cookie (preferred) or Authorization header
    let token = req.cookies?.adminToken;
    
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided',
        code: 'NO_TOKEN'
      });
    }


    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
 
      console.warn(`[SECURITY] Invalid JWT attempt: ${jwtError.message}`);
      
   
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }


    if (!decoded.id || !decoded.role) {
      return res.status(401).json({
        success: false,
        error: 'Malformed token',
        code: 'MALFORMED_TOKEN'
      });
    }

    // 5. Attach admin info to request
    req.admin = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('[SECURITY] Unexpected auth error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
  }
};

/**
 * Role-based authorization middleware
 * Usage: app.post('/api/admin/create', secureAuthMiddleware, requireRole('super-admin'), handler)
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (req.admin.role !== requiredRole && req.admin.role !== 'super-admin') {
      // Log unauthorized access attempt
      console.warn(`[SECURITY] Unauthorized access attempt by ${req.admin.username} to ${req.originalUrl}`);
      
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    next();
  };
};

/**
 * Optional: Verify CSRF token (if using session-based auth)
 * This provides defense against cross-site request forgery
 */
const verifyCsrfToken = (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfToken = req.headers['x-csrf-token'];
    const sessionCsrf = req.session ? req.session.csrfToken : null;

    if (!csrfToken || csrfToken !== sessionCsrf) {
      return res.status(403).json({
        success: false,
        error: 'CSRF validation failed',
        code: 'CSRF_FAILED'
      });
    }
  }
  next();
};

module.exports = {
  secureAuthMiddleware,
  requireRole,
  verifyCsrfToken
};
