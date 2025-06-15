/**
 * Secure Token Storage for OAuth 2.0 Implicit Grant Flow
 * Implements memory-first storage with sessionStorage backup and integrity checking
 */

export interface TokenData {
  token: string;
  expiresAt: number;
  issuedAt: number;
}

export interface StoredTokenData {
  token: string;
  expiresAt: number;
  timestamp: number;
  userAgent: string;
  integrity: string;
}

export class SecureTokenStorage {
  private static readonly STORAGE_KEY = 'ynab_session';
  private static readonly INTEGRITY_KEY = 'ynab_session_integrity';

  // In-memory storage (most secure)
  private static memoryToken: string | null = null;
  private static memoryExpiresAt: number | null = null;

  /**
   * Store access token securely with integrity checking
   */
  static storeToken(accessToken: string, expiresIn: number): void {
    try {
      const now = Date.now();
      const expiresAt = now + expiresIn * 1000;

      // Store in memory (most secure)
      this.memoryToken = accessToken;
      this.memoryExpiresAt = expiresAt;

      // Create session data for backup storage
      const sessionData: StoredTokenData = {
        token: this.obfuscateToken(accessToken),
        expiresAt,
        timestamp: now,
        userAgent: this.getBrowserFingerprint(),
        integrity: '', // Will be calculated below
      };

      // Calculate integrity hash
      sessionData.integrity = this.calculateIntegrity(sessionData);

      // Store in sessionStorage as backup
      try {
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessionData));
        sessionStorage.setItem(this.INTEGRITY_KEY, sessionData.integrity);
      } catch (storageError) {
        console.warn('Failed to store token in sessionStorage:', storageError);
        // Continue with memory-only storage
      }

      console.log('Token stored successfully');
    } catch (error) {
      console.error('Failed to store token:', error);
      throw new Error('Token storage failed');
    }
  }

  /**
   * Retrieve access token with integrity verification
   */
  static getToken(): string | null {
    try {
      // Check memory first (fastest and most secure)
      if (
        this.memoryToken &&
        this.memoryExpiresAt &&
        Date.now() < this.memoryExpiresAt
      ) {
        return this.memoryToken;
      }

      // Clear expired memory token
      if (this.memoryExpiresAt && Date.now() >= this.memoryExpiresAt) {
        this.memoryToken = null;
        this.memoryExpiresAt = null;
      }

      // Fallback to sessionStorage
      return this.retrieveFromSessionStorage();
    } catch (error) {
      console.warn('❌ Token retrieval error:', error);
      this.clearToken();
      return null;
    }
  }

  /**
   * Check if current token is valid and not expired
   */
  static isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      // For YNAB tokens (bearer tokens, not JWTs), check our stored expiration
      if (this.memoryExpiresAt && Date.now() < this.memoryExpiresAt) {
        return true;
      }

      // Check sessionStorage expiration
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const sessionData: StoredTokenData = JSON.parse(stored);
        return Date.now() < sessionData.expiresAt;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get token expiration date
   */
  static getTokenExpiration(): Date | null {
    try {
      // For YNAB tokens, use our stored expiration time
      if (this.memoryExpiresAt) {
        return new Date(this.memoryExpiresAt);
      }

      // Check sessionStorage expiration
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const sessionData: StoredTokenData = JSON.parse(stored);
        return new Date(sessionData.expiresAt);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get time until token expires in milliseconds
   */
  static getTimeUntilExpiration(): number | null {
    const expiration = this.getTokenExpiration();
    if (!expiration) return null;

    const timeUntilExpiry = expiration.getTime() - Date.now();
    return timeUntilExpiry > 0 ? timeUntilExpiry : 0;
  }

  /**
   * Clear all stored token data
   */
  static clearToken(): void {
    // Clear memory
    this.memoryToken = null;
    this.memoryExpiresAt = null;

    // Clear sessionStorage
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.INTEGRITY_KEY);
    } catch (error) {
      console.warn('Failed to clear sessionStorage:', error);
    }

    console.log('Token cleared successfully');
  }

  /**
   * Retrieve token from sessionStorage with integrity verification
   */
  private static retrieveFromSessionStorage(): string | null {
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      const storedIntegrity = sessionStorage.getItem(this.INTEGRITY_KEY);

      if (!stored || !storedIntegrity) return null;

      const sessionData: StoredTokenData = JSON.parse(stored);

      // Verify integrity
      const calculatedIntegrity = this.calculateIntegrity(sessionData);
      if (calculatedIntegrity !== storedIntegrity) {
        console.warn(
          'Token integrity check failed - possible tampering detected'
        );
        this.clearToken();
        return null;
      }

      // Check expiration
      if (Date.now() >= sessionData.expiresAt) {
        this.clearToken();
        return null;
      }

      // Verify browser fingerprint
      if (sessionData.userAgent !== this.getBrowserFingerprint()) {
        console.warn(
          'Browser fingerprint mismatch - possible session hijacking'
        );
        this.clearToken();
        return null;
      }

      // Restore to memory
      const token = this.deobfuscateToken(sessionData.token);
      this.memoryToken = token;
      this.memoryExpiresAt = sessionData.expiresAt;

      return token;
    } catch (error) {
      console.warn('Failed to retrieve token from sessionStorage:', error);
      this.clearToken();
      return null;
    }
  }

  /**
   * Simple token obfuscation (not cryptographic security, just basic protection)
   */
  private static obfuscateToken(token: string): string {
    try {
      const key = this.getObfuscationKey();
      const obfuscated = token
        .split('')
        .map((char, i) =>
          String.fromCharCode(
            char.charCodeAt(0) ^ key.charCodeAt(i % key.length)
          )
        )
        .join('');
      return btoa(obfuscated);
    } catch {
      // Fallback to base64 encoding if obfuscation fails
      return btoa(token);
    }
  }

  /**
   * Deobfuscate token
   */
  private static deobfuscateToken(obfuscated: string): string {
    try {
      const key = this.getObfuscationKey();
      const decoded = atob(obfuscated);
      return decoded
        .split('')
        .map((char, i) =>
          String.fromCharCode(
            char.charCodeAt(0) ^ key.charCodeAt(i % key.length)
          )
        )
        .join('');
    } catch {
      // Fallback to base64 decoding if deobfuscation fails
      return atob(obfuscated);
    }
  }

  /**
   * Generate obfuscation key from browser characteristics
   */
  private static getObfuscationKey(): string {
    try {
      const characteristics = [
        navigator.userAgent.substring(0, 50),
        window.location.hostname,
        screen.width.toString(),
        screen.height.toString(),
        new Date().getTimezoneOffset().toString(),
      ].join('|');

      return btoa(characteristics).substring(0, 16);
    } catch {
      return 'fallback-key-16';
    }
  }

  /**
   * Calculate integrity hash for stored data
   */
  private static calculateIntegrity(
    data: Omit<StoredTokenData, 'integrity'>
  ): string {
    try {
      const str = JSON.stringify({
        token: data.token,
        expiresAt: data.expiresAt,
        timestamp: data.timestamp,
        userAgent: data.userAgent,
      });

      // Simple hash function (not cryptographically secure, but sufficient for integrity checking)
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      return hash.toString(16);
    } catch {
      return 'integrity-failed';
    }
  }

  /**
   * Get browser fingerprint for session validation
   */
  private static getBrowserFingerprint(): string {
    try {
      return btoa(navigator.userAgent + window.location.hostname).substring(
        0,
        32
      );
    } catch {
      return 'unknown-browser';
    }
  }

  /**
   * Parse JWT payload without verification (for expiration checking only)
   */
  private static parseJWTPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      if (!payload) return null;

      // Handle base64url encoding
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(base64);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }

  /**
   * Get storage statistics for debugging
   */
  static getStorageInfo(): {
    hasMemoryToken: boolean;
    hasSessionStorageToken: boolean;
    tokenExpiration: Date | null;
    timeUntilExpiration: number | null;
    isValid: boolean;
  } {
    return {
      hasMemoryToken: !!this.memoryToken,
      hasSessionStorageToken: !!sessionStorage.getItem(this.STORAGE_KEY),
      tokenExpiration: this.getTokenExpiration(),
      timeUntilExpiration: this.getTimeUntilExpiration(),
      isValid: this.isTokenValid(),
    };
  }
}
