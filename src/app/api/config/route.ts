import { NextResponse } from 'next/server';
import { getConfigurationStatus } from '@/lib/config';

/**
 * API route to check configuration status
 * This runs on the server-side where environment variables are available
 */
export async function GET() {
  try {
    const configStatus = getConfigurationStatus();
    
    return NextResponse.json({
      valid: configStatus.valid,
      error: configStatus.error,
      missingVars: configStatus.missingVars,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Configuration check error:', error);
    
    return NextResponse.json({
      valid: false,
      error: 'Failed to check configuration',
      missingVars: ['YNAB_ACCESS_TOKEN', 'NODE_ENV'],
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
