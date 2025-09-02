import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';
import { YNABOAuthClient } from '@/lib/ynab/client-oauth';
import { SecureErrorHandler } from '@/lib/errors';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/user
 * Returns the authenticated YNAB user ID (no other user data)
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const auth = AuthMiddleware.validateRequest(request);
    if (!auth.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: auth.error || 'Authentication failed',
            statusCode: auth.statusCode || 401,
          },
        },
        { status: auth.statusCode || 401 }
      );
    }

    const ynabClient = new YNABOAuthClient(auth.token!);

    // Fetch user from YNAB API
    const userResp = await ynabClient.getUser();
    const userId = userResp?.data?.user?.id;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            type: 'API_ERROR',
            message: 'Unable to retrieve YNAB user id',
            statusCode: 502,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { userId },
      metadata: {
        generatedAt: new Date().toISOString(),
        authMethod: 'oauth',
        rateLimitStatus: ynabClient.getRateLimitStatus(),
      },
    });
  } catch (error) {
    const appErr = SecureErrorHandler.handleAPIError(error, 'GET_USER_ID');
    return NextResponse.json(
      {
        success: false,
        error: {
          type: appErr.name || 'API_ERROR',
          message: appErr.message || 'Failed to fetch user id',
          statusCode: (appErr as any).statusCode || 500,
        },
      },
      { status: (appErr as any).statusCode || 500 }
    );
  }
}

