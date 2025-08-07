import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { socialMediaIntegrationService } from '@/lib/services/social-media-integration.service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const { accountId } = data;

    let results;
    if (accountId) {
      // Sync specific account
      const result = await socialMediaIntegrationService.syncAccountPosts(accountId);
      results = [{ accountId, ...result }];
    } else {
      // Sync all accounts
      results = await socialMediaIntegrationService.syncAllAccounts();
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error syncing social media accounts:', error);
    return NextResponse.json(
      { error: 'Failed to sync social media accounts' },
      { status: 500 }
    );
  }
}