import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'YNAB Off-Target Assignment Analysis',
  description: 'Analyze your YNAB budget target alignment and identify over-target spending patterns',
  keywords: ['YNAB', 'budget', 'target', 'analysis', 'financial', 'planning'],
  authors: [{ name: 'Ken Yesh', email: 'ken.yesh@apella.io' }],
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
        <div className="min-h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
