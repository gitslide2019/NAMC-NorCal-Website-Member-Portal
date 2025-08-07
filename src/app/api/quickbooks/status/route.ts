/**
 * QuickBooks Connection Status Route
 * Get current QuickBooks connection status and company info
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
    const status = await quickbooksService.getConnectionStatus();

    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting QuickBooks status:', error);
    return NextResponse.json(
      { error: 'Failed to get connection status' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const quickbooksService = new QuickBooksAPIService();
    await quickbooksService.disconnect();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting QuickBooks:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect QuickBooks' },
      { status: 500 }
    );
  }
}