/**
 * Environment Configuration and Validation
 * Based on our security plan requirements
 */

// Environment variable validation result
interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Security configuration interface
interface SecurityConfig {
  YNAB_ACCESS_TOKEN: string;
  NODE_ENV: 'development' | 'production' | 'test';
  API_BASE_URL: string;
  RATE_LIMIT_REQUESTS_PER_HOUR: number;
  CACHE_TTL_SECONDS: number;
  ENABLE_SECURITY_HEADERS: boolean;
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}

// YNAB token validation pattern
const YNAB_TOKEN_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

/**
 * Validate YNAB access token format
 */
export function validateYNABToken(token: string): ValidationResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'YNAB access token is required' };
  }
  
  if (!YNAB_TOKEN_PATTERN.test(token)) {
    return { 
      valid: false, 
      error: 'Invalid YNAB access token format. Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' 
    };
  }
  
  return { valid: true };
}

/**
 * Validate all required environment variables
 */
export function validateEnvironment(): ValidationResult {
  const requiredVars = [
    'YNAB_ACCESS_TOKEN',
    'NODE_ENV'
  ];
  
  // Check for missing required variables
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required environment variables: ${missing.join(', ')}`
    };
  }
  
  // Validate YNAB token format
  const tokenValidation = validateYNABToken(process.env.YNAB_ACCESS_TOKEN!);
  if (!tokenValidation.valid) {
    return {
      valid: false,
      error: `Invalid YNAB_ACCESS_TOKEN: ${tokenValidation.error}`
    };
  }
  
  // Validate NODE_ENV
  const validEnvs = ['development', 'production', 'test'];
  if (!validEnvs.includes(process.env.NODE_ENV!)) {
    return {
      valid: false,
      error: `Invalid NODE_ENV. Must be one of: ${validEnvs.join(', ')}`
    };
  }
  
  return { valid: true };
}

/**
 * Get validated configuration
 */
export function getConfig(): SecurityConfig {
  const validation = validateEnvironment();
  
  if (!validation.valid) {
    throw new Error(`Configuration validation failed: ${validation.error}`);
  }
  
  return {
    YNAB_ACCESS_TOKEN: process.env.YNAB_ACCESS_TOKEN!,
    NODE_ENV: process.env.NODE_ENV as 'development' | 'production' | 'test',
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.ynab.com/v1',
    RATE_LIMIT_REQUESTS_PER_HOUR: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR || '200', 10),
    CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10),
    ENABLE_SECURITY_HEADERS: process.env.ENABLE_SECURITY_HEADERS !== 'false',
    LOG_LEVEL: (process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info'
  };
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get safe configuration for client-side use (no secrets)
 */
export function getClientConfig() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.ynab.com/v1',
    APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'YNAB Off-Target Analysis',
    ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true'
  };
}

// Export configuration for use throughout the application
export const config = getConfig();
