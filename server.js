require('dotenv').config();
const express = require("express");
const path = require("path");
const compression = require("compression");
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const connectDB = require("./config/database");

// Security imports
const { secureAuthMiddleware, requireRole } = require("./middleware/secureAuthMiddleware");
const { apiLimiter } = require("./middleware/rateLimiter");
const securityHeaders = require("./utils/securityHeaders");
const secureAdminAuthRoutes = require("./routes/secureAdminAuth");

// Models
const ContactSubmission = require("./models/ContactSubmission");
const JoinSubmission = require("./models/JoinSubmission");
const BlogSubmission = require("./models/BlogSubmission");
const BookingSession = require("./models/BookingSession");
const AmbassadorSubmission = require("./models/AmbassadorSubmission");
const MembershipSubmission = require("./models/MembershipSubmission");
const Admin = require("./models/Admin");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

// Security headers
app.use(securityHeaders);

// Middleware for compression and performance
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Body parser middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.SESSION_SECRET));

// CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Always allow same-origin and localhost for development
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://localhost',
    'http://127.0.0.1:5000',
    'http://127.0.0.1',
    'https://hackhalt.org',
    'https://www.hackhalt.org',
  ];
  
  if (process.env.VERCEL_URL) {
    allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
  }
  
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  
  // Allow requests from allowed origins or same-origin (when no origin header) or production
  if (allowedOrigins.includes(origin) || !origin || isProduction) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Configure Express to handle font MIME types correctly for production
app.set('view cache', true);
express.static.mime.types['woff'] = 'font/woff';
express.static.mime.types['woff2'] = 'font/woff2';
express.static.mime.types['ttf'] = 'font/ttf';

// Serve static files from /public with optimized caching
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  fallthrough: true,
  setHeaders: (res, filePath, stat) => {
    // Cache static assets for 1 day, but allow revalidation
    if (filePath.match(/\.(js|css|woff|woff2|ttf|eot|svg)$/)) {
      res.set('Cache-Control', 'public, max-age=86400, immutable');
      res.set('ETag', '"' + stat.mtimeMs.toString(16) + '"');
      // Ensure correct MIME types for fonts
      if (filePath.endsWith('.woff2')) res.set('Content-Type', 'font/woff2');
      if (filePath.endsWith('.woff')) res.set('Content-Type', 'font/woff');
      if (filePath.endsWith('.ttf')) res.set('Content-Type', 'font/ttf');
    } else if (filePath.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
      res.set('Cache-Control', 'public, max-age=2592000, immutable');
    } else if (filePath.match(/\.(html)$/)) {
      res.set('Cache-Control', 'public, max-age=3600, must-revalidate');
    }
  }
}));

// Set performance headers
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('X-XSS-Protection', '1; mode=block');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-UA-Compatible', 'IE=edge');
  next();
});

// Connect to MongoDB
connectDB();

// Auto-initialize admin user if corrupted or missing
async function initializeAdminUser() {
  try {
    const bcrypt = require('bcryptjs');
    
    // Give MongoDB a moment to connect
    await new Promise(resolve => setTimeout(resolve, 1000));

    const admin = await Admin.findOne({ username: 'admin' }).select('+password');
    
    if (!admin || !admin.password || !admin.password.startsWith('$2')) {
      console.log('🔧 Admin user missing or corrupted. Reinitializing...');
      
      // Delete old admin if exists
      if (admin) {
        await Admin.deleteOne({ username: 'admin' });
      }
      
      // Create new admin with properly hashed password
      const password = 'HackHalt@2025';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      await Admin.collection.insertOne({
        username: 'admin',
        email: 'admin@hackhalt.com',
        password: hashedPassword,
        role: 'super-admin',
        isActive: true,
        createdAt: new Date()
      });
      
      console.log('✅ Admin user reinitialized successfully');
      console.log('   Username: admin');
      console.log('   Password: HackHalt@2025');
    } else {
      // Verify password works
      try {
        const isValid = await admin.comparePassword('HackHalt@2025');
        if (isValid) {
          console.log('✅ Admin user verified - password is valid');
        } else {
          console.log('⚠️  Admin user exists but password is invalid. Resetting...');
          const password = 'HackHalt@2025';
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);
          
          await Admin.updateOne(
            { username: 'admin' },
            { password: hashedPassword }
          );
          
          console.log('✅ Admin password reset to HackHalt@2025');
        }
      } catch (verifyError) {
        console.log('⚠️  Admin password verification failed. Resetting...');
        const password = 'HackHalt@2025';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        await Admin.updateOne(
          { username: 'admin' },
          { password: hashedPassword }
        );
        
        console.log('✅ Admin password reset to HackHalt@2025');
      }
    }
  } catch (error) {
    console.error('⚠️  Failed to initialize admin user:', error.message);
    // Don't fail startup if admin init fails
  }
}

// Run initialization after a short delay to let MongoDB connect
setTimeout(initializeAdminUser, 2000);

// Routes for multi-page website
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/about", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "about.html"));
});

app.get("/community", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "community.html"));
});

app.get("/blogs", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "blogs.html"));
});

app.get("/events", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "events.html"));
});

app.get("/partners", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "partners.html"));
});

app.get("/contact", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "contact.html"));
});

app.get("/legal-compliance", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "legal-compliance.html"));
});

app.get("/book-session", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "book-session.html"));
});

app.get("/add-blog", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "add-blog.html"));
});

// ========== SECURITY & RATE LIMITING ==========
app.use('/api/', apiLimiter);

// ========== API RESPONSE HEADERS MIDDLEWARE ==========
app.use('/api/', (req, res, next) => {
  // Force JSON for all API responses - prevent HTML output
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.set('X-Content-Type-Options', 'nosniff');
  next();
});

// ========== AUTHENTICATION ROUTES ==========
app.use('/api/auth', secureAdminAuthRoutes);
console.log('✅ Registered route: /api/auth');

// ========== PROTECTED ADMIN ROUTES ==========
app.get("/admin", (req, res) => {
  // Check if user has valid token
  if (!req.cookies?.adminToken) {
    return res.redirect('/admin-login');
  }
  
  try {
    jwt.verify(req.cookies.adminToken, process.env.JWT_SECRET);
    res.sendFile(path.join(__dirname, "public", "admin.html"));
  } catch (error) {
    // Token invalid, redirect to login
    res.clearCookie('adminToken');
    res.redirect('/admin-login');
  }
});

app.get("/admin-login", (req, res) => {
  // Redirect authenticated users to /admin
  if (req.cookies?.adminToken) {
    try {
      jwt.verify(req.cookies.adminToken, process.env.JWT_SECRET);
      return res.redirect('/admin');
    } catch (error) {
      // Token invalid, show login page
    }
  }
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.get("/blog-admin", (req, res) => {
  // Check if user has valid token
  if (!req.cookies?.adminToken) {
    return res.redirect('/admin-login');
  }
  
  try {
    jwt.verify(req.cookies.adminToken, process.env.JWT_SECRET);
    res.sendFile(path.join(__dirname, "public", "blog-admin.html"));
  } catch (error) {
    // Token invalid, redirect to login
    res.clearCookie('adminToken');
    res.redirect('/admin-login');
  }
});

// ========== API ENDPOINTS ==========

// GET /api/health - Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const mongoStatus = require('mongoose').connection.readyState;
    // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
    const mongoStatusText = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    }[mongoStatus] || 'unknown';

    res.json({
      success: true,
      message: "Server is running",
      mongodb: mongoStatusText,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/debug/admin - Debug admin user (development only)
app.get("/api/debug/admin", async (req, res) => {
  try {
    const admin = await Admin.findOne({ username: 'admin' }).select("+password");
    
    if (!admin) {
      return res.json({
        success: false,
        message: "Admin user not found"
      });
    }

    res.json({
      success: true,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      hasPassword: !!admin.password,
      passwordLength: admin.password ? admin.password.length : 0,
      passwordPrefix: admin.password ? admin.password.substring(0, 30) : 'N/A',
      isValidBcryptHash: admin.password && admin.password.startsWith('$2') ? 'Looks valid' : 'May be corrupted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/debug/test-password - Test password directly (development only)
app.post("/api/debug/test-password", async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Password required"
      });
    }

    const admin = await Admin.findOne({ username: 'admin' }).select("+password");
    
    if (!admin) {
      return res.json({
        success: false,
        message: "Admin user not found"
      });
    }

    const isValid = await admin.comparePassword(password);
    
    res.json({
      success: true,
      passwordTested: password,
      passwordMatch: isValid,
      adminPassword: admin.password ? admin.password.substring(0, 30) + '...' : 'N/A'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ========== ADMIN AUTHENTICATION ==========
// Login endpoint now at: POST /api/auth/login (see routes/secureAdminAuth.js)
// Includes: rate limiting, bcrypt, JWT, HTTP-only cookies, audit logging

// POST /api/admin/register - Create new admin (protected)
app.post("/api/admin/register", secureAuthMiddleware, requireRole('super-admin'), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        error: "Username or email already exists"
      });
    }

    // Create new admin
    const newAdmin = new Admin({
      username,
      email,
      password,
      role: role || 'admin',
      isActive: true
    });

    await newAdmin.save();

    console.log(`New admin created: ${username}`);

    res.json({
      success: true,
      message: "Admin created successfully",
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create admin"
    });
  }
});

// GET /api/admin/profile - Get current admin profile
app.get("/api/admin/profile", secureAuthMiddleware, async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: "Admin not found"
      });
    }

    res.json({
      success: true,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        lastLogin: admin.lastLogin
      }
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch profile"
    });
  }
});

// POST /api/contact - Handle unified form submissions with purpose classification
app.post("/api/contact", async (req, res) => {
  console.log("🔵 POST /api/contact received at", new Date().toISOString());
  console.log("📦 Request body:", req.body);
  
  try {
    let { purpose, name, email, phone, subject, message, organization, interests, region, linkedin, experience } = req.body;
    
    // Normalize purpose - trim and validate
    if (purpose) {
      purpose = (purpose || '').trim();
      console.log("🔧 Normalized purpose:", purpose);
    }
    
    console.log("📋 Extracted fields:", { purpose, name, email, subject, message, organization, interests, region, linkedin, experience });

    // Validation - Always required
    if (!purpose || !name || !email) {
      console.warn("❌ Validation failed - missing required fields (purpose, name, or email)");
      return res.status(400).json({
        success: false,
        error: "Please select a purpose and provide name and email"
      });
    }

    // Validate purpose
    const validPurposes = ['Contact Inquiry', 'Join Initiative', 'Ambassador Application'];
    if (!validPurposes.includes(purpose)) {
      console.warn("❌ Invalid purpose:", purpose);
      return res.status(400).json({
        success: false,
        error: "Invalid purpose selected"
      });
    }

    // Purpose-specific validation
    if (purpose === 'Contact Inquiry') {
      if (!subject || !message) {
        return res.status(400).json({
          success: false,
          error: "Please provide subject and message for Contact Inquiry"
        });
      }
    } else if (purpose === 'Join Initiative') {
      if (!interests) {
        return res.status(400).json({
          success: false,
          error: "Please fill in the areas of interest"
        });
      }
    } else if (purpose === 'Ambassador Application') {
      if (!region || !experience) {
        return res.status(400).json({
          success: false,
          error: "Please provide region and experience for Ambassador Application"
        });
      }
    }

    // Create new unified contact submission
    const contactSubmission = new ContactSubmission({
      purpose: purpose,
      name: (name || '').trim(),
      email: (email || '').trim(),
      phone: phone ? (phone || '').trim() : undefined,
      subject: subject ? (subject || '').trim() : undefined,
      message: message ? (message || '').trim() : undefined,
      organization: organization ? (organization || '').trim() : undefined,
      interests: interests ? (interests || '').trim() : undefined,
      region: region ? (region || '').trim() : undefined,
      linkedin: linkedin ? (linkedin || '').trim() : undefined,
      experience: experience ? (experience || '').trim() : undefined
    });
    console.log("📝 ContactSubmission object created with purpose:", purpose);

    // Save to MongoDB
    const savedSubmission = await contactSubmission.save();
    console.log("✅ Unified submission saved with ID:", savedSubmission._id, "Purpose:", purpose);

    console.log("✉️ Unified submission received:", { purpose, name, email, timestamp: new Date() });

    res.json({
      success: true,
      message: `Thank you for your ${purpose.toLowerCase()}. We'll get back to you soon!`,
      submissionId: savedSubmission._id,
      purpose: purpose
    });
    console.log("📤 Response sent successfully");
  } catch (error) {
    console.error("❌ Error processing unified form:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process form submission"
    });
  }
});

// POST /api/join - Handle join form submissions (DEPRECATED - use /api/contact instead)
app.post("/api/join", async (req, res) => {
  try {
    const { name, email, organization, interests } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    // Create new join submission with purpose set to "Join Initiative" for backward compatibility
    const joinSubmission = new ContactSubmission({
      purpose: 'Join Initiative',
      name,
      email,
      organization,
      interests
    });

    // Save to MongoDB
    const savedSubmission = await joinSubmission.save();

    console.log("Join submission received:", { name, email, organization, timestamp: new Date() });

    res.json({
      success: true,
      message: "Welcome to HackHalt CIC! You'll receive confirmation email soon.",
      submissionId: savedSubmission._id
    });
  } catch (error) {
    console.error("Error processing join form:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process join form"
    });
  }
});

// POST /api/book-session - Handle booking session submissions
app.post("/api/book-session", async (req, res) => {
  try {
    const { name, email, organisation, package: packageType, dates, message } = req.body;

    // Validation
    if (!name || !email || !packageType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    // Create new booking session
    const bookingSession = new BookingSession({
      name,
      email,
      organisation,
      package: packageType,
      dates,
      message
    });

    // Save to MongoDB
    const savedSubmission = await bookingSession.save();

    console.log("🔵 Booking session received:", { name, email, organisation, package: packageType, timestamp: new Date() });

    res.json({
      success: true,
      message: "Thank you for your booking request! We will contact you with availability.",
      submissionId: savedSubmission._id
    });
  } catch (error) {
    console.error("❌ Error processing booking form:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process booking form"
    });
  }
});

// GET /api/submissions/bookings - Get all booking submissions
app.get("/api/submissions/bookings", async (req, res) => {
  try {
    const submissions = await BookingSession.find().sort({ createdAt: -1 });
    console.log("📊 Found", submissions.length, "booking sessions");
    res.json({
      success: true,
      submissions: submissions
    });
  } catch (error) {
    console.error("❌ Error fetching booking submissions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch booking submissions"
    });
  }
});

// DELETE /api/submissions/bookings/:id - Delete booking submission
app.delete("/api/submissions/bookings/:id", async (req, res) => {
  try {
    await BookingSession.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Booking deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete booking"
    });
  }
});

// GET /api/submissions - Get all submissions (for admin/testing)
app.get("/api/submissions", async (req, res) => {
  try {
    // Check database connection
    const mongoStatus = require('mongoose').connection.readyState;
    if (mongoStatus !== 1) {
      return res.status(503).json({
        success: false,
        error: "Database not connected",
        dbStatus: mongoStatus
      });
    }

    const [contactSubmissions, joinSubmissions, blogSubmissions, bookingSubmissions, ambassadorSubmissions] = await Promise.all([
      ContactSubmission.find().sort({ createdAt: -1 }),
      JoinSubmission.find().sort({ createdAt: -1 }),
      BlogSubmission.find().sort({ createdAt: -1 }),
      BookingSession.find().sort({ createdAt: -1 }),
      AmbassadorSubmission.find().sort({ createdAt: -1 })
    ]);

    res.json({
      success: true,
      counts: {
        contact: contactSubmissions.length,
        join: joinSubmissions.length,
        blogs: blogSubmissions.length,
        bookings: bookingSubmissions.length,
        ambassadors: ambassadorSubmissions.length
      },
      submissions: {
        contact: contactSubmissions,
        join: joinSubmissions,
        blogs: blogSubmissions,
        bookings: bookingSubmissions,
        ambassadors: ambassadorSubmissions
      }
    });
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch submissions",
      details: error.message
    });
  }
});

// POST /api/blog - Admin: Create blog immediately (protected)
app.post("/api/blog", secureAuthMiddleware, async (req, res) => {
  try {
    const { title, author, category, content, excerpt, image, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: title and content"
      });
    }

    const blogSubmission = new BlogSubmission({
      title,
      author: author || "Anonymous",
      category: category || "General",
      content,
      excerpt: excerpt || content.substring(0, 500),
      image: image || null,
      tags: tags || [],
      status: 'Approved',
      adminId: req.admin.id,
      isPublished: true
    });

    const savedSubmission = await blogSubmission.save();
    console.log("Admin blog created:", { title, adminId: req.admin.id });

    res.json({
      success: true,
      message: "Blog post created successfully!",
      submissionId: savedSubmission._id
    });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create blog"
    });
  }
});

// PUT /api/blog/:id - Admin: Edit & approve/reject blog (protected)
app.put("/api/blog/:id", secureAuthMiddleware, async (req, res) => {
  try {
    const { title, author, category, content, excerpt, image, status } = req.body;
    
    // Build update object with only provided fields
    const updateData = { updatedAt: new Date() };
    if (title !== undefined && title !== null) updateData.title = title;
    if (author !== undefined && author !== null) updateData.author = author;
    if (category !== undefined && category !== null) updateData.category = category;
    if (content !== undefined && content !== null) updateData.content = content;
    if (excerpt !== undefined && excerpt !== null) updateData.excerpt = excerpt;
    if (image !== undefined && image !== null) updateData.image = image;
    if (status !== undefined && status !== null) updateData.status = status;

    const blog = await BlogSubmission.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: "Blog not found"
      });
    }

    console.log("✅ Blog updated:", { id: req.params.id, title: blog.title, status: blog.status });

    res.json({
      success: true,
      message: "Blog updated successfully",
      blog
    });
  } catch (error) {
    console.error("❌ Error updating blog:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to update blog"
    });
  }
});

// GET /api/submissions/contact - Get all contact submissions (unified endpoint with optional purpose filtering)
app.get("/api/submissions/contact", async (req, res) => {
  console.log("🔵 GET /api/submissions/contact requested at", new Date().toISOString());
  const { purpose } = req.query;
  
  try {
    let query = {};
    const validPurposes = ['Contact Inquiry', 'Join Initiative', 'Ambassador Application'];
    
    // Filter by purpose if provided
    if (purpose) {
      const normalizedInput = (purpose || '').trim();
      console.log("🔍 Filtering by purpose. Input:", purpose, "Normalized:", normalizedInput);
      
      if (validPurposes.includes(normalizedInput)) {
        query.purpose = normalizedInput;
        console.log("✅ Valid purpose filter applied:", normalizedInput);
      } else {
        console.warn("⚠️ Invalid purpose provided, will return all:", purpose);
      }
    }
    
    // Fetch from database with exact string matching
    const submissions = await ContactSubmission.find(query).sort({ createdAt: -1 });
    console.log("📊 Found", submissions.length, "contact submissions");
    console.log("📋 Query filter:", query);
    
    // Log sample of submissions for debugging
    if (submissions.length > 0) {
      console.log("📋 Sample submission purposes:", submissions.slice(0, 3).map(s => ({ id: s._id, purpose: s.purpose, name: s.name })));
    }
    
    const response = {
      success: true,
      submissions: submissions,
      filter: query,
      count: submissions.length
    };
    console.log("📤 Sending response with", submissions.length, "submissions");
    res.json(response);
  } catch (error) {
    console.error("❌ Error fetching contact submissions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch contact submissions"
    });
  }
});

// GET /api/submissions/join - Get all join submissions (DEPRECATED - use /api/submissions/contact?purpose=Join%20Initiative)
app.get("/api/submissions/join", async (req, res) => {
  try {
    // Fetch submissions with purpose set to "Join Initiative" for backward compatibility
    const submissions = await ContactSubmission.find({ purpose: 'Join Initiative' }).sort({ createdAt: -1 });
    res.json({
      success: true,
      submissions: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch join submissions"
    });
  }
});

// GET /api/submissions/blogs - Admin: Get all blog submissions (all statuses)
app.get("/api/submissions/blogs", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const submissions = await BlogSubmission.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({
      success: true,
      submissions: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch blog submissions"
    });
  }
});

// GET /api/blogs - Public: Get approved blogs only (sorted descending by date)
app.get("/api/blogs", async (req, res) => {
  try {
    const blogs = await BlogSubmission.find({ status: 'Approved' })
      .sort({ createdAt: -1 });
    res.json({
      success: true,
      blogs: blogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch blogs"
    });
  }
});

// DELETE /api/submissions/contact/:id - Delete contact submission
app.delete("/api/submissions/contact/:id", async (req, res) => {
  try {
    await ContactSubmission.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Submission deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete submission"
    });
  }
});

// DELETE /api/submissions/join/:id - Delete join submission
app.delete("/api/submissions/join/:id", async (req, res) => {
  try {
    await JoinSubmission.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Submission deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete submission"
    });
  }
});

// DELETE /api/submissions/blogs/:id - Delete blog submission
app.delete("/api/submissions/blogs/:id", async (req, res) => {
  try {
    await BlogSubmission.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Blog submission deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete blog submission"
    });
  }
});

// POST /api/ambassadors - Submit ambassador application
app.post("/api/ambassadors", async (req, res) => {
  try {
    console.log("📝 Ambassador form submission received:", JSON.stringify(req.body, null, 2));
    
    const { firstName, lastName, email, phone, region, expertise, bio, timestamp } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !phone || !region || !expertise) {
      console.log("❌ Validation failed. Received:", {firstName, lastName, email, phone, region, expertise});
      return res.status(400).json({
        success: false,
        error: "Missing required fields: " + (
          !firstName ? "firstName " : "" +
          !lastName ? "lastName " : "" +
          !email ? "email " : "" +
          !phone ? "phone " : "" +
          !region ? "region " : "" +
          !expertise ? "expertise " : ""
        ).trim()
      });
    }

    // Check if email already exists
    const existingApplication = await AmbassadorSubmission.findOne({ email });
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        error: "An application with this email already exists"
      });
    }

    // Create new ambassador submission
    const ambassadorSubmission = new AmbassadorSubmission({
      firstName,
      lastName,
      email,
      phone,
      region,
      expertise,
      bio: bio || "",
      timestamp: timestamp || new Date()
    });

    await ambassadorSubmission.save();

    console.log("✅ Ambassador application submitted:", email);
    res.json({
      success: true,
      message: "Application submitted successfully",
      submission: ambassadorSubmission
    });
  } catch (error) {
    console.error("Ambassador submission error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit application: " + error.message
    });
  }
});

// GET /api/submissions/ambassadors - Get all ambassador applications
app.get("/api/submissions/ambassadors", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const submissions = await AmbassadorSubmission.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({
      success: true,
      submissions: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch ambassador applications"
    });
  }
});

// GET /api/ambassadors - Get all ambassador applications (legacy endpoint)
app.get("/api/ambassadors", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const submissions = await AmbassadorSubmission.find()
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({
      success: true,
      submissions: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch ambassador applications"
    });
  }
});

// DELETE /api/submissions/ambassadors/:id - Delete ambassador application
app.delete("/api/submissions/ambassadors/:id", async (req, res) => {
  try {
    await AmbassadorSubmission.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Application deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete application"
    });
  }
});

// DELETE /api/ambassadors/:id - Delete ambassador application (legacy endpoint)
app.delete("/api/ambassadors/:id", async (req, res) => {
  try {
    await AmbassadorSubmission.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Application deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete application"
    });
  }
});

// ========== MEMBERSHIP SUBMISSIONS ==========
// POST /api/submissions/membership - Create membership submission
app.post("/api/submissions/membership", async (req, res) => {
  try {
    const membershipSubmission = new MembershipSubmission(req.body);
    const savedSubmission = await membershipSubmission.save();
    
    res.status(201).json({
      success: true,
      message: "Membership application submitted successfully",
      submission: savedSubmission
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Error submitting membership application",
      error: error.message
    });
  }
});

// GET /api/submissions/membership - Get all membership submissions
app.get("/api/submissions/membership", authMiddleware, async (req, res) => {
  try {
    const submissions = await MembershipSubmission.find().sort({ submittedAt: -1 });
    res.json({
      success: true,
      count: submissions.length,
      submissions: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching membership submissions",
      error: error.message
    });
  }
});

// DELETE /api/submissions/membership/:id - Delete membership submission
app.delete("/api/submissions/membership/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await MembershipSubmission.findByIdAndDelete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Membership submission not found"
      });
    }
    
    res.json({
      success: true,
      message: "Membership submission deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting membership submission",
      error: error.message
    });
  }
});

// ========== API ENDPOINT ALIASES ==========
// GET /api/contact - Alias for /api/submissions/contact
app.get("/api/contact", async (req, res) => {
  try {
    const submissions = await ContactSubmission.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      submissions: submissions
    });
  } catch (error) {
    console.error('❌ Error fetching contact submissions:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch contact submissions",
      details: error.message
    });
  }
});

// GET /api/join - Alias for /api/submissions/join
app.get("/api/join", async (req, res) => {
  try {
    const submissions = await JoinSubmission.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      submissions: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch join submissions"
    });
  }
});

// GET /api/ambassador - Alias for /api/submissions/ambassadors
app.get("/api/ambassador", async (req, res) => {
  try {
    const submissions = await AmbassadorSubmission.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      submissions: submissions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch ambassador submissions"
    });
  }
});

// DELETE /api/contact/:id - Delete contact submission
app.delete("/api/contact/:id", async (req, res) => {
  try {
    await ContactSubmission.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Contact submission deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete contact submission"
    });
  }
});

// DELETE /api/join/:id - Delete join submission
app.delete("/api/join/:id", async (req, res) => {
  try {
    await JoinSubmission.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Join submission deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete join submission"
    });
  }
});

// DELETE /api/ambassador/:id - Delete ambassador submission
app.delete("/api/ambassador/:id", async (req, res) => {
  try {
    await AmbassadorSubmission.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Ambassador submission deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to delete ambassador submission"
    });
  }
});

// ========== GLOBAL ERROR HANDLER ==========
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  
  // Always return JSON for API routes
  if (req.path.startsWith('/api/')) {
    res.set('Content-Type', 'application/json; charset=utf-8');
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  }
  
  res.status(err.status || 500).send(err.message || 'Internal server error');
});

// ========== 404 HANDLER - ALWAYS JSON FOR API ==========
app.use((req, res) => {
  // CRITICAL: Always return JSON for API routes - NEVER return HTML
  if (req.path.startsWith('/api/')) {
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.set('X-Content-Type-Options', 'nosniff');
    console.warn(`[404] API route not found: ${req.method} ${req.path}`);
    return res.status(404).json({ 
      success: false, 
      error: 'API endpoint not found',
      path: req.path,
      method: req.method
    });
  }
  
  // For non-API routes, return HTML 404 page
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"), (err) => {
    if (err) {
      res.status(404).send('Page not found');
    }
  });
});

// Export for Vercel
module.exports = app;

// Only listen locally (not on Vercel)
if (require.main === module && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HackHalt CIC server running at http://localhost:${PORT}`);
  });
}
