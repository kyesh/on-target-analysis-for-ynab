/**
 * Analytics Dashboard Component
 * Displays usage insights and performance metrics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { analytics } from '@/lib/analytics/posthog-client';

interface AnalyticsData {
  pageViews: number;
  uniqueUsers: number;
  avgSessionDuration: number;
  topPages: Array<{ path: string; views: number }>;
  userFlow: Array<{ from: string; to: string; count: number }>;
  errors: Array<{ type: string; count: number; lastOccurred: string }>;
  performance: {
    avgPageLoad: number;
    avgApiResponse: number;
    errorRate: number;
  };
}

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      // In a real implementation, this would fetch from PostHog API
      // For now, we'll simulate the data structure
      const mockData: AnalyticsData = {
        pageViews: 1250,
        uniqueUsers: 89,
        avgSessionDuration: 342, // seconds
        topPages: [
          { path: '/dashboard', views: 456 },
          { path: '/auth/signin', views: 234 },
          { path: '/analysis/monthly', views: 189 },
          { path: '/', views: 156 },
        ],
        userFlow: [
          { from: '/auth/signin', to: '/dashboard', count: 78 },
          { from: '/dashboard', to: '/analysis/monthly', count: 45 },
          { from: '/analysis/monthly', to: '/dashboard', count: 32 },
        ],
        errors: [
          {
            type: 'API Error',
            count: 12,
            lastOccurred: '2024-01-15T10:30:00Z',
          },
          {
            type: 'Authentication Error',
            count: 8,
            lastOccurred: '2024-01-15T09:15:00Z',
          },
          {
            type: 'Network Error',
            count: 5,
            lastOccurred: '2024-01-14T16:45:00Z',
          },
        ],
        performance: {
          avgPageLoad: 1.2, // seconds
          avgApiResponse: 0.8, // seconds
          errorRate: 0.02, // 2%
        },
      };

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setData(mockData);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics data loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-1/4 rounded bg-gray-200"></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded bg-gray-200"></div>
            ))}
          </div>
          <div className="h-64 rounded bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="text-center">
          <div className="mb-2 text-lg font-semibold text-red-600">
            Analytics Unavailable
          </div>
          <p className="mb-4 text-gray-600">{error}</p>
          <button
            onClick={loadAnalyticsData}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Analytics Dashboard
        </h2>
        <select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">Page Views</div>
          <div className="text-2xl font-bold text-gray-900">
            {data.pageViews.toLocaleString()}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">Unique Users</div>
          <div className="text-2xl font-bold text-gray-900">
            {data.uniqueUsers}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">Avg Session</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatDuration(data.avgSessionDuration)}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="text-sm font-medium text-gray-500">Error Rate</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatPercentage(data.performance.errorRate)}
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Pages */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Top Pages
          </h3>
          <div className="space-y-3">
            {data.topPages.map((page, index) => (
              <div
                key={page.path}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium text-gray-500">
                    #{index + 1}
                  </div>
                  <div className="text-sm text-gray-900">{page.path}</div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {page.views}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* User Flow */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            User Flow
          </h3>
          <div className="space-y-3">
            {data.userFlow.map((flow, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <div className="text-gray-600">{flow.from}</div>
                <div className="text-gray-400">→</div>
                <div className="text-gray-600">{flow.to}</div>
                <div className="ml-auto font-medium text-gray-900">
                  {flow.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Performance
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Avg Page Load</div>
              <div className="text-sm font-medium text-gray-900">
                {data.performance.avgPageLoad}s
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Avg API Response</div>
              <div className="text-sm font-medium text-gray-900">
                {data.performance.avgApiResponse}s
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Error Rate</div>
              <div className="text-sm font-medium text-gray-900">
                {formatPercentage(data.performance.errorRate)}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Errors */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Errors
          </h3>
          <div className="space-y-3">
            {data.errors.map((error, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {error.type}
                  </div>
                  <div className="text-xs text-gray-500">
                    Last: {new Date(error.lastOccurred).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-sm font-medium text-red-600">
                  {error.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Privacy Protected
            </h3>
            <p className="mt-1 text-sm text-blue-700">
              All analytics data is anonymized and aggregated. No personal
              information is collected or stored. Users can opt out of analytics
              tracking at any time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
