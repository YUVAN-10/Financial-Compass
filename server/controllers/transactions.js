const axios = require('axios');
const FormData = require('form-data');
const { validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const sendEmail = require('../utils/email');
const fs = require('fs');

const { GoogleGenerativeAI } = require('@google/generative-ai');

// @desc    Scan a bill and extract details
// @route   POST /api/transactions/scan
// @access  Private
exports.scanBill = async (req, res) => {
  console.log('scanBill function started.');
  try {
    if (!req.file) {
      console.log('No file uploaded.');
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    console.log('Uploaded file details:', req.file);

    // Free Gemini Vision API implementation
    console.log('Making Gemini Vision API call.');
    let parsedText = '';
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Convert image to Base64
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Data = imageBuffer.toString('base64');

      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: req.file.mimetype,
        },
      };

      const prompt = "Please extract all text from this receipt. Just return the raw recognized text.";

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      parsedText = response.text();
    } catch (err) {
      console.error('Error in Gemini API call:', err);
      // Clean up uploaded file
      fs.unlink(req.file.path, (e) => {
        if (e) console.error('Error deleting uploaded file:', e);
      });
      return res.status(500).json({ success: false, error: `Gemini API Error: ${err.message}` });
    }
    console.log('Gemini API call finished.');

    // Clean up uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting uploaded file:', err);
    });

    if (!parsedText) {
      return res.status(400).json({ success: false, error: 'Could not extract text from the document.' });
    }

    console.log('Parsed Text (Raw):', parsedText);

    // Split text into lines and clean up
    const lines = parsedText.split(/\r\n|\n|\r/).map(line => line.trim()).filter(line => line.length > 0);

    // --- 1. AMOUNT EXTRACTION ---
    let totalAmount = '';

    // Strategy: Look for "Total", "Amount", "Balance" lines, then look for numbers in that line or the next.
    // Also collect all currency-like numbers as fallback.
    const amountRegex = /(\d{1,3}(?:,\d{3})*(?:\.\d{2}))|(\d+\.\d{2})/; // Matches 1,234.56 or 1234.56 or 10.00
    const moneyCandidates = [];

    const totalKeywords = ['total', 'grand total', 'amount due', 'amount', 'balance', 'net payable', 'payable'];
    const excludeKeywords = ['subtotal', 'sub total', 'tax', 'vat', 'gst', 'discount', 'change', 'cash'];

    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();

      // Check for specific "Total" context
      const isTotalLine = totalKeywords.some(k => lineLower.includes(k)) && !excludeKeywords.some(k => lineLower.includes(k));

      const match = lines[i].match(amountRegex);
      if (match) {
        // Clean the number (remove commas)
        const valStr = match[0].replace(/,/g, '');
        const val = parseFloat(valStr);
        if (!isNaN(val)) {
          moneyCandidates.push({
            val,
            isTotalContext: isTotalLine,
            lineIndex: i
          });
        }
      } else if (isTotalLine && i + 1 < lines.length) {
        // Check next line content if current line has "Total" but no number
        const nextLineMatch = lines[i + 1].match(amountRegex);
        if (nextLineMatch) {
          const valStr = nextLineMatch[0].replace(/,/g, '');
          const val = parseFloat(valStr);
          if (!isNaN(val)) {
            moneyCandidates.push({
              val,
              isTotalContext: true,
              lineIndex: i + 1
            });
          }
        }
      }
    }

    // Decision Logic for Amount
    let bestAmountCandidate = null;

    // First Priority: Highest value marked as 'isTotalContext'
    const totalContextCandidates = moneyCandidates.filter(c => c.isTotalContext);
    if (totalContextCandidates.length > 0) {
      // Usually the grand total is the highest value among 'total' lines
      bestAmountCandidate = totalContextCandidates.reduce((max, c) => c.val > max.val ? c : max, totalContextCandidates[0]);
    }

    // Second Priority: Just the highest money-like number found (fallback)
    if (!bestAmountCandidate && moneyCandidates.length > 0) {
      bestAmountCandidate = moneyCandidates.reduce((max, c) => c.val > max.val ? c : max, moneyCandidates[0]);
    }

    if (bestAmountCandidate) {
      totalAmount = bestAmountCandidate.val.toFixed(2);
    }
    console.log('Extracted Amount:', totalAmount);


    // --- 2. DATE EXTRACTION ---
    let date = '';
    const dateRegexes = [
      /\b(\d{1,2}[-./]\d{1,2}[-./]\d{2,4})\b/, // DD/MM/YYYY or MM/DD/YYYY or similar
      /\b(\d{4}[-./]\d{1,2}[-./]\d{1,2})\b/, // YYYY/MM/DD
      /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,.-]*\d{1,2}(?:st|nd|rd|th)?[\s,.-]*\d{4})\b/i, // Dec 25, 2023
      /\b(\d{1,2}[\s,.-]*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,.-]*\d{4})\b/i // 25 Dec 2023
    ];

    for (const line of lines) {
      // Skip obvious non-date lines to save time/false positives
      if (line.length < 6) continue;

      let foundDate = null;
      for (const regex of dateRegexes) {
        const match = line.match(regex);
        if (match) {
          // Try parsing
          const parsed = Date.parse(match[0]);
          if (!isNaN(parsed)) {
            // Check if date is reasonable (not in far future, not older than 5 years)
            const d = new Date(parsed);
            const now = new Date();
            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(now.getFullYear() - 5);

            if (d <= now && d >= fiveYearsAgo) {
              foundDate = d;
              break; // Found a valid date on this line
            }
          }
        }
      }

      if (foundDate) {
        // Format to YYYY-MM-DD
        const y = foundDate.getFullYear();
        const m = (foundDate.getMonth() + 1).toString().padStart(2, '0');
        const d = foundDate.getDate().toString().padStart(2, '0');
        date = `${y}-${m}-${d}`;
        break; // Stop after first valid date found (usually top of receipt)
      }
    }
    console.log('Extracted Date:', date);


    // --- 3. SHOP NAME EXTRACTION ---
    let supplierName = '';

    // Filter out common header words
    const junkWords = ['tax invoice', 'invoice', 'receipt', 'bill', 'cash', 'card', 'welcome', 'tel:', 'ph:', 'gstin', 'date:', 'table'];

    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const lineIndex = i;
      const line = lines[i];
      const lineLower = line.toLowerCase();

      // Heuristics
      // 1. Line shouldn't be too short
      if (line.length < 3) continue;

      // 2. Line shouldn't contain junk words (mostly)
      if (junkWords.some(w => lineLower.includes(w))) continue;

      // 3. Line shouldn't be the date
      if (date && line.includes(date)) continue;

      // 4. Line shouldn't be a pure number
      if (!isNaN(parseFloat(line.replace(/[^0-9.]/g, '')))) continue;

      // Found a good candidate!
      supplierName = line;
      break;
    }

    // Fallback: If no name found, use "Retailer"
    if (!supplierName) {
      supplierName = 'Retailer';
    }
    // Capitalize properly (Title Case)
    supplierName = supplierName.toLowerCase().replace(/(?:^|\s)\S/g, function (a) { return a.toUpperCase(); });

    console.log('Extracted Shop:', supplierName);


    const extractedData = {
      description: supplierName, // Using shop name as default description
      amount: totalAmount,
      date: date,
      category: null, // User must select
      type: 'expense',
      shopName: supplierName
    };

    res.status(200).json({ success: true, data: extractedData });

  } catch (err) {
    console.error('Full error in scanBill:', err);
    res.status(500).json({ success: false, error: 'Server Error processing bill.' });
  }
};


// @desc    Get all transactions for a user
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    // Build query
    let query = { user: req.user.id };

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      query.date = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      query.date = { $lte: new Date(req.query.endDate) };
    }

    // Filter by type (expense or income)
    if (req.query.type && ['expense', 'income'].includes(req.query.type)) {
      query.type = req.query.type;
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by search term (in description)
    if (req.query.search) {
      query.description = { $regex: req.query.search, $options: 'i' };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Transaction.countDocuments(query);

    // Execute query
    const transactions = await Transaction.find(query)
      .populate('category', 'name color icon')
      .sort({ date: -1 })
      .skip(startIndex)
      .limit(limit);

    // Pagination result
    const pagination = {};

    if (endIndex < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: transactions.length,
      pagination,
      data: transactions
    });
  } catch (err) {
    console.error('Error in createTransaction:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id).populate(
      'category',
      'name color icon'
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Make sure user owns transaction
    if (transaction.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this transaction'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new transaction
// @route   POST /api/transactions
// @access  Private

// @desc    Get all transactions for a specific date
// @route   GET /api/transactions/date/:date
// @access  Private
exports.getTransactionsByDate = async (req, res) => {
  try {
    const date = new Date(req.params.date);
    const nextDay = new Date(req.params.date);
    nextDay.setDate(nextDay.getDate() + 1);

    const transactions = await Transaction.find({
      user: req.user.id,
      date: {
        $gte: date,
        $lt: nextDay,
      },
    }).populate('category', 'name color icon');

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Verify category exists and belongs to user
    const category = await Category.findById(req.body.category);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    if (category.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to use this category'
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      ...req.body,
      user: req.user.id
    });

    res.status(201).json({
      success: true,
      data: transaction
    });

    // Send email notification
    try {
      await sendEmail({
        email: req.user.email,
        subject: `New ${transaction.type} transaction created`,
        message: `A new transaction of ${transaction.amount} has been created.`
      });
    } catch (error) {
      console.error('Error sending email:', error);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Private
exports.updateTransaction = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    let transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Make sure user owns transaction
    if (transaction.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to update this transaction'
      });
    }

    // If category is being updated, verify it exists and belongs to user
    if (req.body.category && req.body.category !== transaction.category.toString()) {
      const category = await Category.findById(req.body.category);
      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Category not found'
        });
      }

      if (category.user.toString() !== req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Not authorized to use this category'
        });
      }
    }

    // Update transaction
    transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    ).populate('category', 'name color icon');

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Make sure user owns transaction
    if (transaction.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to delete this transaction'
      });
    }

    await transaction.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new bulk transactions
// @route   POST /api/transactions/bulk
// @access  Private
exports.createBulkTransactions = async (req, res) => {
  const { transactions } = req.body;

  if (!transactions || !Array.isArray(transactions)) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid input" });
  }

  const createdTransactions = [];

  for (const transactionData of transactions) {
    const { amount, description, date, type, category } = transactionData;

    // Basic validation
    if (!amount || !description || !date || !type || !category) {
      // Skip incomplete transactions
      continue;
    }

    try {
      const categoryDoc = await Category.findOne({
        _id: category,
        user: req.user.id,
      });
      if (!categoryDoc) {
        // Skip if category is invalid or doesn't belong to user
        continue;
      }

      const newTransaction = new Transaction({
        user: req.user.id,
        amount,
        description,
        date,
        type,
        category,
        source: "sms",
      });

      const savedTransaction = await newTransaction.save();
      createdTransactions.push(savedTransaction);
    } catch (error) {
      // Log error and continue with next transaction
      console.error("Error creating transaction:", error);
    }
  }

  res.status(201).json({
    success: true,
    data: createdTransactions,
  });
};



// @desc    Get monthly summary (total income, expenses, balance)
// @route   GET /api/transactions/summary/monthly
// @access  Private
exports.getMonthlySummary = async (req, res) => {
  try {
    // Get year and month from query params or use current date
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;

    console.log('User in getMonthlySummary:', req.user);
    console.log('Year:', year, 'Month:', month);

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Get all transactions for the specified month and year
    const transactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    });

    // Calculate totals
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(transaction => {
      if (transaction.type === 'income') {
        totalIncome += transaction.amount;
      } else {
        totalExpense += transaction.amount;
      }
    });

    const balance = totalIncome - totalExpense;

    res.status(200).json({
      success: true,
      data: {
        month,
        year,
        totalIncome,
        totalExpense,
        balance,
        transactionCount: transactions.length
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get spending by category for a month
// @route   GET /api/transactions/summary/category
// @access  Private
exports.getCategorySummary = async (req, res) => {
  try {
    // Get year and month from query params or use current date
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Aggregate transactions by category
    const categorySummary = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate, $lte: endDate },
          type: 'expense' // Only include expenses
        }
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      {
        $unwind: '$categoryDetails'
      },
      {
        $project: {
          _id: 1,
          totalAmount: 1,
          count: 1,
          name: '$categoryDetails.name',
          color: '$categoryDetails.color',
          icon: '$categoryDetails.icon'
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);

    // Calculate total expenses for percentage calculation
    const totalExpenses = categorySummary.reduce(
      (total, category) => total + category.totalAmount,
      0
    );

    // Map to the structure expected by the frontend
    const categoriesWithPercentage = categorySummary.map(category => ({
      ...category,
      percentage: totalExpenses > 0 ? (category.totalAmount / totalExpenses) * 100 : 0
    }));

    res.status(200).json({
      success: true,
      data: categoriesWithPercentage
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get monthly trend for the year
// @route   GET /api/transactions/summary/trend
// @access  Private
exports.getMonthlyTrend = async (req, res) => {
  try {
    // Get year from query params or use current year
    const year = parseInt(req.query.year) || new Date().getFullYear();

    console.log('Monthly trend request - User ID:', req.user._id, 'User object:', req.user, 'Year:', year);

    // Create array to hold monthly data
    const monthlyData = [];

    // Loop through each month
    for (let month = 1; month <= 12; month++) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      // Get all transactions for the month - ensure consistent user ID usage
      const transactions = await Transaction.find({
        user: req.user._id,
        date: { $gte: startDate, $lte: endDate }
      });

      // Calculate totals
      let totalIncome = 0;
      let totalExpense = 0;

      transactions.forEach(transaction => {
        if (transaction.type === 'income') {
          totalIncome += transaction.amount;
        } else {
          totalExpense += transaction.amount;
        }
      });

      const balance = totalIncome - totalExpense;

      monthlyData.push({
        month,
        totalIncome,
        totalExpense,
        balance,
        transactionCount: transactions.length
      });
    }

    console.log('Monthly trend response - Data points:', monthlyData.length);

    res.status(200).json({
      success: true,
      data: {
        monthlyData
      }
    });
  } catch (err) {
    console.error('Error fetching monthly trend:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get daily trend for a specific month
// @route   GET /api/transactions/summary/daily
// @access  Private
exports.getDailyTrend = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;

    console.log(`Getting daily trend for Year: ${year}, Month: ${month}, User: ${req.user._id}`);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    const daysInMonth = endDate.getDate();

    const transactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate },
    });

    const dailyData = [];

    // Initialize array with all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      dailyData.push({
        day,
        date: new Date(year, month - 1, day).toISOString().split('T')[0], // YYYY-MM-DD
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        transactionCount: 0,
      });
    }

    // Aggregate transactions
    transactions.forEach((tx) => {
      const day = new Date(tx.date).getDate();
      if (day >= 1 && day <= daysInMonth) {
        const dayIndex = day - 1;
        if (tx.type === 'income') {
          dailyData[dayIndex].totalIncome += tx.amount;
        } else {
          dailyData[dayIndex].totalExpense += tx.amount;
        }
        dailyData[dayIndex].transactionCount += 1;
      }
    });

    // Calculate balance per day
    dailyData.forEach(day => {
      day.balance = day.totalIncome - day.totalExpense;
    });

    res.status(200).json({
      success: true,
      data: dailyData,
    });

  } catch (err) {
    console.error('Error fetching daily trend:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
    });
  }
};

// @desc    Get performance summary for a user
// @route   GET /api/transactions/summary/performance
// @access  Private
exports.getPerformanceSummary = async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

    const summary = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: {
            $gte: new Date(`${year}-01-01T00:00:00.000Z`),
            $lte: new Date(`${year}-12-31T23:59:59.999Z`)
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: "$date" },
            type: "$type"
          },
          total: { $sum: "$amount" }
        }
      },
      {
        $group: {
          _id: "$_id.month",
          monthlyData: {
            $push: {
              type: "$_id.type",
              total: "$total"
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          month: "$_id",
          income: {
            $let: {
              vars: {
                incomeData: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$monthlyData",
                        as: "md",
                        cond: { $eq: ["$$md.type", "income"] }
                      }
                    },
                    0
                  ]
                }
              },
              in: "$$incomeData.total"
            }
          },
          expense: {
            $let: {
              vars: {
                expenseData: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$monthlyData",
                        as: "md",
                        cond: { $eq: ["$$md.type", "expense"] }
                      }
                    },
                    0
                  ]
                }
              },
              in: "$$expenseData.total"
            }
          }
        }
      },
      {
        $sort: { month: 1 }
      }
    ]);

    // Format data for recharts
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedData = monthNames.map((name, index) => {
      const monthData = summary.find(s => s.month === index + 1);
      return {
        name,
        income: monthData ? monthData.income : 0,
        expense: monthData ? monthData.expense : 0
      };
    });

    res.status(200).json({
      success: true,
      data: formattedData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Download generated receipt bill file for a transaction
// @route   GET /api/transactions/:id/bill
// @access  Private
exports.downloadTransactionBill = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Verify user owns transaction
    if (transaction.user.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'Not authorized to access this transaction' });
    }

    if (!transaction.billPath) {
      return res.status(404).json({ success: false, error: 'No bill receipt found for this transaction' });
    }

    const fs = require('fs');
    if (!fs.existsSync(transaction.billPath)) {
      return res.status(404).json({ success: false, error: 'Bill receipt file does not exist on server' });
    }

    return res.download(transaction.billPath, `receipt-${transaction._id}.txt`);
  } catch (err) {
    console.error('Error downloading bill:', err);
    return res.status(500).json({ success: false, error: 'Server Error downloading bill' });
  }
};