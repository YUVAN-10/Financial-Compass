const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Please add an amount'],
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    trim: true,
    maxlength: [100, 'Description cannot be more than 100 characters']
  },
  date: {
    type: Date,
    required: [true, 'Please add a date'],
    default: Date.now
  },
  type: {
    type: String,
    enum: ['expense', 'income'],
    required: [true, 'Please specify transaction type']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Please add a category']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  billPath: {
    type: String,
  },
  recurringTransaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RecurringTransaction',
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for faster queries
TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);