/**
 * YNAB OAuth Client for Implicit Grant Flow
 * Handles YNAB API interactions with client-provided OAuth tokens
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { globalRateLimiter } from '@/lib/rate-limiter';
import { SecureErrorHandler, ErrorType, AppError } from '@/lib/errors';
import {
  YNABBudgetsResponse,
  YNABCategoriesResponse,
  YNABMonthResponse,
  YNABCategoryResponse,
  YNABUserResponse,
  YNABErrorResponse
} from '@/types/ynab';

export interface YNABClientConfig {
  timeout?: number;
  baseURL?: string;
  userAgent?: string;
}

export class YNABOAuthClient {
  private client: AxiosInstance;
  private readonly baseURL: string;
  private readonly accessToken: string;

  constructor(accessToken: string, config: YNABClientConfig = {}) {
    if (!accessToken) {
      throw new AppError(
        ErrorType.AUTHENTICATION_ERROR,
        'Access token is required',
        'No access token provided for YNAB API client',
        401
      );
    }

    this.accessToken = accessToken;
    this.baseURL = config.baseURL || 'https://api.ynab.com/v1';

    // Create axios instance with secure defaults
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: config.timeout || 30000, // 30 second timeout
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': config.userAgent || 'YNAB-Off-Target-Analysis/1.0'
      }
    });

    // Add request interceptor for rate limiting and logging
    this.client.interceptors.request.use(
      (requestConfig) => {
        // Enforce rate limiting before making request
        const endpoint = requestConfig.url || '';
        globalRateLimiter.enforceLimit('ynab-api', endpoint);
        
        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`YNAB OAuth API Request: ${requestConfig.method?.toUpperCase()} ${endpoint}`);
        }
        
        return requestConfig;
      },
      (error) => {
        return Promise.reject(SecureErrorHandler.handleAPIError(error, 'REQUEST_INTERCEPTOR'));
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        // Log successful response in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`YNAB OAuth API Response: ${response.status} ${response.config.url}`);
        }
        
        return response;
      },
      (error) => {
        // Handle OAuth-specific errors
        if (error.response?.status === 401) {
          throw new AppError(
            ErrorType.AUTHENTICATION_ERROR,
            'OAuth token invalid or expired',
            'Your session has expired. Please sign in again.',
            401
          );
        }
        
        return Promise.reject(SecureErrorHandler.handleAPIError(error, 'RESPONSE_INTERCEPTOR'));
      }
    );
  }

  /**
   * Validate API connection and token
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.getUser();
      return true;
    } catch (error) {
      console.warn('YNAB OAuth connection validation failed:', error);
      return false;
    }
  }

  /**
   * Get user information (for token validation)
   */
  async getUser(): Promise<YNABUserResponse> {
    try {
      const response: AxiosResponse<YNABUserResponse> = await this.client.get('/user');
      return response.data;
    } catch (error) {
      throw SecureErrorHandler.handleAPIError(error, 'GET_USER');
    }
  }

  /**
   * Get all budgets
   */
  async getBudgets(): Promise<YNABBudgetsResponse> {
    try {
      const response: AxiosResponse<YNABBudgetsResponse> = await this.client.get('/budgets');
      return response.data;
    } catch (error) {
      throw SecureErrorHandler.handleAPIError(error, 'GET_BUDGETS');
    }
  }

  /**
   * Get categories for a budget (current month)
   */
  async getCategories(budgetId: string): Promise<YNABCategoriesResponse> {
    this.validateBudgetId(budgetId);
    
    try {
      const response: AxiosResponse<YNABCategoriesResponse> = await this.client.get(
        `/budgets/${budgetId}/categories`
      );
      return response.data;
    } catch (error) {
      throw SecureErrorHandler.handleAPIError(error, 'GET_CATEGORIES');
    }
  }

  /**
   * Get month data with categories for specific month
   */
  async getMonth(budgetId: string, month: string): Promise<YNABMonthResponse> {
    this.validateBudgetId(budgetId);
    this.validateMonthFormat(month);
    
    try {
      const response: AxiosResponse<YNABMonthResponse> = await this.client.get(
        `/budgets/${budgetId}/months/${month}`
      );
      return response.data;
    } catch (error) {
      throw SecureErrorHandler.handleAPIError(error, 'GET_MONTH');
    }
  }

  /**
   * Get single category for specific month
   */
  async getCategory(budgetId: string, month: string, categoryId: string): Promise<YNABCategoryResponse> {
    this.validateBudgetId(budgetId);
    this.validateMonthFormat(month);
    this.validateCategoryId(categoryId);
    
    try {
      const response: AxiosResponse<YNABCategoryResponse> = await this.client.get(
        `/budgets/${budgetId}/months/${month}/categories/${categoryId}`
      );
      return response.data;
    } catch (error) {
      throw SecureErrorHandler.handleAPIError(error, 'GET_CATEGORY');
    }
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus() {
    return globalRateLimiter.getStatus('ynab-api');
  }

  /**
   * Make a custom request with validation
   */
  async makeRequest<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'): Promise<T> {
    if (!this.isValidEndpoint(endpoint)) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        `Invalid endpoint: ${endpoint}`,
        'Invalid API endpoint requested',
        400
      );
    }

    try {
      const response: AxiosResponse<T> = await this.client.request({
        url: endpoint,
        method
      });
      return response.data;
    } catch (error) {
      throw SecureErrorHandler.handleAPIError(error, 'CUSTOM_REQUEST');
    }
  }

  /**
   * Validate budget ID format
   */
  private validateBudgetId(budgetId: string): void {
    if (!budgetId || typeof budgetId !== 'string') {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid budget ID',
        'Budget ID must be a non-empty string',
        400
      );
    }

    // YNAB budget IDs are UUIDs
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(budgetId)) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid budget ID format',
        'Budget ID must be a valid UUID',
        400
      );
    }
  }

  /**
   * Validate month format
   */
  private validateMonthFormat(month: string): void {
    if (!month || typeof month !== 'string') {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid month',
        'Month must be a non-empty string',
        400
      );
    }

    // YNAB expects YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(month)) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        `Invalid month format: ${month}`,
        'Month must be in YYYY-MM-DD format (e.g., 2024-01-01)',
        400
      );
    }

    // Validate it's a valid date
    const date = new Date(month);
    if (isNaN(date.getTime())) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        `Invalid month date: ${month}`,
        'Month must be a valid date',
        400
      );
    }
  }

  /**
   * Validate category ID format
   */
  private validateCategoryId(categoryId: string): void {
    if (!categoryId || typeof categoryId !== 'string') {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid category ID',
        'Category ID must be a non-empty string',
        400
      );
    }

    // YNAB category IDs are UUIDs
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(categoryId)) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid category ID format',
        'Category ID must be a valid UUID',
        400
      );
    }
  }

  /**
   * Check if endpoint is valid (security measure)
   */
  private isValidEndpoint(endpoint: string): boolean {
    const allowedEndpoints = [
      '/user',
      '/budgets',
      /^\/budgets\/[0-9a-f-]{36}$/i,
      /^\/budgets\/[0-9a-f-]{36}\/categories$/i,
      /^\/budgets\/[0-9a-f-]{36}\/months$/i,
      /^\/budgets\/[0-9a-f-]{36}\/months\/\d{4}-\d{2}-\d{2}$/i,
      /^\/budgets\/[0-9a-f-]{36}\/months\/\d{4}-\d{2}-\d{2}\/categories\/[0-9a-f-]{36}$/i
    ];

    return allowedEndpoints.some(pattern => 
      typeof pattern === 'string' ? pattern === endpoint : pattern.test(endpoint)
    );
  }

  /**
   * Get client information for debugging
   */
  getClientInfo(): {
    baseURL: string;
    hasToken: boolean;
    tokenPreview: string;
    rateLimitStatus: any;
  } {
    return {
      baseURL: this.baseURL,
      hasToken: !!this.accessToken,
      tokenPreview: this.accessToken ? 
        `${this.accessToken.substring(0, 8)}...${this.accessToken.substring(this.accessToken.length - 8)}` : 
        'No token',
      rateLimitStatus: this.getRateLimitStatus()
    };
  }
}
