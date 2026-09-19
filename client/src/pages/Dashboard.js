import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { format, isToday } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import FinancialChart from '../components/FinancialChart';
import Calendar from 'react-calendar';
import '../Calendar.css';

const Dashboard = () => {

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [categorySummary, setCategorySummary] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [upcomingRecurring, setUpcomingRecurring] = useState([]);
  const [performanceData, setPerformanceData] = useState([]);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [transactionsForSelectedDate, setTransactionsForSelectedDate] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [datesWithTransactions, setDatesWithTransactions] = useState(new Set());
  const [showTodaysSpendingList, setShowTodaysSpendingList] = useState(false);
  const [showSelectedDateTransactions, setShowSelectedDateTransactions] = useState(false);
  const [showAllTopSpending, setShowAllTopSpending] = useState(false);

  const [isRecurringAlertDismissed, setIsRecurringAlertDismissed] = useState(
    localStorage.getItem('dismissedRecurringAlert') === 'true'
  );

  const calculateRecurringMonthlyDeduction = () => {
    let totalMonthlyExpense = 0;
    let totalYearlyExpense = 0;
    
    const activeItems = upcomingRecurring.filter(tx => tx.isActive !== false);
    
    activeItems.forEach(tx => {
      const amount = tx.amount || 0;
      let monthly = 0;
      let yearly = 0;

      switch (tx.frequency) {
        case 'Daily':
          monthly = amount * 30;
          yearly = amount * 365;
          break;
        case 'Weekly':
          monthly = amount * 4.33;
          yearly = amount * 52;
          break;
        case 'Every 2 Weeks':
          monthly = amount * 2.17;
          yearly = amount * 26;
          break;
        case 'Monthly':
          monthly = amount;
          yearly = amount * 12;
          break;
        case 'Quarterly':
          monthly = amount / 3;
          yearly = amount * 4;
          break;
        case 'Yearly':
          monthly = amount / 12;
          yearly = amount;
          break;
        default:
          monthly = amount;
          yearly = amount * 12;
      }

      if (tx.type !== 'Income') {
        totalMonthlyExpense += monthly;
        totalYearlyExpense += yearly;
      }
    });

    return {
      monthly: Math.round(totalMonthlyExpense),
      yearly: Math.round(totalYearlyExpense)
    };
  };

  const recurringImpact = calculateRecurringMonthlyDeduction();

  const handleDismissRecurringAlert = () => {
    localStorage.setItem('dismissedRecurringAlert', 'true');
    setIsRecurringAlertDismissed(true);
  };

  const handleDownload = () => {
    const formattedDate = format(calendarDate, 'yyyy-MM-dd');
    const reportData = transactionsForSelectedDate.map(t => ({
      Date: format(new Date(t.date), 'yyyy-MM-dd'),
      Description: t.description,
      Category: t.category.name,
      Amount: t.amount,
      Type: t.type,
    }));

    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Transactions_${formattedDate}`);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(data, `Transactions_${formattedDate}.xlsx`);
  };


  const [viewedMonth, setViewedMonth] = useState(new Date().getMonth() + 1);
  const [viewedYear, setViewedYear] = useState(new Date().getFullYear());



  const { loading: authLoading } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (authLoading) return; // Wait for auth to finish loading
      try {
        setLoading(true);
        const cacheBuster = `&_=${new Date().getTime()}`;

        const summaryResponse = await api.get(`/api/transactions/summary/monthly?year=${viewedYear}&month=${viewedMonth}${cacheBuster}`);
        setMonthlySummary(summaryResponse.data.data || null);

        const categoryResponse = await api.get(`/api/transactions/summary/category?year=${viewedYear}&month=${viewedMonth}${cacheBuster}`);
        setCategorySummary(categoryResponse.data.data || []);

        const transactionsResponse = await api.get(`/api/transactions?limit=5${cacheBuster}`);
        setRecentTransactions(transactionsResponse.data.data || []);

        const budgetResponse = await api.get(`/api/budgets/progress?year=${viewedYear}&month=${viewedMonth}${cacheBuster}`);
        const alerts = (budgetResponse.data.data || []).filter(budget =>
          (budget.percentage >= 80 && budget.percentage < 100) || budget.percentage > 100
        );
        setBudgetAlerts(alerts);

        const recurringResponse = await api.get(`/api/recurring-transactions?active=true&limit=3${cacheBuster}`);
        setUpcomingRecurring(recurringResponse.data.data || []);

        const performanceResponse = await api.get(`/api/transactions/summary/performance?year=${viewedYear}${cacheBuster}`);
        setPerformanceData(performanceResponse.data.data || []);

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [viewedMonth, viewedYear, authLoading]);

  const handlePrevMonth = () => {
    setViewedMonth(prevMonth => {
      if (prevMonth === 1) {
        setViewedYear(prevYear => prevYear - 1);
        return 12;
      }
      return prevMonth - 1;
    });
  };

  const handleNextMonth = () => {
    setViewedMonth(prevMonth => {
      if (prevMonth === 12) {
        setViewedYear(prevYear => prevYear + 1);
        return 1;
      }
      return prevMonth + 1;
    });
  };

  useEffect(() => {
    const fetchAllTransactions = async () => {
      try {
        const response = await api.get('/api/transactions');
        const transactions = response.data.data || [];
        setAllTransactions(transactions);
        const dates = new Set(transactions.map(t => format(new Date(t.date), 'yyyy-MM-dd')));
        setDatesWithTransactions(dates);
      } catch (err) {
        console.error('Error fetching all transactions:', err);
      }
    };
    fetchAllTransactions();
  }, []);

  useEffect(() => {
    if (calendarDate) {
      const formattedDate = format(calendarDate, 'yyyy-MM-dd');
      const filtered = allTransactions.filter(transaction => {
        return format(new Date(transaction.date), 'yyyy-MM-dd') === formattedDate;
      });
      setTransactionsForSelectedDate(filtered);
    }
  }, [calendarDate, allTransactions]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12"> {/* Increased spacing */}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-gray-200 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1 w-12 bg-accent-500 rounded-full"></div>
            <span className="text-xs font-bold text-primary-500 tracking-widest uppercase">Overview</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-primary-900 leading-tight">
            Financial Dashboard
          </h1>
          <p className="mt-2 text-primary-600 text-base max-w-xl">
            Real-time insights for smarter monitoring.
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center bg-white rounded-full shadow-sm p-1 border border-gray-200">
          <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div className="px-6 py-1 border-x border-gray-100">
            <h2 className="text-sm font-bold text-primary-700 min-w-[120px] text-center uppercase tracking-wide">
              {format(new Date(viewedYear, viewedMonth - 1), 'MMMM yyyy')}
            </h2>
          </div>
          <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Pinned Recurring Impact Alert Banner */}
      {!isRecurringAlertDismissed && recurringImpact.monthly > 0 && (
        <div className="bg-gradient-to-r from-primary-900/95 to-primary-800/95 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-lg text-white relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          {/* Subtle background glow */}
          <div className="absolute -left-16 -top-16 w-36 h-36 bg-accent-400/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="flex items-start gap-3.5 relative z-10">
            <div className="p-2.5 bg-white/10 rounded-xl mt-0.5">
              <ArrowPathIcon className="h-5 w-5 text-accent-300 animate-spin-slow" style={{ animationDuration: '8s' }} />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-white tracking-wide">Automated Budget Commitments</h4>
              <p className="text-xs text-primary-100/90 mt-1 max-w-2xl leading-relaxed">
                Active recurring autopays are projected to deduct <span className="font-bold text-accent-300">₹{recurringImpact.monthly.toLocaleString()}</span> from your balance this month, equating to <span className="font-bold text-accent-300">₹{recurringImpact.yearly.toLocaleString()}</span> annually.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 relative z-10 shrink-0 self-end sm:self-center">
            <Link
              to="/recurring-transactions"
              className="px-4 py-2 bg-accent-500 hover:bg-accent-400 text-primary-950 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              Manage Automations
            </Link>
            <button
              onClick={handleDismissRecurringAlert}
              className="p-2 hover:bg-white/10 text-white/70 hover:text-white rounded-xl transition-colors"
              title="Dismiss Alert"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Income Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-primary-200 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-primary-50 rounded-lg group-hover:bg-primary-100 transition-colors">
              <ArrowUpIcon className="h-6 w-6 text-primary-600" />
            </div>
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">Income</span>
          </div>
          <h2 className="text-3xl font-display font-bold text-gray-900">
            ₹{monthlySummary?.totalIncome?.toFixed(2) || '0.00'}
          </h2>
          <div className="mt-2 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-accent-500 w-3/4 rounded-full"></div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
              <ArrowDownIcon className="h-6 w-6 text-orange-500" />
            </div>
            <span className="text-xs font-semibold tracking-wider uppercase text-gray-400">Expenses</span>
          </div>
          <h2 className="text-3xl font-display font-bold text-gray-900">
            ₹{monthlySummary?.totalExpense?.toFixed(2) || '0.00'}
          </h2>
          <div className="mt-2 w-full h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 w-1/2 rounded-full"></div>
          </div>
        </div>

        {/* Net Worth Card (Aramco Spotlight) */}
        <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[4rem] pointer-events-none"></div>

          <div className="flex items-center justify-between mb-4 relative z-10 transition-transform group-hover:-translate-y-1">
            <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <CurrencyDollarIcon className="h-6 w-6 text-accent-400" />
            </div>
            <span className="text-xs font-semibold tracking-wider uppercase text-primary-200">Net Balance</span>
          </div>

          <h2 className="text-3xl font-display font-bold text-white mb-2 relative z-10">
            ₹{monthlySummary?.balance?.toFixed(2) || '0.00'}
          </h2>
          <p className="text-primary-100 text-xs relative z-10 opacity-80 group-hover:opacity-100 transition-opacity">
            Current financial standing
          </p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="space-y-8">
        {/* Top Row: Financial Overview & Calendar (Equal Width) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Financial Overview Chart */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-display font-bold text-gray-900">Financial Overview</h3>
              <select className="bg-gray-50 border border-gray-200 rounded-md text-xs font-semibold text-gray-600 py-1.5 px-3 cursor-pointer hover:border-primary-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all">
                <option>Monthly</option>
                <option>Yearly</option>
              </select>
            </div>
            <div className="flex-1 min-h-[300px]">
              <FinancialChart data={performanceData} />
            </div>
          </div>

          {/* Calendar Widget */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
            <h3 className="text-lg font-display font-bold text-gray-900 mb-6 px-2 border-l-4 border-primary-500 pl-3">Calendar</h3>
            <div className="calendar-container flex-1">
              <Calendar
                onChange={setCalendarDate}
                value={calendarDate}
                className="w-full border-none font-sans"
                tileClassName={({ date, view }) => {
                  if (view === 'month') {
                    const isSelected = format(date, 'yyyy-MM-dd') === format(calendarDate, 'yyyy-MM-dd');
                    if (isSelected) return 'bg-primary-600 text-white rounded-lg shadow-md';
                  }
                  return null;
                }}
                tileContent={({ date, view }) => {
                  if (view === 'month') {
                    const formattedDate = format(date, 'yyyy-MM-dd');
                    if (datesWithTransactions.has(formattedDate)) {
                      return <div className="h-1.5 w-1.5 bg-accent-500 rounded-full mx-auto mt-1"></div>;
                    }
                  }
                  return null;
                }}
              />
            </div>
            {transactionsForSelectedDate.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-semibold text-primary-900">
                    {format(calendarDate, 'MMM d')}
                  </h4>
                  <button
                    onClick={() => setShowSelectedDateTransactions(!showSelectedDateTransactions)}
                    className="text-xs font-semibold text-accent-600 hover:text-accent-700 uppercase tracking-wide"
                  >
                    {showSelectedDateTransactions ? "Hide" : "Details"}
                  </button>
                </div>

                {showSelectedDateTransactions && (
                  <div className="space-y-3 animate-fade-in">
                    {transactionsForSelectedDate.slice(0, 3).map((transaction) => (
                      <div key={transaction._id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 truncate max-w-[120px]">{transaction.description}</span>
                        <span className={`font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-500'}`}>
                          {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount}
                        </span>
                      </div>
                    ))}
                    <button onClick={handleDownload} className="w-full mt-2 text-xs text-primary-500 hover:text-primary-700 underline">
                      Download Report
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Row: Transactions & Other Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (Transactions) - Takes 2/3 width */}
          <div className="lg:col-span-2">
            {/* Recent Transactions List */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-xl font-display font-bold text-gray-900">Recent Transactions</h3>
                </div>
                <Link
                  to="/transactions"
                  className="text-xs font-bold text-primary-600 hover:text-primary-800 uppercase tracking-wider flex items-center group"
                >
                  View all
                  <ArrowUpIcon className="h-3 w-3 ml-1 transform rotate-45 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
              <div className="space-y-4">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => (
                    <div key={transaction._id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${transaction.type === 'expense' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                          }`}>
                          {transaction.type === 'expense' ? (
                            <ArrowDownIcon className="h-4 w-4" />
                          ) : (
                            <ArrowUpIcon className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{transaction.description}</p>
                          <p className="text-xs text-gray-400 font-medium">{transaction.category?.name || 'Uncategorized'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold font-mono ${transaction.type === 'expense' ? 'text-gray-900' : 'text-green-600'
                          }`}>
                          {transaction.type === 'expense' ? '-' : '+'}₹{transaction.amount?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-[10px] text-gray-400">{format(new Date(transaction.date), 'MMM d')}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    No recent transactions found.
                  </div>
                )}

                <div className="pt-4">
                  <Link
                    to="/transactions/new"
                    className="flex w-full items-center justify-center px-6 py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 hover:border-accent-400 hover:text-primary-700 hover:bg-accent-50 transition-all font-medium"
                  >
                    <PlusIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                    Add New Transaction
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column (Widgets) - Takes 1/3 width */}
          <div className="space-y-8">
            {/* Budget Alerts Widget */}
            {budgetAlerts.length > 0 && (
              <div className="bg-primary-50 rounded-2xl p-6 border border-primary-100">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-gray-900">Budget Alerts</h3>
                </div>

                <div className="space-y-6">
                  {budgetAlerts.slice(0, 3).map((budget) => (
                    <div key={budget._id}>
                      <div className="flex justify-between mb-2 text-sm">
                        <span className="font-semibold text-primary-900">{budget.category.name}</span>
                        <span className={budget.percentage > 100 ? 'text-red-600 font-bold' : 'text-primary-600'}>
                          {budget.percentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                          className={`h-full rounded-full ${budget.percentage > 100 ? 'bg-red-500' : 'bg-orange-400'}`}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link
                    to="/budgets"
                    className="text-primary-700 font-semibold text-sm hover:underline"
                  >
                    Manage Budgets
                  </Link>
                </div>
              </div>
            )}

            {/* Upcoming Recurring Widget */}
            {upcomingRecurring.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-accent-500"></div>
                <div className="flex items-center gap-3 mb-6 pl-2">
                  <div className="bg-accent-50 p-2 rounded-lg shadow-sm">
                    <ClockIcon className="h-5 w-5 text-accent-500" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-gray-900">Upcoming Autopay</h3>
                </div>

                <div className="space-y-4 pl-2">
                  {upcomingRecurring.map((recurring) => {
                     const nextDue = recurring.nextDueDate ? new Date(recurring.nextDueDate) : new Date(recurring.startDate);
                     const isDueSoon = nextDue <= new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // within 5 days
                     return (
                        <div key={recurring._id} className="flex justify-between items-center border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="text-sm font-bold text-primary-900">{recurring.title}</p>
                            <p className="text-xs text-gray-500 font-medium">
                              Due: {format(nextDue, 'MMM d, yyyy')}
                            </p>
                          </div>
                          <div className="text-right">
                             <span className={`text-sm font-black ${recurring.type === 'Income' ? 'text-emerald-500' : 'text-primary-900'}`}>
                               {recurring.type === 'Income' ? '+' : '-'}₹{recurring.amount}
                             </span>
                             {isDueSoon && <span className="block text-[9px] tracking-wide text-orange-500 font-bold uppercase mt-1">Due Soon</span>}
                          </div>
                        </div>
                     )
                  })}
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100 text-center">
                  <Link
                    to="/recurring-transactions"
                    className="text-primary-600 font-bold text-xs hover:text-primary-800 uppercase tracking-widest transition-colors"
                  >
                    Manage Automations
                  </Link>
                </div>
              </div>
            )}

            {/* Top Spending Categories */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-display font-bold text-gray-900 mb-6 border-l-4 border-accent-500 pl-3">Top Spending</h3>
              {categorySummary.length > 0 ? (
                <div className="space-y-5">
                  {categorySummary.slice(0, 4).map((category, idx) => (
                    <div key={category._id} className="flex items-center">
                      <span className="w-6 text-sm font-bold text-gray-400 mr-2">0{idx + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-bold text-primary-900">{category.name}</span>
                          <span className="text-sm text-gray-500">₹{category.totalAmount.toFixed(0)}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${category.percentage}%` }}
                            className="h-full bg-primary-800 rounded-full"
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;