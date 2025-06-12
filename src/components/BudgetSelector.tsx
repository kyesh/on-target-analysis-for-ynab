'use client';

import { useState, useEffect } from 'react';
import { SafeBudget } from '@/types/ynab';

interface BudgetSelectorProps {
  onBudgetSelect: (budgetId: string) => void;
  selectedBudgetId?: string;
}

export default function BudgetSelector({ onBudgetSelect, selectedBudgetId }: BudgetSelectorProps) {
  const [budgets, setBudgets] = useState<SafeBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/budgets');
      const data = await response.json();
      
      if (data.success) {
        // Sort budgets by lastModified in descending order (most recent first)
        const sortedBudgets = data.data.budgets.sort((a: SafeBudget, b: SafeBudget) =>
          new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
        );
        setBudgets(sortedBudgets);

        // Auto-select most recently modified budget if none selected
        if (!selectedBudgetId && sortedBudgets.length > 0) {
          onBudgetSelect(sortedBudgets[0].id);
        }
      } else {
        setError(data.error?.message || 'Failed to load budgets');
      }
    } catch (err) {
      setError('Failed to fetch budgets');
      console.error('Budget fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded-md"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">
        Error: {error}
        <button 
          onClick={fetchBudgets}
          className="ml-2 text-blue-600 hover:text-blue-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor="budget-select" className="block text-sm font-medium text-gray-700">
        Select Budget
      </label>
      <select
        id="budget-select"
        value={selectedBudgetId || ''}
        onChange={(e) => onBudgetSelect(e.target.value)}
        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
      >
        <option value="">Choose a budget...</option>
        {budgets.map((budget) => (
          <option key={budget.id} value={budget.id}>
            {budget.name}
          </option>
        ))}
      </select>
      {budgets.length > 0 && (
        <p className="text-xs text-gray-500">
          {budgets.length} budget{budgets.length !== 1 ? 's' : ''} available
        </p>
      )}
    </div>
  );
}
