import { NextRequest, NextResponse } from 'next/server';
import { YNABService } from '@/lib/ynab-service';

/**
 * Debug endpoint to get raw YNAB month data
 * This helps with debugging and understanding the YNAB API response structure
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const budgetId = searchParams.get('budgetId');
    const month = searchParams.get('month');

    if (!budgetId || !month) {
      return NextResponse.json({
        error: 'Missing required parameters: budgetId and month'
      }, { status: 400 });
    }

    console.log(`[DEBUG] Getting raw YNAB data for budget ${budgetId}, month ${month}`);

    // Get raw month data from YNAB
    const monthData = await YNABService.getMonth(budgetId, month);

    // Return raw data with goal fields highlighted
    const categoriesWithGoals = monthData.categories
      .filter(cat => cat.goal_type)
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        budgeted: cat.budgeted,
        activity: cat.activity,
        balance: cat.balance,
        goal_type: cat.goal_type,
        goal_target: cat.goal_target,
        goal_under_funded: cat.goal_under_funded,
        goal_percentage_complete: cat.goal_percentage_complete,
        goal_overall_funded: cat.goal_overall_funded,
        goal_overall_left: cat.goal_overall_left,
        goal_target_month: cat.goal_target_month,
        goal_creation_month: cat.goal_creation_month,
        goal_months_to_budget: cat.goal_months_to_budget,
        goal_needs_whole_amount: cat.goal_needs_whole_amount,
        goal_day: cat.goal_day,
        goal_cadence: cat.goal_cadence,
        goal_cadence_frequency: cat.goal_cadence_frequency,
      }));

    return NextResponse.json({
      success: true,
      month: monthData.month,
      totalCategories: monthData.categories.length,
      categoriesWithGoals: categoriesWithGoals.length,
      data: categoriesWithGoals
    });

  } catch (error) {
    console.error('[DEBUG] Error getting raw YNAB data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
