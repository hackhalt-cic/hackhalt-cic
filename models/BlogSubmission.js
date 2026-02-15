const mongoose = require('mongoose');

const blogSubmissionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [300, 'Title cannot be more than 300 characters']
  },
  author: {
    type: String,
    required: [true, 'Please provide author name'],
    trim: true,
    maxlength: [100, 'Author name cannot be more than 100 characters']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot be more than 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Please provide blog content'],
    maxlength: [50000, 'Content cannot be more than 50000 characters']
  },
  excerpt: {
    type: String,
    maxlength: [500, 'Excerpt cannot be more than 500 characters']
  },
  image: {
    type: String,
    default: null
  },
  tags: [{
    type: String,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BlogSubmission', blogSubmissionSchema);
