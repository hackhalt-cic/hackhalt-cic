/**
 * Blog API Routes
 * Handles direct blog operations for admin dashboard
 */

const express = require('express');
const router = express.Router();
const BlogSubmission = require('../models/BlogSubmission');

// ============================================
// POST /api/blog - Create new blog
// ============================================
router.post('/', async (req, res) => {
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
// GET /api/blog/:id - Get single blog
// ============================================
router.get('/:id', async (req, res) => {
  try {
    const blog = await BlogSubmission.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        error: 'Blog not found'
      });
    }

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    console.error('[ERROR] Failed to fetch blog:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog',
      message: error.message
    });
  }
});

// ============================================
// PUT /api/blog/:id - Update blog
// ============================================
router.put('/:id', async (req, res) => {
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
// DELETE /api/blog/:id - Delete blog
// ============================================
router.delete('/:id', async (req, res) => {
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
