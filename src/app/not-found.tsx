/**
 * Custom 404 Not Found Page
 * Provides user-friendly error handling with auto-redirect and manual navigation
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Footer } from '@/components/Footer';

export default function NotFound() {
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const router = useRouter();

  useEffect(() => {
    // Start countdown for auto-redirect
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

    return () => clearInterval(countdown);
  }, [router]);

  const handleManualRedirect = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex flex-col">
      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-md text-center">
          {/* 404 Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <svg
              className="h-8 w-8 text-orange-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0118 12a8 8 0 10-8 8 7.962 7.962 0 014.291-1.709L16 16.5z"
              />
            </svg>
          </div>

          {/* Error Message */}
          <h1 className="mb-2 text-4xl font-bold text-gray-900">404</h1>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            Page Not Found
          </h2>
          <p className="mb-6 text-gray-600">
            Sorry, we couldn't find the page you're looking for. The page may have been moved, deleted, or the URL might be incorrect.
          </p>

          {/* Auto-redirect Notice */}
          <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center">
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
                  Auto-Redirect Active
                </h3>
                <p className="mt-1 text-sm text-blue-700">
                  Redirecting to home in {redirectCountdown} second
                  {redirectCountdown !== 1 ? 's' : ''}...
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleManualRedirect}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go to Dashboard Now
            </button>

            <button
              onClick={() => window.history.back()}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Go Back
            </button>
          </div>

          {/* Help Information */}
          <div className="mt-8 text-sm text-gray-500">
            <p className="mb-2">If you continue to experience issues:</p>
            <ul className="space-y-1 text-left">
              <li>• Check the URL for typos</li>
              <li>• Try refreshing the page</li>
              <li>• Clear your browser cache</li>
              <li>• Contact support if the problem persists</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer with YNAB Disclaimer */}
      <Footer />
    </div>
  );
}
