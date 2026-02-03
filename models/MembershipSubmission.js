const mongoose = require('mongoose');

const membershipSubmissionSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please provide your full name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Please provide a phone number'],
    trim: true
  },
  organization: {
    type: String,
    trim: true
  },
  designation: {
    type: String,
    required: [true, 'Please provide your designation'],
    trim: true
  },
  membershipTier: {
    type: String,
    required: [true, 'Please select a membership tier'],
    enum: ['student', 'professional', 'organizational']
  },
  interests: {
    type: String,
    required: [true, 'Please provide your areas of interest'],
    maxlength: [1000, 'Interests cannot be more than 1000 characters']
  },
  message: {
    type: String,
    maxlength: [2000, 'Message cannot be more than 2000 characters']
  },
  agreeTerms: {
    type: Boolean,
    required: true,
    default: false
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  }
});

module.exports = mongoose.model('MembershipSubmission', membershipSubmissionSchema);
