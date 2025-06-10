'use client';

import { useState, useEffect } from 'react';
import { getFirstDayOfMonth, getPreviousMonth, getNextMonth } from '@/lib/data-processing';

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
  budgetLastMonth 
}: MonthSelectorProps) {
  const [currentMonth, setCurrentMonth] = useState<string>('');

  useEffect(() => {
    const today = getFirstDayOfMonth();
    const defaultMonth = budgetLastMonth && new Date(today) > new Date(budgetLastMonth) 
      ? budgetLastMonth 
      : today;
    
    setCurrentMonth(defaultMonth);
    if (!selectedMonth) {
      onMonthSelect(defaultMonth);
    }
  }, [budgetLastMonth, selectedMonth, onMonthSelect]);

  const formatMonthDisplay = (monthStr: string): string => {
    const date = new Date(monthStr);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const canGoPrevious = (): boolean => {
    if (!selectedMonth || !budgetFirstMonth) return false;
    return new Date(selectedMonth) > new Date(budgetFirstMonth);
  };

  const canGoNext = (): boolean => {
    if (!selectedMonth || !budgetLastMonth) return false;
    return new Date(selectedMonth) < new Date(budgetLastMonth);
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

    const months: string[] = [];
    let current = budgetFirstMonth;

    while (new Date(current) <= new Date(budgetLastMonth)) {
      months.push(current);
      current = getNextMonth(current);
    }

    return months.reverse(); // Most recent first
  };

  return (
    <div className="space-y-2">
      <label htmlFor="month-select" className="block text-sm font-medium text-gray-700">
        Analysis Month
      </label>
      
      {/* Month Navigation */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handlePrevious}
          disabled={!canGoPrevious()}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        
        <select
          id="month-select"
          value={selectedMonth || ''}
          onChange={(e) => onMonthSelect(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        >
          <option value="">Select month...</option>
          {generateMonthOptions().map((month) => (
            <option key={month} value={month}>
              {formatMonthDisplay(month)}
            </option>
          ))}
        </select>
        
        <button
          onClick={handleNext}
          disabled={!canGoNext()}
          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
