/**
 * QuickBooks Connection Test Route
 * Test the current QuickBooks connection and return company info
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { QuickBooksAPIService } from '@/lib/services/quickbooks-api.service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const quickbooksService = new QuickBooksAPIService();
    const testResult = await quickbooksService.testConnection();

    return NextResponse.json(testResult);
  } catch (error) {
    console.error('Error testing QuickBooks connection:', error);
    return NextResponse.json(
      { 
        connected: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      },
      { status: 500 }
    );
  }
}