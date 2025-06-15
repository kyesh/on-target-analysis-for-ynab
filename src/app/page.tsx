'use client';

import { useEffect, useState } from 'react';
import BudgetSelector from '@/components/BudgetSelector';
import MonthSelector from '@/components/MonthSelector';
import AnalysisDashboard from '@/components/AnalysisDashboard';
import ExportButton from '@/components/ExportButton';
import { DashboardSummary } from '@/types/analysis';
import { YNABBudget } from '@/types/ynab';

export default function HomePage() {
  const [isConfigValid, setIsConfigValid] = useState<boolean | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);
  const [missingVars, setMissingVars] = useState<string[]>([]);
  const [rateLimitStatus, setRateLimitStatus] = useState<any>(null);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedBudget, setSelectedBudget] = useState<YNABBudget | null>(null);
  const [analysis, setAnalysis] = useState<MonthlyAnalysisResponse | null>(null);

  useEffect(() => {
    // Check configuration via API route (server-side)
    const checkConfiguration = async () => {
      try {
        const response = await fetch('/api/config');
        const configStatus = await response.json();

        setIsConfigValid(configStatus.valid);

        if (!configStatus.valid) {
          setError(configStatus.error || 'Configuration validation failed');
          setMissingVars(configStatus.missingVars || []);
          setConnectionStatus('error');
          return;
        }

        // If configuration is valid, test YNAB API connection
        const testConnection = async () => {
          try {
            // Test connection via API route to avoid client-side token exposure
            const connectionResponse = await fetch('/api/ynab/test-connection');
            const connectionResult = await connectionResponse.json();

            setConnectionStatus(connectionResult.connected ? 'connected' : 'error');

            if (connectionResult.connected) {
              setRateLimitStatus(connectionResult.rateLimit);
            } else {
              setError(connectionResult.error || 'Unable to connect to YNAB API. Please check your access token.');
            }
          } catch (err) {
            setConnectionStatus('error');
            setError('Failed to test YNAB API connection');
          }
        };

        await testConnection();
      } catch (err) {
        setConnectionStatus('error');
        setError('Failed to check configuration');
        setIsConfigValid(false);
      }
    };

    checkConfiguration();
  }, []);

  useEffect(() => {
    if (selectedBudgetId) {
      fetchBudgetDetails();
    }
  }, [selectedBudgetId]);

  const fetchBudgetDetails = async () => {
    try {
      const response = await fetch('/api/budgets');
      const data = await response.json();

      if (data.success) {
        const budget = data.data.budgets.find((b: YNABBudget) => b.id === selectedBudgetId);
        setSelectedBudget(budget || null);
      }
    } catch (error) {
      console.error('Failed to fetch budget details:', error);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'checking':
        return 'text-warning-600';
      case 'connected':
        return 'text-success-600';
      case 'error':
        return 'text-danger-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'checking':
        return 'Checking connection...';
      case 'connected':
        return 'Connected to YNAB API';
      case 'error':
        return 'Connection failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            YNAB Off-Target Assignment Analysis
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Analyze your budget target alignment and identify spending patterns that don't align with your financial goals.
          </p>
        </div>

        {/* Status Card */}
        <div className="max-w-2xl mx-auto">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {/* Configuration Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Configuration</span>
                  <span className={`text-sm font-medium ${isConfigValid ? 'text-success-600' : 'text-danger-600'}`}>
                    {isConfigValid ? '✓ Valid' : '✗ Invalid'}
                  </span>
                </div>

                {/* Connection Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">YNAB API Connection</span>
                  <div className="flex items-center space-x-2">
                    {connectionStatus === 'checking' && (
                      <div className="loading-spinner h-4 w-4"></div>
                    )}
                    <span className={`text-sm font-medium ${getStatusColor()}`}>
                      {getStatusText()}
                    </span>
                  </div>
                </div>

                {/* Rate Limit Status */}
                {connectionStatus === 'connected' && rateLimitStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">API Rate Limit</span>
                    <span className="text-sm text-gray-600">
                      {rateLimitStatus.remaining} / {rateLimitStatus.limit} remaining
                    </span>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="mt-4 p-4 bg-danger-50 border border-danger-200 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-danger-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-danger-800">Configuration Error</h3>
                        <div className="mt-2 text-sm text-danger-700">
                          <p>{error}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success State */}
                {connectionStatus === 'connected' && (
                  <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-success-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-success-800">Ready to Analyze</h3>
                        <div className="mt-2 text-sm text-success-700">
                          <p>Your YNAB connection is working. Select a budget below to start analyzing!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Dashboard */}
        {connectionStatus === 'connected' && (
          <div className="max-w-7xl mx-auto mt-8 space-y-6">
            {/* Controls */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Budget Analysis</h2>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <BudgetSelector
                    onBudgetSelect={setSelectedBudgetId}
                    selectedBudgetId={selectedBudgetId}
                  />
                  <MonthSelector
                    onMonthSelect={setSelectedMonth}
                    selectedMonth={selectedMonth}
                    budgetFirstMonth={selectedBudget?.first_month}
                    budgetLastMonth={selectedBudget?.last_month}
                  />
                </div>

                {analysis && (
                  <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
                    <ExportButton
                      analysis={analysis}
                      budgetName={selectedBudget?.name}
                      month={selectedMonth}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Results */}
            <AnalysisDashboard
              budgetId={selectedBudgetId}
              month={selectedMonth}
            />
          </div>
        )}

        {/* Setup Instructions */}
        {!isConfigValid && (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Setup Instructions</h2>
              </div>
              <div className="card-body">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Missing Configuration:</h3>
                  {missingVars.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-danger-700 mb-4">
                      {missingVars.map(varName => (
                        <li key={varName}>{varName}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <h3 className="text-sm font-medium text-gray-900 mb-2">OAuth Setup Steps:</h3>
                <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700">
                  <li>
                    <strong>Register YNAB OAuth Application:</strong>
                    <br />
                    Visit <a href="https://app.ynab.com/settings/developer" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">YNAB Developer Settings</a> and create a new OAuth application
                  </li>
                  <li>
                    <strong>Configure OAuth Redirect URI:</strong>
                    <br />
                    Set redirect URI to: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">http://localhost:3000/auth/callback</code>
                  </li>
                  <li>
                    <strong>Update the .env.local file:</strong>
                    <br />
                    Add your OAuth Client ID: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">NEXT_PUBLIC_YNAB_CLIENT_ID=your-client-id</code>
                  </li>
                  <li>
                    <strong>Restart the development server:</strong>
                    <br />
                    Stop the current server (Ctrl+C) and run <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">npm run dev</code> again
                  </li>
                </ol>

                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <strong>🔐 Secure OAuth 2.0:</strong> No Personal Access Tokens needed! OAuth provides secure, user-controlled access to your YNAB data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
