const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');

// Initialize Gemini
// Note: User needs to set GEMINI_API_KEY in .env
// Initialize Gemini
// Note: User needs to set GEMINI_API_KEY in .env
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

exports.chat = async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user.id;

        if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
            return res.status(400).json({
                success: false,
                message: "AI configuration missing. Please set GEMINI_API_KEY in server .env file."
            });
        }

        // 1. Fetch Context Data
        // Get Categories
        const categories = await Category.find({ user: userId });
        const categoryNames = categories.map(c => c.name).join(', ');

        // Get Recent Transactions (last 20 for context)
        const transactions = await Transaction.find({ user: userId })
            .sort({ date: -1 })
            .limit(20);

        // Get current year date range to match default Reports page view
        const currentYear = new Date().getFullYear();
        const startOfYear = new Date(currentYear, 0, 1);
        const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

        // Calculate stats for current year
        const stats = await Transaction.aggregate([
            { 
                $match: { 
                    user: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startOfYear, $lte: endOfYear }
                } 
            },
            {
                $group: {
                    _id: null,
                    totalIncome: { $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] } },
                    totalExpense: { $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] } }
                }
            }
        ]);

        const currentStats = stats.length > 0 ? stats[0] : { totalIncome: 0, totalExpense: 0 };
        const balance = currentStats.totalIncome - currentStats.totalExpense;

        // Calculate dynamic health score matching front-end: (Income - Expenses) / Income * 100
        const totalIncome = currentStats.totalIncome;
        const totalExpense = currentStats.totalExpense;
        const healthScore = totalIncome > 0 ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalExpense) / totalIncome) * 100))) : 0;

        // Fetch category breakdown for current year
        const categoryStats = await Transaction.aggregate([
            { 
                $match: { 
                    user: new mongoose.Types.ObjectId(userId),
                    date: { $gte: startOfYear, $lte: endOfYear }
                } 
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: { $ifNull: ['$categoryInfo.name', 'Uncategorized'] },
                    total: { $sum: '$amount' },
                    type: { $first: '$type' }
                }
            }
        ]);
        const categoryBreakdown = categoryStats.map(c => `- ${c._id} (${c.type}): ₹${c.total}`).join('\n');

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
      You are a smart financial assistant for a personal expense tracker app.
      
      Current User Context (For the current year ${currentYear}):
      - Valid Categories: ${categoryNames}
      - Current Balance (Current Year): ₹${balance}
      - Total Income (Current Year): ₹${totalIncome}
      - Total Expenses (Current Year): ₹${totalExpense}
      - Financial Health Score (Current Year): ${healthScore}%
      - Category Breakdown (Current Year):
${categoryBreakdown || 'No data recorded yet.'}
      - Recent Transactions: ${JSON.stringify(transactions.map(t => ({
            date: t.date.toISOString().split('T')[0],
            title: t.title,
            amount: t.amount,
            type: t.type,
            category: t.category
        })))}
      - Current Date: ${new Date().toISOString().split('T')[0]}

      User Message: "${message}"

      Instructions:
      1. Analyze the user's message.
      2. If the user wants to ADD/CREATE a transaction (e.g., "Spent 500 on food", "Add income 20000"), extract the details and return a JSON object with "action": "create". Infer the specific category from the user's input matching the valid categories list if possible, otherwise use 'Other'.
      3. If the user is asking a QUESTION about their finances (e.g., "How much did I spend on food?", "What is my balance?"), or asking to see a REPORT, SUMMARY, or BUDGET HEALTH SCORE, answer it based on the provided context and return "action": "none".
      4. If the user asks for a financial health score, budget health score, or rating, explicitly state that their score for ${currentYear} is ${healthScore}%. You MUST also include the category-wise spending breakdown in your response so they see their particular spending per category, and explain how this spending affected their health score. Map the score to the following ratings:
         - 75% or above: "Excellent budget state"
         - 50% to 74%: "Healthy budget state"
         - 30% to 49%: "Stable budget state"
         - Below 30%: "Needs attention / high expense rate"
         Offer constructive, brief tips to help them improve or maintain their score.
      5. If the user asks for a report, summary, or details of their transactions, always format the response beautifully with clear sections, bullet points, and newlines. You MUST include a "Category Spending Breakdown" displaying exact figures for each category. Example:
         **Financial Summary Report (${currentYear})**
         - Total Income: ₹X
         - Total Expenses: ₹Y
         - Net Balance: ₹Z
         - Health Score: X% (Rating)
         
         **Spending by Category:**
         - Food (expense): ₹A
         - Travel (expense): ₹B
      6. Always format amounts in Indian Rupees (₹).
      
      Output Format (JSON ONLY):
      
      Option 1 (Action - Add Transaction):
      {
        "action": "create",
        "data": {
          "title": "String (short description)",
          "amount": Number,
          "type": "income" or "expense",
          "category": "String (must be one of: ${categoryNames} or 'Other')",
          "date": "YYYY-MM-DD" (default to today if not specified)
        },
        "response_text": "I have added..."
      }

      Option 2 (No Action - Answer Question/Report):
      {
        "action": "none",
        "response_text": "Your detailed answer or report here..."
      }
    `;

        // 3. Call AI
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 4. Parse Response
        // Clean up markdown code blocks if present
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        let aiResponse;
        try {
            aiResponse = JSON.parse(cleanJson);
        } catch (e) {
            console.error("AI JSON Parse Error", e);
            // Fallback if AI didn't return valid JSON
            return res.json({ success: true, message: text, action: 'none' });
        }

        // 5. Execute Action if needed
        if (aiResponse.action === 'create' && aiResponse.data) {
            try {
                // Resolve category name to ObjectId
                let categoryDoc = categories.find(c => c.name.toLowerCase() === String(aiResponse.data.category).toLowerCase());
                if (!categoryDoc && categories.length > 0) {
                    categoryDoc = categories[0]; // Fallback to first available category
                }
                if (!categoryDoc) {
                    return res.json({ success: false, message: "No categories found. Please create a category first." });
                }

                const newTransaction = await Transaction.create({
                    user: userId,
                    description: aiResponse.data.title || 'AI Transaction',
                    amount: aiResponse.data.amount,
                    type: aiResponse.data.type || 'expense',
                    category: categoryDoc._id,
                    date: aiResponse.data.date ? new Date(aiResponse.data.date) : new Date(),
                });
                // Update the response text to confirm success with ID if needed, but the text from AI is usually good enough.
                // We return the created transaction so frontend can update.
                return res.json({
                    success: true,
                    message: aiResponse.response_text,
                    action: 'create',
                    transaction: newTransaction
                });
            } catch (dbError) {
                console.error("DB Create Error", dbError);
                return res.json({
                    success: false,
                    message: "I understood you wanted to add a transaction, but I encountered a database error."
                });
            }
        }

        // default return for questions
        res.json({
            success: true,
            message: aiResponse.response_text,
            action: 'none'
        });

    } catch (error) {
        console.error('AI Controller Error:', error);
        res.status(500).json({ success: false, message: 'AI Service currently unavailable.' });
    }
};
