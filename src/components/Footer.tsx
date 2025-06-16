/**
 * Footer Component with YNAB Disclaimer
 * Displays YNAB API compliance disclaimer and links to legal pages
 */

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* YNAB Disclaimer - Required for YNAB API Compliance */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            YNAB Disclaimer
          </h3>
          <p className="text-xs text-gray-700 leading-relaxed">
            We are not affiliated, associated, or in any way officially connected with YNAB or any of its subsidiaries or affiliates. 
            The official YNAB website can be found at{' '}
            <a 
              href="https://www.ynab.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              https://www.ynab.com
            </a>.
            <br />
            The names YNAB and You Need A Budget, as well as related names, tradenames, marks, trademarks, emblems, and images are registered trademarks of YNAB.
          </p>
        </div>

        {/* Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Application Info */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              On Target Analysis for YNAB
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              A privacy-focused budget analysis tool that helps you understand your YNAB target alignment 
              without storing your financial data.
            </p>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Legal & Privacy
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/kyesh/on-target-analysis-for-ynab/blob/main/legal/PRIVACY_POLICY.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/kyesh/on-target-analysis-for-ynab/blob/main/legal/TERMS_OF_SERVICE.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/kyesh/on-target-analysis-for-ynab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Legal Documentation
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Support & Contact
            </h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="mailto:on-target-analysis-for-ynab@googlegroups.com"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Contact Support
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com/kyesh/on-target-analysis-for-ynab"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a 
                  href="mailto:on-target-analysis-for-ynab@googlegroups.com?subject=Data%20Deletion%20Request"
                  className="text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Request Data Deletion
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-xs text-gray-500">
              © 2025 On Target Analysis for YNAB. Built with privacy in mind.
            </p>
            <div className="mt-2 sm:mt-0 flex space-x-4">
              <span className="text-xs text-gray-500">
                No data stored permanently
              </span>
              <span className="text-xs text-gray-500">
                GDPR & CCPA Compliant
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
