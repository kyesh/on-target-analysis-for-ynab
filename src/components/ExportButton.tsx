'use client';

import { useState } from 'react';
import { DashboardSummary } from '@/types/analysis';
import { formatCurrency } from '@/lib/data-processing';

interface ExportButtonProps {
  analysis: MonthlyAnalysisResponse | null;
  budgetName?: string;
  month?: string;
}

export default function ExportButton({ analysis, budgetName, month }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const generateCSV = (): string => {
    if (!analysis) return '';

    const { monthlyAnalysis, topOverTargetCategories, topUnderTargetCategories } = analysis;
    
    let csv = 'YNAB Off-Target Assignment Analysis\n';
    csv += `Budget: ${budgetName || monthlyAnalysis.budgetName}\n`;
    csv += `Month: ${month}\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n\n`;
    
    // Summary
    csv += 'SUMMARY\n';
    csv += 'Metric,Value\n';
    csv += `Total Assigned,${formatCurrency(monthlyAnalysis.totalAssigned)}\n`;
    csv += `Total Targeted,${formatCurrency(monthlyAnalysis.totalTargeted)}\n`;
    csv += `Budget Discipline Rating,${monthlyAnalysis.budgetDisciplineRating}\n`;
    csv += `Categories Analyzed,${monthlyAnalysis.categoriesAnalyzed}\n`;
    csv += `Categories with Targets,${monthlyAnalysis.categoriesWithTargets}\n`;
    csv += `Categories Over Target,${monthlyAnalysis.categoriesOverTarget}\n`;
    csv += `Categories Under Target,${monthlyAnalysis.categoriesUnderTarget}\n\n`;
    
    // Over-target categories
    if (topOverTargetCategories.length > 0) {
      csv += 'OVER-TARGET CATEGORIES\n';
      csv += 'Category Name,Category Group,Assigned,Target,Variance,Variance %,Target Type\n';
      topOverTargetCategories.forEach(cat => {
        csv += `"${cat.categoryName}","${cat.categoryGroupName}",${formatCurrency(cat.assigned)},${formatCurrency(cat.target)},${formatCurrency(cat.variance)},${cat.variancePercentage.toFixed(2)}%,${cat.targetType}\n`;
      });
      csv += '\n';
    }
    
    // Under-target categories
    if (topUnderTargetCategories.length > 0) {
      csv += 'UNDER-TARGET CATEGORIES\n';
      csv += 'Category Name,Category Group,Assigned,Target,Variance,Variance %,Target Type\n';
      topUnderTargetCategories.forEach(cat => {
        csv += `"${cat.categoryName}","${cat.categoryGroupName}",${formatCurrency(cat.assigned)},${formatCurrency(cat.target)},${formatCurrency(cat.variance)},${cat.variancePercentage.toFixed(2)}%,${cat.targetType}\n`;
      });
    }
    
    return csv;
  };

  const generateJSON = (): string => {
    if (!analysis) return '';
    
    const exportData = {
      metadata: {
        budgetName: budgetName || analysis.monthlyAnalysis.budgetName,
        month,
        generatedAt: new Date().toISOString(),
        exportType: 'YNAB Off-Target Assignment Analysis'
      },
      analysis
    };
    
    return JSON.stringify(exportData, null, 2);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'csv' | 'json') => {
    if (!analysis) return;
    
    setExporting(true);
    
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const budgetSlug = (budgetName || analysis.monthlyAnalysis.budgetName)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      
      if (format === 'csv') {
        const csv = generateCSV();
        downloadFile(csv, `ynab-analysis-${budgetSlug}-${month}-${timestamp}.csv`, 'text/csv');
      } else {
        const json = generateJSON();
        downloadFile(json, `ynab-analysis-${budgetSlug}-${month}-${timestamp}.json`, 'application/json');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (!analysis) {
    return null;
  }

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => handleExport('csv')}
        disabled={exporting}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {exporting ? 'Exporting...' : 'Export CSV'}
      </button>
      
      <button
        onClick={() => handleExport('json')}
        disabled={exporting}
        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        {exporting ? 'Exporting...' : 'Export JSON'}
      </button>
    </div>
  );
}
