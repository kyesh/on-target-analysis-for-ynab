'use client';

import { useState, useEffect } from 'react';
import { MonthlyAnalysisResponse } from '@/types/analysis';
import { formatCurrency } from '@/lib/data-processing';
import { CategoryDebugPanel, DebugToggle } from './CategoryDebugPanel';
import { MonthlyOverview } from './MonthlyOverview';

interface AnalysisDashboardProps {
  budgetId?: string;
  month?: string;
}

export default function AnalysisDashboard({ budgetId, month }: AnalysisDashboardProps) {
  const [analysis, setAnalysis] = useState<MonthlyAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugMode, setDebugMode] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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
      
      const response = await fetch(`/api/analysis/monthly?${params}`);
      const data = await response.json();
      
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="mt-6 h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Analysis Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button 
              onClick={fetchAnalysis}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Analysis Available</h3>
        <p className="mt-1 text-sm text-gray-500">Select a budget and month to view analysis.</p>
      </div>
    );
  }

  const { monthlyAnalysis, topOverTargetCategories, topUnderTargetCategories } = analysis;

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
  const allOverTargetCategories = [...topOverTargetCategories, ...zeroTargetWithAssignments]
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)); // Sort by absolute variance

  // Calculate total variance amounts for section titles
  const totalOverTargetVariance = allOverTargetCategories
    .reduce((sum, category) => sum + Math.abs(category.variance), 0);

  const totalUnderTargetVariance = topUnderTargetCategories
    .reduce((sum, category) => sum + Math.abs(category.variance), 0);

  return (
    <div className="space-y-6">
      {/* Monthly Overview */}
      <MonthlyOverview analysis={analysis} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Assigned</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(monthlyAnalysis.totalAssigned)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Targeted</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(monthlyAnalysis.totalTargeted)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                  monthlyAnalysis.budgetDisciplineRating === 'Excellent' ? 'bg-green-500' :
                  monthlyAnalysis.budgetDisciplineRating === 'Good' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}>
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Budget Discipline</dt>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Over Target Categories */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Over-Target Categories ({allOverTargetCategories.length}) - {formatCurrency(totalOverTargetVariance)} Over Budget
            </h3>
            {allOverTargetCategories.length > 0 ? (
              <div className="space-y-3">
                {allOverTargetCategories.slice(0, 5).map((category) => (
                  <div key={category.categoryId} className="flex justify-between items-center p-3 bg-red-50 rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{category.categoryName}</p>
                      <p className="text-xs text-gray-500">{category.categoryGroupName}</p>
                      <div className="text-xs text-gray-600 mt-1 space-x-2">
                        <span>Target: {formatCurrency(category.target)}</span>
                        <span>•</span>
                        <span>Assigned: {formatCurrency(category.assigned)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        +{formatCurrency(category.variance)} over
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.variancePercentage !== null && !isNaN(category.variancePercentage) && isFinite(category.variancePercentage)
                          ? `${category.variancePercentage.toFixed(1)}% over target`
                          : category.target === 0 ? 'Zero target with assignment' : 'Over target'
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No categories are over target this month.</p>
            )}
          </div>
        </div>

        {/* Under Target Categories */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Under-Target Categories ({topUnderTargetCategories.length}) - {formatCurrency(totalUnderTargetVariance)} Under Budget
            </h3>
            {topUnderTargetCategories.length > 0 ? (
              <div className="space-y-3">
                {topUnderTargetCategories.slice(0, 5).map((category) => (
                  <div key={category.categoryId} className="flex justify-between items-center p-3 bg-yellow-50 rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{category.categoryName}</p>
                      <p className="text-xs text-gray-500">{category.categoryGroupName}</p>
                      <div className="text-xs text-gray-600 mt-1 space-x-2">
                        <span>Target: {formatCurrency(category.target)}</span>
                        <span>•</span>
                        <span>Assigned: {formatCurrency(category.assigned)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-yellow-600">
                        {formatCurrency(category.variance)} under
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.variancePercentage !== null && !isNaN(category.variancePercentage) && isFinite(category.variancePercentage)
                          ? `${Math.abs(category.variancePercentage).toFixed(1)}% under target`
                          : 'Under target'
                        }
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">All categories with targets are properly funded.</p>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Category List with Debug Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              All Categories ({analysis.categories.length})
            </h3>
            <DebugToggle isEnabled={debugMode} onToggle={setDebugMode} />
          </div>

          {/* Category List */}
          <div className="space-y-4">
            {analysis.categories
              .filter(category => category.hasTarget || category.assigned > 0)
              .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance)) // Sort by absolute variance (largest first)
              .map((category) => (
                <div key={category.id} className="border border-gray-200 rounded-lg p-4">
                  {/* Category Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900">{category.name}</h4>
                        {category.hasTarget && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            category.alignmentStatus === 'on-target' ? 'bg-green-100 text-green-800' :
                            category.alignmentStatus === 'over-target' ? 'bg-red-100 text-red-800' :
                            category.alignmentStatus === 'under-target' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {category.alignmentStatus}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{category.categoryGroupName}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        Assigned: {formatCurrency(category.assigned)}
                      </div>
                      {category.hasTarget && (
                        <>
                          <div className="text-sm text-gray-600">
                            Target: {formatCurrency(category.neededThisMonth)}
                          </div>
                          <div className={`text-sm font-medium ${
                            category.variance > 0 ? 'text-red-600' :
                            category.variance < 0 ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            Variance: {formatCurrency(category.variance)}
                          </div>
                          {category.percentageOfTarget !== null && (
                            <div className="text-xs text-gray-500">
                              {category.percentageOfTarget.toFixed(1)}% of target
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
          {analysis.categories.filter(category => category.hasTarget || category.assigned > 0).length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              No categories with targets or assignments found for this month.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
