/**
 * OAuth Callback Page for Implicit Grant Flow
 * Handles OAuth callback and token extraction from URL fragment
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImplicitOAuthClient } from '@/lib/auth/implicit-oauth-client';
import { SecureTokenStorage } from '@/lib/auth/secure-token-storage';
import { TokenValidator } from '@/lib/auth/token-validator';

type CallbackStatus = 'processing' | 'success' | 'error';

export default function CallbackPage() {
  const [status, setStatus] = useState<CallbackStatus>('processing');
  const [error, setError] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Handle OAuth callback
        const result = ImplicitOAuthClient.handleCallback();

        if (result.success && result.accessToken) {
          // Store token securely
          SecureTokenStorage.storeToken(
            result.accessToken,
            result.expiresIn || 7200 // Default to 2 hours
          );

          // Start token validation
          TokenValidator.startValidation({
            checkInterval: 60000, // 1 minute
            warningThreshold: 5 * 60 * 1000, // 5 minutes
            autoRedirectThreshold: 1 * 60 * 1000, // 1 minute
            enableNotifications: false,
          });

          setStatus('success');

          // Start countdown for redirect
          const countdown = setInterval(() => {
            setRedirectCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdown);
                router.push('/');
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          setStatus('error');
          setError(result.error || 'Authentication failed');
        }
      } catch (error) {
        console.error('Callback handling error:', error);
        setStatus('error');
        setError('An unexpected error occurred during authentication');
      }
    };

    // Small delay to ensure URL fragment is available
    const timer = setTimeout(handleCallback, 100);

    return () => clearTimeout(timer);
  }, [router]);

  const handleManualRedirect = () => {
    router.push('/');
  };

  const handleRetry = () => {
    router.push('/auth/signin');
  };

  if (status === 'processing') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 animate-spin text-blue-600"
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
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Completing Authentication
          </h2>
          <p className="text-gray-600">
            Processing your YNAB authentication...
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-auto max-w-md px-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Authentication Failed
          </h2>
          <p className="mb-6 text-gray-600">
            {error || 'An error occurred during authentication'}
          </p>

          <div className="space-y-3">
            <button
              onClick={handleRetry}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try Again
            </button>

            <div className="text-sm text-gray-500">
              <p>If the problem persists, please check:</p>
              <ul className="mt-2 space-y-1 text-left">
                <li>• Your YNAB account is active</li>
                <li>• You have at least one budget in YNAB</li>
                <li>• Your browser allows cookies and JavaScript</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="mx-auto max-w-md px-4 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-6 w-6 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-gray-900">
          Authentication Successful!
        </h2>

        <p className="mb-6 text-gray-600">
          You have successfully connected your YNAB account. Redirecting to your
          dashboard in {redirectCountdown} second
          {redirectCountdown !== 1 ? 's' : ''}...
        </p>

        <div className="space-y-3">
          <button
            onClick={handleManualRedirect}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go to Dashboard Now
          </button>

          <div className="rounded-md border border-green-200 bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Secure Connection Established
                </h3>
                <p className="mt-1 text-sm text-green-700">
                  Your YNAB data is now accessible for analysis. Your session
                  will remain active for up to 2 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
