import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// Rate limiting: Track incidents per IP
const incidentTracker = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_INCIDENTS_PER_WINDOW = 10; // Max 10 incidents per minute per IP

/**
 * POST /api/security/incident
 * Log security incidents for monitoring and analysis
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const clientIP: string = (forwarded ? forwarded.split(',')[0]?.trim() : null) ||
                             headersList.get('x-real-ip') ||
                             'unknown';

    // Rate limiting check
    const now = Date.now();
    const tracker = incidentTracker.get(clientIP);
    
    if (tracker) {
      // Reset counter if window has passed
      if (now - tracker.lastReset > RATE_LIMIT_WINDOW) {
        tracker.count = 0;
        tracker.lastReset = now;
      }
      
      // Check if rate limit exceeded
      if (tracker.count >= MAX_INCIDENTS_PER_WINDOW) {
        return NextResponse.json(
          {
            success: false,
            error: {
              type: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many security incidents reported',
              statusCode: 429,
            },
          },
          { status: 429 }
        );
      }
      
      tracker.count++;
    } else {
      incidentTracker.set(clientIP, { count: 1, lastReset: now });
    }

    // Parse and validate request body
    const body = await request.json();
    
    // Sanitize incident data
    const sanitizedIncident = {
      incident: typeof body.incident === 'string' ? body.incident.substring(0, 200) : 'Unknown incident',
      timestamp: body.timestamp || new Date().toISOString(),
      userAgent: typeof body.userAgent === 'string' ? body.userAgent.substring(0, 500) : 'Unknown',
      url: typeof body.url === 'string' ? body.url.substring(0, 500) : 'Unknown',
      details: body.details ? JSON.stringify(body.details).substring(0, 1000) : '{}',
      clientIP: clientIP,
      environment: process.env.NODE_ENV || 'unknown',
    };

    // Log the security incident
    console.warn('Security Incident Reported:', {
      incident: sanitizedIncident.incident,
      timestamp: sanitizedIncident.timestamp,
      clientIP: sanitizedIncident.clientIP,
      environment: sanitizedIncident.environment,
      userAgent: sanitizedIncident.userAgent.substring(0, 100), // Truncate for logging
      url: sanitizedIncident.url,
    });

    // In a real production environment, you would:
    // 1. Send to a security monitoring service (e.g., Datadog, Splunk)
    // 2. Store in a security incident database
    // 3. Trigger alerts for critical incidents
    // 4. Integrate with SIEM systems
    
    // For now, we'll just log and acknowledge receipt
    
    // Clean up old rate limiting entries periodically
    if (incidentTracker.size > 1000) {
      const cutoff = now - RATE_LIMIT_WINDOW * 2;
      for (const [ip, data] of incidentTracker.entries()) {
        if (data.lastReset < cutoff) {
          incidentTracker.delete(ip);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Security incident logged successfully',
        incidentId: `incident_${now}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: sanitizedIncident.timestamp,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error processing security incident:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to process security incident',
          statusCode: 500,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/security/incident
 * Return basic endpoint information (for health checks)
 */
export async function GET() {
  return NextResponse.json(
    {
      endpoint: '/api/security/incident',
      methods: ['POST'],
      description: 'Security incident reporting endpoint',
      rateLimit: {
        window: `${RATE_LIMIT_WINDOW / 1000} seconds`,
        maxIncidents: MAX_INCIDENTS_PER_WINDOW,
      },
      status: 'operational',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
