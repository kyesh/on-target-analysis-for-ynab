import { NextResponse } from 'next/server';
import { YNABService } from '@/lib/ynab-service';

/**
 * Debug endpoint to clear cache
 * Only available in development
 */
export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      error: 'Cache clearing only available in development'
    }, { status: 403 });
  }

  try {
    YNABService.clearCache();
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache clear error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cache'
    }, { status: 500 });
  }
}
