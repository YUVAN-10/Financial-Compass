import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { createNotification } from '../services/notificationService';

import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const AddTransaction = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    category: '',
    date: new Date(),
    notes: '',
    paymentMethod: ''
  });

  // Fetch categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      toast.error('Failed to load categories');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      date: date
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    setLoading(true);

    try {
      const transactionData = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        type: formData.type,
        category: formData.category,
        date: formData.date.toISOString(),
        notes: formData.notes.trim()
      };

      await axios.post('/api/transactions', transactionData);

      // Create a notification
      await createNotification({
        title: `New ${formData.type}`,
        message: `${formData.description} - $${formData.amount}`,
        type: formData.type,
      });

      toast.success('Transaction added successfully!');
      navigate('/transactions');
    } catch (err) {
      console.error('Error creating transaction:', err);
      toast.error(err.response?.data?.error || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/transactions');
  };

  // Filter categories based on transaction type
  const filteredCategories = categories.filter(category => {
    if (category.type) {
      return category.type === formData.type;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-cream py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="inline-flex items-center text-sm font-bold text-primary-600 hover:text-accent-600 transition-colors mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Back to Transactions
          </button>
          <h1 className="text-3xl font-display font-bold text-primary-900">Add New Transaction</h1>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 animate-fade-in-up">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Transaction Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'income', category: '' }))}
                  className={`py-3 px-4 text-center rounded-xl border-2 transition-all font-bold ${formData.type === 'income'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: 'expense', category: '' }))}
                  className={`py-3 px-4 text-center rounded-xl border-2 transition-all font-bold ${formData.type === 'expense'
                      ? 'border-red-500 bg-red-50 text-red-800 shadow-sm'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50'
                    }`}
                >
                  Expense
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-bold text-gray-700 mb-1">
                Description *
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-200 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors"
                placeholder="Enter transaction description"
              />
            </div>

            {/* Amount */}
            <div>
              <label htmlFor="amount" className="block text-sm font-bold text-gray-700 mb-1">
                Amount *
              </label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 font-bold">₹</span>
                </div>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="block w-full pl-8 pr-12 border border-gray-200 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors text-lg font-bold text-gray-900"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-bold text-gray-700 mb-1">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-200 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors bg-white"
              >
                <option value="">Select a category</option>
                {filteredCategories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {filteredCategories.length === 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  No categories available. Please create a category first.
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={formData.date.toISOString().split('T')[0]}
                onChange={(e) => handleDateChange(new Date(e.target.value))}
                className="block w-full border border-gray-200 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-bold text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full border border-gray-200 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-colors"
                placeholder="Add any additional notes..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={handleCancel}
                className="py-3 px-6 border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="py-3 px-8 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Add Transaction'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddTransaction;