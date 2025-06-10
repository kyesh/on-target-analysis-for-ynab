'use client';

import { useEffect, useState } from 'react';
import { ynabClient } from '@/lib/ynab-client';
import { validateEnvironment } from '@/lib/config';
import { SecureErrorHandler } from '@/lib/errors';

export default function HomePage() {
  const [isConfigValid, setIsConfigValid] = useState<boolean | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate configuration on mount
    const configValidation = validateEnvironment();
    setIsConfigValid(configValidation.valid);
    
    if (!configValidation.valid) {
      setError(configValidation.error || 'Configuration validation failed');
      setConnectionStatus('error');
      return;
    }

    // Test YNAB API connection
    const testConnection = async () => {
      try {
        const isConnected = await ynabClient.validateConnection();
        setConnectionStatus(isConnected ? 'connected' : 'error');
        
        if (!isConnected) {
          setError('Unable to connect to YNAB API. Please check your access token.');
        }
      } catch (err) {
        setConnectionStatus('error');
        setError(SecureErrorHandler.getUserFriendlyMessage(err as Error));
      }
    };

    testConnection();
  }, []);

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
                {connectionStatus === 'connected' && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">API Rate Limit</span>
                    <span className="text-sm text-gray-600">
                      {ynabClient.getRateLimitStatus().remaining} / {ynabClient.getRateLimitStatus().limit} remaining
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
                          <p>Your YNAB connection is working. The dashboard will be available soon!</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        {!isConfigValid && (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Setup Instructions</h2>
              </div>
              <div className="card-body">
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Get your YNAB Personal Access Token from <a href="https://app.ynab.com/settings/developer" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">YNAB Developer Settings</a></li>
                  <li>Create a <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">.env.local</code> file in the project root</li>
                  <li>Add your token: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">YNAB_ACCESS_TOKEN=your-token-here</code></li>
                  <li>Restart the development server</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
