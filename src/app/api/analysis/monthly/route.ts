import { NextRequest, NextResponse } from 'next/server';
import { AuthMiddleware } from '@/lib/auth/auth-middleware';
import { YNABOAuthClient } from '@/lib/ynab/client-oauth';
import { generateDashboardSummary } from '@/lib/monthly-analysis';
import { getFirstDayOfMonth, validateMonthFormat } from '@/lib/data-processing';
import { SecureErrorHandler } from '@/lib/errors';
import { YNABBudget } from '@/types/ynab';

/**
 * Validates that a month is within the budget's valid date range
 */
function validateMonthInBudgetRange(month: string, budget: YNABBudget): { isValid: boolean; error?: string } {
  if (!validateMonthFormat(month)) {
    return { isValid: false, error: `Invalid month format: ${month}. Expected YYYY-MM-DD format.` };
  }

  // Handle both camelCase and snake_case property names
  const firstMonth = budget.first_month;
  const lastMonth = budget.last_month;

  // Validate budget has required date properties
  if (!firstMonth || !lastMonth) {
    return {
      isValid: false,
      error: `Budget ${budget.name} is missing date range information. Cannot validate month ${month}.`
    };
  }

  const requestedDate = new Date(month);
  const budgetFirstDate = new Date(firstMonth);
  const budgetLastDate = new Date(lastMonth);

  // Validate dates are valid
  if (isNaN(budgetFirstDate.getTime()) || isNaN(budgetLastDate.getTime())) {
    return {
      isValid: false,
      error: `Budget ${budget.name} has invalid date range: firstMonth=${firstMonth}, lastMonth=${lastMonth}`
    };
  }

  if (requestedDate < budgetFirstDate) {
    return {
      isValid: false,
      error: `Month ${month} is before budget start date ${firstMonth}`
    };
  }

  if (requestedDate > budgetLastDate) {
    return {
      isValid: false,
      error: `Month ${month} is after budget end date ${lastMonth}`
    };
  }

  return { isValid: true };
}

/**
 * Gets a safe default month within the budget's range
 */
function getSafeDefaultMonth(budget: YNABBudget): string {
  // Handle both camelCase and snake_case property names
  const firstMonth = budget.first_month;
  const lastMonth = budget.last_month;

  // Validate budget has required date properties
  if (!firstMonth || !lastMonth) {
    throw new Error(`Budget ${budget.name} (${budget.id}) is missing date range: firstMonth=${firstMonth}, lastMonth=${lastMonth}`);
  }

  const currentMonth = getFirstDayOfMonth();
  const budgetLastDate = new Date(lastMonth);
  const budgetFirstDate = new Date(firstMonth);
  const currentDate = new Date(currentMonth);

  // Validate dates are valid
  if (isNaN(budgetFirstDate.getTime()) || isNaN(budgetLastDate.getTime())) {
    throw new Error(`Budget ${budget.name} has invalid date range: firstMonth=${firstMonth}, lastMonth=${lastMonth}`);
  }

  // If current month is within budget range, use it
  if (currentDate >= budgetFirstDate && currentDate <= budgetLastDate) {
    return currentMonth;
  }

  // If current month is after budget range, use budget's last month
  if (currentDate > budgetLastDate) {
    return lastMonth;
  }

  // If current month is before budget range, use budget's first month
  return firstMonth;
}

/**
 * Structured logging for API errors
 */
function logAPIError(context: string, error: any, requestInfo: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    context,
    error: {
      name: error.name,
      message: error.message,
      type: error.type || 'unknown',
      statusCode: error.statusCode || 500,
    },
    request: requestInfo,
  };

  console.error(`[${context}] API Error:`, JSON.stringify(logEntry, null, 2));
}

/**
 * GET /api/analysis/monthly
 * Analyze monthly budget target alignment
 *
 * Query parameters:
 * - budgetId: YNAB budget ID (optional, uses default if not provided)
 * - month: Month in YYYY-MM-DD format (optional, uses safe default if not provided)
 */
export async function GET(request: NextRequest) {
  const requestInfo = {
    method: 'GET',
    url: request.url,
    budgetId: null as string | null,
    month: null as string | null,
  };

  try {
    // Validate authentication
    const auth = AuthMiddleware.validateRequest(request);
    if (!auth.valid) {
      return NextResponse.json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: auth.error || 'Authentication failed',
          statusCode: auth.statusCode || 401,
        }
      }, { status: auth.statusCode || 401 });
    }

    // Create YNAB client with OAuth token
    const ynabClient = new YNABOAuthClient(auth.token!);

    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('budgetId');
    const month = searchParams.get('month');

    requestInfo.budgetId = budgetId;
    requestInfo.month = month;

    // Get budget (use default if not specified)
    let budget: YNABBudget;
    if (budgetId) {
      const budgetsResponse = await ynabClient.getBudgets();
      const foundBudget = budgetsResponse.data.budgets.find(b => b.id === budgetId);
      if (!foundBudget) {
        return NextResponse.json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: `Budget not found: ${budgetId}`,
            statusCode: 404,
          }
        }, { status: 404 });
      }
      budget = foundBudget;
    } else {
      const budgetsResponse = await ynabClient.getBudgets();
      if (budgetsResponse.data.budgets.length === 0) {
        return NextResponse.json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'No budgets found',
            statusCode: 404,
          }
        }, { status: 404 });
      }
      budget = budgetsResponse.data.budgets[0]!;
    }

    // Determine analysis month with validation
    let analysisMonth: string;

    if (month) {
      // Validate provided month is within budget range
      const validation = validateMonthInBudgetRange(month, budget);
      if (!validation.isValid) {
        logAPIError('MONTH_VALIDATION', new Error(validation.error!), requestInfo);
        return NextResponse.json({
          success: false,
          error: {
            type: 'invalid_month',
            message: validation.error,
            statusCode: 400,
            availableRange: {
              firstMonth: budget.first_month,
              lastMonth: budget.last_month,
            }
          }
        }, { status: 400 });
      }
      analysisMonth = month;
    } else {
      // Use safe default month within budget range
      analysisMonth = getSafeDefaultMonth(budget);
    }

    // Log successful request info
    console.log(`[MONTHLY_ANALYSIS] Processing request: Budget=${budget.name} (${budget.id}), Month=${analysisMonth}`);

    // Fetch month data
    const monthResponse = await ynabClient.getMonth(budget.id, analysisMonth);
    const monthData = monthResponse.data.month;

    // Generate comprehensive analysis
    const dashboardSummary = generateDashboardSummary(
      monthData,
      budget.id,
      budget.name
    );

    return NextResponse.json({
      success: true,
      data: dashboardSummary,
      metadata: {
        budgetId: budget.id,
        budgetName: budget.name,
        month: analysisMonth,
        budgetRange: {
          firstMonth: budget.first_month,
          lastMonth: budget.last_month,
        },
        generatedAt: new Date().toISOString(),
        rateLimitStatus: ynabClient.getRateLimitStatus(),
      }
    });

  } catch (error) {
    logAPIError('MONTHLY_ANALYSIS', error, requestInfo);

    const appError = SecureErrorHandler.handleAPIError(error, 'MONTHLY_ANALYSIS');

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

/**
 * POST /api/analysis/monthly
 * Analyze monthly data with custom configuration
 */
export async function POST(request: NextRequest) {
  const requestInfo = {
    method: 'POST',
    url: request.url,
    budgetId: null as string | null,
    month: null as string | null,
  };

  try {
    // Validate authentication
    const auth = AuthMiddleware.validateRequest(request);
    if (!auth.valid) {
      return NextResponse.json({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: auth.error || 'Authentication failed',
          statusCode: auth.statusCode || 401,
        }
      }, { status: auth.statusCode || 401 });
    }

    // Create YNAB client with OAuth token
    const ynabClient = new YNABOAuthClient(auth.token!);

    const body = await request.json();
    const { budgetId, month, config } = body;

    requestInfo.budgetId = budgetId;
    requestInfo.month = month;

    // Get budget
    let budget: YNABBudget;
    if (budgetId) {
      const budgetsResponse = await ynabClient.getBudgets();
      const foundBudget = budgetsResponse.data.budgets.find(b => b.id === budgetId);
      if (!foundBudget) {
        return NextResponse.json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: `Budget not found: ${budgetId}`,
            statusCode: 404,
          }
        }, { status: 404 });
      }
      budget = foundBudget;
    } else {
      const budgetsResponse = await ynabClient.getBudgets();
      if (budgetsResponse.data.budgets.length === 0) {
        return NextResponse.json({
          success: false,
          error: {
            type: 'NOT_FOUND',
            message: 'No budgets found',
            statusCode: 404,
          }
        }, { status: 404 });
      }
      budget = budgetsResponse.data.budgets[0]!;
    }

    // Determine analysis month with validation
    let analysisMonth: string;

    if (month) {
      // Validate provided month is within budget range
      const validation = validateMonthInBudgetRange(month, budget);
      if (!validation.isValid) {
        logAPIError('MONTH_VALIDATION_POST', new Error(validation.error!), requestInfo);
        return NextResponse.json({
          success: false,
          error: {
            type: 'invalid_month',
            message: validation.error,
            statusCode: 400,
            availableRange: {
              firstMonth: budget.first_month,
              lastMonth: budget.last_month,
            }
          }
        }, { status: 400 });
      }
      analysisMonth = month;
    } else {
      // Use safe default month within budget range
      analysisMonth = getSafeDefaultMonth(budget);
    }

    // Log successful request info
    console.log(`[MONTHLY_ANALYSIS_POST] Processing request: Budget=${budget.name} (${budget.id}), Month=${analysisMonth}`);

    // Fetch month data
    const monthResponse = await ynabClient.getMonth(budget.id, analysisMonth);
    const monthData = monthResponse.data.month;

    // Generate analysis with custom config
    const dashboardSummary = generateDashboardSummary(
      monthData,
      budget.id,
      budget.name,
      config
    );

    return NextResponse.json({
      success: true,
      data: dashboardSummary,
      metadata: {
        budgetId: budget.id,
        budgetName: budget.name,
        month: analysisMonth,
        budgetRange: {
          firstMonth: budget.first_month,
          lastMonth: budget.last_month,
        },
        config,
        generatedAt: new Date().toISOString(),
      }
    });

  } catch (error) {
    logAPIError('MONTHLY_ANALYSIS_POST', error, requestInfo);

    const appError = SecureErrorHandler.handleAPIError(error, 'MONTHLY_ANALYSIS_POST');

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
