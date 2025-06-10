import { NextResponse } from 'next/server';
import { ynabClient } from '@/lib/ynab-client';
import { SecureErrorHandler } from '@/lib/errors';

/**
 * API route to test YNAB connection
 * This runs on the server-side where environment variables are available
 */
export async function GET() {
  try {
    // Check if client is configured
    if (!ynabClient.isClientConfigured()) {
      return NextResponse.json({
        connected: false,
        error: 'YNAB API client is not properly configured',
        timestamp: new Date().toISOString()
      });
    }

    // Test YNAB API connection
    const isConnected = await ynabClient.validateConnection();
    
    if (isConnected) {
      // Get rate limit status for additional info
      const rateLimitStatus = ynabClient.getRateLimitStatus();
      
      return NextResponse.json({
        connected: true,
        rateLimit: rateLimitStatus,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        connected: false,
        error: 'Unable to connect to YNAB API. Please check your access token.',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('YNAB connection test error:', error);
    
    return NextResponse.json({
      connected: false,
      error: SecureErrorHandler.getUserFriendlyMessage(error as Error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
