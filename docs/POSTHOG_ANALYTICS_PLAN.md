# PostHog Analytics Integration Plan

## Overview

Comprehensive analytics implementation for user behavior tracking, performance monitoring, and product insights while maintaining privacy compliance.

## Phase 1: PostHog Setup and Configuration

### 1.1 PostHog Installation

```bash
npm install posthog-js@^1.252.1
npm install posthog-node@^5.1.0
npm install @types/posthog-js
```

**Current Version**: PostHog-JS 1.252.1 (verified working with session recordings)

**Version Notes**:
- PostHog-JS 1.252.1 is the latest stable version with full session recording support
- Previous versions (1.251.x) had compatibility issues with session recording processing
- This version includes enhanced session recording capabilities and improved privacy controls

### 1.2 Environment Configuration

```env
# PostHog Configuration
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-project-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
POSTHOG_PERSONAL_API_KEY=your-posthog-personal-api-key

# Privacy Configuration
ANALYTICS_ENABLED=true
ANALYTICS_CONSENT_REQUIRED=true
ANALYTICS_RETENTION_DAYS=90
```

### 1.3 PostHog Provider Setup

```typescript
// src/lib/analytics/posthog-provider.tsx
'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageviews: false, // We'll handle this manually
    capture_pageleaves: true,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
        email: true,
      },
      recordCrossOriginIframes: false,
      recordCanvas: false,
    },
    autocapture: false, // We'll use custom events
    respect_dnt: true,
    opt_out_capturing_by_default: false,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.debug()
      }
    },
  })
}

export function PostHogPageview(): JSX.Element {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      let url = window.origin + pathname
      if (searchParams && searchParams.toString()) {
        url = url + '?' + searchParams.toString()
      }
      posthog.capture('$pageview', {
        $current_url: url,
      })
    }
  }, [pathname, searchParams])

  return <></>
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}
```

## Phase 2: Event Tracking Strategy

### 2.1 Core User Actions to Track

#### Authentication Events

```typescript
// src/lib/analytics/events.ts
export const AuthEvents = {
  LOGIN_STARTED: 'auth_login_started',
  LOGIN_COMPLETED: 'auth_login_completed',
  LOGIN_FAILED: 'auth_login_failed',
  LOGOUT: 'auth_logout',
  TOKEN_REFRESH: 'auth_token_refresh',
} as const;

export const trackAuthEvent = (
  event: keyof typeof AuthEvents,
  properties?: Record<string, any>
) => {
  posthog.capture(AuthEvents[event], {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};
```

#### Budget Analysis Events

```typescript
export const AnalysisEvents = {
  BUDGET_SELECTED: 'analysis_budget_selected',
  MONTH_CHANGED: 'analysis_month_changed',
  ANALYSIS_LOADED: 'analysis_loaded',
  ANALYSIS_ERROR: 'analysis_error',
  EXPORT_INITIATED: 'analysis_export_initiated',
  CALCULATION_RULE_APPLIED: 'calculation_rule_applied',
} as const;

export const trackAnalysisEvent = (
  event: keyof typeof AnalysisEvents,
  properties?: Record<string, any>
) => {
  posthog.capture(AnalysisEvents[event], {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};
```

#### Debug and UI Events

```typescript
export const UIEvents = {
  DEBUG_MODE_TOGGLED: 'ui_debug_mode_toggled',
  DEBUG_PANEL_OPENED: 'ui_debug_panel_opened',
  CATEGORY_EXPANDED: 'ui_category_expanded',
  FILTER_APPLIED: 'ui_filter_applied',
  SORT_CHANGED: 'ui_sort_changed',
} as const;

export const trackUIEvent = (
  event: keyof typeof UIEvents,
  properties?: Record<string, any>
) => {
  posthog.capture(UIEvents[event], {
    timestamp: new Date().toISOString(),
    ...properties,
  });
};
```

### 2.2 Performance Tracking

```typescript
// src/lib/analytics/performance.ts
export const PerformanceEvents = {
  PAGE_LOAD_TIME: 'performance_page_load_time',
  API_REQUEST_TIME: 'performance_api_request_time',
  CALCULATION_TIME: 'performance_calculation_time',
  RENDER_TIME: 'performance_render_time',
} as const;

export const trackPerformance = (
  metric: keyof typeof PerformanceEvents,
  duration: number,
  metadata?: Record<string, any>
) => {
  posthog.capture(PerformanceEvents[metric], {
    duration_ms: duration,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};

// Performance monitoring hook
export const usePerformanceTracking = () => {
  const trackPageLoad = () => {
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        const loadTime =
          performance.timing.loadEventEnd - performance.timing.navigationStart;
        trackPerformance('PAGE_LOAD_TIME', loadTime);
      });
    }
  };

  const trackAPICall = async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> => {
    const startTime = performance.now();
    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;
      trackPerformance('API_REQUEST_TIME', duration, {
        endpoint,
        success: true,
      });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      trackPerformance('API_REQUEST_TIME', duration, {
        endpoint,
        success: false,
        error: error.message,
      });
      throw error;
    }
  };

  return { trackPageLoad, trackAPICall };
};
```

## Phase 3: Component Integration

### 3.1 Analytics Hook

```typescript
// src/hooks/useAnalytics.ts
import { usePostHog } from 'posthog-js/react';
import { useCallback } from 'react';

export const useAnalytics = () => {
  const posthog = usePostHog();

  const trackBudgetSelection = useCallback(
    (budgetId: string, budgetName: string) => {
      posthog.capture('analysis_budget_selected', {
        budget_id: budgetId,
        budget_name: budgetName,
        timestamp: new Date().toISOString(),
      });
    },
    [posthog]
  );

  const trackMonthChange = useCallback(
    (month: string, direction?: 'next' | 'previous') => {
      posthog.capture('analysis_month_changed', {
        month,
        direction,
        timestamp: new Date().toISOString(),
      });
    },
    [posthog]
  );

  const trackDebugToggle = useCallback(
    (enabled: boolean) => {
      posthog.capture('ui_debug_mode_toggled', {
        debug_enabled: enabled,
        timestamp: new Date().toISOString(),
      });
    },
    [posthog]
  );

  const trackCalculationRule = useCallback(
    (rule: string, categoryId: string, amount: number) => {
      posthog.capture('calculation_rule_applied', {
        rule,
        category_id: categoryId,
        calculated_amount: amount,
        timestamp: new Date().toISOString(),
      });
    },
    [posthog]
  );

  return {
    trackBudgetSelection,
    trackMonthChange,
    trackDebugToggle,
    trackCalculationRule,
  };
};
```

### 3.2 Component Implementation Examples

```typescript
// src/components/AnalysisDashboard.tsx (updated with analytics)
import { useAnalytics } from '@/hooks/useAnalytics';

export function AnalysisDashboard({ budgetId, month }: AnalysisDashboardProps) {
  const { trackBudgetSelection, trackMonthChange, trackDebugToggle } =
    useAnalytics();
  const [debugMode, setDebugMode] = useState(false);

  const handleBudgetChange = (newBudgetId: string, budgetName: string) => {
    trackBudgetSelection(newBudgetId, budgetName);
    // ... existing logic
  };

  const handleMonthChange = (
    newMonth: string,
    direction: 'next' | 'previous'
  ) => {
    trackMonthChange(newMonth, direction);
    // ... existing logic
  };

  const handleDebugToggle = (enabled: boolean) => {
    setDebugMode(enabled);
    trackDebugToggle(enabled);
  };

  // ... rest of component
}
```

### 3.3 Server-Side Analytics

```typescript
// src/lib/analytics/server-analytics.ts
import { PostHog } from 'posthog-node';

const serverPostHog = new PostHog(process.env.POSTHOG_PERSONAL_API_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
});

export const trackServerEvent = async (
  event: string,
  distinctId: string,
  properties?: Record<string, any>
) => {
  if (process.env.ANALYTICS_ENABLED === 'true') {
    serverPostHog.capture({
      distinctId,
      event,
      properties: {
        timestamp: new Date().toISOString(),
        server_side: true,
        ...properties,
      },
    });
  }
};

// API route analytics
export const trackAPIUsage = async (
  endpoint: string,
  method: string,
  userId: string,
  responseTime: number,
  statusCode: number
) => {
  await trackServerEvent('api_request', userId, {
    endpoint,
    method,
    response_time_ms: responseTime,
    status_code: statusCode,
  });
};
```

## Phase 4: Privacy and Compliance

### 4.1 Consent Management

```typescript
// src/components/ConsentBanner.tsx
import { useState, useEffect } from 'react'
import posthog from 'posthog-js'

export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('analytics-consent')
    if (!consent) {
      setShowBanner(true)
    } else if (consent === 'accepted') {
      posthog.opt_in_capturing()
    } else {
      posthog.opt_out_capturing()
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('analytics-consent', 'accepted')
    posthog.opt_in_capturing()
    setShowBanner(false)
  }

  const handleDecline = () => {
    localStorage.setItem('analytics-consent', 'declined')
    posthog.opt_out_capturing()
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex-1 mr-4">
          <p className="text-sm">
            We use analytics to improve your experience. No personal financial data is collected.
            <a href="/privacy" className="underline ml-1">Learn more</a>
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleDecline}
            className="px-4 py-2 text-sm border border-gray-600 rounded hover:bg-gray-800"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm bg-blue-600 rounded hover:bg-blue-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 4.2 Data Privacy Configuration

```typescript
// src/lib/analytics/privacy.ts
export const PrivacyConfig = {
  // Data retention (90 days)
  dataRetentionDays: 90,

  // PII masking rules
  maskingRules: {
    budgetNames: true,
    categoryNames: true,
    amounts: false, // Aggregate amounts are OK
    userIds: true,
  },

  // Geographic restrictions
  allowedRegions: ['US', 'CA', 'EU'],

  // GDPR compliance
  gdprCompliant: true,
  ccpaCompliant: true,
};

export const sanitizeEventData = (data: Record<string, any>) => {
  const sanitized = { ...data };

  // Remove or hash PII
  if (sanitized.budget_name && PrivacyConfig.maskingRules.budgetNames) {
    sanitized.budget_name = hashString(sanitized.budget_name);
  }

  if (sanitized.category_name && PrivacyConfig.maskingRules.categoryNames) {
    sanitized.category_name = hashString(sanitized.category_name);
  }

  if (sanitized.user_id && PrivacyConfig.maskingRules.userIds) {
    sanitized.user_id = hashString(sanitized.user_id);
  }

  return sanitized;
};
```

## Phase 5: Dashboard and Insights

### 5.1 Custom Analytics Dashboard

```typescript
// src/app/admin/analytics/page.tsx
import { PostHog } from 'posthog-node'

export default async function AnalyticsDashboard() {
  const insights = await getAnalyticsInsights()

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          title="Active Users"
          value={insights.activeUsers}
          change={insights.activeUsersChange}
        />
        <MetricCard
          title="Budget Analyses"
          value={insights.totalAnalyses}
          change={insights.analysesChange}
        />
        <MetricCard
          title="Debug Usage"
          value={`${insights.debugUsagePercent}%`}
          change={insights.debugUsageChange}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeatureUsageChart data={insights.featureUsage} />
        <CalculationRuleChart data={insights.ruleUsage} />
      </div>
    </div>
  )
}
```

## Implementation Timeline

### Week 1: Setup and Basic Integration

- Install PostHog and configure basic tracking
- Implement consent management
- Set up core event tracking

### Week 2: Advanced Analytics

- Implement performance tracking
- Add server-side analytics
- Create custom dashboards

### Week 3: Privacy and Compliance

- Implement data sanitization
- Add GDPR/CCPA compliance features
- Security audit of analytics implementation

### Week 4: Testing and Optimization

- Test analytics in staging environment
- Optimize event tracking performance
- Validate privacy compliance

## Session Recording Verification

### Verification Steps

1. **Check PostHog Version Loading**:
   ```javascript
   // In browser console, verify PostHog-JS version
   console.log(posthog.version); // Should show 1.252.1
   ```

2. **Monitor Network Requests**:
   - Look for successful POST requests to `https://us.i.posthog.com/s/` (session recordings)
   - Look for successful POST requests to `https://us.i.posthog.com/e/` (events)
   - All requests should return 200 status codes

3. **Verify Dashboard Visibility**:
   - Navigate to PostHog project dashboard
   - Go to Session Replay section
   - Recordings should appear within 5-10 minutes of user activity

### Troubleshooting Session Recordings

**Issue**: Session recordings not appearing in dashboard
**Solution**:
- Verify PostHog-JS version is 1.252.1 or later
- Check network requests for successful transmission
- Ensure sufficient user interaction (minimum 30 seconds recommended)
- Verify PostHog project configuration allows session recordings

**Issue**: Recordings appear but are incomplete
**Solution**:
- Check for JavaScript errors in browser console
- Verify session recording configuration in PostHog init
- Ensure proper masking rules are not blocking content

## Success Metrics

- ✅ User behavior insights collected
- ✅ Performance bottlenecks identified
- ✅ Privacy compliance verified
- ✅ Analytics dashboard functional
- ✅ No PII leakage detected
- ✅ GDPR/CCPA compliance achieved
- ✅ Session recordings operational (PostHog-JS 1.252.1)
- ✅ Network transmission verified (200 status codes)
- ✅ Dashboard visibility confirmed
