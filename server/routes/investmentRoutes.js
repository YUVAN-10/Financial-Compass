const express = require('express');
const router = express.Router();
const Investment = require('../models/Investment');
const { protect } = require('../middleware/auth'); // Correctly import the protect middleware

// GET all investments for user
router.get('/', protect, async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user.id }).sort({ date: -1 });
    res.json(investments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST new investment
router.post('/', protect, async (req, res) => {
  const { name, type, amount, date, notes } = req.body;
  try {
    const newInvestment = new Investment({
      user: req.user.id,
      name,
      type,
      amount,
      date,
      notes
    });
    await newInvestment.save();
    res.status(201).json(newInvestment);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save' });
  }
});

// UPDATE an investment
router.put('/:id', protect, async (req, res) => {
  try {
    let investment = await Investment.findById(req.params.id);

    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' });
    }

    // Make sure user owns investment
    if (investment.user.toString() !== req.user.id) {
      return res.status(401).json({ error: 'User not authorized' });
    }

    investment = await Investment.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(investment);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE an investment
router.delete('/:id', protect, async (req, res) => {
  try {
    const investment = await Investment.findById(req.params.id);

    if (!investment) {
      return res.status(404).json({ error: 'Investment not found' });
    }

    // Make sure user owns investment
    if (investment.user.toString() !== req.user.id) {
      return res.status(401).json({ error: 'User not authorized' });
    }

    await investment.deleteOne();

    res.json({ message: 'Investment removed' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;