/**
 * Implicit OAuth Client for YNAB OAuth 2.0 Implicit Grant Flow
 * Handles client-side OAuth authentication with security best practices
 */

export interface OAuthCallbackResult {
  success: boolean;
  accessToken?: string;
  expiresIn?: number;
  error?: string;
  errorDescription?: string;
}

export class ImplicitOAuthClient {
  private static readonly SCOPE = 'read-only';
  private static readonly STATE_STORAGE_KEY = 'oauth_state';
  private static readonly NONCE_STORAGE_KEY = 'oauth_nonce';

  /**
   * Resolve the OAuth Client ID at runtime.
   * Prefers injected public config (window.__PUBLIC_CONFIG__) and falls back to process.env for dev.
   */
  private static getClientId(): string {
    try {
      if (typeof window !== 'undefined') {
        const cfg = (window as any).__PUBLIC_CONFIG__;
        if (cfg && typeof cfg.YNAB_CLIENT_ID === 'string') {
          return cfg.YNAB_CLIENT_ID;
        }
      }
      // Server-side or no public config; use env (useful for dev)
      return process.env.NEXT_PUBLIC_YNAB_CLIENT_ID || '';
    } catch {
      return '';
    }
  }

  /**
   * Get the OAuth redirect URI for the current environment
   */
  private static getRedirectUri(): string {
    if (typeof window === 'undefined') {
      throw new Error('OAuth client can only be used in browser environment');
    }
    return `${window.location.origin}/auth/callback`;
  }

  /**
   * Initiate the OAuth 2.0 Implicit Grant flow
   * Redirects user to YNAB OAuth authorization page
   */
  static initiateAuth(): void {
    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error(
        'YNAB Client ID not configured. Please set NEXT_PUBLIC_YNAB_CLIENT_ID environment variable.'
      );
    }

    try {
      const state = this.generateSecureState();
      const nonce = this.generateNonce();

      // Store state and nonce for validation
      sessionStorage.setItem(this.STATE_STORAGE_KEY, state);
      sessionStorage.setItem(this.NONCE_STORAGE_KEY, nonce);

      const authUrl = new URL('https://app.ynab.com/oauth/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', this.getRedirectUri());
      authUrl.searchParams.set('response_type', 'token');
      authUrl.searchParams.set('scope', this.SCOPE);
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('nonce', nonce);

      // Redirect to YNAB OAuth
      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('Failed to initiate OAuth flow:', error);
      throw new Error('Failed to start authentication process');
    }
  }

  /**
   * Handle OAuth callback and extract tokens from URL fragment
   * Should be called on the OAuth callback page
   */
  static handleCallback(): OAuthCallbackResult {
    try {
      const fragment = window.location.hash.substring(1);
      if (!fragment) {
        return { success: false, error: 'No OAuth response received' };
      }

      const params = new URLSearchParams(fragment);

      // Validate state parameter to prevent CSRF attacks
      const state = params.get('state');
      const storedState = sessionStorage.getItem(this.STATE_STORAGE_KEY);

      if (!state || !storedState || state !== storedState) {
        this.cleanupStoredParameters();
        return {
          success: false,
          error: 'Invalid state parameter - possible CSRF attack',
        };
      }

      // Clean up stored parameters
      this.cleanupStoredParameters();

      // Check for OAuth error
      const error = params.get('error');
      if (error) {
        const errorDescription = params.get('error_description');
        return {
          success: false,
          error,
          errorDescription: errorDescription || undefined,
        };
      }

      // Extract access token
      const accessToken = params.get('access_token');
      const tokenType = params.get('token_type');
      const expiresIn = parseInt(params.get('expires_in') || '0', 10);

      if (!accessToken) {
        return { success: false, error: 'No access token received' };
      }

      if (tokenType && tokenType.toLowerCase() !== 'bearer') {
        return { success: false, error: 'Unsupported token type' };
      }

      // Validate token format (YNAB uses bearer tokens, not JWTs)
      if (!this.isValidYnabTokenFormat(accessToken)) {
        return { success: false, error: 'Invalid token format received' };
      }

      // Immediately clear URL fragment for security
      this.clearUrlFragment();

      return {
        success: true,
        accessToken,
        expiresIn: expiresIn > 0 ? expiresIn : 7200, // Default to 2 hours if not provided
      };
    } catch (error) {
      console.error('OAuth callback handling error:', error);
      this.cleanupStoredParameters();
      return { success: false, error: 'Failed to process OAuth callback' };
    }
  }

  /**
   * Generate cryptographically secure state parameter
   */
  private static generateSecureState(): string {
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      throw new Error(
        'Crypto API not available - secure random generation not possible'
      );
    }

    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join(
      ''
    );
  }

  /**
   * Generate nonce for additional security
   */
  private static generateNonce(): string {
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      throw new Error(
        'Crypto API not available - secure random generation not possible'
      );
    }

    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join(
      ''
    );
  }

  /**
   * Validation for YNAB bearer token format
   */
  private static isValidYnabTokenFormat(token: string): boolean {
    try {
      // YNAB tokens are typically alphanumeric with hyphens and underscores
      // They are not JWTs, so we use a simpler validation
      if (!token || token.length === 0) return false;

      // Check for reasonable token length (YNAB tokens are typically 40-60 characters)
      if (token.length < 20 || token.length > 100) return false;

      // Check for valid characters (alphanumeric, hyphens, underscores)
      if (!/^[A-Za-z0-9_-]+$/.test(token)) return false;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Basic validation of JWT token format (kept for compatibility)
   */
  private static isValidTokenFormat(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      // Validate each part is base64url encoded
      for (const part of parts) {
        if (!part || part.length === 0) return false;
        // Basic base64url pattern check
        if (!/^[A-Za-z0-9_-]+$/.test(part)) return false;
      }

      // Try to decode the payload to ensure it's valid JSON
      const payloadPart = parts[1];
      if (!payloadPart) return false;

      const payload = JSON.parse(
        atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/'))
      );

      // Check for required JWT claims
      if (!payload.exp || !payload.iat) return false;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear URL fragment immediately after token extraction for security
   */
  private static clearUrlFragment(): void {
    try {
      // Replace current history entry to remove fragment
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + window.location.search
      );
    } catch (error) {
      console.warn('Failed to clear URL fragment:', error);
    }
  }

  /**
   * Clean up stored OAuth parameters
   */
  private static cleanupStoredParameters(): void {
    try {
      sessionStorage.removeItem(this.STATE_STORAGE_KEY);
      sessionStorage.removeItem(this.NONCE_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to cleanup OAuth parameters:', error);
    }
  }

  /**
   * Validate OAuth configuration
   */
  static validateConfiguration(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    const clientId = this.getClientId();
    if (!clientId) {
      errors.push('NEXT_PUBLIC_YNAB_CLIENT_ID environment variable is not set');
    }

    if (typeof window !== 'undefined') {
      if (
        window.location.protocol !== 'https:' &&
        window.location.hostname !== 'localhost'
      ) {
        errors.push('OAuth requires HTTPS in production');
      }

      if (!window.crypto || !window.crypto.getRandomValues) {
        errors.push(
          'Crypto API not available - secure random generation not possible'
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get OAuth authorization URL for testing/debugging
   */
  static getAuthorizationUrl(): string {
    const state = this.generateSecureState();
    const nonce = this.generateNonce();
    const clientId = this.getClientId();

    const authUrl = new URL('https://app.ynab.com/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', this.getRedirectUri());
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', this.SCOPE);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('nonce', nonce);

    return authUrl.toString();
  }
}
