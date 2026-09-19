const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { processRecurring } = require('../middleware/recurringMiddleware');

const {
  getRecurringTransactions,
  addRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  payRecurringTransaction,
} = require('../controllers/recurringTransactions');

// Apply protection and processing to all recurring routes
router.use(protect);
router.use(processRecurring);

router
  .route('/')
  .get(getRecurringTransactions)
  .post(addRecurringTransaction);

router.post('/:id/pay', payRecurringTransaction);

router
  .route('/:id')
  .put(updateRecurringTransaction)
  .delete(deleteRecurringTransaction);

module.exports = router;