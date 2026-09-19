import React from 'react';
import CategorySuggestions from '../components/CategorySuggestions';

const CategorySuggestionsPage = () => {
  const suggestions = [
    { name: 'Groceries', description: 'Monthly grocery shopping' },
    { name: 'Utilities', description: 'Electricity, water, internet, etc.' },
    { name: 'Transportation', description: 'Gas, public transit, etc.' },
    { name: 'Entertainment', description: 'Movies, concerts, etc.' },
  ];

  return (
    <div className="min-h-screen bg-cream py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-primary-900">Category Suggestions</h1>
            <p className="mt-2 text-primary-600">Here are some suggested categories for your budgets.</p>
          </div>
        </div>
        <div className="animate-fade-in-up">
          <CategorySuggestions suggestions={suggestions} />
        </div>
      </div>
    </div>
  );
};

export default CategorySuggestionsPage;