const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema({
  purpose: {
    type: String,
    enum: {
      values: ['Contact Inquiry', 'Join Initiative', 'Ambassador Application'],
      message: 'Invalid purpose. Must be one of: Contact Inquiry, Join Initiative, Ambassador Application'
    },
    required: [true, 'Please select a purpose'],
    trim: true,
    set: (v) => (v || '').trim() // Ensure trim on set
  },
  name: {
    type: String,
    required: [true, 'Please provide a name'],
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
    trim: true
  },
  subject: {
    type: String,
    trim: true,
    maxlength: [200, 'Subject cannot be more than 200 characters']
  },
  message: {
    type: String,
    maxlength: [5000, 'Message cannot be more than 5000 characters']
  },
  organization: {
    type: String,
    trim: true,
    maxlength: [200, 'Organization name cannot be more than 200 characters']
  },
  interests: {
    type: String,
    trim: true,
    maxlength: [2000, 'Interests cannot be more than 2000 characters']
  },
  region: {
    type: String,
    trim: true,
    maxlength: [100, 'Region cannot be more than 100 characters']
  },
  linkedin: {
    type: String,
    trim: true,
    maxlength: [500, 'LinkedIn URL cannot be more than 500 characters']
  },
  experience: {
    type: String,
    trim: true,
    maxlength: [3000, 'Experience cannot be more than 3000 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
