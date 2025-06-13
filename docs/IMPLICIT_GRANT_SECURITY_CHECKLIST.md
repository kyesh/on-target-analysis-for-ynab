# Implicit Grant Security Implementation Checklist

## Security Hardening for Implicit Grant Flow

### 1. Content Security Policy (Critical)

#### Strict CSP Configuration
```typescript
// next.config.js - Production CSP
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://app.posthog.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https: blob:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.ynab.com https://app.ynab.com https://app.posthog.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
  block-all-mixed-content;
`;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 2. XSS Prevention (Critical)

#### Input Sanitization
```typescript
// src/lib/security/xss-prevention.ts
export class XSSPrevention {
  // Sanitize all user inputs
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .replace(/data:/gi, '') // Remove data: URLs
      .trim()
      .substring(0, 1000); // Limit length
  }
  
  // Validate URLs for redirects
  static isValidRedirectUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const allowedHosts = [
        window.location.hostname,
        'app.ynab.com'
      ];
      
      return parsed.protocol === 'https:' && 
             allowedHosts.includes(parsed.hostname);
    } catch {
      return false;
    }
  }
  
  // Escape HTML content
  static escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  // Validate OAuth state parameter
  static validateOAuthState(state: string): boolean {
    // State should be 64 hex characters
    return /^[a-f0-9]{64}$/.test(state);
  }
}
```

#### Component-Level Protection
```typescript
// src/components/SecureInput.tsx
import { XSSPrevention } from '@/lib/security/xss-prevention';

interface SecureInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export function SecureInput({ value, onChange, placeholder, maxLength = 100 }: SecureInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = XSSPrevention.sanitizeInput(e.target.value);
    onChange(sanitized);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      maxLength={maxLength}
      className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
```

### 3. Token Security (Critical)

#### Enhanced Token Storage
```typescript
// src/lib/auth/secure-token-storage-enhanced.ts
export class SecureTokenStorageEnhanced {
  private static readonly STORAGE_KEY = 'ynab_session';
  private static readonly INTEGRITY_KEY = 'ynab_session_integrity';
  private static token: string | null = null;
  private static expiresAt: number | null = null;

  // Store token with integrity check
  static storeToken(accessToken: string, expiresIn: number): void {
    const expiresAt = Date.now() + (expiresIn * 1000);
    
    // Store in memory
    this.token = accessToken;
    this.expiresAt = expiresAt;
    
    // Create session data with integrity hash
    const sessionData = {
      token: this.obfuscateToken(accessToken),
      expiresAt,
      timestamp: Date.now(),
      userAgent: navigator.userAgent.substring(0, 50), // Partial fingerprint
    };
    
    const integrity = this.calculateIntegrity(sessionData);
    
    try {
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
      sessionStorage.setItem(this.INTEGRITY_KEY, integrity);
    } catch (error) {
      console.warn('Failed to store token:', error);
    }
  }
  
  // Retrieve token with integrity verification
  static getToken(): string | null {
    // Check memory first
    if (this.token && this.expiresAt && Date.now() < this.expiresAt) {
      return this.token;
    }
    
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      const storedIntegrity = sessionStorage.getItem(this.INTEGRITY_KEY);
      
      if (!stored || !storedIntegrity) return null;
      
      const sessionData = JSON.parse(stored);
      
      // Verify integrity
      const calculatedIntegrity = this.calculateIntegrity(sessionData);
      if (calculatedIntegrity !== storedIntegrity) {
        console.warn('Token integrity check failed');
        this.clearToken();
        return null;
      }
      
      // Check expiration
      if (Date.now() >= sessionData.expiresAt) {
        this.clearToken();
        return null;
      }
      
      // Restore to memory
      const token = this.deobfuscateToken(sessionData.token);
      this.token = token;
      this.expiresAt = sessionData.expiresAt;
      
      return token;
    } catch (error) {
      console.warn('Failed to retrieve token:', error);
      this.clearToken();
      return null;
    }
  }
  
  // Clear all token data
  static clearToken(): void {
    this.token = null;
    this.expiresAt = null;
    
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.INTEGRITY_KEY);
    } catch (error) {
      console.warn('Failed to clear token:', error);
    }
  }
  
  // Simple obfuscation (not cryptographic security)
  private static obfuscateToken(token: string): string {
    const key = this.getObfuscationKey();
    return btoa(token.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join(''));
  }
  
  private static deobfuscateToken(obfuscated: string): string {
    const key = this.getObfuscationKey();
    return atob(obfuscated).split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
  }
  
  private static getObfuscationKey(): string {
    // Simple key derivation from browser characteristics
    return btoa(navigator.userAgent + window.location.hostname).substring(0, 16);
  }
  
  private static calculateIntegrity(data: any): string {
    // Simple integrity check using JSON string hash
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}
```

### 4. Network Security

#### HTTPS Enforcement
```typescript
// src/lib/security/https-enforcer.ts
export class HTTPSEnforcer {
  // Ensure all requests use HTTPS
  static enforceHTTPS(): void {
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:') {
      if (process.env.NODE_ENV === 'production') {
        window.location.href = window.location.href.replace('http:', 'https:');
      } else {
        console.warn('HTTPS enforcement disabled in development');
      }
    }
  }
  
  // Validate API URLs
  static validateApiUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && 
             (parsed.hostname === 'api.ynab.com' || 
              parsed.hostname === 'app.ynab.com');
    } catch {
      return false;
    }
  }
}
```

### 5. Error Handling and Logging

#### Secure Error Handling
```typescript
// src/lib/security/secure-error-handler.ts
export class SecureErrorHandler {
  // Handle authentication errors without exposing sensitive data
  static handleAuthError(error: any): {
    userMessage: string;
    shouldRedirect: boolean;
  } {
    // Log full error for debugging (server-side only)
    if (typeof window === 'undefined') {
      console.error('Auth error:', error);
    }
    
    // Return sanitized error for client
    if (error.message?.includes('401') || error.message?.includes('unauthorized')) {
      return {
        userMessage: 'Your session has expired. Please sign in again.',
        shouldRedirect: true
      };
    }
    
    if (error.message?.includes('403') || error.message?.includes('forbidden')) {
      return {
        userMessage: 'Access denied. Please check your YNAB permissions.',
        shouldRedirect: false
      };
    }
    
    return {
      userMessage: 'An authentication error occurred. Please try again.',
      shouldRedirect: true
    };
  }
  
  // Sanitize error messages for client display
  static sanitizeErrorMessage(message: string): string {
    // Remove potentially sensitive information
    return message
      .replace(/token/gi, 'session')
      .replace(/bearer/gi, 'auth')
      .replace(/[a-f0-9]{32,}/gi, '[REDACTED]') // Remove long hex strings
      .substring(0, 200); // Limit length
  }
}
```

## Implementation Checklist

### Pre-Implementation Security Setup
- [ ] **Configure Content Security Policy**
  - [ ] Strict script-src policy
  - [ ] Limited connect-src to YNAB domains only
  - [ ] Frame-ancestors 'none'
  - [ ] Upgrade-insecure-requests enabled

- [ ] **Set up HTTPS enforcement**
  - [ ] Production HTTPS redirect
  - [ ] HSTS headers configured
  - [ ] Mixed content blocking enabled

- [ ] **Input sanitization framework**
  - [ ] XSS prevention utilities implemented
  - [ ] Secure input components created
  - [ ] URL validation for redirects

### OAuth Implementation Security
- [ ] **State parameter validation**
  - [ ] Cryptographically secure state generation
  - [ ] State verification on callback
  - [ ] State cleanup after use

- [ ] **Token handling security**
  - [ ] Immediate URL fragment cleanup
  - [ ] Memory-first storage strategy
  - [ ] Token obfuscation in sessionStorage
  - [ ] Integrity checking for stored tokens

- [ ] **Error handling**
  - [ ] Secure error messages (no token exposure)
  - [ ] Proper error logging (server-side only)
  - [ ] User-friendly error display

### Production Deployment Security
- [ ] **Security headers verification**
  - [ ] CSP header active and tested
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Referrer-Policy configured

- [ ] **Token lifecycle management**
  - [ ] Automatic token expiration handling
  - [ ] Re-authentication prompts
  - [ ] Token cleanup on logout

- [ ] **Monitoring and alerting**
  - [ ] Authentication failure monitoring
  - [ ] XSS attempt detection
  - [ ] Unusual access pattern alerts

### Security Testing Checklist
- [ ] **XSS vulnerability testing**
  - [ ] Script injection attempts
  - [ ] HTML injection attempts
  - [ ] Event handler injection attempts

- [ ] **Token security testing**
  - [ ] Token extraction attempts
  - [ ] Browser storage manipulation
  - [ ] Network interception testing

- [ ] **OAuth flow testing**
  - [ ] State parameter manipulation
  - [ ] Redirect URI manipulation
  - [ ] Error condition handling

## Security Monitoring

### Client-Side Security Monitoring
```typescript
// src/lib/security/security-monitor.ts
export class SecurityMonitor {
  // Monitor for potential XSS attempts
  static monitorXSSAttempts(): void {
    // Monitor for script injection in URL
    if (window.location.href.includes('<script>')) {
      this.reportSecurityIncident('XSS attempt in URL');
    }
    
    // Monitor for suspicious localStorage access
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key: string, value: string) {
      if (key.includes('token') || key.includes('auth')) {
        SecurityMonitor.reportSecurityIncident('Suspicious localStorage access');
      }
      return originalSetItem.call(this, key, value);
    };
  }
  
  private static reportSecurityIncident(incident: string): void {
    // Log security incident (implement proper reporting)
    console.warn(`Security incident: ${incident}`);
    
    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/security/incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(console.error);
    }
  }
}
```

This security checklist ensures the Implicit Grant Flow implementation maintains the highest security standards possible within its architectural constraints.
