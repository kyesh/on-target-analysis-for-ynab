/**
 * Sign-In Page for OAuth 2.0 Implicit Grant Flow
 * Handles user authentication initiation
 */

'use client';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ImplicitOAuthClient } from '@/lib/auth/implicit-oauth-client';
import { SecureTokenStorage } from '@/lib/auth/secure-token-storage';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user is already authenticated
    if (SecureTokenStorage.isTokenValid()) {
      window.location.href = '/dashboard';
      return;
    }

    // Check for error from callback
    const callbackError = searchParams.get('error');
    if (callbackError) {
      setError(decodeURIComponent(callbackError));
    }

    // Validate OAuth configuration
    const validation = ImplicitOAuthClient.validateConfiguration();
    if (!validation.valid) {
      setConfigError(validation.errors.join(', '));
    }
  }, [searchParams]);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validate configuration before proceeding
      const validation = ImplicitOAuthClient.validateConfiguration();
      if (!validation.valid) {
        setConfigError(validation.errors.join(', '));
        setIsLoading(false);
        return;
      }

      // Initiate OAuth flow
      ImplicitOAuthClient.initiateAuth();
    } catch (error) {
      console.error('Sign-in error:', error);
      setError('Failed to initiate authentication. Please try again.');
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setConfigError(null);
    handleSignIn();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to YNAB Analysis
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect your YNAB account to analyze your budget targets and
            spending patterns
          </p>
        </div>

        {/* Error Messages */}
        {configError && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Configuration Error
                </h3>
                <p className="mt-1 text-sm text-red-700">{configError}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Authentication Error
                </h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sign In Form */}
        <div className="mt-8 space-y-6">
          <div>
            <button
              onClick={error || configError ? handleRetry : handleSignIn}
              disabled={isLoading || !!configError}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <svg
                    className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Connecting...
                </>
              ) : error || configError ? (
                'Try Again'
              ) : (
                'Connect with YNAB'
              )}
            </button>
          </div>

          {/* Information */}
          <div className="space-y-2 text-center text-xs text-gray-500">
            <p>This app only requests read-only access to your YNAB data.</p>
            <p>
              You can revoke access at any time in your YNAB account settings.
            </p>
            <p>
              Your data is processed securely and never stored on our servers.
            </p>
          </div>

          {/* Security Information */}
          <div className="rounded-md border border-blue-200 bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Secure Authentication
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  We use OAuth 2.0 for secure authentication. Your YNAB
                  credentials are never shared with us.
                </p>
              </div>
            </div>
          </div>

          {/* Development Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Development Mode
                  </h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Running in development mode. OAuth redirects to localhost.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
