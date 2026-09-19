import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import CategorySuggestions from '../components/CategorySuggestions';

const Budgets = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [isEditing, setIsEditing] = useState(false);
  const [currentBudgetId, setCurrentBudgetId] = useState(null);

  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const [budgetProgress, setBudgetProgress] = useState([]);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/budgets/progress?month=${filterMonth}&year=${filterYear}`);
      setBudgetProgress(response.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching budgets:', err);
      setError('Failed to load budgets. Please try again later.');
      setLoading(false);
    }
  }, [filterMonth, filterYear]);

  useEffect(() => {
    fetchBudgets();
    fetchCategories();
  }, [fetchBudgets, filterMonth, filterYear]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      setCategories(response.data.data);
    } catch (err) {
      console.error('Error fetching categories:', err.response ? err.response.data : err.message);
      toast.error('Failed to load categories');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const budgetData = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (isEditing) {
        await axios.put(`/api/budgets/${currentBudgetId}`, budgetData);
        toast.success('Budget updated successfully');
      } else {
        await axios.post('/api/budgets', budgetData);
        toast.success('Budget created successfully');
      }

      resetForm();
      fetchBudgets();
    } catch (err) {
      console.error('Error saving budget:', err);
      toast.error(err.response?.data?.error || 'Failed to save budget');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await axios.delete(`/api/budgets/${id}`);
        toast.success('Budget deleted successfully');
        fetchBudgets();
      } catch (err) {
        console.error('Error deleting budget:', err);
        toast.error('Failed to delete budget');
      }
    }
  };

  const handleEdit = (budget) => {
    const originalBudget = {
      category: budget.category._id,
      amount: budget.budgetAmount,
      month: filterMonth,
      year: filterYear
    };

    setFormData(originalBudget);
    setCurrentBudgetId(budget._id);
    setIsEditing(true);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      category: '',
      amount: '',
      month: filterMonth,
      year: filterYear
    });
    setIsEditing(false);
    setCurrentBudgetId(null);
    setShowForm(false);
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="min-h-screen bg-cream py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary-900">Budget Management</h1>
            <p className="mt-2 text-primary-600">Track and manage your monthly spending limits</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all transform hover:-translate-y-0.5"
          >
            {showForm ? (
              <>
                <XMarkIcon className="-ml-1 mr-2 h-5 w-5" />
                Cancel
              </>
            ) : (
              <>
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Add Budget
              </>
            )}
          </button>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 mb-6">
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 uppercase tracking-wider text-xs text-primary-500">Budget Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="month" className="block text-sm font-bold text-gray-700 mb-1">
                  Month
                </label>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                  className="block w-full border border-gray-200 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="year" className="block text-sm font-bold text-gray-700 mb-1">
                  Year
                </label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(parseInt(e.target.value))}
                  className="block w-full border border-gray-200 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all bg-gray-50 hover:bg-white"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 mb-6 animate-fade-in">
            <div className="p-6">
              <h2 className="text-xl font-display font-bold text-primary-900 mb-6 border-b border-gray-100 pb-2">
                {isEditing ? 'Edit Budget' : 'Create New Budget'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="block w-full border border-gray-200 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="amount" className="block text-sm font-bold text-gray-700 mb-1">
                      Budget Amount *
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 font-bold">₹</span>
                      </div>
                      <input
                        type="number"
                        name="amount"
                        id="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="block w-full pl-8 border border-gray-200 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="month" className="block text-sm font-bold text-gray-700 mb-1">
                      Month *
                    </label>
                    <select
                      id="month"
                      name="month"
                      value={formData.month}
                      onChange={handleChange}
                      required
                      className="block w-full border border-gray-200 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                    >
                      {months.map((month) => (
                        <option key={month.value} value={month.value}>
                          {month.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="year" className="block text-sm font-bold text-gray-700 mb-1">
                      Year *
                    </label>
                    <select
                      id="year"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      required
                      className="block w-full border border-gray-200 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                    >
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="py-2.5 px-6 border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900 transition-colors"
                  >
                    {isEditing ? 'Update Budget' : 'Create Budget'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Category Suggestions */}
        {(categories.length === 0 || showForm) && (
          <div className="mb-6">
            <CategorySuggestions
              onCategoriesAdded={(newCategories) => {
                fetchCategories();
                toast.success(`Added ${newCategories.length} new categories!`);
              }}
              existingCategories={categories}
            />
          </div>
        )}

        {/* Budget Progress */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mx-auto"></div>
              <p className="mt-4 text-gray-500 font-medium">Loading budgets...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 font-medium bg-red-50">{error}</div>
          ) : budgetProgress.length === 0 ? (
            <div className="p-16 text-center">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                <PlusIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No budgets set</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">Start planning your finances by setting monthly limits for different categories.</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all transform hover:-translate-y-0.5"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Create Your First Budget
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {budgetProgress.map((budget) => (
                <li key={budget._id} className="p-6 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: `${budget.category.color}20` }}
                      >
                        <div
                          className="h-6 w-6 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: budget.category.color, color: 'white' }}
                        >
                          {/* We could add an icon here if categories have them */}
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-bold text-gray-900">{budget.category.name}</h3>
                        <p className="text-sm font-medium text-gray-500">
                          Budget: <span className="text-gray-900">₹{budget.budgetAmount.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(budget)}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(budget._id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-bold text-gray-700">
                        {budget.percentage.toFixed(0)}% spent
                      </span>
                      <span className="font-medium text-gray-600">
                        ₹{budget.spent.toFixed(2)} / ₹{budget.budgetAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${budget.percentage < 80 ? 'bg-accent-500' : budget.percentage < 100 ? 'bg-warning-400' : 'bg-error-500'}`}
                        style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="mt-2 text-xs font-bold uppercase tracking-wide">
                      {budget.remaining > 0 ? (
                        <span className="text-accent-600">
                          ₹{budget.remaining.toFixed(2)} remaining
                        </span>
                      ) : (
                        <span className="text-red-500">
                          ₹{Math.abs(budget.remaining).toFixed(2)} over budget
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default Budgets;