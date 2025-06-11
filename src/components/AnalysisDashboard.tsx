'use client';

import { useState, useEffect } from 'react';
import { MonthlyAnalysisResponse } from '@/types/analysis';
import { formatCurrency } from '@/lib/data-processing';

interface AnalysisDashboardProps {
  budgetId?: string;
  month?: string;
}

export default function AnalysisDashboard({ budgetId, month }: AnalysisDashboardProps) {
  const [analysis, setAnalysis] = useState<MonthlyAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
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
              Over-Target Categories ({topOverTargetCategories.length})
            </h3>
            {topOverTargetCategories.length > 0 ? (
              <div className="space-y-3">
                {topOverTargetCategories.slice(0, 5).map((category) => (
                  <div key={category.categoryId} className="flex justify-between items-center p-3 bg-red-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{category.categoryName}</p>
                      <p className="text-xs text-gray-500">{category.categoryGroupName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        +{formatCurrency(category.variance)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.variancePercentage !== null && !isNaN(category.variancePercentage) && isFinite(category.variancePercentage)
                          ? `${category.variancePercentage.toFixed(1)}% over`
                          : 'Over target'
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
              Under-Target Categories ({topUnderTargetCategories.length})
            </h3>
            {topUnderTargetCategories.length > 0 ? (
              <div className="space-y-3">
                {topUnderTargetCategories.slice(0, 5).map((category) => (
                  <div key={category.categoryId} className="flex justify-between items-center p-3 bg-yellow-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{category.categoryName}</p>
                      <p className="text-xs text-gray-500">{category.categoryGroupName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-yellow-600">
                        {formatCurrency(category.variance)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {category.variancePercentage !== null && !isNaN(category.variancePercentage) && isFinite(category.variancePercentage)
                          ? `${Math.abs(category.variancePercentage).toFixed(1)}% under`
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
    </div>
  );
}
