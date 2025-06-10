/**
 * Secure Error Handling Framework
 * Based on our security plan requirements
 */

// Error types for the application
export enum ErrorType {
  AUTHENTICATION = 'authentication',
  RATE_LIMIT = 'rate_limit',
  NOT_FOUND = 'not_found',
  SERVER_ERROR = 'server_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  CONFIGURATION_ERROR = 'configuration_error',
  DATA_PROCESSING_ERROR = 'data_processing_error'
}

// Application error class
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isRetryable: boolean;
  public readonly userMessage: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    type: ErrorType,
    message: string,
    userMessage: string,
    statusCode: number = 500,
    isRetryable: boolean = false,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
    this.userMessage = userMessage;
    this.context = context;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

// Secure Error Handler Class
export class SecureErrorHandler {
  /**
   * Get user-friendly error message (no sensitive data)
   */
  static getUserFriendlyMessage(error: Error | AppError): string {
    if (error instanceof AppError) {
      return error.userMessage;
    }

    // Generic error messages for security
    const errorMap: Record<string, string> = {
      'AUTHENTICATION_FAILED': 'Please check your YNAB access token and try again',
      'RATE_LIMIT_EXCEEDED': 'Too many requests. Please wait and try again in a few minutes',
      'NETWORK_ERROR': 'Unable to connect to YNAB. Please check your internet connection',
      'DATA_PROCESSING_ERROR': 'Error processing budget data. Please try again',
      'CONFIGURATION_ERROR': 'Application configuration error. Please check your setup',
      'VALIDATION_ERROR': 'Invalid data provided. Please check your input',
      'UNKNOWN_ERROR': 'An unexpected error occurred. Please try again'
    };

    return errorMap[error.name] || errorMap['UNKNOWN_ERROR'];
  }

  /**
   * Sanitize error message (remove sensitive data)
   */
  private static sanitizeErrorMessage(message: string): string {
    return message
      // Remove potential tokens
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[TOKEN]')
      // Remove Bearer tokens
      .replace(/Bearer\s+[^\s]+/gi, 'Bearer [TOKEN]')
      // Remove monetary amounts
      .replace(/\$[\d,]+\.?\d*/g, '$[AMOUNT]')
      // Remove potential API keys
      .replace(/[A-Za-z0-9]{32,}/g, '[REDACTED]');
  }

  /**
   * Log error securely (no sensitive data)
   */
  static logError(error: Error | AppError, context: string): void {
    const sanitizedError = {
      name: error.name,
      message: this.sanitizeErrorMessage(error.message),
      type: error instanceof AppError ? error.type : 'unknown',
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      stack: error.stack ? this.sanitizeErrorMessage(error.stack) : undefined
    };

    // Only log in development or if explicitly enabled
    if (process.env.NODE_ENV === 'development' || process.env.ENABLE_ERROR_LOGGING === 'true') {
      console.error('Application Error:', sanitizedError);
    }
  }

  /**
   * Handle API errors from YNAB
   */
  static handleAPIError(error: unknown, context: string = 'API_CALL'): AppError {
    this.logError(error as Error, context);

    if (error instanceof AppError) {
      return error;
    }

    // Handle fetch/axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as any).response;
      
      switch (response?.status) {
        case 401:
          return new AppError(
            ErrorType.AUTHENTICATION,
            'Authentication failed',
            'Your YNAB access token is invalid or expired. Please check your token and try again.',
            401,
            false
          );
        case 429:
          return new AppError(
            ErrorType.RATE_LIMIT,
            'Rate limit exceeded',
            'Too many requests to YNAB API. Please wait a few minutes and try again.',
            429,
            true
          );
        case 404:
          return new AppError(
            ErrorType.NOT_FOUND,
            'Resource not found',
            'The requested budget or category was not found.',
            404,
            false
          );
        case 500:
        case 502:
        case 503:
          return new AppError(
            ErrorType.SERVER_ERROR,
            'Server error',
            'YNAB service is temporarily unavailable. Please try again later.',
            response.status,
            true
          );
        default:
          return new AppError(
            ErrorType.SERVER_ERROR,
            `HTTP ${response.status}`,
            'An error occurred while communicating with YNAB. Please try again.',
            response.status,
            true
          );
      }
    }

    // Handle network errors
    if (error && typeof error === 'object' && 'code' in error) {
      const networkError = error as { code: string };
      if (networkError.code === 'NETWORK_ERROR' || networkError.code === 'ENOTFOUND') {
        return new AppError(
          ErrorType.NETWORK_ERROR,
          'Network error',
          'Unable to connect to YNAB. Please check your internet connection.',
          0,
          true
        );
      }
    }

    // Generic error fallback
    return new AppError(
      ErrorType.SERVER_ERROR,
      'Unknown error',
      'An unexpected error occurred. Please try again.',
      500,
      false
    );
  }
}

// Predefined error creators for common scenarios
export const createAuthenticationError = (message: string = 'Authentication failed') =>
  new AppError(
    ErrorType.AUTHENTICATION,
    message,
    'Please check your YNAB access token and try again',
    401,
    false
  );

export const createRateLimitError = (resetTime?: number) =>
  new AppError(
    ErrorType.RATE_LIMIT,
    'Rate limit exceeded',
    resetTime 
      ? `Rate limit exceeded. Please wait ${Math.ceil(resetTime / 1000)} seconds and try again.`
      : 'Rate limit exceeded. Please wait and try again.',
    429,
    true,
    { resetTime }
  );

export const createValidationError = (message: string) =>
  new AppError(
    ErrorType.VALIDATION_ERROR,
    message,
    'Invalid data provided. Please check your input and try again.',
    400,
    false
  );

export const createConfigurationError = (message: string) =>
  new AppError(
    ErrorType.CONFIGURATION_ERROR,
    message,
    'Application configuration error. Please check your setup.',
    500,
    false
  );
