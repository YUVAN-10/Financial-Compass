const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['Income', 'Expense'],
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  frequency: {
    type: String,
    enum: ['Daily', 'Weekly', 'Every 2 Weeks', 'Monthly', 'Quarterly', 'Yearly'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
  },
  paymentMethod: {
    type: String,
    enum: ['UPI', 'Card', 'Cash', 'Bank Transfer'],
  },
  notes: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  autoPayPermission: {
    type: Boolean,
    default: false,
  },
  lastNotifiedDueDate: {
    type: Date,
  },
  nextDueDate: {
    type: Date,
  },
  lastProcessedDate: {
    type: Date,
  },
  source: {
    type: String,
    default: 'recurring',
  },
  lastCreated: {
    type: Date,
  },
}, {
  timestamps: true,
});

const RecurringTransaction = mongoose.model('RecurringTransaction', recurringTransactionSchema);

module.exports = RecurringTransaction;