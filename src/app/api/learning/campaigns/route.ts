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
    const memberId = searchParams.get('memberId');
    const status = searchParams.get('status');
    const active = searchParams.get('active');

    let campaigns;

    if (active === 'true') {
      // Get all active campaigns (public view)
      campaigns = await badgeShopCampaignsService.getActiveCampaigns();
    } else if (memberId) {
      // Check if user can access the requested member's campaigns
      if (memberId !== session.user.id && session.user.memberType !== 'ADMIN') {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      campaigns = await badgeShopCampaignsService.getMemberCampaigns(memberId, status || undefined);
    } else {
      // Get current user's campaigns
      campaigns = await badgeShopCampaignsService.getMemberCampaigns(session.user.id, status || undefined);
    }

    return NextResponse.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
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

    const data = await request.json();

    // Validate required fields
    if (!data.badgeId || !data.campaignType || !data.title) {
      return NextResponse.json(
        { error: 'Missing required fields: badgeId, campaignType, title' },
        { status: 400 }
      );
    }

    // Validate campaign type
    const validCampaignTypes = ['BADGE_EARNED', 'SKILL_ADVANCEMENT', 'PROJECT_COMPLETION'];
    if (!validCampaignTypes.includes(data.campaignType)) {
      return NextResponse.json(
        { error: 'Invalid campaign type. Must be one of: ' + validCampaignTypes.join(', ') },
        { status: 400 }
      );
    }

    // Validate fund allocation percentages if provided
    if (data.memberProjectFundPercentage !== undefined || 
        data.namcSupportPercentage !== undefined || 
        data.sponsorPartnershipPercentage !== undefined) {
      
      const memberFund = data.memberProjectFundPercentage || 50;
      const namcSupport = data.namcSupportPercentage || 30;
      const sponsorPartnership = data.sponsorPartnershipPercentage || 20;
      
      if (Math.abs(memberFund + namcSupport + sponsorPartnership - 100) > 0.01) {
        return NextResponse.json(
          { error: 'Fund allocation percentages must total 100%' },
          { status: 400 }
        );
      }
    }

    // Use session user ID if memberId not provided or if not admin
    const memberId = (data.memberId && session.user.memberType === 'ADMIN') 
      ? data.memberId 
      : session.user.id;

    const campaign = await badgeShopCampaignsService.createBadgeShopCampaign({
      memberId,
      badgeId: data.badgeId,
      campaignType: data.campaignType,
      title: data.title,
      description: data.description,
      productIds: data.productIds,
      productCategories: data.productCategories,
      discountPercentage: data.discountPercentage,
      campaignDuration: data.campaignDuration,
      memberProjectFundPercentage: data.memberProjectFundPercentage,
      namcSupportPercentage: data.namcSupportPercentage,
      sponsorPartnershipPercentage: data.sponsorPartnershipPercentage,
    });

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    if (error instanceof Error && error.message === 'Fund allocation percentages must total 100%') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}