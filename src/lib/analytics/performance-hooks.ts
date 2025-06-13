/**
 * Performance Monitoring Hooks for Analytics
 * Tracks API response times, page load speeds, and component render performance
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { trackPerformance, trackError } from './events';

/**
 * Hook to track API request performance
 */
export function useApiPerformanceTracking() {
  const trackApiRequest = useCallback(async <T>(
    endpoint: string,
    method: string,
    requestFn: () => Promise<T>
  ): Promise<T> => {
    const startTime = performance.now();
    let success = false;
    let statusCode = 0;

    try {
      const result = await requestFn();
      success = true;
      statusCode = 200; // Assume success if no error thrown
      return result;
    } catch (error: any) {
      success = false;
      statusCode = error.status || error.statusCode || 500;
      
      // Track API error
      trackError.apiError(
        endpoint,
        method,
        statusCode,
        error.message || 'Unknown API error',
        error.type || 'API_ERROR'
      );
      
      throw error;
    } finally {
      const duration = performance.now() - startTime;
      
      // Track API performance
      trackPerformance.apiRequest(
        endpoint,
        method,
        duration,
        statusCode,
        success
      );
    }
  }, []);

  return { trackApiRequest };
}

/**
 * Hook to track page load performance
 */
export function usePageLoadTracking(pageName: string) {
  useEffect(() => {
    const trackPageLoad = () => {
      // Use Navigation Timing API if available
      if (typeof window !== 'undefined' && 'performance' in window) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const loadTime = navigation.loadEventEnd - navigation.fetchStart;
          const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
          const firstPaint = performance.getEntriesByName('first-paint')[0]?.startTime || 0;
          const firstContentfulPaint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0;

          trackPerformance.pageLoad(pageName, loadTime, performance.getEntriesByType('resource').length);

          // Track additional performance metrics
          if (loadTime > 0) {
            trackPerformance.componentRender('page_load_complete', loadTime);
          }
          
          if (domContentLoaded > 0) {
            trackPerformance.componentRender('dom_content_loaded', domContentLoaded);
          }
          
          if (firstPaint > 0) {
            trackPerformance.componentRender('first_paint', firstPaint);
          }
          
          if (firstContentfulPaint > 0) {
            trackPerformance.componentRender('first_contentful_paint', firstContentfulPaint);
          }
        }
      }
    };

    // Track when page is fully loaded
    if (document.readyState === 'complete') {
      trackPageLoad();
    } else {
      window.addEventListener('load', trackPageLoad);
      return () => window.removeEventListener('load', trackPageLoad);
    }
  }, [pageName]);
}

/**
 * Hook to track component render performance
 */
export function useComponentPerformanceTracking(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const mountTime = useRef<number>(0);

  useEffect(() => {
    // Track component mount time
    mountTime.current = performance.now();
    
    return () => {
      // Track component unmount
      const unmountTime = performance.now();
      const totalMountDuration = unmountTime - mountTime.current;
      
      if (totalMountDuration > 100) { // Only track if component was mounted for more than 100ms
        trackPerformance.componentRender(`${componentName}_total_mount_duration`, totalMountDuration);
      }
    };
  }, [componentName]);

  const trackRenderStart = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const trackRenderEnd = useCallback((renderType: string = 'render') => {
    if (renderStartTime.current > 0) {
      const renderDuration = performance.now() - renderStartTime.current;
      trackPerformance.componentRender(`${componentName}_${renderType}`, renderDuration);
      renderStartTime.current = 0;
    }
  }, [componentName]);

  return {
    trackRenderStart,
    trackRenderEnd,
  };
}

/**
 * Hook to track user interaction performance
 */
export function useInteractionPerformanceTracking() {
  const trackInteraction = useCallback((
    interactionType: string,
    targetElement: string,
    callback?: () => void | Promise<void>
  ) => {
    const startTime = performance.now();
    
    const executeCallback = async () => {
      try {
        if (callback) {
          await callback();
        }
      } catch (error: any) {
        trackError.javascriptError(
          `Interaction error in ${interactionType}`,
          error.stack,
          'interaction-handler',
          0
        );
      } finally {
        const duration = performance.now() - startTime;
        trackPerformance.componentRender(`interaction_${interactionType}_${targetElement}`, duration);
      }
    };

    executeCallback();
  }, []);

  return { trackInteraction };
}

/**
 * Hook to track network performance
 */
export function useNetworkPerformanceTracking() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('navigator' in window)) {
      return;
    }

    // Track network information if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const networkInfo = {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      };

      // Track network performance baseline
      trackPerformance.componentRender('network_baseline', 0);
      
      // Listen for network changes
      const handleNetworkChange = () => {
        const newNetworkInfo = {
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        };

        // Track network change if significant
        if (newNetworkInfo.effectiveType !== networkInfo.effectiveType) {
          trackPerformance.componentRender(`network_change_to_${newNetworkInfo.effectiveType}`, 0);
        }
      };

      connection.addEventListener('change', handleNetworkChange);
      
      return () => {
        connection.removeEventListener('change', handleNetworkChange);
      };
    }
  }, []);
}

/**
 * Hook to track memory usage performance
 */
export function useMemoryPerformanceTracking() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const trackMemoryUsage = () => {
      // Track memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        
        const memoryUsage = {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        };

        // Track memory usage percentage
        const memoryUsagePercentage = (memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100;
        
        if (memoryUsagePercentage > 80) {
          trackPerformance.componentRender('high_memory_usage', memoryUsagePercentage);
        }
      }
    };

    // Track memory usage periodically
    const interval = setInterval(trackMemoryUsage, 30000); // Every 30 seconds
    
    // Initial tracking
    trackMemoryUsage();

    return () => clearInterval(interval);
  }, []);
}

/**
 * Comprehensive performance tracking hook that combines all performance monitoring
 */
export function usePerformanceTracking(componentName: string, pageName?: string) {
  const { trackApiRequest } = useApiPerformanceTracking();
  const { trackRenderStart, trackRenderEnd } = useComponentPerformanceTracking(componentName);
  const { trackInteraction } = useInteractionPerformanceTracking();

  // Track page load if pageName is provided
  usePageLoadTracking(pageName || componentName);
  
  // Track network performance
  useNetworkPerformanceTracking();
  
  // Track memory performance
  useMemoryPerformanceTracking();

  return {
    trackApiRequest,
    trackRenderStart,
    trackRenderEnd,
    trackInteraction,
  };
}
