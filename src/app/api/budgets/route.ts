import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';
import { YNABOAuthClient } from '@/lib/ynab/client-oauth';
import { SecureErrorHandler } from '@/lib/errors';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/budgets
 * Get all available YNAB budgets using OAuth token from Authorization header
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

    // Create YNAB client with OAuth token
    const ynabClient = new YNABOAuthClient(auth.token!);

    // Fetch budgets
    const response = await ynabClient.getBudgets();
    const budgets = response.data.budgets;

    // Return safe budget information (no sensitive data)
    const safeBudgets = budgets.map(budget => ({
      id: budget.id,
      name: budget.name,
      lastModified: budget.last_modified_on,
      firstMonth: budget.first_month,
      lastMonth: budget.last_month,
      currencyFormat: budget.currency_format,
    }));

    return NextResponse.json({
      success: true,
      data: {
        budgets: safeBudgets,
        count: safeBudgets.length,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        authMethod: 'oauth',
        rateLimitStatus: ynabClient.getRateLimitStatus(),
      },
    });
  } catch (error) {
    console.error('Get budgets error:', error);

    const appError = SecureErrorHandler.handleAPIError(error, 'GET_BUDGETS');

    return NextResponse.json(
      {
        success: false,
        error: {
          type: appError.type,
          message: appError.userMessage,
          statusCode: appError.statusCode,
        },
      },
      { status: appError.statusCode }
    );
  }
}
