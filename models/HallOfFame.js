const mongoose = require('mongoose');

const hallOfFameSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  designation: {
    type: String,
    required: [true, 'Designation is required'],
    trim: true,
    maxlength: [200, 'Designation cannot exceed 200 characters']
  },
  year: {
    type: Number,
    required: [true, 'Year is required'],
    min: [2024, 'Year must be 2024 or later'],
    max: [2100, 'Year must be 2100 or earlier']
  },
  quarter: {
    type: String,
    required: [true, 'Quarter is required'],
    enum: ['Q1', 'Q2', 'Q3', 'Q4']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for efficient queries by year and quarter
hallOfFameSchema.index({ year: -1, quarter: 1 });

module.exports = mongoose.model('HallOfFame', hallOfFameSchema);
