/**
 * Analytics Initializer Component
 * Initializes PostHog analytics and sets up event tracking
 */

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { analytics } from '@/lib/analytics/posthog-client';
import { trackInteraction } from '@/lib/analytics/events';

export function AnalyticsInitializer() {
  const pathname = usePathname();

  useEffect(() => {
    // Initialize PostHog
    analytics.initialize();

    // Set up global error tracking
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      // Track JavaScript errors
      if (analytics.getConsentStatus().given) {
        analytics.track('javascript_error', {
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
          stack: event.error?.stack?.substring(0, 500),
        });
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Track promise rejections
      if (analytics.getConsentStatus().given) {
        analytics.track('promise_rejection', {
          reason: event.reason?.toString?.() || 'Unknown rejection',
        });
      }
    };

    // Add global error listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
    };
  }, []);

  // Track custom page views when pathname changes (in addition to automatic $pageview)
  useEffect(() => {
    if (pathname) {
      // Only track custom page_view events if consent is given
      // PostHog will automatically track $pageview events
      if (analytics.getConsentStatus().given) {
        trackInteraction.pageView(pathname);
      }
    }
  }, [pathname]);

  // This component doesn't render anything
  return null;
}
