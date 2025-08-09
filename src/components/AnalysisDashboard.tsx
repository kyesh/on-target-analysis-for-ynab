'use client';

import { useState, useEffect } from 'react';
import { DashboardSummary, MonthlyAnalysisResponse } from '@/types/analysis';
import { formatCurrency } from '@/lib/data-processing';
import { CategoryDebugPanel, DebugToggle } from './CategoryDebugPanel';
import { MonthlyOverview } from './MonthlyOverview';
import { ApiClient } from '@/lib/api/client';
import { AuthenticationError } from './AuthenticationError';

interface AnalysisDashboardProps {
  budgetId?: string;
  month?: string;
}

export default function AnalysisDashboard({
  budgetId,
  month,
}: AnalysisDashboardProps) {
  const [analysis, setAnalysis] = useState<MonthlyAnalysisResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleCategoryDebug = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  useEffect(() => {
    if (budgetId && month) {
      fetchAnalysis();
    }
  }, [budgetId, month]);

  const fetchAnalysis = async () => {
    if (!budgetId || !month) return;

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        budgetId,
        month,
      });

      const data = await ApiClient.get(`/api/analysis/monthly?${params}`);

      if (data.success) {
        setAnalysis(data.data);
      } else {
        setError(data.error?.message || 'Failed to load analysis');
      }
    } catch (err) {
      setError('Failed to fetch analysis data');
      console.error('Analysis fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-lg bg-gray-200"></div>
            ))}
          </div>
          <div className="mt-6 h-64 rounded-lg bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <AuthenticationError
        error={error}
        onRetry={fetchAnalysis}
        showAutoRedirect={true}
        redirectDelay={5}
      />
    );
  }

  if (!analysis) {
    return (
      <div className="py-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          No Analysis Available
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Select a budget and month to view analysis.
        </p>
      </div>
    );
  }

  const { monthlyAnalysis, topOverTargetCategories, topUnderTargetCategories } =
    analysis;

  // Get zero-target categories with assignments for over-target section
  const zeroTargetWithAssignments = analysis.categories
    .filter(category => category.neededThisMonth === 0 && category.assigned > 0)
    .map(category => ({
      categoryId: category.id,
      categoryName: category.name,
      categoryGroupName: category.categoryGroupName,
      assigned: category.assigned,
      target: 0,
      variance: category.assigned, // All assigned amount is "over" the zero target
      variancePercentage: null, // Can't calculate percentage of zero
      targetType: null,
      month: analysis.selectedMonth,
    }))
    .sort((a, b) => b.variance - a.variance); // Sort by variance (highest first)

  // Combine over-target categories with zero-target categories
  const allOverTargetCategories = [
    ...topOverTargetCategories,
    ...zeroTargetWithAssignments,
  ].sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)); // Sort by absolute variance

  // Calculate total variance amounts for section titles
  const totalOverTargetVariance = allOverTargetCategories.reduce(
    (sum, category) => sum + Math.abs(category.variance),
    0
  );

  const totalUnderTargetVariance = topUnderTargetCategories.reduce(
    (sum, category) => sum + Math.abs(category.variance),
    0
  );
  // Target Summary: all categories with targets > 0 sorted by target desc
  const targetSummary = analysis.categories
    .filter(c => c.hasTarget && (c.neededThisMonth || 0) > 0)
    .map(c => ({
      id: c.id,
      name: c.name,
      categoryGroupName: c.categoryGroupName,
      target: c.neededThisMonth || 0,
      assigned: c.assigned,
      variance: c.variance,
    }))
    .sort((a, b) => b.target - a.target);


  return (
    <div className="space-y-6">
      {/* Monthly Overview */}
      <MonthlyOverview analysis={analysis} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">
                    Total Assigned
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(monthlyAnalysis.totalAssigned)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">
                    Total Targeted
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(monthlyAnalysis.totalTargeted)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-md ${
                    monthlyAnalysis.budgetDisciplineRating === 'Excellent'
                      ? 'bg-green-500'
                      : monthlyAnalysis.budgetDisciplineRating === 'Good'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                >
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">
                    Budget Discipline
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {monthlyAnalysis.budgetDisciplineRating}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Analysis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Over Target Categories */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
              Over-Target Categories ({allOverTargetCategories.length}) -{' '}
              {formatCurrency(totalOverTargetVariance)} Over Target
            </h3>
            {allOverTargetCategories.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {allOverTargetCategories.map(category => (
                  <div
                    key={category.categoryId}
                    className="flex items-center justify-between rounded-md bg-red-50 p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {category.categoryName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.categoryGroupName}
                      </p>
                      <div className="mt-1 space-x-2 text-xs text-gray-600">
                        <span>Target: {formatCurrency(category.target)}</span>
                        <span>•</span>
                        <span>
                          Assigned: {formatCurrency(category.assigned)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        +{formatCurrency(category.variance)} over
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.variancePercentage !== null &&
                        !isNaN(category.variancePercentage) &&
                        isFinite(category.variancePercentage)
                          ? `${category.variancePercentage.toFixed(1)}% over target`
                          : category.target === 0
                            ? 'Zero target with assignment'
                            : 'Over target'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No categories are over target this month.
              </p>
            )}
          </div>
        </div>

        {/* Under Target Categories */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
              Under-Target Categories ({topUnderTargetCategories.length}) -{' '}
              {formatCurrency(totalUnderTargetVariance)} Under Target
            </h3>
            {topUnderTargetCategories.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {topUnderTargetCategories.map(category => (
                  <div
                    key={category.categoryId}
                    className="flex items-center justify-between rounded-md bg-yellow-50 p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {category.categoryName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.categoryGroupName}
                      </p>
                      <div className="mt-1 space-x-2 text-xs text-gray-600">
                        <span>Target: {formatCurrency(category.target)}</span>
                        <span>•</span>
                        <span>
                          Assigned: {formatCurrency(category.assigned)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-yellow-600">
                        {formatCurrency(category.variance)} under
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.variancePercentage !== null &&
                        !isNaN(category.variancePercentage) &&
                        isFinite(category.variancePercentage)
                          ? `${Math.abs(category.variancePercentage).toFixed(1)}% under target`
                          : 'Under target'}


                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                All categories with targets are properly funded.
              </p>
            )}
          </div>
        </div>
      </div>

        {/* Target Summary */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
              Target Summary ({targetSummary.length})
            </h3>
            {targetSummary.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {targetSummary.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md bg-gray-50 p-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.categoryGroupName}
                      </p>
                      <div className="mt-1 space-x-2 text-xs text-gray-600">
                        <span>Target: {formatCurrency(item.target)}</span>
                        <span>•</span>
                        <span>Assigned: {formatCurrency(item.assigned)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${
                          item.variance > 0
                            ? 'text-red-600'
                            : item.variance < 0
                              ? 'text-yellow-600'
                              : 'text-green-600'
                        }`}
                      >
                        Variance: {formatCurrency(item.variance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No categories with targets this month.
              </p>
            )}
          </div>
        </div>


      {/* Detailed Category List with Debug Information */}
      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              All Categories ({analysis.categories.length})
            </h3>
            <DebugToggle isEnabled={debugMode} onToggle={setDebugMode} />
          </div>

          {/* Category List */}
          <div className="space-y-4">
            {analysis.categories
              .filter(category => category.hasTarget || category.assigned > 0)
              .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)) // Sort by absolute variance (largest first)
              .map(category => (
                <div
                  key={category.id}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  {/* Category Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {category.name}
                        </h4>
                        {category.hasTarget && (
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              category.alignmentStatus === 'on-target'
                                ? 'bg-green-100 text-green-800'
                                : category.alignmentStatus === 'over-target'
                                  ? 'bg-red-100 text-red-800'
                                  : category.alignmentStatus === 'under-target'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {category.alignmentStatus}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {category.categoryGroupName}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        Assigned: {formatCurrency(category.assigned)}
                      </div>
                      {category.hasTarget && (
                        <>
                          <div className="text-sm text-gray-600">
                            Target:{' '}
                            {formatCurrency(category.neededThisMonth || 0)}
                          </div>
                          <div
                            className={`text-sm font-medium ${
                              category.variance > 0
                                ? 'text-red-600'
                                : category.variance < 0
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                            }`}
                          >
                            Variance: {formatCurrency(category.variance)}
                          </div>
                          {category.percentageOfTarget !== null && (
                            <div className="text-xs text-gray-500">
                              {category.percentageOfTarget.toFixed(1)}% of
                              target
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Debug Panel */}
                  {debugMode && category.debugInfo && (
                    <CategoryDebugPanel
                      category={category}
                      isOpen={expandedCategories.has(category.id)}
                      onToggle={() => toggleCategoryDebug(category.id)}
                    />
                  )}
                </div>
              ))}
          </div>

          {/* No Categories Message */}
          {analysis.categories.filter(
            category => category.hasTarget || category.assigned > 0
          ).length === 0 && (
            <p className="py-8 text-center text-sm text-gray-500">
              No categories with targets or assignments found for this month.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
