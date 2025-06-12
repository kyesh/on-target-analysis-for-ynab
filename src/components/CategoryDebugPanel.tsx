/**
 * Debug panel component for displaying YNAB calculation details
 */

import React, { useState } from 'react';
import { ProcessedCategory } from '../types/analysis';

interface CategoryDebugPanelProps {
  category: ProcessedCategory;
  isOpen: boolean;
  onToggle: () => void;
}

/**
 * Format milliunits as currency for display
 */
function formatCurrency(milliunits: number | null): string {
  if (milliunits === null) return 'null';
  return `$${(milliunits / 1000).toFixed(2)}`;
}

/**
 * Get color for calculation rule
 */
function getRuleColor(rule: string): string {
  if (rule.startsWith('Rule 1')) return 'text-blue-600 bg-blue-50';
  if (rule.startsWith('Rule 2')) return 'text-green-600 bg-green-50';
  if (rule.startsWith('Rule 3')) return 'text-purple-600 bg-purple-50';
  if (rule.startsWith('Rule 4')) return 'text-orange-600 bg-orange-50';
  if (rule.startsWith('Rule 5')) return 'text-red-600 bg-red-50';
  if (rule.startsWith('No Goal')) return 'text-gray-600 bg-gray-50';
  return 'text-gray-600 bg-gray-50';
}

/**
 * Get day name from day number
 */
function getDayName(dayNumber: number | null): string {
  if (dayNumber === null) return 'null';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayNumber] || `Day ${dayNumber}`;
}

/**
 * Get cadence description from cadence number
 */
function getCadenceDescription(cadence: number | null): string {
  if (cadence === null) return 'null';
  const descriptions: Record<number, string> = {
    0: '0 (One-time)',
    1: '1 (Monthly)',
    2: '2 (Weekly)',
    13: '13 (Yearly)'
  };
  return descriptions[cadence] || `${cadence} (Unknown)`;
}

export function CategoryDebugPanel({ category, isOpen, onToggle }: CategoryDebugPanelProps) {
  if (!category.debugInfo) {
    return null;
  }

  const { rawFields, calculationRule, calculationDetails } = category.debugInfo;

  return (
    <div className="mt-2 border border-gray-200 rounded-lg">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 text-left text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-t-lg flex items-center justify-between"
      >
        <span>🔍 Debug Information</span>
        <span className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      {/* Debug Content */}
      {isOpen && (
        <div className="p-4 space-y-4 bg-white">
          {/* Calculation Rule */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Applied Rule</h4>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getRuleColor(calculationRule)}`}>
              {calculationRule}
            </div>
          </div>

          {/* Raw YNAB API Fields */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Raw YNAB API Fields</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div><span className="font-medium">goal_type:</span> {rawFields.goal_type || 'null'}</div>
                <div><span className="font-medium">goal_target:</span> {formatCurrency(rawFields.goal_target)}</div>
                <div><span className="font-medium">goal_cadence:</span> {getCadenceDescription(rawFields.goal_cadence)}</div>
                <div><span className="font-medium">goal_cadence_frequency:</span> {rawFields.goal_cadence_frequency ?? 'null'}</div>
                <div><span className="font-medium">goal_day:</span> {rawFields.goal_day !== null ? `${rawFields.goal_day} (${getDayName(rawFields.goal_day)})` : 'null'}</div>
              </div>
              <div className="space-y-1">
                <div><span className="font-medium">goal_months_to_budget:</span> {rawFields.goal_months_to_budget ?? 'null'}</div>
                <div><span className="font-medium">goal_overall_left:</span> {formatCurrency(rawFields.goal_overall_left)}</div>
                <div><span className="font-medium">budgeted:</span> {formatCurrency(rawFields.budgeted)}</div>
                <div><span className="font-medium">balance:</span> {formatCurrency(rawFields.balance)}</div>
                <div><span className="font-medium">activity:</span> {formatCurrency(rawFields.activity)}</div>
              </div>
            </div>
          </div>

          {/* Calculation Details */}
          {calculationDetails && (
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Calculation Details</h4>
              <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
                {calculationDetails.calculation && (
                  <div><span className="font-medium">Formula:</span> {calculationDetails.calculation}</div>
                )}
                {calculationDetails.dayCount && (
                  <div><span className="font-medium">Day Count:</span> {calculationDetails.dayCount}</div>
                )}
                {calculationDetails.currentMonth && (
                  <div><span className="font-medium">Current Month:</span> {calculationDetails.currentMonth}</div>
                )}
                {calculationDetails.reason && (
                  <div><span className="font-medium">Reason:</span> {calculationDetails.reason}</div>
                )}
                {calculationDetails.error && (
                  <div className="text-red-600"><span className="font-medium">Error:</span> {calculationDetails.error}</div>
                )}
              </div>
            </div>
          )}

          {/* Calculated Values */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Calculated Values</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="font-medium">neededThisMonth:</span> {formatCurrency(category.neededThisMonth)}</div>
              <div><span className="font-medium">assigned:</span> {formatCurrency(category.assigned)}</div>
              <div><span className="font-medium">variance:</span> {formatCurrency(category.variance)}</div>
              <div><span className="font-medium">percentageOfTarget:</span> {category.percentageOfTarget?.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Global debug toggle component
 */
interface DebugToggleProps {
  isEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function DebugToggle({ isEnabled, onToggle }: DebugToggleProps) {
  return (
    <div className="flex items-center space-x-2 mb-4">
      <label className="flex items-center space-x-2 text-sm">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="font-medium text-gray-700">Show Debug Information</span>
      </label>
      <span className="text-xs text-gray-500">
        (Shows YNAB API fields and calculation details for categories with goals)
      </span>
    </div>
  );
}
