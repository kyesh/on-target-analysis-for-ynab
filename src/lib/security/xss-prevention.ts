/**
 * XSS Prevention Utilities for OAuth 2.0 Implicit Grant Flow
 * Provides input sanitization and validation functions
 */

export class XSSPrevention {
  // Dangerous patterns to remove or escape
  private static readonly DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
  ];

  // Safe URL protocols
  private static readonly SAFE_PROTOCOLS = [
    'http:',
    'https:',
    'mailto:',
    'tel:',
    'ftp:',
  ];

  /**
   * Sanitize user input by removing dangerous content
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }

    let sanitized = input;

    // Remove dangerous patterns
    this.DANGEROUS_PATTERNS.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove angle brackets to prevent HTML injection
    sanitized = sanitized.replace(/[<>]/g, '');

    // Trim whitespace and limit length
    sanitized = sanitized.trim().substring(0, 1000);

    return sanitized;
  }

  /**
   * Escape HTML content for safe display
   */
  static escapeHtml(unsafe: string): string {
    if (typeof unsafe !== 'string') {
      return '';
    }

    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate and sanitize URLs
   */
  static sanitizeUrl(url: string): string | null {
    if (typeof url !== 'string' || !url.trim()) {
      return null;
    }

    try {
      const parsed = new URL(url.trim());

      // Check if protocol is safe
      if (!this.SAFE_PROTOCOLS.includes(parsed.protocol)) {
        return null;
      }

      // Additional checks for YNAB OAuth URLs
      if (
        parsed.protocol === 'https:' &&
        (parsed.hostname === 'app.ynab.com' ||
          parsed.hostname === 'api.ynab.com')
      ) {
        return parsed.toString();
      }

      // Allow same-origin URLs
      if (
        typeof window !== 'undefined' &&
        parsed.origin === window.location.origin
      ) {
        return parsed.toString();
      }

      // For other HTTPS URLs, be more restrictive
      if (parsed.protocol === 'https:') {
        return parsed.toString();
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate OAuth state parameter
   */
  static validateOAuthState(state: string): boolean {
    if (typeof state !== 'string') {
      return false;
    }

    // State should be 64 hex characters (32 bytes)
    return /^[a-f0-9]{64}$/i.test(state);
  }

  /**
   * Validate OAuth nonce parameter
   */
  static validateOAuthNonce(nonce: string): boolean {
    if (typeof nonce !== 'string') {
      return false;
    }

    // Nonce should be 32 hex characters (16 bytes)
    return /^[a-f0-9]{32}$/i.test(nonce);
  }

  /**
   * Validate JWT token format (basic structure check)
   */
  static validateJWTFormat(token: string): boolean {
    if (typeof token !== 'string') {
      return false;
    }

    // JWT should have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Each part should be base64url encoded
    const base64UrlPattern = /^[A-Za-z0-9_-]+$/;
    return parts.every(part => part.length > 0 && base64UrlPattern.test(part));
  }

  /**
   * Sanitize JSON data recursively
   */
  static sanitizeJsonData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeInput(data);
    }

    if (typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJsonData(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = this.sanitizeInput(key);
        sanitized[sanitizedKey] = this.sanitizeJsonData(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Validate redirect URL for OAuth flow
   */
  static validateRedirectUrl(url: string): boolean {
    if (typeof url !== 'string') {
      return false;
    }

    try {
      const parsed = new URL(url);

      // Must be HTTPS in production
      if (
        process.env.NODE_ENV === 'production' &&
        parsed.protocol !== 'https:'
      ) {
        return false;
      }

      // Allow HTTP for localhost in development
      if (
        process.env.NODE_ENV === 'development' &&
        parsed.protocol === 'http:' &&
        parsed.hostname === 'localhost'
      ) {
        return true;
      }

      // Must be same origin or YNAB domain
      if (typeof window !== 'undefined') {
        const currentOrigin = window.location.origin;
        if (parsed.origin === currentOrigin) {
          return true;
        }
      }

      // Allow YNAB OAuth domains
      const allowedHosts = ['app.ynab.com', 'api.ynab.com'];
      return allowedHosts.includes(parsed.hostname);
    } catch {
      return false;
    }
  }

  /**
   * Create a Content Security Policy nonce
   */
  static generateCSPNonce(): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join(
        ''
      );
    }

    // Fallback for environments without crypto
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Validate file upload (if needed in the future)
   */
  static validateFileUpload(file: File): { valid: boolean; error?: string } {
    // Basic file validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'text/plain'];

    if (file.size > maxSize) {
      return { valid: false, error: 'File too large' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'File type not allowed' };
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.vbs$/i,
      /\.js$/i,
      /\.html$/i,
      /\.php$/i,
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      return { valid: false, error: 'Suspicious file type' };
    }

    return { valid: true };
  }

  /**
   * Monitor for potential XSS attempts
   */
  static monitorXSSAttempts(): void {
    if (typeof window === 'undefined') {
      return;
    }

    // Monitor URL for XSS attempts
    const currentUrl = window.location.href;
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+=/i,
      /<iframe/i,
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(currentUrl))) {
      this.reportSecurityIncident('XSS attempt detected in URL', {
        url: currentUrl,
        userAgent: navigator.userAgent,
      });
    }

    // Monitor for suspicious DOM modifications
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (
                  element.tagName === 'SCRIPT' ||
                  element.tagName === 'IFRAME'
                ) {
                  // Development allowlist: ignore known PostHog analytics injections
                  const isDev = process.env.NODE_ENV === 'development';
                  const src = (element as HTMLScriptElement).src || (element as HTMLIFrameElement).src || '';
                  const isPosthog =
                    src.includes('posthog') ||
                    src.includes('us-assets.i.posthog.com') ||
                    src.includes('us.i.posthog.com') ||
                    (element.getAttribute && element.getAttribute('data-posthog') !== null) ||
                    // PostHog recorder creates iframes with specific patterns
                    (element.tagName === 'IFRAME' && (
                      element.getAttribute('style')?.includes('display: none') ||
                      element.getAttribute('src') === 'about:blank'
                    ));

                  if (!(isDev && isPosthog)) {
                    this.reportSecurityIncident('Suspicious DOM modification', {
                      tagName: element.tagName,
                      innerHTML: element.innerHTML.substring(0, 100),
                    });
                  }
                }
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  /**
   * Report security incidents
   */
  private static reportSecurityIncident(
    incident: string,
    details: any = {}
  ): void {
    console.warn(`Security incident: ${incident}`, details);

    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production') {
      // This would typically send to a security monitoring service
      fetch('/api/security/incident', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          incident,
          details,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(error => {
        console.error('Failed to report security incident:', error);
      });
    }
  }

  /**
   * Initialize XSS monitoring
   */
  static initialize(): void {
    if (typeof window !== 'undefined') {
      this.monitorXSSAttempts();
    }
  }
}
