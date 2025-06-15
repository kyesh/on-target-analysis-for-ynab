/**
 * GDPR/CCPA Consent Banner Component
 * Handles user consent for analytics tracking
 */

'use client';

import React, { useState, useEffect } from 'react';
import { analytics, ConsentSettings } from '@/lib/analytics/posthog-client';

export interface ConsentBannerProps {
  onConsentChange?: (consent: ConsentSettings) => void;
  position?: 'top' | 'bottom';
  theme?: 'light' | 'dark';
}

export function ConsentBanner({
  onConsentChange,
  position = 'bottom',
  theme = 'light',
}: ConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentSettings>({
    analytics: false,
    performance: false,
    functional: true, // Always true for essential functionality
    advertising: false,
  });

  useEffect(() => {
    // Check if consent has already been given
    const consentStatus = analytics.getConsentStatus();
    if (!consentStatus.given) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    const fullConsent: ConsentSettings = {
      analytics: true,
      performance: true,
      functional: true,
      advertising: false, // We don't use advertising
    };

    setConsent(fullConsent);
    analytics.setConsent(fullConsent);
    onConsentChange?.(fullConsent);
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    const minimalConsent: ConsentSettings = {
      analytics: false,
      performance: false,
      functional: true, // Essential functionality only
      advertising: false,
    };

    setConsent(minimalConsent);
    analytics.setConsent(minimalConsent);
    onConsentChange?.(minimalConsent);
    setIsVisible(false);
  };

  const handleCustomConsent = () => {
    analytics.setConsent(consent);
    onConsentChange?.(consent);
    setIsVisible(false);
  };

  const handleConsentChange = (type: keyof ConsentSettings, value: boolean) => {
    setConsent(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  if (!isVisible) {
    return null;
  }

  const positionClasses = position === 'top' ? 'top-0' : 'bottom-0';

  const themeClasses =
    theme === 'dark'
      ? 'bg-gray-900 text-white border-gray-700'
      : 'bg-white text-gray-900 border-gray-200';

  return (
    <div
      className={`fixed ${positionClasses} left-0 right-0 z-50 border-t ${themeClasses} shadow-lg`}
    >
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        {!showDetails ? (
          // Simple consent banner
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <h3 className="mb-2 text-lg font-semibold">
                We value your privacy
              </h3>
              <p className="text-sm opacity-90">
                We use analytics to improve your experience and understand how
                our application is used. Your data is processed securely and
                never sold to third parties.
              </p>
            </div>

            <div className="flex min-w-fit flex-col gap-2 sm:flex-row">
              <button
                onClick={() => setShowDetails(true)}
                className="rounded-md border border-current px-4 py-2 text-sm transition-colors hover:bg-current hover:bg-opacity-10"
              >
                Customize
              </button>
              <button
                onClick={handleRejectAll}
                className="rounded-md border border-current px-4 py-2 text-sm transition-colors hover:bg-current hover:bg-opacity-10"
              >
                Reject All
              </button>
              <button
                onClick={handleAcceptAll}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          // Detailed consent options
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Privacy Preferences</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-sm opacity-70 hover:opacity-100"
              >
                ← Back
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Essential/Functional */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Essential</label>
                  <input
                    type="checkbox"
                    checked={consent.functional}
                    disabled
                    className="rounded border-gray-300"
                  />
                </div>
                <p className="text-xs opacity-75">
                  Required for the application to function properly. Cannot be
                  disabled.
                </p>
              </div>

              {/* Analytics */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Analytics</label>
                  <input
                    type="checkbox"
                    checked={consent.analytics}
                    onChange={e =>
                      handleConsentChange('analytics', e.target.checked)
                    }
                    className="rounded border-gray-300"
                  />
                </div>
                <p className="text-xs opacity-75">
                  Helps us understand how you use the application to improve
                  your experience.
                </p>
              </div>

              {/* Performance */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Performance</label>
                  <input
                    type="checkbox"
                    checked={consent.performance}
                    onChange={e =>
                      handleConsentChange('performance', e.target.checked)
                    }
                    className="rounded border-gray-300"
                  />
                </div>
                <p className="text-xs opacity-75">
                  Monitors application performance and helps identify issues.
                </p>
              </div>

              {/* Advertising (disabled for this app) */}
              <div className="space-y-2 opacity-50">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Advertising</label>
                  <input
                    type="checkbox"
                    checked={false}
                    disabled
                    className="rounded border-gray-300"
                  />
                </div>
                <p className="text-xs opacity-75">
                  Not used by this application.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-current border-opacity-20 pt-4 sm:flex-row">
              <button
                onClick={handleRejectAll}
                className="rounded-md border border-current px-4 py-2 text-sm transition-colors hover:bg-current hover:bg-opacity-10"
              >
                Reject All
              </button>
              <button
                onClick={handleCustomConsent}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
              >
                Save Preferences
              </button>
              <button
                onClick={handleAcceptAll}
                className="rounded-md bg-green-600 px-4 py-2 text-sm text-white transition-colors hover:bg-green-700"
              >
                Accept All
              </button>
            </div>

            <div className="border-t border-current border-opacity-20 pt-2 text-xs opacity-75">
              <p>
                You can change these preferences at any time in the application
                settings. For more information, see our{' '}
                <a href="/privacy" className="underline hover:no-underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to manage consent state
 */
export function useAnalyticsConsent() {
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentSettings, setConsentSettings] =
    useState<ConsentSettings | null>(null);

  useEffect(() => {
    const status = analytics.getConsentStatus();
    setConsentGiven(status.given);
    setConsentSettings(status.settings || null);
  }, []);

  const updateConsent = (consent: ConsentSettings) => {
    analytics.setConsent(consent);
    setConsentGiven(consent.analytics);
    setConsentSettings(consent);
  };

  const revokeConsent = () => {
    const minimalConsent: ConsentSettings = {
      analytics: false,
      performance: false,
      functional: true,
      advertising: false,
    };
    updateConsent(minimalConsent);
  };

  return {
    consentGiven,
    consentSettings,
    updateConsent,
    revokeConsent,
  };
}
