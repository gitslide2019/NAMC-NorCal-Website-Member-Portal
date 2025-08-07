import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BadgeShopCampaignsService } from '@/lib/services/badge-shop-campaigns.service';

const badgeShopCampaignsService = new BadgeShopCampaignsService();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (data.purchaseAmount === undefined) {
      return NextResponse.json(
        { error: 'Missing required field: purchaseAmount' },
        { status: 400 }
      );
    }

    // Validate purchase amount
    if (typeof data.purchaseAmount !== 'number' || data.purchaseAmount <= 0) {
      return NextResponse.json(
        { error: 'Purchase amount must be a positive number' },
        { status: 400 }
      );
    }

    const result = await badgeShopCampaignsService.recordCampaignPurchase(
      params.id,
      data.purchaseAmount
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error recording campaign purchase:', error);
    if (error instanceof Error && error.message === 'Campaign not found') {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to record campaign purchase' },
      { status: 500 }
    );
  }
}