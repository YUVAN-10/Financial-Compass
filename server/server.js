const dotenv = require('dotenv');
const result = dotenv.config({ path: __dirname + '/.env' });
if (result.error) {
  console.error("Error loading .env file:", result.error);
} else {
  console.log("Environment variables loaded successfully. GEMINI_API_KEY is: " + (process.env.GEMINI_API_KEY ? "SET" : "NOT SET"));
}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
// Restart trigger
const helmet = require('helmet');
// require('dotenv').config({ path: './config/config.env' });
const connectDB = require('./config/db');

// Import routes
// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const budgetRoutes = require('./routes/budgets');
const recurringTransactionRoutes = require('./routes/recurringTransactions');
const smsRoutes = require('./routes/sms');
const investmentRoutes = require('./routes/investmentRoutes');
const notificationRoutes = require('./routes/notifications');
const aiRoutes = require('./routes/ai');
const { initCronJobs } = require('./services/cronJobs');
// const financialGoalRoutes = require('./routes/financialGoals');

// Initialize express app
const { protect } = require('./middleware/auth');
const passport = require('passport');
const session = require('express-session');

// Passport config
require('./config/passport')(passport);

require('./cron');

const app = express();

// app.use(helmet.contentSecurityPolicy(({
//   directives: {
//     defaultSrc: ["'self'"],
//     scriptSrc: ["'self'"],
//     styleSrc: ["'self'"],
//     fontSrc: ["'self'"],
//     imgSrc: ["'self'"],
//     connectSrc: ["'self'"],
//   },
// })));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Express session
app.use(
  session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB
connectDB();

// Routes

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/recurring-transactions', recurringTransactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
// app.use('/api/financial-goals', financialGoalRoutes);

// Catch-all route for debugging
app.use((req, res, next) => {
  console.log(`Unhandled request: ${req.method} ${req.originalUrl}`);
  next();
});

// Define PORT
const PORT = process.env.PORT || 5001;

// Initialize background jobs
initCronJobs();

const server = app.listen(PORT, () => console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Server Error'
  });
});

process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', err);
  console.error('Unhandled Rejection Details:', err.stack);
  server.close(() => process.exit(1));
});