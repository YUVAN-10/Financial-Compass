import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  TagIcon,
  HomeIcon,
  ShoppingBagIcon,
  BanknotesIcon,
  FilmIcon,
  MusicalNoteIcon,
  GiftIcon,
  WifiIcon,
  TruckIcon,
  ShoppingCartIcon,
  CakeIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#0B1F3A', // Deep Navy Blue as default
    icon: 'tag'
  });

  // Available icons with Heroicons components
  const availableIcons = [
    { name: 'tag', component: <TagIcon className="h-5 w-5" /> },
    { name: 'home', component: <HomeIcon className="h-5 w-5" /> },
    { name: 'shopping', component: <ShoppingBagIcon className="h-5 w-5" /> },
    { name: 'money', component: <BanknotesIcon className="h-5 w-5" /> },
    { name: 'entertainment', component: <FilmIcon className="h-5 w-5" /> },
    { name: 'music', component: <MusicalNoteIcon className="h-5 w-5" /> },
    { name: 'gift', component: <GiftIcon className="h-5 w-5" /> },
    { name: 'internet', component: <WifiIcon className="h-5 w-5" /> },
    { name: 'transport', component: <TruckIcon className="h-5 w-5" /> },
    { name: 'groceries', component: <ShoppingCartIcon className="h-5 w-5" /> },
    { name: 'food', component: <CakeIcon className="h-5 w-5" /> },
    { name: 'health', component: <HeartIcon className="h-5 w-5" /> }
  ];

  // Available colors matching the financial theme
  const availableColors = [
    { name: 'Navy', value: '#00301e' }, // Primary-900
    { name: 'Emerald', value: '#03D47C' }, // Accent-300
    { name: 'Gold', value: '#D4AF37' },
    { name: 'Slate', value: '#64748B' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Teal', value: '#14B8A6' }
  ];

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/categories');
      setCategories(response.data.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddNew = () => {
    setFormData({
      name: '',
      color: '#00301e',
      icon: 'tag'
    });
    setFormMode('add');
    setShowForm(true);
  };

  const handleEdit = (category) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name,
      color: category.color,
      icon: category.icon
    });
    setFormMode('edit');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setCurrentCategory(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (formMode === 'add') {
        await api.post('/api/categories', formData);
        toast.success('Category added successfully');
      } else {
        await api.put(`/api/categories/${currentCategory._id}`, formData);
        toast.success('Category updated successfully');
      }

      fetchCategories();
      handleCloseForm();
    } catch (err) {
      console.error('Error saving category:', err);
      toast.error(err.response?.data?.error || 'Failed to save category');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category? This will affect all transactions using this category.')) {
      try {
        await api.delete(`/api/categories/${id}`);
        toast.success('Category deleted successfully');
        fetchCategories();
      } catch (err) {
        console.error('Error deleting category:', err);
        toast.error(err.response?.data?.error || 'Failed to delete category');
      }
    }
  };

  const renderIcon = (iconName) => {
    const icon = availableIcons.find(i => i.name === iconName);
    return icon ? icon.component : <TagIcon className="h-5 w-5" />;
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-cream min-h-screen max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary-900">Categories</h1>
          <p className="mt-1 text-primary-600">Manage your transaction categories</p>
        </div>
        <button
          onClick={handleAddNew}
          className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-bold rounded-xl shadow-md text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all transform hover:-translate-y-0.5"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
          Add Category
        </button>
      </div>

      {/* Categories List */}
      <div className="bg-white shadow-sm overflow-hidden rounded-2xl border border-gray-100">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500 mx-auto"></div>
            <p className="mt-4 text-gray-500 font-medium">Loading categories...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 font-medium bg-red-50">{error}</div>
        ) : categories.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
              <TagIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No categories found</h3>
            <p className="mb-6">Create your first category to get started organizing your finances.</p>
            <button
              onClick={handleAddNew}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-bold rounded-xl text-accent-700 bg-accent-100 hover:bg-accent-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-colors"
            >
              Create Category
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {categories.map((category) => (
              <li key={category._id} className="hover:bg-gray-50 transition-colors">
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className="h-12 w-12 rounded-xl flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: `${category.color}20`, color: category.color }}
                      >
                        {renderIcon(category.icon)}
                      </div>
                      <div className="ml-4">
                        <div className="text-lg font-bold text-primary-900">{category.name}</div>
                        <div className="flex items-center mt-1">
                          <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }}></span>
                          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                            {availableColors.find(c => c.value === category.color)?.name || 'Custom'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleDelete(category._id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add/Edit Category Form Modal */}
      {showForm && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-primary-900/75 backdrop-blur-sm" onClick={handleCloseForm}></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full animate-fade-in-up">
              <div className="bg-white px-6 pt-6 pb-4">
                <h3 className="text-xl font-display font-bold text-primary-900 mb-6 border-b border-gray-100 pb-4">
                  {formMode === 'add' ? 'Add New Category' : 'Edit Category'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Category Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-1">
                      Category Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      className="block w-full border border-gray-200 rounded-xl py-3 px-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent transition-all"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. Groceries"
                    />
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Color
                    </label>
                    <div className="grid grid-cols-6 gap-3">
                      {availableColors.map((color) => (
                        <div
                          key={color.value}
                          className={`h-10 w-10 rounded-full cursor-pointer flex items-center justify-center transition-all transform hover:scale-110 ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-primary-900 scale-110 shadow-md' : ''}`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => setFormData({ ...formData, color: color.value })}
                          title={color.name}
                        >
                          {formData.color === color.value && (
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Icon Selection */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Icon
                    </label>
                    <div className="grid grid-cols-6 gap-3">
                      {availableIcons.map((icon) => (
                        <div
                          key={icon.name}
                          className={`h-12 w-12 rounded-xl flex items-center justify-center cursor-pointer transition-all ${formData.icon === icon.name ? 'bg-primary-900 text-white shadow-md transform scale-105' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
                          onClick={() => setFormData({ ...formData, icon: icon.name })}
                          title={icon.name}
                        >
                          {React.cloneElement(icon.component, {
                            className: `h-6 w-6`
                          })}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      className="py-2.5 px-6 border border-gray-200 rounded-xl shadow-sm text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors"
                      onClick={handleCloseForm}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="py-2.5 px-6 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-accent-500 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-colors"
                    >
                      {formMode === 'add' ? 'Add Category' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;