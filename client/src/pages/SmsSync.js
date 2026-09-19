import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button, FormInput, LoadingSpinner } from '../components/ui';
import { parseSms } from '../utils/smsParser';
import api from '../services/api';
import { createNotification } from '../services/notificationService';


const SmsSync = () => {
  const [smsText, setSmsText] = useState('');
  const [parsedTransactions, setParsedTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/api/categories');
        setCategories(response.data.data || []);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };
    fetchCategories();
  }, []);

  const handleParseSms = () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      console.log("Parsing SMS text:", smsText);
      const parsed = parseSms(smsText);
      console.log("Parsed transactions:", parsed);
      const uncategorizedCategory = categories.find(c => c.name === 'Uncategorized');
      const defaultCategoryId = uncategorizedCategory ? uncategorizedCategory._id : (categories.length > 0 ? categories[0]._id : '');

      setParsedTransactions(parsed.map(t => ({
        ...t,
        selected: true,
        category: t.category ? t.category : defaultCategoryId
      })));
    } catch (err) {
      setError('Error parsing SMS messages. Please check the format and try again.');
      console.error('Error parsing SMS:', err);
    }
    setLoading(false);
  };

  const handleSaveTransactions = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const transactionsToSave = parsedTransactions
        .filter(t => t.selected)
        .map(t => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, selected, ...rest } = t;
          return rest;
        });

      if (transactionsToSave.some(t => !t.category)) {
        setError('Please select a category for all transactions you want to save.');
        setLoading(false);
        return;
      }

      await api.post('/api/sms/save', { transactions: transactionsToSave });

      // Create notifications for saved transactions
      for (const transaction of transactionsToSave) {
        await createNotification({
          title: `New ${transaction.type}`,
          message: `A new transaction of ${transaction.amount} has been added.`,
          type: transaction.type,
        });
      }

      setSuccessMessage('Transactions saved successfully!');
      setParsedTransactions([]);
      setSmsText('');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError('Error saving transactions. Please try again.');
      console.error('Error saving transactions:', err.response ? err.response.data : err.message);
    }
    setLoading(false);
  };

  const handleTransactionChange = (index, field, value) => {
    const updatedTransactions = [...parsedTransactions];
    updatedTransactions[index][field] = value;
    setParsedTransactions(updatedTransactions);
  };

  const handleSelectTransaction = (index, selected) => {
    const updatedTransactions = [...parsedTransactions];
    updatedTransactions[index].selected = selected;
    setParsedTransactions(updatedTransactions);
  };

  const handleSelectAll = (selected) => {
    const updatedTransactions = parsedTransactions.map(t => ({ ...t, selected }));
    setParsedTransactions(updatedTransactions);
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-cream min-h-screen max-w-7xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary-900">Add from SMS</h1>
          <p className="mt-1 text-primary-600">Sync transactions directly from your bank SMS messages</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 h-fit">
          <h2 className="text-xl font-bold mb-4 text-primary-900 flex items-center">
            <svg className="w-6 h-6 mr-2 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Paste SMS Messages
          </h2>
          <textarea
            className="w-full p-4 border border-gray-200 bg-gray-50/50 rounded-xl focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all text-gray-800 text-sm font-mono"
            rows="12"
            placeholder="Paste your bank or UPI SMS messages here. Each message should be on a new line."
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
          ></textarea>
          <Button
            onClick={handleParseSms}
            className="mt-6 w-full py-3 text-lg font-bold bg-primary-900 hover:bg-primary-800 transition-all transform hover:-translate-y-0.5 text-white rounded-xl shadow-md"
            disabled={loading}
          >
            {loading ? <LoadingSpinner /> : 'Parse SMS'}
          </Button>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 min-h-[500px]">
          <h2 className="text-xl font-bold mb-6 text-primary-900 flex items-center justify-between">
            <span>Parsed Transactions</span>
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{parsedTransactions.length} found</span>
          </h2>

          {error && <p className="text-red-700 bg-red-50 border border-red-100 p-4 rounded-xl mb-6 flex items-start"><span className="mr-2">⚠️</span> {error}</p>}
          {successMessage && <p className="text-emerald-700 bg-emerald-50 border border-emerald-100 p-4 rounded-xl mb-6 flex items-start"><span className="mr-2">✅</span> {successMessage}</p>}

          {parsedTransactions.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-3 justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <div className="flex space-x-2">
                  <button onClick={() => handleSelectAll(true)} className="px-3 py-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors uppercase tracking-wide">Select All</button>
                  <button onClick={() => handleSelectAll(false)} className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors uppercase tracking-wide">Deselect All</button>
                </div>
                <Button
                  onClick={handleSaveTransactions}
                  className="px-6 py-2.5 text-sm font-bold bg-accent-500 hover:bg-accent-600 transition-all shadow-md text-white rounded-xl flex items-center"
                  disabled={loading}
                >
                  {loading ? <LoadingSpinner /> : (
                    <>
                      <span>Save Selected</span>
                      <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </>
                  )}
                </Button>
              </div>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {parsedTransactions.map((transaction, index) => (
                  <div key={index} className={`p-4 rounded-xl border transition-all duration-200 ${transaction.selected ? 'bg-accent-50/30 border-accent-200 shadow-sm' : 'bg-white border-gray-100 hover:bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className="pt-2">
                        <input
                          type="checkbox"
                          checked={transaction.selected || false}
                          onChange={(e) => handleSelectTransaction(index, e.target.checked)}
                          className="h-5 w-5 rounded border-gray-300 text-accent-600 focus:ring-accent-500"
                        />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormInput
                            value={transaction.description}
                            onChange={(e) => handleTransactionChange(index, 'description', e.target.value)}
                            className="w-full bg-white border-gray-200 text-gray-800 p-2 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 transition-shadow font-medium"
                            placeholder="Description"
                          />
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-gray-400 text-sm font-bold">₹</span>
                            <FormInput
                              type="number"
                              value={transaction.amount}
                              onChange={(e) => handleTransactionChange(index, 'amount', parseFloat(e.target.value))}
                              className="w-full pl-6 bg-white border-gray-200 text-gray-800 p-2 rounded-lg text-sm focus:ring-2 focus:ring-accent-500 transition-shadow font-bold"
                              placeholder="Amount"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <FormInput
                            type="date"
                            value={format(new Date(transaction.date), 'yyyy-MM-dd')}
                            onChange={(e) => handleTransactionChange(index, 'date', e.target.value)}
                            className="w-full bg-white border-gray-200 text-gray-700 p-2 rounded-lg text-xs focus:ring-2 focus:ring-accent-500 transition-shadow"
                          />
                          <select
                            value={transaction.type}
                            onChange={(e) => handleTransactionChange(index, 'type', e.target.value)}
                            className="w-full p-2 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs focus:ring-2 focus:ring-accent-500 transition-shadow uppercase font-bold"
                          >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                          </select>
                          <select
                            value={transaction.category}
                            onChange={(e) => handleTransactionChange(index, 'category', e.target.value)}
                            className="w-full p-2 border border-gray-200 rounded-lg bg-white text-gray-700 text-xs focus:ring-2 focus:ring-accent-500 transition-shadow"
                          >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                              <option key={cat._id} value={cat._id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <div className="mx-auto h-24 w-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-600">No transactions parsed yet</p>
              <p className="text-sm mt-1">Paste your SMS messages on the left and click "Parse SMS"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


export default SmsSync;