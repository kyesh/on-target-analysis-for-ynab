'use client';

import { useState, useEffect } from 'react';
import {
  getFirstDayOfMonth,
  getPreviousMonth,
  getNextMonth,
} from '@/lib/data-processing';

interface MonthSelectorProps {
  onMonthSelect: (month: string) => void;
  selectedMonth?: string;
  budgetFirstMonth?: string;
  budgetLastMonth?: string;
}

export default function MonthSelector({
  onMonthSelect,
  selectedMonth,
  budgetFirstMonth,
  budgetLastMonth,
}: MonthSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState<string>('');

  // Initialize current month when budget data changes
  useEffect(() => {
    if (!budgetFirstMonth || !budgetLastMonth) {
      setCurrentMonth('');
      return;
    }

    try {
      const today = getFirstDayOfMonth();
      const todayDate = new Date(today + 'T00:00:00.000Z');
      const budgetFirstDate = new Date(budgetFirstMonth + 'T00:00:00.000Z');
      const budgetLastDate = new Date(budgetLastMonth + 'T00:00:00.000Z');

      // Choose a safe default month within budget range
      let defaultMonth: string;
      if (todayDate >= budgetFirstDate && todayDate <= budgetLastDate) {
        defaultMonth = today;
      } else if (todayDate > budgetLastDate) {
        defaultMonth = budgetLastMonth;
      } else {
        defaultMonth = budgetFirstMonth;
      }

      setCurrentMonth(defaultMonth);
    } catch (error) {
      console.error('Error setting default month:', error);
      setCurrentMonth('');
    }
  }, [budgetFirstMonth, budgetLastMonth]);

  // Handle initial month selection separately to avoid setState during render
  useEffect(() => {
    if (!selectedMonth && currentMonth && budgetFirstMonth && budgetLastMonth) {
      // Use setTimeout to avoid setState during render
      const timer = setTimeout(() => {
        onMonthSelect(currentMonth);
      }, 0);
      return () => clearTimeout(timer);
    }
    // Return undefined for cases where no cleanup is needed
    return undefined;
  }, [
    currentMonth,
    selectedMonth,
    budgetFirstMonth,
    budgetLastMonth,
    onMonthSelect,
  ]);

  const formatMonthDisplay = (monthStr: string): string => {
    // Parse as UTC to avoid timezone issues
    const date = new Date(monthStr + 'T00:00:00.000Z');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      timeZone: 'UTC',
    });
  };

  const canGoPrevious = (): boolean => {
    if (!selectedMonth || !budgetFirstMonth) return false;
    try {
      return (
        new Date(selectedMonth + 'T00:00:00.000Z') >
        new Date(budgetFirstMonth + 'T00:00:00.000Z')
      );
    } catch (error) {
      console.error('Error checking previous month availability:', error);
      return false;
    }
  };

  const canGoNext = (): boolean => {
    if (!selectedMonth || !budgetLastMonth) return false;
    try {
      return (
        new Date(selectedMonth + 'T00:00:00.000Z') <
        new Date(budgetLastMonth + 'T00:00:00.000Z')
      );
    } catch (error) {
      console.error('Error checking next month availability:', error);
      return false;
    }
  };

  const handlePrevious = () => {
    if (selectedMonth && canGoPrevious()) {
      const prevMonth = getPreviousMonth(selectedMonth);
      onMonthSelect(prevMonth);
    }
  };

  const handleNext = () => {
    if (selectedMonth && canGoNext()) {
      const nextMonth = getNextMonth(selectedMonth);
      onMonthSelect(nextMonth);
    }
  };

  const generateMonthOptions = (): string[] => {
    if (!budgetFirstMonth || !budgetLastMonth) {
      return [];
    }

    try {
      const months: string[] = [];
      const monthsSet = new Set<string>(); // Prevent duplicates
      let current = budgetFirstMonth;
      const maxIterations = 120; // Safety limit: 10 years max
      let iterations = 0;

      const budgetLastDate = new Date(budgetLastMonth + 'T00:00:00.000Z');

      while (
        new Date(current + 'T00:00:00.000Z') <= budgetLastDate &&
        iterations < maxIterations
      ) {
        if (!monthsSet.has(current)) {
          months.push(current);
          monthsSet.add(current);
        }

        const nextMonth = getNextMonth(current);
        if (nextMonth === current) {
          // Prevent infinite loop if getNextMonth returns the same month
          console.error('getNextMonth returned the same month, breaking loop');
          break;
        }
        current = nextMonth;
        iterations++;
      }
      return months.reverse(); // Most recent first
    } catch (error) {
      console.error('Error generating month options:', error);
      return [];
    }
  };

  return (
    <div className="space-y-2">
      <label
        htmlFor="month-select"
        className="block text-sm font-medium text-gray-700"
      >
        Analysis Month
      </label>

      {/* Month Navigation */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrevious}
          disabled={!canGoPrevious()}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Previous
        </button>

        <select
          id="month-select"
          value={selectedMonth || ''}
          onChange={e => onMonthSelect(e.target.value)}
          className="flex-1 rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Select month...</option>
          {generateMonthOptions().map((month, index) => (
            <option key={`month-${month}-${index}`} value={month}>
              {formatMonthDisplay(month)}
            </option>
          ))}
        </select>

        <button
          onClick={handleNext}
          disabled={!canGoNext()}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next →
        </button>
      </div>

      {selectedMonth && (
        <p className="text-xs text-gray-500">
          Analyzing {formatMonthDisplay(selectedMonth)}
        </p>
      )}
    </div>
  );
}
