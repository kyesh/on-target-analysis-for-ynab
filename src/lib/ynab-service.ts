/**
 * YNAB Data Service Layer
 * Handles YNAB API interactions with caching and error handling
 */

import { ynabClient } from './ynab-client';
import { 
  YNABBudget, 
  YNABMonth, 
  YNABCategoryGroup,
  YNABBudgetsResponse,
  YNABMonthResponse,
  YNABCategoriesResponse 
} from '@/types/ynab';
import { SecureErrorHandler, AppError, ErrorType } from './errors';
import { validateMonthFormat } from './data-processing';

/**
 * Simple in-memory cache with TTL
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instance
const cache = new SimpleCache();

/**
 * YNAB Service class with caching and error handling
 */
export class YNABService {
  /**
   * Get all budgets with caching
   */
  static async getBudgets(): Promise<YNABBudget[]> {
    const cacheKey = 'budgets';
    const cached = cache.get<YNABBudget[]>(cacheKey);
    
    if (cached) {
      console.log('📦 Cache hit: budgets');
      return cached;
    }

    try {
      console.log('🌐 API call: getBudgets');
      const response: YNABBudgetsResponse = await ynabClient.getBudgets();
      const budgets = response.data.budgets;
      
      // Cache for 10 minutes (budgets don't change often)
      cache.set(cacheKey, budgets, 10 * 60 * 1000);
      
      return budgets;
    } catch (error) {
      throw SecureErrorHandler.handleAPIError(error, 'GET_BUDGETS');
    }
  }

  /**
   * Get default budget (first budget if no default specified)
   */
  static async getDefaultBudget(): Promise<YNABBudget> {
    const budgets = await this.getBudgets();
    
    if (budgets.length === 0) {
      throw new AppError(
        ErrorType.NOT_FOUND,
        'No budgets found',
        'No YNAB budgets found in your account. Please create a budget in YNAB first.',
        404
      );
    }

    // Return first budget as default
    return budgets[0];
  }

  /**
   * Get month data with caching
   */
  static async getMonth(budgetId: string, month: string): Promise<YNABMonth> {
    if (!validateMonthFormat(month)) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        `Invalid month format: ${month}`,
        'Month must be in YYYY-MM-DD format (e.g., 2024-01-01)',
        400
      );
    }

    const cacheKey = `month:${budgetId}:${month}`;
    const cached = cache.get<YNABMonth>(cacheKey);
    
    if (cached) {
      console.log(`📦 Cache hit: month ${month}`);
      return cached;
    }

    try {
      console.log(`🌐 API call: getMonth ${month}`);
      const response: YNABMonthResponse = await ynabClient.getMonth(budgetId, month);
      const monthData = response.data.month;
      
      // Cache for 5 minutes (month data can change frequently during budgeting)
      cache.set(cacheKey, monthData, 5 * 60 * 1000);
      
      return monthData;
    } catch (error) {
      throw SecureErrorHandler.handleAPIError(error, 'GET_MONTH');
    }
  }

  /**
   * Get current month data
   */
  static async getCurrentMonth(budgetId: string): Promise<YNABMonth> {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01
    return this.getMonth(budgetId, currentMonth);
  }

  /**
   * Get categories for current month with caching
   */
  static async getCategories(budgetId: string): Promise<YNABCategoryGroup[]> {
    const cacheKey = `categories:${budgetId}`;
    const cached = cache.get<YNABCategoryGroup[]>(cacheKey);
    
    if (cached) {
      console.log('📦 Cache hit: categories');
      return cached;
    }

    try {
      console.log('🌐 API call: getCategories');
      const response: YNABCategoriesResponse = await ynabClient.getCategories(budgetId);
      const categoryGroups = response.data.category_groups;
      
      // Cache for 5 minutes
      cache.set(cacheKey, categoryGroups, 5 * 60 * 1000);
      
      return categoryGroups;
    } catch (error) {
      throw SecureErrorHandler.handleAPIError(error, 'GET_CATEGORIES');
    }
  }

  /**
   * Get multiple months of data efficiently
   */
  static async getMonthRange(
    budgetId: string, 
    startMonth: string, 
    endMonth: string
  ): Promise<YNABMonth[]> {
    if (!validateMonthFormat(startMonth) || !validateMonthFormat(endMonth)) {
      throw new AppError(
        ErrorType.VALIDATION_ERROR,
        'Invalid month format',
        'Months must be in YYYY-MM-DD format (e.g., 2024-01-01)',
        400
      );
    }

    const months: string[] = [];
    const current = new Date(startMonth);
    const end = new Date(endMonth);

    while (current <= end) {
      const monthStr = current.toISOString().slice(0, 7) + '-01';
      months.push(monthStr);
      current.setMonth(current.getMonth() + 1);
    }

    // Fetch all months in parallel with rate limiting consideration
    const monthDataPromises = months.map(async (month, index) => {
      // Add small delay to respect rate limits (200 requests/hour = ~3 seconds between requests)
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      return this.getMonth(budgetId, month);
    });

    try {
      return await Promise.all(monthDataPromises);
    } catch (error) {
      throw SecureErrorHandler.handleAPIError(error, 'GET_MONTH_RANGE');
    }
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  static clearCache(): void {
    cache.clear();
    console.log('🗑️ Cache cleared');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return cache.getStats();
  }

  /**
   * Validate budget access
   */
  static async validateBudgetAccess(budgetId: string): Promise<boolean> {
    try {
      const budgets = await this.getBudgets();
      return budgets.some(budget => budget.id === budgetId);
    } catch (error) {
      console.error('Budget validation error:', error);
      return false;
    }
  }

  /**
   * Get budget by ID
   */
  static async getBudget(budgetId: string): Promise<YNABBudget> {
    const budgets = await this.getBudgets();
    const budget = budgets.find(b => b.id === budgetId);
    
    if (!budget) {
      throw new AppError(
        ErrorType.NOT_FOUND,
        `Budget not found: ${budgetId}`,
        'The requested budget was not found or you do not have access to it.',
        404
      );
    }
    
    return budget;
  }
}
