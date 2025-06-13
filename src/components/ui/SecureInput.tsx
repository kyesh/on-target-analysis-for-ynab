/**
 * Secure Input Component with XSS Prevention
 * Automatically sanitizes user input to prevent XSS attacks
 */

'use client';

import React, { useState, useCallback, forwardRef } from 'react';
import { XSSPrevention } from '@/lib/security/xss-prevention';

export interface SecureInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  sanitize?: boolean;
  maxLength?: number;
  allowedPatterns?: RegExp[];
  blockedPatterns?: RegExp[];
  onSecurityViolation?: (violation: string, originalValue: string) => void;
}

export const SecureInput = forwardRef<HTMLInputElement, SecureInputProps>(({
  value,
  onChange,
  sanitize = true,
  maxLength = 1000,
  allowedPatterns = [],
  blockedPatterns = [],
  onSecurityViolation,
  className = '',
  ...props
}, ref) => {
  const [hasSecurityViolation, setHasSecurityViolation] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    let processedValue = rawValue;

    // Apply length limit
    if (processedValue.length > maxLength) {
      processedValue = processedValue.substring(0, maxLength);
    }

    // Check for blocked patterns
    const hasBlockedPattern = blockedPatterns.some(pattern => pattern.test(processedValue));
    if (hasBlockedPattern) {
      setHasSecurityViolation(true);
      onSecurityViolation?.('Blocked pattern detected', rawValue);
      return; // Don't update value
    }

    // Check allowed patterns (if specified)
    if (allowedPatterns.length > 0) {
      const hasAllowedPattern = allowedPatterns.some(pattern => pattern.test(processedValue));
      if (!hasAllowedPattern && processedValue.length > 0) {
        setHasSecurityViolation(true);
        onSecurityViolation?.('Value does not match allowed patterns', rawValue);
        return; // Don't update value
      }
    }

    // Apply sanitization
    if (sanitize) {
      const originalValue = processedValue;
      processedValue = XSSPrevention.sanitizeInput(processedValue);
      
      // Check if sanitization changed the value
      if (originalValue !== processedValue) {
        setHasSecurityViolation(true);
        onSecurityViolation?.('Input was sanitized', originalValue);
      }
    }

    // Clear security violation flag if value is now clean
    if (hasSecurityViolation && processedValue === rawValue) {
      setHasSecurityViolation(false);
    }

    onChange(processedValue);
  }, [onChange, sanitize, maxLength, allowedPatterns, blockedPatterns, onSecurityViolation, hasSecurityViolation]);

  const baseClassName = [
    'block w-full rounded-md border-gray-300 shadow-sm',
    'focus:border-blue-500 focus:ring-blue-500',
    'disabled:bg-gray-50 disabled:text-gray-500',
    hasSecurityViolation ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="relative">
      <input
        ref={ref}
        value={value}
        onChange={handleChange}
        className={baseClassName}
        {...props}
      />
      
      {hasSecurityViolation && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
      )}
    </div>
  );
});

SecureInput.displayName = 'SecureInput';

// Specialized secure inputs for common use cases

export interface SecureTextAreaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  sanitize?: boolean;
  maxLength?: number;
  onSecurityViolation?: (violation: string, originalValue: string) => void;
}

export const SecureTextArea = forwardRef<HTMLTextAreaElement, SecureTextAreaProps>(({
  value,
  onChange,
  sanitize = true,
  maxLength = 5000,
  onSecurityViolation,
  className = '',
  ...props
}, ref) => {
  const [hasSecurityViolation, setHasSecurityViolation] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawValue = e.target.value;
    let processedValue = rawValue;

    // Apply length limit
    if (processedValue.length > maxLength) {
      processedValue = processedValue.substring(0, maxLength);
    }

    // Apply sanitization
    if (sanitize) {
      const originalValue = processedValue;
      processedValue = XSSPrevention.sanitizeInput(processedValue);
      
      // Check if sanitization changed the value
      if (originalValue !== processedValue) {
        setHasSecurityViolation(true);
        onSecurityViolation?.('Input was sanitized', originalValue);
      } else if (hasSecurityViolation) {
        setHasSecurityViolation(false);
      }
    }

    onChange(processedValue);
  }, [onChange, sanitize, maxLength, onSecurityViolation, hasSecurityViolation]);

  const baseClassName = [
    'block w-full rounded-md border-gray-300 shadow-sm',
    'focus:border-blue-500 focus:ring-blue-500',
    'disabled:bg-gray-50 disabled:text-gray-500',
    hasSecurityViolation ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        className={baseClassName}
        {...props}
      />
      
      {hasSecurityViolation && (
        <div className="absolute top-3 right-3 pointer-events-none">
          <svg
            className="h-5 w-5 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
      )}
    </div>
  );
});

SecureTextArea.displayName = 'SecureTextArea';

// URL input with validation
export interface SecureUrlInputProps extends Omit<SecureInputProps, 'type'> {
  allowedDomains?: string[];
  requireHttps?: boolean;
}

export const SecureUrlInput = forwardRef<HTMLInputElement, SecureUrlInputProps>(({
  allowedDomains = [],
  requireHttps = true,
  onSecurityViolation,
  ...props
}, ref) => {
  const handleSecurityViolation = useCallback((violation: string, originalValue: string) => {
    // Additional URL-specific validation
    const sanitizedUrl = XSSPrevention.sanitizeUrl(originalValue);
    
    if (!sanitizedUrl) {
      onSecurityViolation?.('Invalid URL format', originalValue);
      return;
    }

    try {
      const url = new URL(sanitizedUrl);
      
      if (requireHttps && url.protocol !== 'https:') {
        onSecurityViolation?.('HTTPS required', originalValue);
        return;
      }

      if (allowedDomains.length > 0 && !allowedDomains.includes(url.hostname)) {
        onSecurityViolation?.('Domain not allowed', originalValue);
        return;
      }
    } catch {
      onSecurityViolation?.('URL parsing failed', originalValue);
      return;
    }

    onSecurityViolation?.(violation, originalValue);
  }, [allowedDomains, requireHttps, onSecurityViolation]);

  return (
    <SecureInput
      ref={ref}
      type="url"
      allowedPatterns={[/^https?:\/\/.+/]} // Basic URL pattern
      onSecurityViolation={handleSecurityViolation}
      {...props}
    />
  );
});

SecureUrlInput.displayName = 'SecureUrlInput';

// Email input with validation
export const SecureEmailInput = forwardRef<HTMLInputElement, Omit<SecureInputProps, 'type'>>(
  (props, ref) => {
    return (
      <SecureInput
        ref={ref}
        type="email"
        allowedPatterns={[/^[^\s@]+@[^\s@]+\.[^\s@]+$/]} // Basic email pattern
        {...props}
      />
    );
  }
);

SecureEmailInput.displayName = 'SecureEmailInput';
