import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BadgeShopCampaignsService } from '@/lib/services/badge-shop-campaigns.service';

const badgeShopCampaignsService = new BadgeShopCampaignsService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || session.user.id;
    const limit = parseInt(searchParams.get('limit') || '50');

    // Check if user can access the requested member's transactions
    if (memberId !== session.user.id && session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate limit
    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    const transactions = await badgeShopCampaignsService.getMemberProjectFundTransactions(
      memberId,
      limit
    );

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    console.error('Error fetching member project fund transactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member project fund transactions' },
      { status: 500 }
    );
  }
}