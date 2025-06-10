/**
 * YNAB API Client
 * Based on confirmed API research findings - all endpoints and data structures verified
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { config } from './config';
import { globalRateLimiter } from './rate-limiter';
import { SecureErrorHandler, ErrorType, AppError } from './errors';
import {
  YNABBudgetsResponse,
  YNABCategoriesResponse,
  YNABMonthResponse,
  YNABCategoryResponse,
  YNABUserResponse,
  YNABErrorResponse
} from '@/types/ynab';

export class YNABClient {
  private client: AxiosInstance;
  private readonly baseURL: string;
  private readonly accessToken: string;

  constructor() {
    this.baseURL = config.API_BASE_URL;
    this.accessToken = config.YNAB_ACCESS_TOKEN;

    // Create axios instance with secure defaults
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 second timeout
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'YNAB-Off-Target-Analysis/1.0'
      }
    });

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(
      (config) => {
        // Enforce rate limiting before making request
        const endpoint = config.url || '';
        globalRateLimiter.enforceLimit('ynab-api', endpoint);
        
        // Log request in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`YNAB API Request: ${config.method?.toUpperCase()} ${endpoint}`);
        }
        
        return config;
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
          console.log(`YNAB API Response: ${response.status} ${response.config.url}`);
        }
        
        return response;
      },
      (error) => {
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
      SecureErrorHandler.logError(error as Error, 'CONNECTION_VALIDATION');
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
   * CONFIRMED: All goal/target fields available
   */
  async getCategories(budgetId: string): Promise<YNABCategoriesResponse> {
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
   * CONFIRMED: Historical target data fully accessible
   */
  async getMonth(budgetId: string, month: string): Promise<YNABMonthResponse> {
    try {
      // Validate month format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(month)) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Invalid month format: ${month}`,
          'Month must be in YYYY-MM-DD format (e.g., 2024-01-01)',
          400
        );
      }

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
   * CONFIRMED: Category-level historical analysis supported
   */
  async getCategory(budgetId: string, month: string, categoryId: string): Promise<YNABCategoryResponse> {
    try {
      // Validate month format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(month)) {
        throw new AppError(
          ErrorType.VALIDATION_ERROR,
          `Invalid month format: ${month}`,
          'Month must be in YYYY-MM-DD format (e.g., 2024-01-01)',
          400
        );
      }

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
   * Check if endpoint is valid (security measure)
   */
  private isValidEndpoint(endpoint: string): boolean {
    const allowedEndpoints = [
      '/user',
      '/budgets',
      /^\/budgets\/[^/]+$/,
      /^\/budgets\/[^/]+\/categories$/,
      /^\/budgets\/[^/]+\/months$/,
      /^\/budgets\/[^/]+\/months\/\d{4}-\d{2}-\d{2}$/,
      /^\/budgets\/[^/]+\/months\/\d{4}-\d{2}-\d{2}\/categories\/[^/]+$/
    ];

    return allowedEndpoints.some(pattern => 
      typeof pattern === 'string' ? pattern === endpoint : pattern.test(endpoint)
    );
  }

  /**
   * Make a custom request (with validation)
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
}

// Global YNAB client instance
export const ynabClient = new YNABClient();
