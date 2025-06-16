'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthenticationErrorProps {
  error: string;
  onRetry?: () => void;
  showAutoRedirect?: boolean;
  redirectDelay?: number;
}

export function AuthenticationError({
  error,
  onRetry,
  showAutoRedirect = true,
  redirectDelay = 5,
}: AuthenticationErrorProps) {
  const [countdown, setCountdown] = useState(redirectDelay);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const router = useRouter();

  // Check if this is an authentication-related error
  const isAuthError = error.toLowerCase().includes('authentication') || 
                     error.toLowerCase().includes('token') ||
                     error.toLowerCase().includes('unauthorized') ||
                     error.toLowerCase().includes('sign in');

  useEffect(() => {
    if (!isAuthError || !showAutoRedirect) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setIsRedirecting(true);
          router.push('/auth/signin');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAuthError, showAutoRedirect, router]);

  const handleSignInClick = () => {
    setIsRedirecting(true);
    router.push('/auth/signin');
  };

  const handleRetryClick = () => {
    if (onRetry) {
      onRetry();
    }
  };

  // Get user-friendly error message
  const getUserFriendlyMessage = (errorMessage: string) => {
    if (errorMessage.toLowerCase().includes('no authentication token')) {
      return 'Please connect your YNAB account to view budget analysis';
    }
    if (errorMessage.toLowerCase().includes('token has expired')) {
      return 'Your session has expired. Please sign in again to continue';
    }
    if (errorMessage.toLowerCase().includes('unauthorized')) {
      return 'Authentication required. Please connect your YNAB account';
    }
    return errorMessage;
  };

  const friendlyMessage = getUserFriendlyMessage(error);

  return (
    <div className="rounded-md border border-red-200 bg-red-50 p-4">
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
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            {isAuthError ? 'Authentication Required' : 'Analysis Error'}
          </h3>
          <p className="mt-1 text-sm text-red-700">{friendlyMessage}</p>
          
          {/* Auto-redirect countdown for auth errors */}
          {isAuthError && showAutoRedirect && countdown > 0 && !isRedirecting && (
            <p className="mt-2 text-sm text-red-600">
              Redirecting to sign-in page in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap gap-2">
            {isAuthError && (
              <button
                onClick={handleSignInClick}
                disabled={isRedirecting}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                {isRedirecting ? 'Redirecting...' : 'Connect to YNAB'}
              </button>
            )}
            
            {onRetry && (
              <button
                onClick={handleRetryClick}
                className="inline-flex items-center rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-800 transition-colors duration-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <svg
                  className="-ml-1 mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Retry
              </button>
            )}
          </div>

          {/* Help text for authentication errors */}
          {isAuthError && (
            <div className="mt-3 text-xs text-red-600">
              <p>
                <strong>Need help?</strong> Make sure you have an active YNAB account with at least one budget.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
