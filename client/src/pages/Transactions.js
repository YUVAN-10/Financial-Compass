import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import { toast } from 'react-toastify';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const Transactions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // State for transactions and pagination
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: parseInt(queryParams.get('page')) || 1,
    limit: parseInt(queryParams.get('limit')) || 10,
    total: 0
  });

  // State for filters
  const [filters, setFilters] = useState({
    startDate: queryParams.get('startDate') ? new Date(queryParams.get('startDate')) : null,
    endDate: queryParams.get('endDate') ? new Date(queryParams.get('endDate')) : null,
    type: queryParams.get('type') || '',
    category: queryParams.get('category') || '',
    search: queryParams.get('search') || ''
  });

  // State for filter visibility
  const [showFilters, setShowFilters] = useState(false);

  // State for categories (for filter dropdown)
  const [categories, setCategories] = useState([]);

  // Fetch transactions with current filters and pagination
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);

      // Build query string from filters and pagination
      const params = new URLSearchParams();
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);

      if (filters.startDate) {
        params.append('startDate', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        params.append('endDate', filters.endDate.toISOString());
      }

      if (filters.type) {
        params.append('type', filters.type);
      }

      if (filters.category) {
        params.append('category', filters.category);
      }

      if (filters.search) {
        params.append('search', filters.search);
      }

      // Update URL with current filters and pagination
      navigate(`/transactions?${params.toString()}`, { replace: true });

      // Fetch transactions
      const response = await api.get(`/api/transactions?${params.toString()}`);

      setTransactions(response.data.data);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0
      }));
      setLoading(false);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Failed to load transactions. Please try again.');
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, filters, navigate]);

  // Fetch categories for filter dropdown
  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Don't set error state here to avoid blocking transaction loading
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, [fetchTransactions, pagination.page, pagination.limit]);

  // Handle filter changes
  const handleFilterChange = (name, value) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Apply filters
  const applyFilters = () => {
    setPagination(prev => ({
      ...prev,
      page: 1 // Reset to first page when applying new filters
    }));
    fetchTransactions();
    setShowFilters(false);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      type: '',
      category: '',
      search: ''
    });
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
    // We'll apply the reset filters in the next useEffect call
  };

  // Apply reset filters
  useEffect(() => {
    if (!filters.startDate && !filters.endDate && !filters.type && !filters.category && !filters.search) {
      fetchTransactions();
    }
  }, [filters, fetchTransactions]);

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage > 0) {
      setPagination(prev => ({
        ...prev,
        page: newPage
      }));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        await api.delete(`/api/transactions/${id}`);
        toast.success('Transaction deleted successfully');
        fetchTransactions(); // Refresh the list
      } catch (err) {
        console.error('Error deleting transaction:', err);
        toast.error('Failed to delete transaction');
      }
    }
  };

  const handleDownloadBill = async (id) => {
    try {
      const response = await api.get(`/api/transactions/${id}/bill`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${id}.txt`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Receipt downloaded successfully!');
    } catch (err) {
      console.error('Error downloading receipt:', err);
      toast.error('Failed to download receipt');
    }
  };

  return (
    <div className="bg-cream min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary-900">Transaction Ledger</h1>
            <p className="mt-2 text-primary-600">
              Detailed record of all financial transactions
            </p>
          </div>
          <Link
            to="/transactions/new"
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all transform hover:-translate-y-0.5"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            New Transaction
          </Link>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Search Input */}
              <div className="relative flex-grow max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent sm:text-sm transition-shadow"
                  placeholder="Search transactions..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && applyFilters()}
                />
              </div>

              {/* Filter Toggle Button */}
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-xl text-primary-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-colors"
                onClick={() => setShowFilters(!showFilters)}
              >
                <FunnelIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                Filters
                {(filters.startDate || filters.endDate || filters.type || filters.category) && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent-100 text-accent-700">
                    Active
                  </span>
                )}
              </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <div className="mt-6 border-t border-gray-100 pt-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Range Filters */}
                  <div>
                    <label htmlFor="startDate" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Start Date
                    </label>
                    <DatePicker
                      selected={filters.startDate}
                      onChange={(date) => handleFilterChange('startDate', date)}
                      selectsStart
                      startDate={filters.startDate}
                      endDate={filters.endDate}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-accent-500 focus:border-accent-500 sm:text-sm"
                      placeholderText="Select start date"
                      isClearable
                    />
                  </div>

                  <div>
                    <label htmlFor="endDate" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      End Date
                    </label>
                    <DatePicker
                      selected={filters.endDate}
                      onChange={(date) => handleFilterChange('endDate', date)}
                      selectsEnd
                      startDate={filters.startDate}
                      endDate={filters.endDate}
                      minDate={filters.startDate}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-accent-500 focus:border-accent-500 sm:text-sm"
                      placeholderText="Select end date"
                      isClearable
                    />
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label htmlFor="type" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Type
                    </label>
                    <select
                      id="type"
                      name="type"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-accent-500 focus:border-accent-500 sm:text-sm"
                      value={filters.type}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                    >
                      <option value="">All Types</option>
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label htmlFor="category" className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                      Category
                    </label>
                    <select
                      id="category"
                      name="category"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-accent-500 focus:border-accent-500 sm:text-sm"
                      value={filters.category}
                      onChange={(e) => handleFilterChange('category', e.target.value)}
                    >
                      <option value="">All Categories</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-colors"
                    onClick={resetFilters}
                  >
                    <XMarkIcon className="-ml-1 mr-2 h-5 w-5 text-gray-400" aria-hidden="true" />
                    Reset
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-900 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-900 transition-colors"
                    onClick={applyFilters}
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mx-auto"></div>
              <p className="mt-4 text-gray-500 font-medium">Loading transactions...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center bg-red-50 text-red-700 font-medium">{error}</div>
          ) : transactions.length === 0 ? (
            <div className="p-16 text-center text-gray-500">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                <MagnifyingGlassIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No transactions found</h3>
              <p className="max-w-sm mx-auto mb-6">We couldn't find any transactions matching your current filters.</p>
              {(filters.startDate || filters.endDate || filters.type || filters.category || filters.search) && (
                <button
                  className="text-accent-600 hover:text-accent-700 font-bold hover:underline"
                  onClick={resetFilters}
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {transactions.map((transaction) => (
                <li key={transaction._id} className="hover:bg-primary-50/50 transition-colors group">
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${transaction.type === 'expense' ? 'bg-orange-50 text-orange-600' : 'bg-accent-50 text-accent-600'}`}>
                          {transaction.type === 'expense' ? (
                            <ArrowDownIcon className="h-5 w-5" />
                          ) : (
                            <ArrowUpIcon className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900 group-hover:text-primary-700 transition-colors">{transaction.description}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {transaction.category?.name || 'Uncategorized'}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(transaction.date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className={`text-sm font-bold font-mono ${transaction.type === 'expense' ? 'text-gray-900' : 'text-accent-600'}`}>
                            {transaction.type === 'expense' ? '-' : '+'}₹{transaction.amount.toFixed(2)}
                          </div>
                          {transaction.type === 'expense' && transaction.category?.budget && (
                            <div className="text-[10px] font-medium text-gray-400 mt-0.5">
                              {((transaction.amount / transaction.category.budget) * 100).toFixed(0)}% of budget
                            </div>
                          )}
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {transaction.billPath && (
                            <button
                              onClick={() => handleDownloadBill(transaction._id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-accent-600 hover:bg-accent-50 transition-colors"
                              title="Download Receipt"
                            >
                              <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/transactions/${transaction._id}/edit`)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                            title="Edit"
                          >
                            <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => handleDelete(transaction._id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Pagination */}
          {!loading && !error && transactions.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${pagination.page === 1 ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} transition-colors`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${pagination.page * pagination.limit >= pagination.total ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'} transition-colors`}
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    Showing <span className="font-bold text-gray-900">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                    <span className="font-bold text-gray-900">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="font-bold text-gray-900">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${pagination.page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'} transition-colors`}
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                    </button>

                    {/* Current Page Indicator */}
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-primary-50 text-sm font-bold text-primary-700">
                      Page {pagination.page}
                    </span>

                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page * pagination.limit >= pagination.total}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${pagination.page * pagination.limit >= pagination.total ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'} transition-colors`}
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Transactions;