/**
 * Monthly Overview component displaying key financial metrics
 */

import React from 'react';
import { DashboardSummary, MonthlyAnalysisResponse } from '../types/analysis';
import { formatCurrency } from '../lib/data-processing';

interface MonthlyOverviewProps {
  analysis: MonthlyAnalysisResponse;
}

export function MonthlyOverview({ analysis }: MonthlyOverviewProps) {
  // Calculate total needed this month from all categories
  const totalNeededThisMonth = analysis.categories
    .filter(category => category.neededThisMonth !== null)
    .reduce((sum, category) => sum + (category.neededThisMonth || 0), 0);

  // Get month data for income, budgeted, and activity
  const monthData = analysis.monthlyAnalysis;

  const overviewCards = [
    {
      title: 'Income',
      value: monthData.totalIncome,
      description: 'Total income for the month',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      title: 'Budgeted',
      value: monthData.totalAssigned,
      description: 'Total amount budgeted',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      title: 'Activity',
      value: monthData.totalActivity,
      description: 'Total spending/activity',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      title: 'Needed This Month',
      value: totalNeededThisMonth,
      description: 'Sum of all calculated targets',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
  ];

  return (
    <div className="rounded-lg bg-white shadow">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
          Monthly Overview - {analysis.selectedMonth}
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {overviewCards.map(card => (
            <div
              key={card.title}
              className={`${card.bgColor} ${card.borderColor} rounded-lg border p-4`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {card.title}
                  </p>
                  <p className={`text-2xl font-bold ${card.color}`}>
                    {formatCurrency(card.value)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Insights */}
        <div className="mt-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <div className="rounded bg-gray-50 p-3">
            <span className="font-medium text-gray-700">Budget vs Needed:</span>
            <div
              className={`font-semibold ${
                monthData.totalAssigned >= totalNeededThisMonth
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {formatCurrency(monthData.totalAssigned - totalNeededThisMonth)}
              {monthData.totalAssigned >= totalNeededThisMonth
                ? ' surplus'
                : ' shortfall'}
            </div>
          </div>

          <div className="rounded bg-gray-50 p-3">
            <span className="font-medium text-gray-700">
              Income vs Activity:
            </span>
            <div
              className={`font-semibold ${
                monthData.totalIncome >= Math.abs(monthData.totalActivity)
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {formatCurrency(monthData.totalIncome + monthData.totalActivity)}
              {monthData.totalIncome >= Math.abs(monthData.totalActivity)
                ? ' positive'
                : ' negative'}
            </div>
          </div>

          <div className="rounded bg-gray-50 p-3">
            <span className="font-medium text-gray-700">
              Categories with Targets:
            </span>
            <div className="font-semibold text-blue-600">
              {analysis.categories.filter(c => c.hasTarget).length} of{' '}
              {analysis.categories.length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
