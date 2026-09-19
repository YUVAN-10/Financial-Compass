const express = require('express');
const { check } = require('express-validator');
const {
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetProgress
} = require('../controllers/budgets');
const { protect } = require('../middleware/auth');
const { processRecurring } = require('../middleware/recurringMiddleware');

const router = express.Router();

// Protect all routes
router.use(protect);
router.use(processRecurring);

// Get budget progress
router.get('/progress', getBudgetProgress);

// Get all budgets and create a budget
router
  .route('/')
  .get(getBudgets)
  .post(
    [
      check('amount', 'Amount is required').not().isEmpty(),
      check('amount', 'Amount must be a number').isNumeric(),
      check('amount', 'Amount must be positive').isFloat({ min: 0 }),
      check('category', 'Category is required').not().isEmpty(),
      check('month', 'Month is required').not().isEmpty(),
      check('month', 'Month must be between 1 and 12').isInt({ min: 1, max: 12 }),
      check('year', 'Year is required').not().isEmpty(),
      check('year', 'Year must be 2000 or later').isInt({ min: 2000 })
    ],
    createBudget
  );

// Get, update, and delete a budget
router
  .route('/:id')
  .get(getBudget)
  .put(
    [
      check('amount', 'Amount must be a number').optional().isNumeric(),
      check('amount', 'Amount must be positive').optional().isFloat({ min: 0 }),
      check('month', 'Month must be between 1 and 12')
        .optional()
        .isInt({ min: 1, max: 12 }),
      check('year', 'Year must be 2000 or later').optional().isInt({ min: 2000 })
    ],
    updateBudget
  )
  .delete(deleteBudget);

module.exports = router;