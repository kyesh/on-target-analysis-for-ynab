/**
 * Client-side API helper for OAuth 2.0 Implicit Grant Flow
 * Handles authenticated API requests with automatic token management
 */

import { SecureTokenStorage } from '@/lib/auth/secure-token-storage';
import { SecureErrorHandler, AppError, ErrorType } from '@/lib/errors';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    type: string;
    message: string;
    statusCode: number;
  };
  metadata?: {
    generatedAt: string;
    authMethod: string;
    rateLimitStatus?: any;
  };
}

export interface ApiRequestOptions extends RequestInit {
  requireAuth?: boolean;
  timeout?: number;
}

export class ApiClient {
  private static readonly DEFAULT_TIMEOUT = 30000; // 30 seconds
  private static readonly BASE_URL = typeof window !== 'undefined' ? window.location.origin : '';

  /**
   * Make an authenticated API request
   */
  static async request<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      requireAuth = true,
      timeout = this.DEFAULT_TIMEOUT,
      headers = {},
      ...fetchOptions
    } = options;

    try {
      // Prepare headers
      const requestHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...headers,
      };

      // Add authentication if required
      if (requireAuth) {
        const token = SecureTokenStorage.getToken();
        if (!token) {
          throw new AppError(
            ErrorType.AUTHENTICATION_ERROR,
            'No authentication token available',
            'Please sign in to continue',
            401
          );
        }

        if (!SecureTokenStorage.isTokenValid()) {
          throw new AppError(
            ErrorType.AUTHENTICATION_ERROR,
            'Authentication token has expired',
            'Your session has expired. Please sign in again.',
            401
          );
        }

        requestHeaders['Authorization'] = `Bearer ${token}`;
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Make request
      const response = await fetch(`${this.BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers: requestHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Parse response
      const responseData = await response.json();

      // Handle non-2xx responses
      if (!response.ok) {
        throw new AppError(
          responseData.error?.type || ErrorType.API_ERROR,
          responseData.error?.message || 'API request failed',
          responseData.error?.message || `Request failed with status ${response.status}`,
          response.status
        );
      }

      return responseData as ApiResponse<T>;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AppError(
          ErrorType.NETWORK_ERROR,
          'Network connection failed',
          'Unable to connect to the server. Please check your internet connection.',
          0
        );
      }

      // Handle timeout errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new AppError(
          ErrorType.TIMEOUT_ERROR,
          'Request timeout',
          'The request took too long to complete. Please try again.',
          408
        );
      }

      // Handle other errors
      throw SecureErrorHandler.handleAPIError(error, 'API_CLIENT');
    }
  }

  /**
   * GET request
   */
  static async get<T = any>(
    endpoint: string,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  static async post<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  static async put<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  static async delete<T = any>(
    endpoint: string,
    options: Omit<ApiRequestOptions, 'method' | 'body'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return SecureTokenStorage.isTokenValid();
  }

  /**
   * Get authentication status
   */
  static getAuthStatus(): {
    isAuthenticated: boolean;
    tokenExpiration: Date | null;
    timeUntilExpiry: number | null;
  } {
    return {
      isAuthenticated: this.isAuthenticated(),
      tokenExpiration: SecureTokenStorage.getTokenExpiration(),
      timeUntilExpiry: SecureTokenStorage.getTimeUntilExpiration(),
    };
  }

  /**
   * Validate API endpoint
   */
  private static validateEndpoint(endpoint: string): boolean {
    // Ensure endpoint starts with /
    if (!endpoint.startsWith('/')) {
      return false;
    }

    // Check for allowed API endpoints
    const allowedPrefixes = [
      '/api/budgets',
      '/api/analysis',
      '/api/auth',
      '/api/health',
    ];

    return allowedPrefixes.some(prefix => endpoint.startsWith(prefix));
  }

  /**
   * Make a safe API request with endpoint validation
   */
  static async safeRequest<T = any>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    if (!this.validateEndpoint(endpoint)) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid API endpoint',
        `Endpoint ${endpoint} is not allowed`,
        400
      );
    }

    return this.request<T>(endpoint, options);
  }
}

// Convenience functions for common API calls
export const budgetApi = {
  getBudgets: () => ApiClient.get('/api/budgets'),
  
  getMonthlyAnalysis: (budgetId?: string, month?: string) => {
    const params = new URLSearchParams();
    if (budgetId) params.set('budgetId', budgetId);
    if (month) params.set('month', month);
    
    const query = params.toString();
    return ApiClient.get(`/api/analysis/monthly${query ? `?${query}` : ''}`);
  },
  
  postMonthlyAnalysis: (data: { budgetId?: string; month?: string; config?: any }) =>
    ApiClient.post('/api/analysis/monthly', data),
};

// Error handling utilities
export const handleApiError = (error: unknown): string => {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

export const isAuthenticationError = (error: unknown): boolean => {
  return error instanceof AppError && error.type === ErrorType.AUTHENTICATION_ERROR;
};
