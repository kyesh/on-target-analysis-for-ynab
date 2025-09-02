/**
 * Analytics Integration Hooks
 * Provides easy integration of analytics tracking with existing components
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { analytics } from './posthog-client';
import { trackAuth, trackBudget, trackInteraction, trackError } from './events';

/**
 * Hook to track authentication events
 */
export function useAuthAnalytics() {
  const { isAuthenticated } = useAuth();

  const identifiedRef = useRef(false);
  useEffect(() => {
    let cancelled = false;
    const identify = async () => {
      if (!isAuthenticated || identifiedRef.current) return;
      try {
        const resp = await fetch('/api/user', { method: 'GET' });
        const data = await resp.json();
        if (!cancelled && data?.success && data?.data?.userId) {
          analytics.identify(data.data.userId, {
            ynab_user_id: data.data.userId,
            authenticated_at: new Date().toISOString(),
            session_start: new Date().toISOString(),
          });
          identifiedRef.current = true;
        }
      } catch (e) {
        console.warn('Identify failed:', e);
      }
    };
    identify();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const trackOAuthInitiated = useCallback(
    (method: 'button_click' | 'auto_redirect' = 'button_click') => {
      trackAuth.oauthInitiated(method);
    },
    []
  );

  const trackOAuthCompleted = useCallback(
    (duration: number, tokenExpiresIn?: number) => {
      trackAuth.oauthCompleted(duration, tokenExpiresIn);
    },
    []
  );

  const trackOAuthFailed = useCallback((error: string, errorCode?: string) => {
    trackAuth.oauthFailed(error, errorCode);
  }, []);

  const trackLogout = useCallback(
    (method: 'manual' | 'auto' | 'timeout' = 'manual') => {
      trackAuth.logout(method);
      analytics.reset(); // Reset user identity
    },
    []
  );

  return {
    trackOAuthInitiated,
    trackOAuthCompleted,
    trackOAuthFailed,
    trackLogout,
  };
}

/**
 * Hook to track budget analysis events
 */
export function useBudgetAnalytics() {
  const trackBudgetsLoaded = useCallback((budgets: any[], loadTime: number) => {
    trackBudget.budgetsLoaded(budgets.length, loadTime);
  }, []);

  const trackBudgetSelected = useCallback((budget: any) => {
    trackBudget.budgetSelected(budget.id, budget.name);
  }, []);

  const trackMonthChanged = useCallback(
    (month: string, direction: 'next' | 'previous' | 'direct') => {
      trackBudget.monthChanged(month, direction);
    },
    []
  );

  const trackAnalysisGenerated = useCallback(
    (
      budgetId: string,
      month: string,
      categories: any[],
      processingTime: number
    ) => {
      trackBudget.analysisGenerated(
        budgetId,
        month,
        categories.length,
        processingTime
      );
    },
    []
  );

  const trackCategoryViewed = useCallback((category: any) => {
    const targetStatus = category.goal_target ? 'has_target' : 'no_target';
    trackBudget.categoryViewed(category.id, category.name, targetStatus);
  }, []);

  const trackFilterApplied = useCallback(
    (filterType: string, filterValue: string) => {
      trackBudget.filterApplied(filterType, filterValue);
    },
    []
  );

  return {
    trackBudgetsLoaded,
    trackBudgetSelected,
    trackMonthChanged,
    trackAnalysisGenerated,
    trackCategoryViewed,
    trackFilterApplied,
  };
}

/**
 * Hook to track user interactions
 */
export function useInteractionAnalytics() {
  const trackButtonClick = useCallback(
    (buttonName: string, location: string) => {
      trackInteraction.buttonClick(buttonName, location);
    },
    []
  );

  const trackFormSubmit = useCallback(
    (formName: string, success: boolean, errorMessage?: string) => {
      trackInteraction.formSubmit(formName, success, errorMessage);
    },
    []
  );

  const trackHelpAccessed = useCallback((helpTopic: string, source: string) => {
    trackInteraction.helpAccessed(helpTopic, source);
  }, []);

  const trackPageView = useCallback((path?: string, title?: string) => {
    trackInteraction.pageView(path || window.location.pathname, title);
  }, []);

  return {
    trackButtonClick,
    trackFormSubmit,
    trackHelpAccessed,
    trackPageView,
  };
}

/**
 * Hook to track errors with context
 */
export function useErrorAnalytics() {
  const trackApiError = useCallback(
    (
      endpoint: string,
      method: string,
      statusCode: number,
      errorMessage: string,
      errorType?: string
    ) => {
      trackError.apiError(
        endpoint,
        method,
        statusCode,
        errorMessage,
        errorType
      );
    },
    []
  );

  const trackAuthenticationError = useCallback(
    (errorType: string, errorMessage: string) => {
      trackError.authenticationError(errorType, errorMessage);
    },
    []
  );

  const trackValidationError = useCallback(
    (field: string, errorMessage: string, value?: string) => {
      trackError.validationError(field, errorMessage, value);
    },
    []
  );

  const trackNetworkError = useCallback((url: string, errorMessage: string) => {
    trackError.networkError(url, errorMessage);
  }, []);

  const trackJavaScriptError = useCallback(
    (
      errorMessage: string,
      stack?: string,
      filename?: string,
      line?: number
    ) => {
      trackError.javascriptError(errorMessage, stack, filename, line);
    },
    []
  );

  return {
    trackApiError,
    trackAuthenticationError,
    trackValidationError,
    trackNetworkError,
    trackJavaScriptError,
  };
}

/**
 * Hook to track feature usage and discovery
 */
export function useFeatureAnalytics() {
  const trackFeatureUsed = useCallback(
    (featureName: string, context: string) => {
      analytics.track('feature_used', {
        feature_name: featureName,
        context,
        timestamp: new Date().toISOString(),
      });
    },
    []
  );

  const trackFeatureDiscovered = useCallback(
    (featureName: string, discoveryMethod: string) => {
      analytics.track('feature_discovered', {
        feature_name: featureName,
        discovery_method: discoveryMethod,
        timestamp: new Date().toISOString(),
      });
    },
    []
  );

  const trackTooltipViewed = useCallback(
    (tooltipContent: string, location: string) => {
      analytics.track('tooltip_viewed', {
        tooltip_content: tooltipContent.substring(0, 100), // Truncate for privacy
        location,
        timestamp: new Date().toISOString(),
      });
    },
    []
  );

  const trackHelpDocumentAccessed = useCallback(
    (documentName: string, section?: string) => {
      analytics.track('help_document_accessed', {
        document_name: documentName,
        section,
        timestamp: new Date().toISOString(),
      });
    },
    []
  );

  return {
    trackFeatureUsed,
    trackFeatureDiscovered,
    trackTooltipViewed,
    trackHelpDocumentAccessed,
  };
}

/**
 * Comprehensive analytics hook that provides all tracking capabilities
 */
export function useAnalytics() {
  const authAnalytics = useAuthAnalytics();
  const budgetAnalytics = useBudgetAnalytics();
  const interactionAnalytics = useInteractionAnalytics();
  const errorAnalytics = useErrorAnalytics();
  const featureAnalytics = useFeatureAnalytics();

  // Track user properties
  const setUserProperties = useCallback((properties: Record<string, any>) => {
    analytics.setUserProperties(properties);
  }, []);

  // Track custom events
  const trackCustomEvent = useCallback(
    (eventName: string, properties: Record<string, any> = {}) => {
      analytics.track(eventName, {
        ...properties,
        timestamp: new Date().toISOString(),
      });
    },
    []
  );

  // Get consent status
  const getConsentStatus = useCallback(() => {
    return analytics.getConsentStatus();
  }, []);

  return {
    // Auth tracking
    ...authAnalytics,

    // Budget tracking
    ...budgetAnalytics,

    // Interaction tracking
    ...interactionAnalytics,

    // Error tracking
    ...errorAnalytics,

    // Feature tracking
    ...featureAnalytics,

    // Utility functions
    setUserProperties,
    trackCustomEvent,
    getConsentStatus,
  };
}
