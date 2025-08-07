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

    // Check if user can access the requested member's fund
    if (memberId !== session.user.id && session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const fund = await badgeShopCampaignsService.getMemberProjectFund(memberId);

    return NextResponse.json({
      success: true,
      data: fund,
    });
  } catch (error) {
    console.error('Error fetching member project fund:', error);
    return NextResponse.json(
      { error: 'Failed to fetch member project fund' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin (only admins can manually adjust funds)
    if (session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.memberId || !data.transactionType || data.amount === undefined || !data.source) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, transactionType, amount, source' },
        { status: 400 }
      );
    }

    // Validate transaction type
    const validTransactionTypes = ['EARNED', 'SPENT', 'WITHDRAWN', 'REFUND'];
    if (!validTransactionTypes.includes(data.transactionType)) {
      return NextResponse.json(
        { error: 'Invalid transaction type. Must be one of: ' + validTransactionTypes.join(', ') },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof data.amount !== 'number' || data.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Validate source
    const validSources = ['BADGE_SHOP_CAMPAIGN', 'PROJECT_COMPLETION', 'MANUAL_ADJUSTMENT'];
    if (!validSources.includes(data.source)) {
      return NextResponse.json(
        { error: 'Invalid source. Must be one of: ' + validSources.join(', ') },
        { status: 400 }
      );
    }

    const transaction = await badgeShopCampaignsService.addToMemberProjectFund({
      memberId: data.memberId,
      transactionType: data.transactionType,
      amount: data.amount,
      source: data.source,
      sourceId: data.sourceId,
      description: data.description,
    });

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error('Error adding to member project fund:', error);
    return NextResponse.json(
      { error: 'Failed to add to member project fund' },
      { status: 500 }
    );
  }
}