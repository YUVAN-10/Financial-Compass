const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const { processRecurringTransactions } = require('../services/cronJobs');

// @desc    Get all recurring transactions
// @route   GET /api/recurring-transactions
// @access  Private
exports.getRecurringTransactions = async (req, res, next) => {
  try {
    const recurringTransactions = await RecurringTransaction.find({ user: req.user.id }).populate('category');

    return res.status(200).json({
      success: true,
      count: recurringTransactions.length,
      data: recurringTransactions,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
};

// @desc    Add recurring transaction
// @route   POST /api/recurring-transactions
// @access  Private
exports.addRecurringTransaction = async (req, res, next) => {
  try {
    let { title, amount, type, category, frequency, startDate, endDate, paymentMethod, notes, isActive } = req.body;

    // If isActive is not provided, default to true
    if (isActive === undefined) isActive = true;

    // Initially, the next due date is just the start date
    const nextDueDate = new Date(startDate);

    const recurringTransaction = await RecurringTransaction.create({
      user: req.user.id,
      title,
      amount,
      type,
      category,
      frequency,
      startDate,
      nextDueDate,
      endDate,
      paymentMethod,
      notes,
      isActive,
    });

    return res.status(201).json({
      success: true,
      data: recurringTransaction,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(val => val.message);

      return res.status(400).json({
        success: false,
        error: messages,
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Server Error',
      });
    }
  }
};


// @desc    Update recurring transaction
// @route   PUT /api/recurring-transactions/:id
// @access  Private
exports.updateRecurringTransaction = async (req, res, next) => {
  try {
    const recurringTransaction = await RecurringTransaction.findById(req.params.id);

    if (!recurringTransaction) {
      return res.status(404).json({
        success: false,
        error: 'No recurring transaction found',
      });
    }

    if (recurringTransaction.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this recurring transaction',
      });
    }

    const updatedRecurringTransaction = await RecurringTransaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('category');

    return res.status(200).json({
      success: true,
      data: updatedRecurringTransaction,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
};

// @desc    Delete recurring transaction
// @route   DELETE /api/recurring-transactions/:id
// @access  Private
exports.deleteRecurringTransaction = async (req, res, next) => {
  try {
    const recurringTransaction = await RecurringTransaction.findById(req.params.id);

    if (!recurringTransaction) {
      return res.status(404).json({
        success: false,
        error: 'No recurring transaction found',
      });
    }

    if (recurringTransaction.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this recurring transaction',
      });
    }

    await RecurringTransaction.deleteOne({ _id: req.params.id });

    return res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
};

// @desc    Trigger automated processing (wrapper for cron)
// @access  Internal/Private
exports.handleRecurring = async () => {
  try {
    await processRecurringTransactions();
  } catch (err) {
    console.error('Error handling recurring transactions wrapper:', err);
  }
};

// @desc    Approve/Pay recurring transaction manually
// @route   POST /api/recurring-transactions/:id/pay
// @access  Private
exports.payRecurringTransaction = async (req, res, next) => {
  try {
    const recurring = await RecurringTransaction.findById(req.params.id);

    if (!recurring) {
      return res.status(404).json({
        success: false,
        error: 'No recurring transaction found',
      });
    }

    if (recurring.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to process this recurring transaction',
      });
    }

    const today = new Date();
    let nextDue = recurring.nextDueDate || today;

    if (nextDue > today) {
      return res.status(400).json({
        success: false,
        error: 'This recurring transaction is not due yet',
      });
    }

    // Process the payment
    const newTx = await Transaction.create({
      user: recurring.user,
      amount: recurring.amount,
      description: recurring.title,
      date: new Date(nextDue),
      type: recurring.type.toLowerCase(),
      category: recurring.category,
      recurringTransaction: recurring._id
    });

    // Generate receipt/bill file
    const { generateReceiptFile, calculateNextDueDate } = require('../services/cronJobs');
    const billPath = generateReceiptFile(newTx, recurring);
    if (billPath) {
      newTx.billPath = billPath;
      await newTx.save();
    }

    // Create Notification
    const Notification = require('../models/Notification');
    await Notification.create({
      user: recurring.user,
      title: 'Payment Successful',
      message: `Your recurring payment for "${recurring.title}" of ₹${recurring.amount} was approved and paid manually. A bill receipt has been generated.`,
      type: recurring.type.toLowerCase() === 'income' ? 'income' : 'expense'
    });

    // Update recurring transaction due date
    recurring.lastProcessedDate = new Date(nextDue);
    recurring.nextDueDate = calculateNextDueDate(nextDue, recurring.frequency);
    recurring.lastNotifiedDueDate = null; // reset notification tracker
    await recurring.save();

    return res.status(200).json({
      success: true,
      message: 'Payment processed and bill generated successfully',
      data: {
        transaction: newTx,
        nextDueDate: recurring.nextDueDate
      },
    });
  } catch (err) {
    console.error('Error processing manual recurring payment:', err);
    return res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
};