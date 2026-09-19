import React, { useState, useEffect } from 'react';
import {
  getRecurringTransactions,
  addRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  payRecurringTransaction,
} from '../services';
import { getCategories } from '../services/categoryService';
import { toast } from 'react-hot-toast';

const RecurringTransactions = () => {
  const [recurringTransactions, setRecurringTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTransactionId, setCurrentTransactionId] = useState(null);
  const [paymentReport, setPaymentReport] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    type: 'Expense',
    category: '',
    frequency: 'Monthly',
    startDate: '',
    endDate: '',
    paymentMethod: 'UPI',
    notes: '',
    isActive: true,
    autoPayPermission: false
  });

  const triggerPushNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };

  useEffect(() => {
    fetchRecurringTransactions();
    fetchCategories();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const fetchRecurringTransactions = async () => {
    try {
      const res = await getRecurringTransactions();
      setRecurringTransactions(res.data);
    } catch (error) {
      toast.error('Failed to fetch recurring transactions');
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(res.data);
      setFormData(prevState => ({ ...prevState, category: res.data[0]._id }));
    } catch (error) {
      toast.error('Failed to fetch categories');
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEditing) {
      handleUpdate();
      return;
    }
    try {
      await addRecurringTransaction(formData);
      fetchRecurringTransactions();
      setIsModalOpen(false);
      toast.success('Recurring transaction added successfully');
    } catch (error) {
      toast.error('Failed to add recurring transaction');
    }
  };

  const handleEdit = (transaction) => {
    setIsEditing(true);
    setCurrentTransactionId(transaction._id);
    setFormData({
      title: transaction.title,
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category?._id || '',
      frequency: transaction.frequency,
      startDate: new Date(transaction.startDate).toISOString().split('T')[0],
      endDate: transaction.endDate ? new Date(transaction.endDate).toISOString().split('T')[0] : '',
      paymentMethod: transaction.paymentMethod,
      notes: transaction.notes,
      isActive: transaction.isActive !== undefined ? transaction.isActive : true,
      autoPayPermission: transaction.autoPayPermission !== undefined ? transaction.autoPayPermission : false
    });
    setIsModalOpen(true);
  };

  const handleUpdate = async () => {
    try {
      await updateRecurringTransaction(currentTransactionId, formData);
      fetchRecurringTransactions();
      setIsModalOpen(false);
      setIsEditing(false);
      toast.success('Recurring transaction updated successfully');
    } catch (error) {
      toast.error('Failed to update recurring transaction');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this recurring transaction?')) {
      try {
        await deleteRecurringTransaction(id);
        fetchRecurringTransactions();
        toast.success('Recurring transaction deleted successfully');
      } catch (error) {
        toast.error('Failed to delete recurring transaction');
      }
    }
  };

  const handleManualPay = async (id) => {
    try {
      const res = await payRecurringTransaction(id);
      fetchRecurringTransactions();
      
      if (res && res.data) {
        // Set payment report details for modal
        setPaymentReport({
          title: res.data.transaction?.description,
          amount: res.data.transaction?.amount,
          category: res.data.transaction?.category,
          date: res.data.transaction?.date,
          nextDueDate: res.data.nextDueDate
        });

        // Trigger browser push notification
        triggerPushNotification(
          'Payment Successful',
          `₹${res.data.transaction?.amount} paid successfully for "${res.data.transaction?.description}".`
        );
      }
      
      toast.success('Payment approved and transaction processed successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to process payment');
    }
  };

  const handleToggleActive = async (transaction) => {
    try {
      await updateRecurringTransaction(transaction._id, { 
        ...transaction, 
        isActive: transaction.isActive === undefined ? false : !transaction.isActive 
      });
      fetchRecurringTransactions();
      toast.success(transaction.isActive !== false ? 'Automation paused' : 'Automation activated');
    } catch (error) {
      toast.error('Failed to update automation status');
    }
  };

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentTransactionId(null);
    setFormData({
      title: '',
      amount: '',
      type: 'Expense',
      category: categories.length > 0 ? categories[0]._id : '',
      frequency: 'Monthly',
      startDate: '',
      endDate: '',
      paymentMethod: 'UPI',
      notes: '',
      isActive: true,
      autoPayPermission: false
    });
    setIsModalOpen(true);
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setCurrentTransactionId(null);
    setFormData({
      title: '',
      amount: '',
      type: 'Expense',
      category: categories.length > 0 ? categories[0]._id : '',
      frequency: 'Monthly',
      startDate: '',
      endDate: '',
      paymentMethod: 'UPI',
      notes: '',
      isActive: true,
      autoPayPermission: false
    });
  };

  const calculateImpact = () => {
    let totalMonthlyExpense = 0;
    let totalYearlyExpense = 0;
    let totalMonthlyIncome = 0;
    let totalYearlyIncome = 0;

    recurringTransactions.forEach(tx => {
      if (tx.isActive === false) return; // ignore paused automations

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

      if (tx.type === 'Income') {
        totalMonthlyIncome += monthly;
        totalYearlyIncome += yearly;
      } else {
        totalMonthlyExpense += monthly;
        totalYearlyExpense += yearly;
      }
    });

    return {
      monthlyExpense: Math.round(totalMonthlyExpense),
      yearlyExpense: Math.round(totalYearlyExpense),
      monthlyIncome: Math.round(totalMonthlyIncome),
      yearlyIncome: Math.round(totalYearlyIncome),
      netMonthly: Math.round(totalMonthlyIncome - totalMonthlyExpense),
      netYearly: Math.round(totalYearlyIncome - totalYearlyExpense)
    };
  };

  const impact = calculateImpact();

  return (
    <div className="min-h-screen bg-cream py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary-900">Recurring Transactions</h1>
            <p className="mt-1 text-primary-600">Manage your automated recurring payments and income</p>
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all transform hover:-translate-y-0.5"
          >
            <span className="mr-2">+</span> Add Recurring
          </button>
        </div>

        {/* Working Principle Explainer & Projections Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Explainer Note Card */}
          <div className="lg:col-span-1 bg-gradient-to-br from-primary-900 to-primary-800 rounded-2xl p-6 shadow-lg text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[4rem] pointer-events-none"></div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-6 bg-accent-400 rounded-full"></span>
              <h3 className="text-lg font-display font-bold text-white">How Automation Works</h3>
            </div>
            <p className="text-sm text-primary-100 leading-relaxed opacity-95">
              These recurring rules automatically post transactions to your account on their respective due dates. 
              Active rules dynamically adjust your monthly and yearly projections so you can track future commitments proactively.
            </p>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-accent-300 font-bold">
              <span>Status: AI Automation Agent Live</span>
              <span className="h-2 w-2 rounded-full bg-accent-400 animate-pulse"></span>
            </div>
          </div>

          {/* Impact Stats Grid Card */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-2 w-2 rounded-full bg-accent-500"></div>
                <h3 className="text-lg font-display font-bold text-gray-900">Estimated Projections</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Monthly Expense Projections */}
                <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100/50">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-orange-600 block mb-1">Monthly Reduction</span>
                  <span className="text-2xl font-black text-gray-900 font-mono">₹{impact.monthlyExpense.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-400 block mt-1">From active autopays</span>
                </div>

                {/* Yearly Expense Projections */}
                <div className="p-4 rounded-xl bg-red-50/50 border border-red-100/50">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-red-600 block mb-1">Yearly Reduction</span>
                  <span className="text-2xl font-black text-gray-900 font-mono">₹{impact.yearlyExpense.toLocaleString()}</span>
                  <span className="text-[10px] text-gray-400 block mt-1">Annual commitment</span>
                </div>

                {/* Net Flow Projections */}
                <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100/50">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block mb-1">Net Flow Projections</span>
                  <span className={`text-2xl font-black font-mono ${impact.netMonthly >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {impact.netMonthly >= 0 ? '+' : ''}₹{impact.netMonthly.toLocaleString()}/mo
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-1">₹{impact.netYearly.toLocaleString()}/yr net</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>* Projections based on {recurringTransactions.filter(t => t.isActive !== false).length} active automations.</span>
              <span className="font-semibold text-primary-950">Net balance deductions are calculated in real-time.</span>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {recurringTransactions.length === 0 ? (
            <div className="p-16 text-center text-gray-500">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Recurring Transactions</h3>
              <p className="mb-6">Set up recurring payments or income to automate your tracking.</p>
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl text-accent-700 bg-accent-100 hover:bg-accent-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-colors"
              >
                Create First Recurring
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Title</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Frequency</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Next Due</th>
                    <th scope="col" className="relative px-6 py-4">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-50">
                  {recurringTransactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-primary-900">{transaction.title}</div>
                        <div className="text-xs text-gray-500">{transaction.type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${transaction.type === 'Income' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {transaction.type === 'Income' ? '+' : '-'} ₹{transaction.amount}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {transaction.category ? (
                          <div className="flex items-center">
                            <span
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: transaction.category.color }}
                            ></span>
                            <span className="text-sm text-gray-700">{transaction.category.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Uncategorized</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {transaction.frequency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleActive(transaction)}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold transition-colors border ${
                            transaction.isActive !== false 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {transaction.isActive !== false ? (
                            <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span> Active</>
                          ) : (
                            <><span className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-1.5"></span> Paused</>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                        {(() => {
                          const isDue = new Date(transaction.nextDueDate || transaction.startDate) <= new Date();
                          const dateStr = transaction.nextDueDate ? new Date(transaction.nextDueDate).toLocaleDateString('en-IN') : new Date(transaction.startDate).toLocaleDateString('en-IN');
                          return (
                            <span className={isDue && transaction.isActive !== false ? "text-red-600 font-extrabold animate-pulse" : "text-primary-900"}>
                              {dateStr}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {new Date(transaction.nextDueDate || transaction.startDate) <= new Date() && transaction.autoPayPermission !== true && transaction.isActive !== false && (
                            <button
                              onClick={() => handleManualPay(transaction._id)}
                              className="inline-flex items-center px-2 py-1 text-xs font-bold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-sm"
                            >
                              Pay Now
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="text-gray-400 hover:text-primary-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(transaction._id)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed z-50 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-primary-900/75 backdrop-blur-sm" onClick={handleCancel}></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full animate-fade-in-up">
                <div className="bg-white px-6 pt-6 pb-4">
                  <h3 className="text-xl font-display font-bold text-primary-900 mb-6 border-b border-gray-100 pb-4">
                    {isEditing ? 'Edit Recurring Transaction' : 'Add Recurring Transaction'}
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Title</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                        placeholder="e.g. Netflix Subscription"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Amount</label>
                        <div className="relative rounded-xl shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 font-bold">₹</span>
                          </div>
                          <input
                            type="number"
                            name="amount"
                            value={formData.amount}
                            onChange={handleInputChange}
                            className="block w-full pl-8 border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                            placeholder="0.00"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Type</label>
                        <select
                          name="type"
                          value={formData.type}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all bg-white"
                        >
                          <option value="Expense">Expense</option>
                          <option value="Income">Income</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Category</label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all bg-white"
                          required
                        >
                          <option value="">Select Category</option>
                          {categories.map(category => (
                            <option key={category._id} value={category._id}>{category.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Frequency</label>
                        <select
                          name="frequency"
                          value={formData.frequency}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all bg-white"
                        >
                          <option value="Daily">Daily</option>
                          <option value="Weekly">Weekly</option>
                          <option value="Every 2 Weeks">Every 2 Weeks</option>
                          <option value="Monthly">Monthly</option>
                          <option value="Quarterly">Quarterly</option>
                          <option value="Yearly">Yearly</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Start Date</label>
                        <input
                          type="date"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">End Date (Optional)</label>
                        <input
                          type="date"
                          name="endDate"
                          value={formData.endDate}
                          onChange={handleInputChange}
                          className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Payment Method</label>
                      <select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleInputChange}
                        className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all bg-white"
                      >
                        <option value="UPI">UPI</option>
                        <option value="Card">Card</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                      </select>
                    </div>

                    <div className="flex items-center space-x-3 py-2 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                      <input
                        type="checkbox"
                        id="autoPayPermission"
                        name="autoPayPermission"
                        checked={formData.autoPayPermission}
                        onChange={(e) => setFormData({ ...formData, autoPayPermission: e.target.checked })}
                        className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300 rounded cursor-pointer transition-colors"
                      />
                      <label htmlFor="autoPayPermission" className="text-xs font-bold text-gray-600 cursor-pointer select-none">
                        Enable Auto-Pay (Approve automatic payment processing and bill generation)
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Notes</label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows="3"
                        className="block w-full border border-gray-200 rounded-xl py-2.5 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                        placeholder="Optional notes..."
                      ></textarea>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-6">
                      {isEditing ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this recurring transaction?')) {
                              handleDelete(currentTransactionId);
                              setIsModalOpen(false);
                            }
                          }}
                          className="py-2.5 px-5 rounded-xl shadow-sm text-sm font-bold text-white bg-red-500 hover:bg-red-600 focus:outline-none transition-colors"
                        >
                          Delete
                        </button>
                      ) : (
                        <div />
                      )}
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={handleCancel}
                          className="py-2.5 px-6 border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900 transition-colors"
                        >
                          {isEditing ? 'Update Transaction' : 'Save Transaction'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {paymentReport && (
          <div className="fixed z-50 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-primary-900/75 backdrop-blur-sm" onClick={() => setPaymentReport(null)}></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full animate-fade-in-up">
                <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between border-b border-emerald-700">
                  <h3 className="text-lg font-display font-bold text-white">
                    🎉 Payment Successful!
                  </h3>
                  <button onClick={() => setPaymentReport(null)} className="text-white/80 hover:text-white transition-colors focus:outline-none">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="text-center pb-4 border-b border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Amount Paid</p>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-1">₹{paymentReport.amount}</p>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Description:</span>
                      <span className="text-primary-900 font-bold">{paymentReport.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Category:</span>
                      <span className="text-primary-900 font-bold">
                        {categories.find(c => c._id === paymentReport.category)?.name || 'Utility Bills'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 font-medium">Paid Date:</span>
                      <span className="text-primary-900 font-bold">
                        {paymentReport.date ? new Date(paymentReport.date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4 text-center">
                    <p className="text-xs text-red-500 font-bold uppercase tracking-wide">Next Payment Schedule</p>
                    <p className="text-sm font-extrabold text-red-600 mt-1">
                      Next due date is on: {new Date(paymentReport.nextDueDate).toLocaleDateString('en-IN')}
                    </p>
                  </div>

                  <div className="pt-4 flex justify-center">
                    <button
                      onClick={() => setPaymentReport(null)}
                      className="w-full py-2.5 px-6 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-primary-900 hover:bg-primary-800 focus:outline-none transition-colors"
                    >
                      Close Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecurringTransactions;