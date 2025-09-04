'use client';

import { useState, useEffect } from 'react';
import { analytics } from '@/lib/analytics/posthog-client';
import { SafeBudget } from '@/types/ynab';
import { ApiClient } from '@/lib/api/client';
import { AuthenticationError } from './AuthenticationError';

interface BudgetSelectorProps {
  onBudgetSelect: (budgetId: string) => void;
  selectedBudgetId?: string;
}

export default function BudgetSelector({
  onBudgetSelect,
  selectedBudgetId,
}: BudgetSelectorProps) {
  const [budgets, setBudgets] = useState<SafeBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.get('/api/budgets');

      if (data.success) {
        // Sort budgets by lastModified in descending order (most recent first)
        const sortedBudgets = data.data.budgets.sort(
          (a: SafeBudget, b: SafeBudget) =>
            new Date(b.lastModified).getTime() -
            new Date(a.lastModified).getTime()
        );
        setBudgets(sortedBudgets);

        // Enrich person properties in PostHog
        try {
          analytics.setUserProperties({
            budget_count: sortedBudgets.length,
            budget_ids: sortedBudgets.map((b: SafeBudget) => b.id),
            currencies: Array.from(
              new Set(
                sortedBudgets
                  .map((b: SafeBudget) => b.currencyFormat?.iso_code)
                  .filter((code: string | undefined | null): code is string => Boolean(code))
              )
            ),
            default_budget_id: sortedBudgets[0]?.id || null,
          });
        } catch (e) {
          console.warn('Failed to set analytics user properties from budgets:', e);
        }

        // Auto-select most recently modified budget if none selected
        if (!selectedBudgetId && sortedBudgets.length > 0) {
          onBudgetSelect(sortedBudgets[0].id);
        }
      } else {
        setError(data.error?.message || 'Failed to load budgets');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch budgets');
      console.error('Budget fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 rounded-md bg-gray-200"></div>
      </div>
    );
  }

  if (error) {
    return (
      <AuthenticationError
        error={error}
        onRetry={fetchBudgets}
        showAutoRedirect={true}
        redirectDelay={5}
      />
    );
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="budget-select"
        className="block text-sm font-medium text-gray-700"
      >
        Select Budget
      </label>
      <select
        id="budget-select"
        value={selectedBudgetId || ''}
        onChange={e => onBudgetSelect(e.target.value)}
        className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
      >
        <option value="">Choose a budget...</option>
        {budgets.map(budget => (
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
