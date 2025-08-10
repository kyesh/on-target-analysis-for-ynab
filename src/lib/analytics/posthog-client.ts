/**
 * PostHog Analytics Client for YNAB Off-Target Analysis
 * Handles user behavior tracking with GDPR/CCPA compliance
 */

'use client';

import posthog from 'posthog-js';

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
}

export interface UserProperties {
  userId?: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

export interface ConsentSettings {
  analytics: boolean;
  performance: boolean;
  functional: boolean;
  advertising: boolean;
}

export class PostHogClient {
  private static instance: PostHogClient | null = null;
  private initialized = false;
  private consentGiven = false;
  private queuedEvents: AnalyticsEvent[] = [];

  private constructor() {}

  static getInstance(): PostHogClient {
    if (!PostHogClient.instance) {
      PostHogClient.instance = new PostHogClient();
    }
    return PostHogClient.instance;
  }

  /**
   * Initialize PostHog with configuration
   */
  initialize(): void {
    if (this.initialized || typeof window === 'undefined') {
      return;
    }

    // Prefer runtime-injected public config for flexibility in Cloud Run
    const runtimeCfg = (typeof window !== 'undefined' && (window as any).__PUBLIC_CONFIG__) || {};
    const apiKey = runtimeCfg.POSTHOG_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = runtimeCfg.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

    if (!apiKey) {
      console.warn('PostHog API key not configured');
      return;
    }

    try {
      posthog.init(apiKey, {
        api_host: host,

        // Privacy and compliance settings
        opt_out_capturing_by_default: true, // Require explicit consent
        respect_dnt: true, // Respect Do Not Track
        disable_surveys: true, // Disable surveys

        // Session recording settings (enabled with privacy controls)
        disable_session_recording: false, // Enable session recording
        session_recording: {
          maskAllInputs: true, // Mask all input fields for privacy
          maskInputOptions: {
            password: true,
            email: true,
            color: false,
            date: false,
            'datetime-local': false,
            month: false,
            number: false,
            range: false,
            search: false,
            tel: false,
            text: true, // Mask text inputs for privacy
            time: false,
            url: false,
            week: false,
          },
          maskTextSelector: '.sensitive, [data-sensitive]', // Mask elements with sensitive class
          blockClass: 'ph-no-capture', // Don't record elements with this class
          blockSelector: '[data-ph-no-capture]', // Don't record elements with this attribute
          collectFonts: false, // Don't collect fonts for privacy
          recordCrossOriginIframes: false, // Don't record cross-origin iframes
        },

        // Performance settings
        loaded: posthog => {
          if (process.env.NODE_ENV === 'development') {
            console.log('PostHog loaded successfully');
          }
        },

        // Capture settings (enable default PostHog events)
        capture_pageview: true, // Enable automatic $pageview events
        capture_pageleave: true, // Keep pageleave events
        autocapture: true, // Enable automatic click tracking ($autocapture events)

        // Cross-domain tracking
        cross_subdomain_cookie: false,

        // Security settings
        secure_cookie: process.env.NODE_ENV === 'production',

        // Persistence settings
        persistence: 'localStorage+cookie',

        // Bootstrap configuration
        bootstrap: {
          distinctID: this.generateAnonymousId(),
        },
      });

      this.initialized = true;

      // Check for existing consent
      this.checkExistingConsent();
    } catch (error) {
      console.error('Failed to initialize PostHog:', error);
    }
  }

  /**
   * Set user consent for analytics
   */
  setConsent(consent: ConsentSettings): void {
    this.consentGiven = consent.analytics;

    // Store consent preferences
    localStorage.setItem(
      'analytics_consent',
      JSON.stringify({
        ...consent,
        timestamp: new Date().toISOString(),
        version: '1.0',
      })
    );

    if (this.consentGiven) {
      // Opt in to capturing
      posthog.opt_in_capturing();

      // Enable session recording if performance consent is given
      if (consent.performance) {
        posthog.startSessionRecording();
      } else {
        posthog.stopSessionRecording();
      }

      // Process queued events
      this.processQueuedEvents();
    } else {
      // Opt out of capturing
      posthog.opt_out_capturing();

      // Stop session recording
      posthog.stopSessionRecording();

      // Clear queued events
      this.queuedEvents = [];
    }
  }

  /**
   * Check for existing consent
   */
  private checkExistingConsent(): void {
    try {
      const storedConsent = localStorage.getItem('analytics_consent');
      if (storedConsent) {
        const consent = JSON.parse(storedConsent);
        this.consentGiven = consent.analytics;

        if (this.consentGiven) {
          posthog.opt_in_capturing();

          // Enable session recording if performance consent is given
          if (consent.performance) {
            posthog.startSessionRecording();
          } else {
            posthog.stopSessionRecording();
          }

          this.processQueuedEvents();
        } else {
          // Ensure session recording is stopped if no consent
          posthog.stopSessionRecording();
        }
      }
    } catch (error) {
      console.warn('Failed to check existing consent:', error);
    }
  }

  /**
   * Track an event
   */
  track(event: string, properties: Record<string, any> = {}): void {
    if (!this.initialized) {
      this.initialize();
    }

    const eventData: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        page_url: window.location.href,
        page_title: document.title,
      },
    };

    if (this.consentGiven) {
      try {
        posthog.capture(event, eventData.properties);
      } catch (error) {
        console.error('Failed to track event:', error);
      }
    } else {
      // Queue event for later if consent is given
      this.queuedEvents.push(eventData);
    }
  }

  /**
   * Track page view
   */
  trackPageView(path?: string): void {
    this.track('$pageview', {
      $current_url: path || window.location.href,
      path: path || window.location.pathname,
    });
  }

  /**
   * Identify user
   */
  identify(userId: string, properties: UserProperties = {}): void {
    if (!this.consentGiven) {
      return;
    }

    try {
      posthog.identify(userId, {
        ...properties,
        identified_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to identify user:', error);
    }
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: UserProperties): void {
    if (!this.consentGiven) {
      return;
    }

    try {
      posthog.people.set(properties);
    } catch (error) {
      console.error('Failed to set user properties:', error);
    }
  }

  /**
   * Reset user identity (for logout)
   */
  reset(): void {
    try {
      posthog.reset();
    } catch (error) {
      console.error('Failed to reset user identity:', error);
    }
  }

  /**
   * Process queued events after consent is given
   */
  private processQueuedEvents(): void {
    while (this.queuedEvents.length > 0) {
      const event = this.queuedEvents.shift();
      if (event) {
        try {
          posthog.capture(event.event, event.properties);
        } catch (error) {
          console.error('Failed to process queued event:', error);
        }
      }
    }
  }

  /**
   * Generate anonymous ID for bootstrap
   */
  private generateAnonymousId(): string {
    return (
      'anon_' +
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Get current consent status
   */
  getConsentStatus(): { given: boolean; settings?: ConsentSettings } {
    try {
      const storedConsent = localStorage.getItem('analytics_consent');
      if (storedConsent) {
        const consent = JSON.parse(storedConsent);
        return {
          given: this.consentGiven,
          settings: consent,
        };
      }
    } catch (error) {
      console.warn('Failed to get consent status:', error);
    }

    return { given: false };
  }

  /**
   * Check if PostHog is available and initialized
   */
  isAvailable(): boolean {
    return this.initialized && typeof posthog !== 'undefined';
  }

  /**
   * Get PostHog instance for advanced usage
   */
  getPostHogInstance() {
    return posthog;
  }
}

// Export singleton instance
export const analytics = PostHogClient.getInstance();
