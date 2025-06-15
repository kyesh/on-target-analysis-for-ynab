/**
 * Health Check API Endpoint
 * Provides system health status for monitoring and deployment validation
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Basic health checks
    const healthChecks = {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        server: true,
        oauth_config: false,
        ynab_connectivity: false,
      },
      performance: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        responseTime: 0, // Will be calculated below
      },
      oauth: {
        configured: false,
        client_id_present: false,
        redirect_uri_valid: false,
      }
    };

    // Check OAuth configuration
    const clientId = process.env.NEXT_PUBLIC_YNAB_CLIENT_ID;
    healthChecks.oauth.client_id_present = !!clientId;
    healthChecks.oauth.configured = !!clientId;
    
    // Validate redirect URI format
    if (typeof window !== 'undefined') {
      const redirectUri = `${window.location.origin}/auth/callback`;
      healthChecks.oauth.redirect_uri_valid = redirectUri.startsWith('https://') || 
                                              (process.env.NODE_ENV === 'development' && redirectUri.startsWith('http://localhost'));
    } else {
      // Server-side check
      const host = request.headers.get('host');
      if (host) {
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const redirectUri = `${protocol}://${host}/auth/callback`;
        healthChecks.oauth.redirect_uri_valid = true;
      }
    }

    healthChecks.checks.oauth_config = healthChecks.oauth.configured && healthChecks.oauth.redirect_uri_valid;

    // Test YNAB API connectivity (without authentication)
    try {
      const ynabResponse = await fetch('https://api.ynab.com/v1/budgets', {
        method: 'HEAD',
        headers: {
          'User-Agent': 'YNAB-Off-Target-Analysis-HealthCheck/1.0'
        }
      });
      
      // We expect a 401 (unauthorized) which means the API is reachable
      healthChecks.checks.ynab_connectivity = ynabResponse.status === 401;
    } catch (error) {
      console.warn('YNAB connectivity check failed:', error);
      healthChecks.checks.ynab_connectivity = false;
    }

    // Calculate response time
    healthChecks.performance.responseTime = Date.now() - startTime;

    // Determine overall status
    const allChecksPass = Object.values(healthChecks.checks).every(check => check === true);
    healthChecks.status = allChecksPass ? 'healthy' : 'degraded';

    // Return appropriate status code
    const statusCode = allChecksPass ? 200 : 503;

    return NextResponse.json(healthChecks, { status: statusCode });

  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: 'unhealthy',
      error: 'Health check failed',
      performance: {
        responseTime: Date.now() - startTime,
      }
    }, { status: 503 });
  }
}

// HEAD request for simple health checks
export async function HEAD() {
  try {
    // Quick health check without detailed response
    const clientId = process.env.NEXT_PUBLIC_YNAB_CLIENT_ID;
    const isHealthy = !!clientId;
    
    return new NextResponse(null, { 
      status: isHealthy ? 200 : 503,
      headers: {
        'X-Health-Status': isHealthy ? 'healthy' : 'unhealthy',
        'X-Health-Timestamp': new Date().toISOString(),
      }
    });
  } catch (error) {
    return new NextResponse(null, { 
      status: 503,
      headers: {
        'X-Health-Status': 'unhealthy',
        'X-Health-Timestamp': new Date().toISOString(),
      }
    });
  }
}
