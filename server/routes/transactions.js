const express = require('express');
const { check } = require('express-validator');
const multer = require('multer');
const {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getMonthlySummary,
  getCategorySummary,
  getMonthlyTrend,
  getDailyTrend, // Added
  getPerformanceSummary,
  createBulkTransactions,
  getTransactionsByDate,
  scanBill,
  downloadTransactionBill
} = require('../controllers/transactions');
const { protect } = require('../middleware/auth');
const { processRecurring } = require('../middleware/recurringMiddleware');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Protect all routes
router.use(protect);
router.use(processRecurring);

// Scan bill
router.post('/scan', upload.single('bill'), scanBill);

// Get monthly summary
router.get('/summary/monthly', getMonthlySummary);

// Get category summary
router.get('/summary/category', getCategorySummary);

// Get monthly trend
router.get('/summary/trend', getMonthlyTrend);

// Get daily trend
router.get('/summary/daily', getDailyTrend);

// Get performance summary
router.get('/summary/performance', getPerformanceSummary);

// Create bulk transactions
router.post('/bulk', createBulkTransactions);

// Get all transactions and create a transaction
router
  .route('/')
  .get(getTransactions)
  .post(
    [
      check('amount', 'Amount is required').not().isEmpty(),
      check('amount', 'Amount must be a number').isNumeric(),
      check('description', 'Description is required').not().isEmpty(),
      check('date', 'Date is required').not().isEmpty(),
      check('type', 'Type must be either expense or income').isIn([
        'expense',
        'income'
      ]),
      check('category', 'Category is required').not().isEmpty()
    ],
    createTransaction
  );

router.get('/date/:date', getTransactionsByDate);
router.get('/:id/bill', downloadTransactionBill);

// Get, update, and delete a transaction
router
  .route('/:id')
  .get(getTransaction)
  .put(
    [
      check('amount', 'Amount must be a number').optional().isNumeric(),
      check('type', 'Type must be either expense or income')
        .optional()
        .isIn(['expense', 'income'])
    ],
    updateTransaction
  )
  .delete(deleteTransaction);

module.exports = router;