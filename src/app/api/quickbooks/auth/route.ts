/**
 * QuickBooks OAuth Authorization Route
 * Initiates OAuth 2.0 flow for QuickBooks integration
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
    const state = `${session.user.id}-${Date.now()}`;
    const authUrl = quickbooksService.generateAuthUrl(state);

    return NextResponse.json({
      authUrl,
      state
    });
  } catch (error) {
    console.error('Error generating QuickBooks auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}