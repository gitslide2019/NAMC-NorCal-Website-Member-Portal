/**
 * QuickBooks OAuth Callback Route
 * Handles OAuth callback and token exchange
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { QuickBooksAPIService } from '@/lib/services/quickbooks-api.service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const realmId = searchParams.get('realmId');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('QuickBooks OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/member/settings?quickbooks_error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !realmId) {
      return NextResponse.redirect(
        new URL('/member/settings?quickbooks_error=missing_parameters', request.url)
      );
    }

    // Verify state parameter
    if (!state || !state.startsWith(session.user.id)) {
      return NextResponse.redirect(
        new URL('/member/settings?quickbooks_error=invalid_state', request.url)
      );
    }

    const quickbooksService = new QuickBooksAPIService();
    
    try {
      await quickbooksService.exchangeCodeForTokens(code, realmId);
      
      // Test the connection
      const connectionTest = await quickbooksService.testConnection();
      
      if (connectionTest.connected) {
        return NextResponse.redirect(
          new URL('/member/settings?quickbooks_success=connected', request.url)
        );
      } else {
        return NextResponse.redirect(
          new URL(`/member/settings?quickbooks_error=${encodeURIComponent(connectionTest.error || 'connection_failed')}`, request.url)
        );
      }
    } catch (tokenError) {
      console.error('Error exchanging QuickBooks tokens:', tokenError);
      return NextResponse.redirect(
        new URL('/member/settings?quickbooks_error=token_exchange_failed', request.url)
      );
    }
  } catch (error) {
    console.error('Error in QuickBooks callback:', error);
    return NextResponse.redirect(
      new URL('/member/settings?quickbooks_error=callback_failed', request.url)
    );
  }
}