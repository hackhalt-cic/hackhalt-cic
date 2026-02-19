/**
 * Submissions API Routes
 * Handles retrieval of form submissions and blog posts for admin dashboard
 */

const express = require('express');
const router = express.Router();
const ContactSubmission = require('../models/ContactSubmission');
const BlogSubmission = require('../models/BlogSubmission');

// ============================================
// GET /api/submissions/contact - Get contact submissions by purpose
// ============================================
router.get('/contact', async (req, res) => {
  try {
    const { purpose } = req.query;

    // Build query
    const query = {};
    if (purpose) {
      query.purpose = purpose;
    }

    // Fetch submissions
    const submissions = await ContactSubmission.find(query)
      .sort({ createdAt: -1 })
      .limit(1000);

    res.json({
      success: true,
      data: submissions,
      count: submissions.length
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch contact submissions:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact submissions',
      message: error.message
    });
  }
});

// ============================================
// GET /api/submissions/blogs - Get all blog submissions
// ============================================
router.get('/blogs', async (req, res) => {
  try {
    const { status } = req.query;

    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }

    // Fetch blogs
    const blogs = await BlogSubmission.find(query)
      .sort({ createdAt: -1 })
      .limit(1000);

    res.json({
      success: true,
      data: blogs,
      count: blogs.length
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch blog submissions:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog submissions',
      message: error.message
    });
  }
});

// ============================================
// GET /api/submissions/contact/:id - Get single contact submission
// ============================================
router.get('/contact/:id', async (req, res) => {
  try {
    const submission = await ContactSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Contact submission not found'
      });
    }

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch contact submission:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch contact submission',
      message: error.message
    });
  }
});

// ============================================
// GET /api/submissions/blog/:id - Get single blog submission
// ============================================
router.get('/blog/:id', async (req, res) => {
  try {
    const blog = await BlogSubmission.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: 'Blog submission not found'
      });
    }

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch blog submission:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog submission',
      message: error.message
    });
  }
});

// ============================================
// POST /api/submissions/blog - Create new blog submission
// ============================================
router.post('/blog', async (req, res) => {
  try {
    const { title, author, category, content, excerpt, image, tags, status } = req.body;

    // Validation
    if (!title || !author || !content) {
      return res.status(400).json({
        success: false,
        error: 'Title, author, and content are required'
      });
    }

    // Create new blog
    const newBlog = new BlogSubmission({
      title,
      author,
      category,
      content,
      excerpt,
      image,
      tags,
      status: status || 'Pending'
    });

    await newBlog.save();

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: newBlog
    });
  } catch (error) {
    console.error('[ERROR] Failed to create blog:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create blog',
      message: error.message
    });
  }
});

// ============================================
// PUT /api/submissions/blog/:id - Update blog submission
// ============================================
router.put('/blog/:id', async (req, res) => {
  try {
    const { title, author, category, content, excerpt, image, tags, status } = req.body;

    const blog = await BlogSubmission.findByIdAndUpdate(
      req.params.id,
      {
        title,
        author,
        category,
        content,
        excerpt,
        image,
        tags,
        status
      },
      { new: true, runValidators: true }
    );

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: 'Blog not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: blog
    });
  } catch (error) {
    console.error('[ERROR] Failed to update blog:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update blog',
      message: error.message
    });
  }
});

// ============================================
// DELETE /api/submissions/blog/:id - Delete blog submission
// ============================================
router.delete('/blog/:id', async (req, res) => {
  try {
    const blog = await BlogSubmission.findByIdAndDelete(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: 'Blog not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog deleted successfully',
      data: blog
    });
  } catch (error) {
    console.error('[ERROR] Failed to delete blog:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete blog',
      message: error.message
    });
  }
});

module.exports = router;
