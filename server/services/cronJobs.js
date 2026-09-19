const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');

const calculateNextDueDate = (currentDate, frequency) => {
  const date = new Date(currentDate);
  switch (frequency) {
    case 'Daily': date.setDate(date.getDate() + 1); break;
    case 'Weekly': date.setDate(date.getDate() + 7); break;
    case 'Every 2 Weeks': date.setDate(date.getDate() + 14); break;
    case 'Monthly': date.setMonth(date.getMonth() + 1); break;
    case 'Quarterly': date.setMonth(date.getMonth() + 3); break;
    case 'Yearly': date.setFullYear(date.getFullYear() + 1); break;
    default: date.setMonth(date.getMonth() + 1); break;
  }
  return date;
};

/**
 * Generate a formatted plain text billing receipt
 * @param {Object} transaction - Mongoose Transaction instance
 * @param {Object} recurring - Mongoose RecurringTransaction instance
 * @returns {String} absolute path to the generated file
 */
const generateReceiptFile = (transaction, recurring) => {
  try {
    const billsDir = path.join(__dirname, '../uploads/bills');
    if (!fs.existsSync(billsDir)) {
      fs.mkdirSync(billsDir, { recursive: true });
    }

    const fileName = `receipt-${transaction._id}.txt`;
    const filePath = path.join(billsDir, fileName);

    const dateStr = transaction.date ? new Date(transaction.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN');
    const typeStr = transaction.type ? transaction.type.toUpperCase() : 'EXPENSE';

    const content = `==================================================
              ARAMCO FINANCE RECEIPT
==================================================
Receipt ID       : ${transaction._id}
Date             : ${dateStr}
Reference Type   : Recurring Auto-Pay
Recurring ID     : ${recurring._id}
Payment Method   : ${recurring.paymentMethod || 'UPI'}

--------------------------------------------------
Description      : ${transaction.description}
Type             : ${typeStr}
Amount Paid      : ₹${transaction.amount.toFixed(2)}
--------------------------------------------------
Status           : PAID (Success)

==================================================
Thank you for using Aramco Finance Auto-Pay!
This is a computer-generated billing receipt.
==================================================`;

    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  } catch (err) {
    console.error('Error generating receipt file:', err);
    return null;
  }
};

/**
 * Process a single recurring transaction based on permissions and due state
 * @param {Object} recurring - Mongoose RecurringTransaction instance
 * @param {Date} today - current date
 * @returns {Number} count of transactions processed
 */
const processSingleRecurringTransaction = async (recurring, today) => {
  if (recurring.endDate && today > new Date(recurring.endDate)) {
    recurring.isActive = false;
    await recurring.save();
    return 0;
  }

  let nextDue = recurring.nextDueDate || today;
  let processedCount = 0;

  if (recurring.autoPayPermission === true) {
    let processed = false;
    
    // Process due occurrences automatically
    while (nextDue <= today) {
      // Create new transaction in the main ledger
      const newTx = await Transaction.create({
        user: recurring.user,
        amount: recurring.amount,
        description: recurring.title,
        date: new Date(nextDue),
        type: recurring.type.toLowerCase(),
        category: recurring.category,
        recurringTransaction: recurring._id
      });

      // Generate receipt file
      const billPath = generateReceiptFile(newTx, recurring);
      if (billPath) {
        newTx.billPath = billPath;
        await newTx.save();
      }

      // Create notification
      await Notification.create({
        user: recurring.user,
        title: 'Auto-Payment Successful',
        message: `Your recurring payment for "${recurring.title}" of ₹${recurring.amount} was paid automatically. A bill receipt has been generated.`,
        type: recurring.type.toLowerCase() === 'income' ? 'income' : 'expense'
      });

      recurring.lastProcessedDate = new Date(nextDue);
      nextDue = calculateNextDueDate(nextDue, recurring.frequency);
      processedCount++;
      processed = true;

      if (recurring.endDate && nextDue > new Date(recurring.endDate)) {
        recurring.isActive = false;
        break;
      }
    }

    if (processed) {
      recurring.nextDueDate = nextDue;
      recurring.lastNotifiedDueDate = null; // reset notification tracker
      await recurring.save();
    }
  } else {
    // Auto-Pay Permission is false. Alert the user if they haven't been alerted for this due date yet
    const nextDueStr = new Date(nextDue).toDateString();
    const lastNotifiedStr = recurring.lastNotifiedDueDate ? new Date(recurring.lastNotifiedDueDate).toDateString() : '';

    if (nextDueStr !== lastNotifiedStr) {
      // Send due notification
      await Notification.create({
        user: recurring.user,
        title: 'Recurring Payment Due',
        message: `Your recurring payment for "${recurring.title}" of ₹${recurring.amount} is due. Please approve this payment to reduce from your income and add to expenses.`,
        type: recurring.type.toLowerCase() === 'income' ? 'income' : 'expense'
      });

      recurring.lastNotifiedDueDate = nextDue;
      await recurring.save();
      console.log(`[Notification] Alerted user ${recurring.user} for due payment: ${recurring.title}`);
    }
  }

  return processedCount;
};

const processRecurringTransactions = async () => {
  try {
    const today = new Date();

    // Find all active transactions where nextDueDate is today or earlier
    const dueTransactions = await RecurringTransaction.find({
      isActive: true,
      nextDueDate: { $lte: today },
    });

    let totalProcessed = 0;

    for (const recurring of dueTransactions) {
      const processed = await processSingleRecurringTransaction(recurring, today);
      totalProcessed += processed;
    }

    if (totalProcessed > 0) {
      console.log(`[Cron] Processed ${totalProcessed} occurrences of recurring transactions automatically.`);
    }
  } catch (err) {
    console.error('[Cron Error] Failed to process recurring transactions:', err);
  }
};

const processUserRecurringTransactions = async (userId) => {
  try {
    const today = new Date();

    // Find all active recurring transactions for specific user that are due
    const dueTransactions = await RecurringTransaction.find({
      user: userId,
      isActive: true,
      nextDueDate: { $lte: today },
    });

    let totalProcessed = 0;

    for (const recurring of dueTransactions) {
      const processed = await processSingleRecurringTransaction(recurring, today);
      totalProcessed += processed;
    }

    if (totalProcessed > 0) {
      console.log(`[On-Demand] Processed ${totalProcessed} recurring transactions for user ${userId}.`);
    }
  } catch (err) {
    console.error(`[On-Demand Error] Failed to process recurring transactions for user ${userId}:`, err);
  }
};

const initCronJobs = () => {
  // Run every day at midnight server time (00:00)
  cron.schedule('0 0 * * *', () => {
    console.log('[Cron] Running daily recurring transaction check...');
    processRecurringTransactions();
  });

  console.log('Background cron jobs initialized successfully.');
};

module.exports = { 
  initCronJobs, 
  processRecurringTransactions, 
  processUserRecurringTransactions, 
  calculateNextDueDate,
  generateReceiptFile,
  processSingleRecurringTransaction
};
