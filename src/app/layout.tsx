import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/auth-context';
import { SecurityInitializer } from '@/components/SecurityInitializer';
import { ConsentBanner } from '@/components/analytics/ConsentBanner';
import { AnalyticsInitializer } from '@/components/analytics/AnalyticsInitializer';
import { Footer } from '@/components/Footer';
import { PublicRuntimeConfig } from '@/components/PublicRuntimeConfig';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'On Target Analysis for YNAB',
  description:
    'Analyze your YNAB budget target alignment and identify spending patterns that don\'t align with your financial goals',
  keywords: ['YNAB', 'budget', 'target', 'analysis', 'financial', 'planning'],
  authors: [{ name: 'Ken Yesh' }],
  robots: 'noindex, nofollow', // Local app, no indexing needed
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 antialiased`}>
        <PublicRuntimeConfig />
        <SecurityInitializer />
        <AnalyticsInitializer />
        <AuthProvider enableNotifications={false} autoRefreshThreshold={5}>
          <div className="min-h-full flex flex-col">
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <ConsentBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
