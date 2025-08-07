import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';
import { prisma } from '@/lib/prisma';

const hubspotService = new HubSpotBackboneService({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
  portalId: process.env.HUBSPOT_PORTAL_ID
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '30'; // days
    const type = searchParams.get('type'); // 'personal' or 'system'

    if (type === 'personal') {
      // Personal networking analytics for the member
      const analytics = await hubspotService.getMemberNetworkingAnalytics({
        member_id: session.user.id,
        timeframe: parseInt(timeframe)
      });

      // Get additional data from local cache
      const localAnalytics = await prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN posted_by = ${session.user.id} THEN 1 END) as opportunities_posted,
          COUNT(CASE WHEN applicant_id = ${session.user.id} THEN 1 END) as applications_sent,
          COUNT(CASE WHEN applicant_id = ${session.user.id} AND status = 'accepted' THEN 1 END) as applications_accepted,
          COUNT(CASE WHEN member_id = ${session.user.id} AND type = 'offer' THEN 1 END) as tools_offered,
          COUNT(CASE WHEN member_id = ${session.user.id} AND type = 'request' THEN 1 END) as tools_requested
        FROM business_opportunities bo
        LEFT JOIN opportunity_applications oa ON bo.hubspot_deal_id = oa.opportunity_id
        LEFT JOIN member_tool_sharing mts ON mts.member_id = ${session.user.id}
        WHERE bo.created_at >= DATE('now', '-${timeframe} days')
           OR oa.created_at >= DATE('now', '-${timeframe} days')
           OR mts.created_at >= DATE('now', '-${timeframe} days')
      `;

      return NextResponse.json({
        ...analytics,
        local_metrics: localAnalytics[0]
      });
    } else {
      // System-wide analytics (admin only)
      const member = await hubspotService.getMemberProfile(session.user.id);
      if (member.member_type !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const systemAnalytics = await hubspotService.getSystemNetworkingAnalytics({
        timeframe: parseInt(timeframe)
      });

      // Get system metrics from local cache
      const systemMetrics = await prisma.$queryRaw`
        SELECT 
          COUNT(DISTINCT bo.id) as total_opportunities,
          COUNT(DISTINCT oa.id) as total_applications,
          COUNT(DISTINCT CASE WHEN oa.status = 'accepted' THEN oa.id END) as successful_matches,
          COUNT(DISTINCT mts.id) as tool_sharing_posts,
          COUNT(DISTINCT pp.id) as partnership_proposals,
          AVG(CASE WHEN oa.status = 'accepted' THEN 1.0 ELSE 0.0 END) as match_success_rate
        FROM business_opportunities bo
        LEFT JOIN opportunity_applications oa ON bo.hubspot_deal_id = oa.opportunity_id
        LEFT JOIN member_tool_sharing mts ON 1=1
        LEFT JOIN partnership_proposals pp ON 1=1
        WHERE bo.created_at >= DATE('now', '-${timeframe} days')
      `;

      return NextResponse.json({
        ...systemAnalytics,
        system_metrics: systemMetrics[0]
      });
    }
  } catch (error) {
    console.error('Error fetching networking analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { 
      connection_id, 
      interaction_type, // 'message', 'collaboration', 'tool_sharing', 'partnership'
      business_impact, // 'lead_generated', 'project_won', 'partnership_formed', 'tool_shared'
      impact_value // monetary value if applicable
    } = data;

    // Track networking interaction and business impact
    const interaction = await hubspotService.trackNetworkingInteraction({
      member_id: session.user.id,
      connection_id,
      interaction_type,
      business_impact,
      impact_value
    });

    // Update local analytics cache
    await prisma.networkingInteraction.create({
      data: {
        member_id: session.user.id,
        connection_id,
        interaction_type,
        business_impact,
        impact_value: impact_value || 0
      }
    });

    return NextResponse.json({ interaction });
  } catch (error) {
    console.error('Error tracking networking interaction:', error);
    return NextResponse.json(
      { error: 'Failed to track interaction' },
      { status: 500 }
    );
  }
}