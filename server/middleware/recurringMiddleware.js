const { processUserRecurringTransactions } = require('../services/cronJobs');

exports.processRecurring = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      await processUserRecurringTransactions(req.user.id);
    }
  } catch (err) {
    console.error('Error in recurring middleware:', err);
  }
  next();
};
