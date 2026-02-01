const mongoose = require("mongoose");

const ambassadorSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  region: {
    type: String,
    required: true,
    enum: ["North", "South", "East", "West", "Central", "Northeast"]
  },
  expertise: {
    type: String,
    required: true,
    minlength: 10
  },
  bio: {
    type: String,
    default: ""
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
ambassadorSchema.index({ email: 1 });
ambassadorSchema.index({ region: 1 });
ambassadorSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AmbassadorSubmission", ambassadorSchema);
