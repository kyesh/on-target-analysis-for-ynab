import { NextResponse } from 'next/server';
import { YNABService } from '@/lib/ynab-service';
import { SecureErrorHandler } from '@/lib/errors';

/**
 * GET /api/budgets
 * Get all available YNAB budgets
 */
export async function GET() {
  try {
    const budgets = await YNABService.getBudgets();
    
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
        cacheStats: YNABService.getCacheStats(),
      }
    });

  } catch (error) {
    console.error('Get budgets error:', error);
    
    const appError = SecureErrorHandler.handleAPIError(error, 'GET_BUDGETS');
    
    return NextResponse.json({
      success: false,
      error: {
        type: appError.type,
        message: appError.userMessage,
        statusCode: appError.statusCode,
      }
    }, { status: appError.statusCode });
  }
}
