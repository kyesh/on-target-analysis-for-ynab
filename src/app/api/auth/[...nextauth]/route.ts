/**
 * NextAuth.js Configuration for OAuth 2.0 Implicit Grant Flow
 * Simplified configuration since authentication is handled client-side
 */

import NextAuth from 'next-auth';
import type { NextAuthOptions } from 'next-auth';

// Minimal NextAuth configuration for Implicit Grant Flow
const authOptions: NextAuthOptions = {
  // No providers needed since OAuth is handled client-side
  providers: [],

  // Use JWT strategy (no database needed)
  session: {
    strategy: 'jwt',
    maxAge: 2 * 60 * 60, // 2 hours (shorter for security with implicit grant)
    updateAge: 30 * 60, // 30 minutes
  },

  // Custom pages for OAuth flow
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },

  callbacks: {
    // JWT callback - minimal handling since tokens are managed client-side
    async jwt({ token, user, account }) {
      // Store user info if available
      if (user) {
        token.sub = user.id;
        token.name = user.name;
        token.email = user.email;
      }

      // Store account info if available
      if (account) {
        token.provider = account.provider;
        token.type = account.type;
      }

      return token;
    },

    // Session callback - return minimal session info
    async session({ session, token }) {
      if (token) {
        session.user = {
          name: token.name || null,
          email: token.email || null,
          image: null,
        };

        // Add custom properties
        (session as any).provider = token.provider || 'implicit-grant';
        (session as any).tokenType = token.type || 'oauth';
        (session as any).userId = token.sub || 'unknown';
      }

      return session;
    },

    // Redirect callback - handle post-authentication redirects
    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      // Allow same-origin URLs
      if (new URL(url).origin === baseUrl) {
        return url;
      }

      // Default to base URL for security
      return baseUrl;
    },

    // Sign in callback - always allow (authentication handled client-side)
    async signIn({ user, account, profile }) {
      return true;
    },
  },

  // Events for logging and monitoring
  events: {
    async signIn(message) {
      console.log('NextAuth SignIn Event:', {
        user: message.user?.id,
        account: message.account?.provider,
        timestamp: new Date().toISOString(),
      });
    },

    async signOut(message) {
      console.log('NextAuth SignOut Event:', {
        token: message.token?.sub,
        timestamp: new Date().toISOString(),
      });
    },

    async session(message) {
      // Only log in development to avoid spam
      if (process.env.NODE_ENV === 'development') {
        console.log('NextAuth Session Event:', {
          user: (message.session as any)?.userId,
          timestamp: new Date().toISOString(),
        });
      }
    },
  },

  // Security configuration
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 2 * 60 * 60, // 2 hours
      },
    },
    callbackUrl: {
      name: 'next-auth.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 10 * 60, // 10 minutes
      },
    },
    csrfToken: {
      name: 'next-auth.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60, // 1 hour
      },
    },
  },

  // Debug mode for development
  debug: process.env.NODE_ENV === 'development',

  // Secret for JWT signing
  secret: process.env.NEXTAUTH_SECRET,

  // Custom logger
  logger: {
    error(code, metadata) {
      console.error('NextAuth Error:', { code, metadata });
    },
    warn(code) {
      console.warn('NextAuth Warning:', code);
    },
    debug(code, metadata) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('NextAuth Debug:', { code, metadata });
      }
    },
  },
};

// Create NextAuth handler
const handler = NextAuth(authOptions);

// Export for both GET and POST requests
export { handler as GET, handler as POST };
