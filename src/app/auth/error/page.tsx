/**
 * Authentication Error Page
 * Displays detailed error information and recovery options
 */

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface ErrorInfo {
  type: string;
  message: string;
  description?: string;
  code?: string;
}

const ERROR_TYPES: Record<string, ErrorInfo> = {
  access_denied: {
    type: 'Access Denied',
    message: 'You denied access to your YNAB account',
    description: 'To use this application, you need to grant access to your YNAB data. This allows us to analyze your budget targets and spending patterns.',
  },
  invalid_request: {
    type: 'Invalid Request',
    message: 'The authentication request was invalid',
    description: 'There was a problem with the authentication request. This might be a temporary issue.',
  },
  unauthorized_client: {
    type: 'Unauthorized Client',
    message: 'This application is not authorized',
    description: 'The application is not properly configured for YNAB OAuth. Please contact support.',
  },
  unsupported_response_type: {
    type: 'Unsupported Response Type',
    message: 'The authentication method is not supported',
    description: 'The requested authentication method is not supported by YNAB.',
  },
  invalid_scope: {
    type: 'Invalid Scope',
    message: 'The requested permissions are invalid',
    description: 'The application requested invalid permissions from YNAB.',
  },
  server_error: {
    type: 'Server Error',
    message: 'YNAB server error occurred',
    description: 'There was a temporary problem with YNAB\'s servers. Please try again in a few minutes.',
  },
  temporarily_unavailable: {
    type: 'Service Unavailable',
    message: 'YNAB service is temporarily unavailable',
    description: 'YNAB\'s authentication service is temporarily unavailable. Please try again later.',
  },
  configuration_error: {
    type: 'Configuration Error',
    message: 'Application configuration error',
    description: 'The application is not properly configured. Please contact support.',
  },
  network_error: {
    type: 'Network Error',
    message: 'Network connection error',
    description: 'Unable to connect to YNAB. Please check your internet connection and try again.',
  },
  unknown: {
    type: 'Unknown Error',
    message: 'An unexpected error occurred',
    description: 'An unexpected error occurred during authentication. Please try again.',
  },
};

export default function AuthErrorPage() {
  const [errorInfo, setErrorInfo] = useState<ErrorInfo>(ERROR_TYPES.unknown || {
    type: 'Unknown Error',
    message: 'An unexpected error occurred',
    description: 'Please try again or contact support if the issue persists.'
  });
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Get error information from URL parameters
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const errorCode = searchParams.get('code');

    if (error && ERROR_TYPES[error]) {
      setErrorInfo({
        ...ERROR_TYPES[error],
        description: errorDescription || ERROR_TYPES[error].description,
        code: errorCode || undefined,
      });
    } else if (error) {
      setErrorInfo({
        type: 'Authentication Error',
        message: error.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        description: errorDescription || 'An authentication error occurred.',
        code: errorCode || undefined,
      });
    }

    // Set additional error details for debugging
    if (errorDescription) {
      setErrorDetails(errorDescription);
    }
  }, [searchParams]);

  const handleRetry = () => {
    router.push('/auth/signin');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  const getErrorIcon = () => {
    const error = searchParams.get('error');
    
    if (error === 'access_denied') {
      return (
        <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      );
    }
    
    return (
      <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    );
  };

  const getErrorColor = () => {
    const error = searchParams.get('error');
    return error === 'access_denied' ? 'yellow' : 'red';
  };

  const errorColor = getErrorColor();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className={`mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-${errorColor}-100 mb-4`}>
            {getErrorIcon()}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {errorInfo.type}
          </h2>
          
          <p className="text-gray-600 mb-4">
            {errorInfo.message}
          </p>
          
          {errorInfo.description && (
            <p className="text-sm text-gray-500 mb-6">
              {errorInfo.description}
            </p>
          )}
        </div>

        {/* Error Details */}
        {errorDetails && process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
            <h3 className="text-sm font-medium text-gray-800 mb-2">Error Details (Development)</h3>
            <p className="text-xs text-gray-600 font-mono break-all">
              {errorDetails}
            </p>
            {errorInfo.code && (
              <p className="text-xs text-gray-600 mt-2">
                Error Code: {errorInfo.code}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-4">
          <button
            onClick={handleRetry}
            className="w-full bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
          >
            Try Again
          </button>
          
          <button
            onClick={handleGoHome}
            className="w-full bg-gray-200 text-gray-800 px-4 py-3 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200 font-medium"
          >
            Go to Home Page
          </button>
        </div>

        {/* Help Information */}
        <div className={`bg-${errorColor}-50 border border-${errorColor}-200 rounded-md p-4`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className={`h-5 w-5 text-${errorColor}-400`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium text-${errorColor}-800`}>
                Need Help?
              </h3>
              <div className={`mt-1 text-sm text-${errorColor}-700`}>
                <p>If you continue to experience issues:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Make sure you have an active YNAB account</li>
                  <li>• Check that you have at least one budget in YNAB</li>
                  <li>• Ensure your browser allows cookies and JavaScript</li>
                  <li>• Try using a different browser or incognito mode</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="text-center text-sm text-gray-500">
          <p>
            Still having trouble? Contact support with the error details above.
          </p>
        </div>
      </div>
    </div>
  );
}
