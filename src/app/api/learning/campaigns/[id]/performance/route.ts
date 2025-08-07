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

    // Validate that at least one performance metric is provided
    if (data.viewCount === undefined && 
        data.clickCount === undefined && 
        data.purchaseCount === undefined && 
        data.totalRevenue === undefined) {
      return NextResponse.json(
        { error: 'At least one performance metric must be provided' },
        { status: 400 }
      );
    }

    // Validate numeric values
    const numericFields = ['viewCount', 'clickCount', 'purchaseCount', 'totalRevenue'];
    for (const field of numericFields) {
      if (data[field] !== undefined && (typeof data[field] !== 'number' || data[field] < 0)) {
        return NextResponse.json(
          { error: `${field} must be a non-negative number` },
          { status: 400 }
        );
      }
    }

    const campaign = await badgeShopCampaignsService.updateCampaignPerformance({
      campaignId: params.id,
      viewCount: data.viewCount,
      clickCount: data.clickCount,
      purchaseCount: data.purchaseCount,
      totalRevenue: data.totalRevenue,
    });

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error('Error updating campaign performance:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign performance' },
      { status: 500 }
    );
  }
}