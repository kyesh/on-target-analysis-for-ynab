/**
 * Authentication Context Provider for OAuth 2.0 Implicit Grant Flow
 * Manages authentication state and provides auth-related functionality
 */

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { SecureTokenStorage } from './secure-token-storage';
import { TokenValidator } from './token-validator';
import { ImplicitOAuthClient } from './implicit-oauth-client';

export interface AuthUser {
  id: string;
  isAuthenticated: boolean;
  tokenExpiration: Date | null;
  timeUntilExpiry: number | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: () => void;
  logout: () => void;
  refreshAuth: () => void;
  getAuthHeaders: () => { Authorization: string } | {};
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: React.ReactNode;
  enableNotifications?: boolean;
  autoRefreshThreshold?: number; // minutes before expiry to show refresh prompt
}

export function AuthProvider({
  children,
  enableNotifications = true,
  autoRefreshThreshold = 5,
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Update authentication state
  const updateAuthState = useCallback(() => {
    const currentToken = SecureTokenStorage.getToken();
    const isValid = SecureTokenStorage.isTokenValid();

    if (currentToken && isValid) {
      const expiration = SecureTokenStorage.getTokenExpiration();
      const timeUntilExpiry = SecureTokenStorage.getTimeUntilExpiration();

      setToken(currentToken);
      setUser({
        id: 'ynab-user', // We don't have user ID from implicit grant
        isAuthenticated: true,
        tokenExpiration: expiration,
        timeUntilExpiry,
      });
    } else {
      setToken(null);
      setUser(null);
    }

    setIsLoading(false);
  }, []);

  // Initialize authentication state
  useEffect(() => {
    updateAuthState();

    // Start token validation if authenticated
    const currentToken = SecureTokenStorage.getToken();
    if (currentToken && SecureTokenStorage.isTokenValid()) {
      TokenValidator.startValidation({
        checkInterval: 60000, // 1 minute
        warningThreshold: autoRefreshThreshold * 60 * 1000,
        autoRedirectThreshold: 1 * 60 * 1000, // 1 minute
        enableNotifications,
      });
    }

    // Listen for storage changes (e.g., logout in another tab)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'ynab_session') {
        updateAuthState();
      }
    };

    // Listen for page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateAuthState();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      TokenValidator.stopValidation();
    };
  }, [updateAuthState, enableNotifications, autoRefreshThreshold]);

  // Add token validation callback
  useEffect(() => {
    const validationCallback = (result: any) => {
      if (!result.isValid) {
        // Token is invalid, clear auth state
        setToken(null);
        setUser(null);
      } else {
        // Update auth state with current token info
        updateAuthState();
      }
    };

    TokenValidator.addValidationCallback(validationCallback);

    return () => {
      TokenValidator.removeValidationCallback(validationCallback);
    };
  }, [updateAuthState]);

  // Login function
  const login = useCallback(() => {
    try {
      ImplicitOAuthClient.initiateAuth();
    } catch (error) {
      console.error('Login initiation failed:', error);
      // Could show user-friendly error message here
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    SecureTokenStorage.clearToken();
    TokenValidator.stopValidation();
    setToken(null);
    setUser(null);

    // Redirect to sign-in page
    window.location.href = '/auth/signin';
  }, []);

  // Refresh authentication (re-initiate OAuth flow)
  const refreshAuth = useCallback(() => {
    login();
  }, [login]);

  // Get authorization headers for API requests
  const getAuthHeaders = useCallback(() => {
    const currentToken = SecureTokenStorage.getToken();
    if (currentToken && SecureTokenStorage.isTokenValid()) {
      return {
        Authorization: `Bearer ${currentToken}`,
      };
    }
    return {};
  }, []);

  // Computed values
  const isAuthenticated = !!user?.isAuthenticated;

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    token,
    login,
    logout,
    refreshAuth,
    getAuthHeaders,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, login } = useAuth();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        login();
      }
    }, [isAuthenticated, isLoading, login]);

    if (isLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              Authentication Required
            </h2>
            <p className="mb-4 text-gray-600">
              Please sign in to access this page.
            </p>
            <button
              onClick={login}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Sign In
            </button>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Hook for checking if token is expiring soon
export function useTokenExpiration(thresholdMinutes: number = 5) {
  const { user } = useAuth();
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    if (!user?.timeUntilExpiry) {
      setIsExpiringSoon(false);
      return;
    }

    const thresholdMs = thresholdMinutes * 60 * 1000;
    setIsExpiringSoon(user.timeUntilExpiry <= thresholdMs);
  }, [user?.timeUntilExpiry, thresholdMinutes]);

  return {
    isExpiringSoon,
    timeUntilExpiry: user?.timeUntilExpiry,
    tokenExpiration: user?.tokenExpiration,
  };
}

// Hook for making authenticated API requests
export function useAuthenticatedFetch() {
  const { getAuthHeaders, isAuthenticated } = useAuth();

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      if (!isAuthenticated) {
        throw new Error('Not authenticated');
      }

      const authHeaders = getAuthHeaders();
      const headers = {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      };

      return fetch(url, {
        ...options,
        headers,
      });
    },
    [getAuthHeaders, isAuthenticated]
  );

  return authenticatedFetch;
}
