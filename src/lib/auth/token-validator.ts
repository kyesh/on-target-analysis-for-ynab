/**
 * Token Validator for OAuth 2.0 Implicit Grant Flow
 * Handles automatic token validation, expiration monitoring, and re-authentication prompts
 */

import { SecureTokenStorage } from './secure-token-storage';
import { ImplicitOAuthClient } from './implicit-oauth-client';

export interface TokenValidationResult {
  isValid: boolean;
  expiresIn?: number;
  needsRefresh?: boolean;
  error?: string;
}

export interface ValidationConfig {
  checkInterval: number; // milliseconds
  warningThreshold: number; // milliseconds before expiry to show warning
  autoRedirectThreshold: number; // milliseconds before expiry to auto-redirect
  enableNotifications: boolean;
}

export class TokenValidator {
  private static intervalId: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static lastValidationTime = 0;
  private static validationCallbacks: Array<
    (result: TokenValidationResult) => void
  > = [];

  // Default configuration
  private static config: ValidationConfig = {
    checkInterval: 60000, // 1 minute
    warningThreshold: 5 * 60 * 1000, // 5 minutes
    autoRedirectThreshold: 1 * 60 * 1000, // 1 minute
    enableNotifications: true,
  };

  /**
   * Start automatic token validation
   */
  static startValidation(customConfig?: Partial<ValidationConfig>): void {
    if (this.isRunning) {
      console.log('Token validation already running');
      return;
    }

    // Merge custom config with defaults
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    this.isRunning = true;
    console.log('Starting token validation with config:', this.config);

    // Perform initial validation
    this.performValidation();

    // Set up periodic validation
    this.intervalId = setInterval(() => {
      this.performValidation();
    }, this.config.checkInterval);

    // Listen for page visibility changes to validate when page becomes visible
    if (typeof document !== 'undefined') {
      document.addEventListener(
        'visibilitychange',
        this.handleVisibilityChange
      );
    }

    // Listen for storage events (token changes in other tabs)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageChange);
    }
  }

  /**
   * Stop automatic token validation
   */
  static stopValidation(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Remove event listeners
    if (typeof document !== 'undefined') {
      document.removeEventListener(
        'visibilitychange',
        this.handleVisibilityChange
      );
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageChange);
    }

    console.log('Token validation stopped');
  }

  /**
   * Perform immediate token validation
   */
  static validateToken(): TokenValidationResult {
    try {
      const token = SecureTokenStorage.getToken();

      if (!token) {
        return {
          isValid: false,
          error: 'No token available',
        };
      }

      if (!SecureTokenStorage.isTokenValid()) {
        return {
          isValid: false,
          error: 'Token has expired',
        };
      }

      const timeUntilExpiration = SecureTokenStorage.getTimeUntilExpiration();

      if (timeUntilExpiration === null) {
        return {
          isValid: false,
          error: 'Unable to determine token expiration',
        };
      }

      const needsRefresh = timeUntilExpiration <= this.config.warningThreshold;

      return {
        isValid: true,
        expiresIn: Math.floor(timeUntilExpiration / 1000),
        needsRefresh,
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return {
        isValid: false,
        error: 'Token validation failed',
      };
    }
  }

  /**
   * Add callback for validation events
   */
  static addValidationCallback(
    callback: (result: TokenValidationResult) => void
  ): void {
    this.validationCallbacks.push(callback);
  }

  /**
   * Remove validation callback
   */
  static removeValidationCallback(
    callback: (result: TokenValidationResult) => void
  ): void {
    const index = this.validationCallbacks.indexOf(callback);
    if (index > -1) {
      this.validationCallbacks.splice(index, 1);
    }
  }

  /**
   * Get current validation status
   */
  static getValidationStatus(): {
    isRunning: boolean;
    lastValidationTime: number;
    config: ValidationConfig;
    currentTokenStatus: TokenValidationResult;
  } {
    return {
      isRunning: this.isRunning,
      lastValidationTime: this.lastValidationTime,
      config: this.config,
      currentTokenStatus: this.validateToken(),
    };
  }

  /**
   * Force re-authentication
   */
  static forceReauthentication(reason?: string): void {
    console.log('Forcing re-authentication:', reason || 'Manual trigger');

    // Clear current token
    SecureTokenStorage.clearToken();

    // Stop validation
    this.stopValidation();

    // Redirect to sign-in
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin';
    }
  }

  /**
   * Show re-authentication prompt to user
   */
  static showReauthenticationPrompt(timeUntilExpiry: number): void {
    if (!this.config.enableNotifications) return;

    const minutes = Math.floor(timeUntilExpiry / (60 * 1000));
    const message =
      minutes > 0
        ? `Your session will expire in ${minutes} minute(s). Would you like to sign in again?`
        : 'Your session has expired. Please sign in again to continue.';

    // Use browser notification if available and permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(
        'YNAB Analysis - Session Expiring',
        {
          body: message,
          icon: '/favicon.ico',
          requireInteraction: true,
        }
      );

      notification.onclick = () => {
        notification.close();
        this.handleReauthenticationChoice(true);
      };

      // Auto-close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    } else {
      // Fallback to confirm dialog
      const shouldReauth = confirm(message);
      this.handleReauthenticationChoice(shouldReauth);
    }
  }

  /**
   * Handle user's re-authentication choice
   */
  private static handleReauthenticationChoice(shouldReauth: boolean): void {
    if (shouldReauth) {
      // Clear current token and redirect to OAuth
      SecureTokenStorage.clearToken();
      ImplicitOAuthClient.initiateAuth();
    } else {
      // User declined, they'll be redirected when token actually expires
      console.log('User declined re-authentication');
    }
  }

  /**
   * Perform validation and handle results
   */
  private static performValidation(): void {
    this.lastValidationTime = Date.now();
    const result = this.validateToken();

    // Notify callbacks
    this.validationCallbacks.forEach(callback => {
      try {
        callback(result);
      } catch (error) {
        console.error('Validation callback error:', error);
      }
    });

    if (!result.isValid) {
      this.handleInvalidToken(result.error);
      return;
    }

    const timeUntilExpiration = SecureTokenStorage.getTimeUntilExpiration();
    if (timeUntilExpiration === null) return;

    // Handle approaching expiration
    if (timeUntilExpiration <= this.config.autoRedirectThreshold) {
      console.log('Token expiring soon, forcing re-authentication');
      this.forceReauthentication('Token expiring soon');
    } else if (timeUntilExpiration <= this.config.warningThreshold) {
      console.log('Token expiring soon, showing warning');
      this.showReauthenticationPrompt(timeUntilExpiration);
    }
  }

  /**
   * Handle invalid token
   */
  private static handleInvalidToken(error?: string): void {
    console.log('Invalid token detected:', error);

    // Clear token storage
    SecureTokenStorage.clearToken();

    // Stop validation
    this.stopValidation();

    // Redirect to sign-in page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/signin';
    }
  }

  /**
   * Handle page visibility change
   */
  private static handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible' && this.isRunning) {
      // Page became visible, perform immediate validation
      console.log('Page became visible, performing token validation');
      this.performValidation();
    }
  };

  /**
   * Handle storage changes (e.g., logout in another tab)
   */
  private static handleStorageChange = (event: StorageEvent): void => {
    if (event.key === 'ynab_session' && event.newValue === null) {
      // Token was cleared in another tab
      console.log('Token cleared in another tab');
      this.handleInvalidToken('Token cleared in another tab');
    }
  };

  /**
   * Request notification permission
   */
  static async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Update validation configuration
   */
  static updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('Token validation config updated:', this.config);

    // Restart validation with new config if currently running
    if (this.isRunning) {
      this.stopValidation();
      this.startValidation();
    }
  }
}
