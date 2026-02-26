/**
 * Hall of Fame API Routes
 * Public GET + Admin-protected POST/PUT/DELETE
 */

const express = require('express');
const router = express.Router();
const HallOfFame = require('../models/HallOfFame');

// ============================================
// GET /api/hall-of-fame - Public: Get all entries
// ============================================
router.get('/', async (req, res) => {
  try {
    const entries = await HallOfFame.find().sort({ year: -1, quarter: 1, createdAt: -1 });
    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    console.error('[HOF] Error fetching entries:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Hall of Fame entries'
    });
  }
});

// ============================================
// POST /api/hall-of-fame - Admin: Add new entry
// ============================================
router.post('/', async (req, res) => {
  try {
    const { name, designation, year, quarter } = req.body;

    // Validation
    if (!name || !designation || !year || !quarter) {
      return res.status(400).json({
        success: false,
        error: 'Name, designation, year, and quarter are required'
      });
    }

    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      return res.status(400).json({
        success: false,
        error: 'Quarter must be Q1, Q2, Q3, or Q4'
      });
    }

    const yearNum = parseInt(year, 10);
    if (isNaN(yearNum) || yearNum < 2024 || yearNum > 2100) {
      return res.status(400).json({
        success: false,
        error: 'Year must be between 2024 and 2100'
      });
    }

    const newEntry = new HallOfFame({
      name: name.trim(),
      designation: designation.trim(),
      year: yearNum,
      quarter
    });

    await newEntry.save();
    console.log('[HOF] New entry added:', newEntry._id, '-', name);

    res.status(201).json({
      success: true,
      message: 'Hall of Fame entry added successfully',
      data: newEntry
    });
  } catch (error) {
    console.error('[HOF] Error adding entry:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to add Hall of Fame entry',
      message: error.message
    });
  }
});

// ============================================
// PUT /api/hall-of-fame/:id - Admin: Update entry
// ============================================
router.put('/:id', async (req, res) => {
  try {
    const { name, designation, year, quarter } = req.body;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (designation) updateData.designation = designation.trim();
    if (year) {
      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 2024 || yearNum > 2100) {
        return res.status(400).json({ success: false, error: 'Year must be between 2024 and 2100' });
      }
      updateData.year = yearNum;
    }
    if (quarter) {
      if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
        return res.status(400).json({ success: false, error: 'Quarter must be Q1, Q2, Q3, or Q4' });
      }
      updateData.quarter = quarter;
    }

    const entry = await HallOfFame.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    res.json({ success: true, message: 'Entry updated', data: entry });
  } catch (error) {
    console.error('[HOF] Error updating entry:', error.message);
    res.status(500).json({ success: false, error: 'Failed to update entry' });
  }
});

// ============================================
// DELETE /api/hall-of-fame/:id - Admin: Delete entry
// ============================================
router.delete('/:id', async (req, res) => {
  try {
    const entry = await HallOfFame.findByIdAndDelete(req.params.id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }

    console.log('[HOF] Entry deleted:', req.params.id);
    res.json({ success: true, message: 'Entry deleted' });
  } catch (error) {
    console.error('[HOF] Error deleting entry:', error.message);
    res.status(500).json({ success: false, error: 'Failed to delete entry' });
  }
});

module.exports = router;
