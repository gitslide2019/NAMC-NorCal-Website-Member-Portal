/**
 * QuickBooks Financial Summary Route
 * Get financial summary data from QuickBooks
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
    const summary = await quickbooksService.getFinancialSummary();

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error getting QuickBooks financial summary:', error);
    return NextResponse.json(
      { error: 'Failed to get financial summary' },
      { status: 500 }
    );
  }
}