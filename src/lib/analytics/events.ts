/**
 * Analytics Event Definitions for YNAB Off-Target Analysis
 * Centralized event tracking for user behavior and performance monitoring
 */

import { analytics } from './posthog-client';

// Event categories
export const EventCategory = {
  AUTHENTICATION: 'authentication',
  BUDGET_ANALYSIS: 'budget_analysis',
  USER_INTERACTION: 'user_interaction',
  PERFORMANCE: 'performance',
  ERROR: 'error',
} as const;

// Authentication events
export const AuthEvents = {
  OAUTH_INITIATED: 'oauth_initiated',
  OAUTH_COMPLETED: 'oauth_completed',
  OAUTH_FAILED: 'oauth_failed',
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_REFRESHED: 'token_refreshed',
  LOGOUT: 'logout',
  SESSION_TIMEOUT: 'session_timeout',
} as const;

// Budget analysis events
export const BudgetEvents = {
  BUDGETS_LOADED: 'budgets_loaded',
  BUDGET_SELECTED: 'budget_selected',
  MONTH_CHANGED: 'month_changed',
  ANALYSIS_GENERATED: 'analysis_generated',
  CATEGORY_VIEWED: 'category_viewed',
  FILTER_APPLIED: 'filter_applied',
  EXPORT_INITIATED: 'export_initiated',
} as const;

// User interaction events
export const InteractionEvents = {
  PAGE_VIEW: 'page_view',
  BUTTON_CLICK: 'button_click',
  FORM_SUBMIT: 'form_submit',
  SEARCH_PERFORMED: 'search_performed',
  HELP_ACCESSED: 'help_accessed',
  FEATURE_DISCOVERED: 'feature_discovered',
} as const;

// Performance events
export const PerformanceEvents = {
  API_REQUEST: 'api_request',
  PAGE_LOAD: 'page_load',
  COMPONENT_RENDER: 'component_render',
  ERROR_BOUNDARY: 'error_boundary',
} as const;

// Error events
export const ErrorEvents = {
  API_ERROR: 'api_error',
  AUTHENTICATION_ERROR: 'authentication_error',
  VALIDATION_ERROR: 'validation_error',
  NETWORK_ERROR: 'network_error',
  JAVASCRIPT_ERROR: 'javascript_error',
} as const;

/**
 * Authentication event tracking
 */
export const trackAuth = {
  oauthInitiated: (
    method: 'button_click' | 'auto_redirect' = 'button_click'
  ) => {
    analytics.track(AuthEvents.OAUTH_INITIATED, {
      category: EventCategory.AUTHENTICATION,
      method,
      timestamp: new Date().toISOString(),
    });
  },

  oauthCompleted: (duration: number, tokenExpiresIn?: number) => {
    analytics.track(AuthEvents.OAUTH_COMPLETED, {
      category: EventCategory.AUTHENTICATION,
      duration_ms: duration,
      token_expires_in: tokenExpiresIn,
      timestamp: new Date().toISOString(),
    });
  },

  oauthFailed: (error: string, errorCode?: string) => {
    analytics.track(AuthEvents.OAUTH_FAILED, {
      category: EventCategory.AUTHENTICATION,
      error,
      error_code: errorCode,
      timestamp: new Date().toISOString(),
    });
  },

  tokenExpired: (timeToExpiry: number) => {
    analytics.track(AuthEvents.TOKEN_EXPIRED, {
      category: EventCategory.AUTHENTICATION,
      time_to_expiry_ms: timeToExpiry,
      timestamp: new Date().toISOString(),
    });
  },

  logout: (method: 'manual' | 'auto' | 'timeout' = 'manual') => {
    analytics.track(AuthEvents.LOGOUT, {
      category: EventCategory.AUTHENTICATION,
      method,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Budget analysis event tracking
 */
export const trackBudget = {
  budgetsLoaded: (count: number, loadTime: number) => {
    analytics.track(BudgetEvents.BUDGETS_LOADED, {
      category: EventCategory.BUDGET_ANALYSIS,
      budget_count: count,
      load_time_ms: loadTime,
      timestamp: new Date().toISOString(),
    });
  },

  budgetSelected: (budgetId: string, budgetName: string) => {
    analytics.track(BudgetEvents.BUDGET_SELECTED, {
      category: EventCategory.BUDGET_ANALYSIS,
      budget_id: budgetId,
      budget_name: budgetName,
      timestamp: new Date().toISOString(),
    });
  },

  monthChanged: (month: string, direction: 'next' | 'previous' | 'direct') => {
    analytics.track(BudgetEvents.MONTH_CHANGED, {
      category: EventCategory.BUDGET_ANALYSIS,
      month,
      direction,
      timestamp: new Date().toISOString(),
    });
  },

  analysisGenerated: (
    budgetId: string,
    month: string,
    categoryCount: number,
    processingTime: number
  ) => {
    analytics.track(BudgetEvents.ANALYSIS_GENERATED, {
      category: EventCategory.BUDGET_ANALYSIS,
      budget_id: budgetId,
      month,
      category_count: categoryCount,
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString(),
    });
  },

  categoryViewed: (
    categoryId: string,
    categoryName: string,
    targetStatus: string
  ) => {
    analytics.track(BudgetEvents.CATEGORY_VIEWED, {
      category: EventCategory.BUDGET_ANALYSIS,
      category_id: categoryId,
      category_name: categoryName,
      target_status: targetStatus,
      timestamp: new Date().toISOString(),
    });
  },

  filterApplied: (filterType: string, filterValue: string) => {
    analytics.track(BudgetEvents.FILTER_APPLIED, {
      category: EventCategory.BUDGET_ANALYSIS,
      filter_type: filterType,
      filter_value: filterValue,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * User interaction event tracking
 */
export const trackInteraction = {
  pageView: (path: string, title?: string) => {
    analytics.track(InteractionEvents.PAGE_VIEW, {
      category: EventCategory.USER_INTERACTION,
      path,
      title: title || document.title,
      referrer: document.referrer,
      timestamp: new Date().toISOString(),
    });
  },

  buttonClick: (buttonName: string, location: string) => {
    analytics.track(InteractionEvents.BUTTON_CLICK, {
      category: EventCategory.USER_INTERACTION,
      button_name: buttonName,
      location,
      timestamp: new Date().toISOString(),
    });
  },

  formSubmit: (formName: string, success: boolean, errorMessage?: string) => {
    analytics.track(InteractionEvents.FORM_SUBMIT, {
      category: EventCategory.USER_INTERACTION,
      form_name: formName,
      success,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  },

  helpAccessed: (helpTopic: string, source: string) => {
    analytics.track(InteractionEvents.HELP_ACCESSED, {
      category: EventCategory.USER_INTERACTION,
      help_topic: helpTopic,
      source,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Performance event tracking
 */
export const trackPerformance = {
  apiRequest: (
    endpoint: string,
    method: string,
    duration: number,
    status: number,
    success: boolean
  ) => {
    analytics.track(PerformanceEvents.API_REQUEST, {
      category: EventCategory.PERFORMANCE,
      endpoint,
      method,
      duration_ms: duration,
      status_code: status,
      success,
      timestamp: new Date().toISOString(),
    });
  },

  pageLoad: (path: string, loadTime: number, resources?: number) => {
    analytics.track(PerformanceEvents.PAGE_LOAD, {
      category: EventCategory.PERFORMANCE,
      path,
      load_time_ms: loadTime,
      resource_count: resources,
      timestamp: new Date().toISOString(),
    });
  },

  componentRender: (componentName: string, renderTime: number) => {
    analytics.track(PerformanceEvents.COMPONENT_RENDER, {
      category: EventCategory.PERFORMANCE,
      component_name: componentName,
      render_time_ms: renderTime,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Error event tracking
 */
export const trackError = {
  apiError: (
    endpoint: string,
    method: string,
    statusCode: number,
    errorMessage: string,
    errorType?: string
  ) => {
    analytics.track(ErrorEvents.API_ERROR, {
      category: EventCategory.ERROR,
      endpoint,
      method,
      status_code: statusCode,
      error_message: errorMessage,
      error_type: errorType,
      timestamp: new Date().toISOString(),
    });
  },

  authenticationError: (errorType: string, errorMessage: string) => {
    analytics.track(ErrorEvents.AUTHENTICATION_ERROR, {
      category: EventCategory.ERROR,
      error_type: errorType,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  },

  validationError: (field: string, errorMessage: string, value?: string) => {
    analytics.track(ErrorEvents.VALIDATION_ERROR, {
      category: EventCategory.ERROR,
      field,
      error_message: errorMessage,
      value: value ? value.substring(0, 100) : undefined, // Truncate for privacy
      timestamp: new Date().toISOString(),
    });
  },

  networkError: (url: string, errorMessage: string) => {
    analytics.track(ErrorEvents.NETWORK_ERROR, {
      category: EventCategory.ERROR,
      url,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
    });
  },

  javascriptError: (
    errorMessage: string,
    stack?: string,
    filename?: string,
    line?: number
  ) => {
    analytics.track(ErrorEvents.JAVASCRIPT_ERROR, {
      category: EventCategory.ERROR,
      error_message: errorMessage,
      stack: stack ? stack.substring(0, 500) : undefined, // Truncate stack trace
      filename,
      line_number: line,
      timestamp: new Date().toISOString(),
    });
  },
};

/**
 * Convenience function to track custom events
 */
export const trackCustomEvent = (
  eventName: string,
  properties: Record<string, any> = {}
) => {
  analytics.track(eventName, {
    ...properties,
    timestamp: new Date().toISOString(),
  });
};
