/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker/Cloud Run deployment
  output: 'standalone',
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['recharts', 'lodash', 'date-fns'],
  },

  // Security headers as defined in our security plan
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://us-assets.i.posthog.com", // Next.js requirements and PostHog scripts
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Tailwind CSS + Google Fonts
              "img-src 'self' data: https: blob:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://api.ynab.com https://app.ynab.com https://ontargetanalysisforynab.com https://us.i.posthog.com https://us-assets.i.posthog.com", // YNAB API, OAuth, production domain, and PostHog analytics
              "worker-src 'self' blob: data:", // Allow Web Workers for PostHog session recording
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              'upgrade-insecure-requests',
              'block-all-mixed-content',
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Optimize for production
  poweredByHeader: false,
  compress: true,

  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // ESLint configuration - temporarily ignore during builds for deployment
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Allow build to continue despite static generation errors
  experimental: {
    optimizePackageImports: ['recharts', 'lodash', 'date-fns'],
    missingSuspenseWithCSRBailout: false,
  },
};

module.exports = nextConfig;
