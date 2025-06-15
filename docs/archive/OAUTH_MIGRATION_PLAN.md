# OAuth 2.0 Migration Plan

## Overview

Migration from YNAB Personal Access Tokens to OAuth 2.0 Authorization Code Grant Flow for production multi-user deployment.

## Phase 1: OAuth Application Setup

### 1.1 YNAB OAuth Application Registration

1. **Register OAuth Application** at https://api.ynab.com/#oauth-applications
2. **Application Details**:
   - Name: "YNAB Off-Target Assignment Analysis"
   - Description: "Comprehensive budget target alignment analysis tool"
   - Redirect URI: `https://your-domain.com/api/auth/callback`
   - Website: `https://your-domain.com`

### 1.2 Environment Configuration

```env
# OAuth Configuration
YNAB_CLIENT_ID=your-oauth-client-id
YNAB_CLIENT_SECRET=your-oauth-client-secret
YNAB_REDIRECT_URI=https://your-domain.com/api/auth/callback
NEXTAUTH_SECRET=your-nextauth-secret-32-chars-min
NEXTAUTH_URL=https://your-domain.com

# Session Configuration
SESSION_ENCRYPTION_KEY=your-session-encryption-key
TOKEN_ENCRYPTION_KEY=your-token-encryption-key
```

## Phase 2: Authentication Implementation

### 2.1 NextAuth.js Integration

```bash
npm install next-auth
npm install @types/next-auth
```

### 2.2 OAuth Provider Configuration

```typescript
// src/lib/auth/ynab-provider.ts
import { OAuthConfig, OAuthUserConfig } from 'next-auth/providers';

export interface YNABProfile {
  id: string;
  user: {
    id: string;
  };
}

export default function YNABProvider<P extends YNABProfile>(
  options: OAuthUserConfig<P>
): OAuthConfig<P> {
  return {
    id: 'ynab',
    name: 'YNAB',
    type: 'oauth',
    authorization: {
      url: 'https://app.ynab.com/oauth/authorize',
      params: {
        scope: 'read-only',
        response_type: 'code',
      },
    },
    token: 'https://app.ynab.com/oauth/token',
    userinfo: 'https://api.ynab.com/v1/user',
    profile(profile) {
      return {
        id: profile.data.user.id,
        name: null,
        email: null,
        image: null,
      };
    },
    options,
  };
}
```

### 2.3 NextAuth Configuration

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import YNABProvider from '@/lib/auth/ynab-provider';

const handler = NextAuth({
  providers: [
    YNABProvider({
      clientId: process.env.YNAB_CLIENT_ID!,
      clientSecret: process.env.YNAB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.expiresAt = token.expiresAt;
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});

export { handler as GET, handler as POST };
```

## Phase 3: Token Management

### 3.1 Secure Token Storage

```typescript
// src/lib/auth/token-manager.ts
import { encrypt, decrypt } from '@/lib/crypto';

export class TokenManager {
  private static readonly TOKEN_KEY = 'ynab_tokens';

  static async storeTokens(
    userId: string,
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    }
  ) {
    const encryptedTokens = await encrypt(JSON.stringify(tokens));
    // Store in secure database or session
    await this.saveToSecureStorage(userId, encryptedTokens);
  }

  static async getTokens(userId: string) {
    const encryptedTokens = await this.getFromSecureStorage(userId);
    if (!encryptedTokens) return null;

    const decryptedTokens = await decrypt(encryptedTokens);
    return JSON.parse(decryptedTokens);
  }

  static async refreshTokenIfNeeded(userId: string) {
    const tokens = await this.getTokens(userId);
    if (!tokens) return null;

    // Check if token expires within 5 minutes
    if (tokens.expiresAt - Date.now() < 5 * 60 * 1000) {
      return await this.refreshToken(tokens.refreshToken);
    }

    return tokens.accessToken;
  }

  private static async refreshToken(refreshToken: string) {
    const response = await fetch('https://app.ynab.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.YNAB_CLIENT_ID!,
        client_secret: process.env.YNAB_CLIENT_SECRET!,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    return await response.json();
  }
}
```

### 3.2 Updated YNAB Client

```typescript
// src/lib/ynab-client-oauth.ts
import { getServerSession } from 'next-auth/next';
import { TokenManager } from '@/lib/auth/token-manager';

export class YNABClientOAuth extends YNABClient {
  constructor(private userId?: string) {
    super();
  }

  async getAuthToken(): Promise<string> {
    if (this.userId) {
      // Server-side: get token from secure storage
      return await TokenManager.refreshTokenIfNeeded(this.userId);
    } else {
      // Client-side: get token from session
      const session = await getServerSession();
      return session?.accessToken;
    }
  }

  protected async makeAuthenticatedRequest<T>(endpoint: string): Promise<T> {
    const token = await this.getAuthToken();
    if (!token) {
      throw new Error('No valid authentication token available');
    }

    return await this.makeRequest(endpoint, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
```

## Phase 4: Migration Strategy

### 4.1 Backward Compatibility

```typescript
// src/lib/auth/auth-adapter.ts
export class AuthAdapter {
  static async getYNABClient(request?: Request): Promise<YNABClient> {
    // Check if OAuth session exists
    const session = await getServerSession();
    if (session?.accessToken) {
      return new YNABClientOAuth(session.user.id);
    }

    // Fallback to Personal Access Token (development only)
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.YNAB_ACCESS_TOKEN
    ) {
      return new YNABClient();
    }

    throw new Error('No valid authentication method available');
  }
}
```

### 4.2 Gradual Migration Steps

1. **Phase 1**: Implement OAuth alongside existing PAT authentication
2. **Phase 2**: Add OAuth login UI and user onboarding
3. **Phase 3**: Test OAuth flow thoroughly in staging environment
4. **Phase 4**: Deploy to production with both authentication methods
5. **Phase 5**: Deprecate PAT authentication for production users

## Phase 5: Security Considerations

### 5.1 Token Security

- **Encryption**: All tokens encrypted at rest using AES-256
- **Secure Storage**: Tokens stored in encrypted database or secure session storage
- **Token Rotation**: Automatic refresh token rotation
- **Expiration Handling**: Graceful handling of expired tokens

### 5.2 OAuth Security Best Practices

- **PKCE**: Implement Proof Key for Code Exchange for additional security
- **State Parameter**: Use cryptographically secure state parameter
- **Redirect URI Validation**: Strict validation of redirect URIs
- **Scope Limitation**: Request only necessary scopes (read-only)

### 5.3 Session Security

```typescript
// src/lib/auth/session-config.ts
export const sessionConfig = {
  strategy: 'jwt' as const,
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60, // 24 hours
  generateSessionToken: () => {
    return crypto.randomUUID();
  },
};
```

## Phase 6: Testing Strategy

### 6.1 OAuth Flow Testing

- **Authorization Flow**: Test complete OAuth authorization flow
- **Token Refresh**: Test automatic token refresh functionality
- **Error Handling**: Test expired token and invalid token scenarios
- **Multi-User**: Test concurrent user sessions

### 6.2 Security Testing

- **Token Leakage**: Verify tokens are not exposed in client-side code
- **Session Hijacking**: Test session security measures
- **CSRF Protection**: Verify CSRF protection is working
- **Redirect URI Attacks**: Test redirect URI validation

## Implementation Timeline

### Week 1: Setup and Configuration

- Register OAuth application with YNAB
- Set up NextAuth.js and OAuth provider
- Configure environment variables

### Week 2: Core Implementation

- Implement OAuth flow and token management
- Create authentication middleware
- Update YNAB client for OAuth

### Week 3: UI and UX

- Create login/logout UI components
- Implement user onboarding flow
- Add authentication state management

### Week 4: Testing and Security

- Comprehensive testing of OAuth flow
- Security audit and penetration testing
- Performance testing with multiple users

### Week 5: Deployment and Migration

- Deploy to staging environment
- Gradual rollout to production
- Monitor and fix any issues

## Success Criteria

- ✅ Secure OAuth 2.0 implementation
- ✅ Multi-user support with isolated data
- ✅ Automatic token refresh functionality
- ✅ Comprehensive error handling
- ✅ Security audit passed
- ✅ Performance benchmarks met
- ✅ User acceptance testing completed
