/**
 * Security Initializer Component
 * Initializes security monitoring and XSS prevention on the client side
 */

'use client';

import { useEffect } from 'react';
import { XSSPrevention } from '@/lib/security/xss-prevention';

export function SecurityInitializer() {
  useEffect(() => {
    // Initialize XSS monitoring
    XSSPrevention.initialize();

    // Enforce HTTPS in production
    if (
      process.env.NODE_ENV === 'production' &&
      typeof window !== 'undefined' &&
      window.location.protocol !== 'https:'
    ) {
      window.location.href = window.location.href.replace('http:', 'https:');
    }

    // Log security initialization
    console.log('Security monitoring initialized');
  }, []);

  // This component doesn't render anything
  return null;
}
