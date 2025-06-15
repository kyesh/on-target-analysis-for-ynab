/**
 * Authentication Middleware for OAuth 2.0 Implicit Grant Flow
 * Handles Bearer token validation and extraction from request headers
 */

import { NextRequest } from 'next/server';
import { SecureErrorHandler, AppError, ErrorType } from '@/lib/errors';

export interface AuthValidationResult {
  valid: boolean;
  token?: string;
  error?: string;
  statusCode?: number;
}

export interface TokenPayload {
  exp: number;
  iat: number;
  sub?: string;
  aud?: string;
  iss?: string;
  [key: string]: any;
}

export class AuthMiddleware {
  private static readonly BEARER_PREFIX = 'Bearer ';
  private static readonly TOKEN_PATTERN = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;

  /**
   * Validate authentication from request headers
   */
  static validateRequest(request: NextRequest): AuthValidationResult {
    try {
      // Extract Authorization header
      const authHeader = request.headers.get('Authorization');
      
      if (!authHeader) {
        return {
          valid: false,
          error: 'Missing Authorization header',
          statusCode: 401
        };
      }

      // Check Bearer token format
      if (!authHeader.startsWith(this.BEARER_PREFIX)) {
        return {
          valid: false,
          error: 'Invalid Authorization header format. Expected: Bearer <token>',
          statusCode: 401
        };
      }

      // Extract token
      const token = authHeader.substring(this.BEARER_PREFIX.length).trim();
      
      if (!token) {
        return {
          valid: false,
          error: 'Empty token in Authorization header',
          statusCode: 401
        };
      }

      // Validate token format
      const tokenValidation = this.validateTokenFormat(token);
      if (!tokenValidation.valid) {
        return {
          valid: false,
          error: tokenValidation.error,
          statusCode: 401
        };
      }

      // Check token expiration
      const expirationCheck = this.checkTokenExpiration(token);
      if (!expirationCheck.valid) {
        return {
          valid: false,
          error: expirationCheck.error,
          statusCode: 401
        };
      }

      return {
        valid: true,
        token
      };
    } catch (error) {
      console.error('Auth validation error:', error);
      return {
        valid: false,
        error: 'Authentication validation failed',
        statusCode: 500
      };
    }
  }

  /**
   * Validate JWT token format (basic structure check)
   */
  private static validateTokenFormat(token: string): { valid: boolean; error?: string } {
    // Check basic JWT pattern
    if (!this.TOKEN_PATTERN.test(token)) {
      return {
        valid: false,
        error: 'Invalid token format - not a valid JWT'
      };
    }

    try {
      // Split token into parts
      const parts = token.split('.');
      if (parts.length !== 3) {
        return {
          valid: false,
          error: 'Invalid JWT structure - must have 3 parts'
        };
      }

      // Validate each part is base64url encoded
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part || part.length === 0) {
          return {
            valid: false,
            error: `Invalid JWT part ${i + 1} - empty`
          };
        }

        // Check base64url pattern
        if (!/^[A-Za-z0-9_-]+$/.test(part)) {
          return {
            valid: false,
            error: `Invalid JWT part ${i + 1} - not base64url encoded`
          };
        }
      }

      // Try to decode payload to ensure it's valid JSON
      const payload = this.parseTokenPayload(token);
      if (!payload) {
        return {
          valid: false,
          error: 'Invalid JWT payload - not valid JSON'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Token format validation failed'
      };
    }
  }

  /**
   * Check if token is expired
   */
  private static checkTokenExpiration(token: string): { valid: boolean; error?: string } {
    try {
      const payload = this.parseTokenPayload(token);
      
      if (!payload) {
        return {
          valid: false,
          error: 'Unable to parse token payload'
        };
      }

      // Check for expiration claim
      if (!payload.exp) {
        return {
          valid: false,
          error: 'Token missing expiration claim'
        };
      }

      // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp <= now) {
        return {
          valid: false,
          error: 'Token has expired'
        };
      }

      // Check if token is not yet valid (nbf claim)
      if (payload.nbf && payload.nbf > now) {
        return {
          valid: false,
          error: 'Token not yet valid'
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: 'Token expiration check failed'
      };
    }
  }

  /**
   * Parse JWT payload without verification (for expiration checking only)
   */
  private static parseTokenPayload(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      if (!payload) return null;

      // Handle base64url encoding
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if needed
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      
      const decoded = atob(padded);
      return JSON.parse(decoded) as TokenPayload;
    } catch (error) {
      console.warn('Failed to parse JWT payload:', error);
      return null;
    }
  }

  /**
   * Get token information for debugging
   */
  static getTokenInfo(token: string): {
    payload: TokenPayload | null;
    expiresAt: Date | null;
    isExpired: boolean;
    timeUntilExpiry: number | null;
  } {
    const payload = this.parseTokenPayload(token);
    
    if (!payload || !payload.exp) {
      return {
        payload,
        expiresAt: null,
        isExpired: true,
        timeUntilExpiry: null
      };
    }

    const expiresAt = new Date(payload.exp * 1000);
    const now = Date.now();
    const isExpired = expiresAt.getTime() <= now;
    const timeUntilExpiry = isExpired ? 0 : expiresAt.getTime() - now;

    return {
      payload,
      expiresAt,
      isExpired,
      timeUntilExpiry
    };
  }

  /**
   * Create authentication error response
   */
  static createAuthError(message: string, statusCode: number = 401): AppError {
    return new AppError(
      ErrorType.AUTHENTICATION_ERROR,
      'Authentication failed',
      message,
      statusCode
    );
  }

  /**
   * Sanitize token for logging (remove sensitive parts)
   */
  static sanitizeTokenForLogging(token: string): string {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return '[INVALID_TOKEN]';

      // Show first 8 chars of header, hide payload, show first 8 chars of signature
      return `${parts[0]?.substring(0, 8) || ''}...[PAYLOAD_HIDDEN]...${parts[2]?.substring(0, 8) || ''}...`;
    } catch {
      return '[TOKEN_SANITIZATION_FAILED]';
    }
  }

  /**
   * Extract user ID from token if available
   */
  static extractUserId(token: string): string | null {
    try {
      const payload = this.parseTokenPayload(token);
      return payload?.sub || null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is close to expiring
   */
  static isTokenExpiringSoon(token: string, thresholdMinutes: number = 5): boolean {
    try {
      const tokenInfo = this.getTokenInfo(token);
      if (!tokenInfo.timeUntilExpiry) return true;

      const thresholdMs = thresholdMinutes * 60 * 1000;
      return tokenInfo.timeUntilExpiry <= thresholdMs;
    } catch {
      return true;
    }
  }

  /**
   * Validate token against YNAB-specific requirements
   */
  static validateYNABToken(token: string): { valid: boolean; error?: string } {
    try {
      const payload = this.parseTokenPayload(token);
      
      if (!payload) {
        return { valid: false, error: 'Invalid token payload' };
      }

      // Check for YNAB-specific claims if needed
      // Note: This is a placeholder for any YNAB-specific validation
      // The actual validation would depend on YNAB's token structure
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'YNAB token validation failed' };
    }
  }
}
