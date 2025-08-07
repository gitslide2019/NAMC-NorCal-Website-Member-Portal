/**
 * QuickBooks Financial Data Sync Route
 * Sync financial data between QuickBooks and HubSpot
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { QuickBooksAPIService } from '@/lib/services/quickbooks-api.service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const quickbooksService = new QuickBooksAPIService();
    const syncResult = await quickbooksService.syncFinancialData();

    return NextResponse.json(syncResult);
  } catch (error) {
    console.error('Error syncing QuickBooks financial data:', error);
    return NextResponse.json(
      { 
        success: false,
        synced: 0,
        errors: [error instanceof Error ? error.message : 'Sync failed']
      },
      { status: 500 }
    );
  }
}