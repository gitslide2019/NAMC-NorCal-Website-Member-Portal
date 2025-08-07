import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProficiencyBadgesService } from '@/lib/services/proficiency-badges.service';
import { prisma } from '@/lib/prisma';

const proficiencyBadgesService = new ProficiencyBadgesService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || session.user.id;
    const category = searchParams.get('category');

    // Check if user can access the requested member's opportunities
    if (memberId !== session.user.id && session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get member's badges to determine unlocked opportunities
    const memberBadges = await proficiencyBadgesService.getMemberBadges(memberId, 'VERIFIED');
    
    // Extract all unlocked opportunity IDs from badges
    const unlockedOpportunityIds = memberBadges
      .flatMap(badge => badge.projectOpportunitiesUnlocked || [])
      .filter(Boolean);

    // Get opportunities that match the unlocked IDs
    let opportunities = [];
    if (unlockedOpportunityIds.length > 0) {
      opportunities = await prisma.opportunity.findMany({
        where: {
          id: {
            in: unlockedOpportunityIds,
          },
          status: 'Active',
          ...(category && { type: category }),
        },
        orderBy: { datePosted: 'desc' },
      });
    }

    // Parse JSON fields
    const parsedOpportunities = opportunities.map(opp => ({
      ...opp,
      requirements: opp.requirements ? JSON.parse(opp.requirements) : [],
      tags: opp.tags ? JSON.parse(opp.tags) : [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        opportunities: parsedOpportunities,
        unlockedByBadges: memberBadges.map(badge => ({
          badgeId: badge.id,
          badgeName: badge.badgeName,
          category: badge.category,
          skillArea: badge.skillArea,
          opportunitiesUnlocked: badge.projectOpportunitiesUnlocked?.length || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching badge-unlocked opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch badge-unlocked opportunities' },
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

    // Check if user is admin
    if (session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.opportunityId || !data.requiredBadges) {
      return NextResponse.json(
        { error: 'Missing required fields: opportunityId, requiredBadges' },
        { status: 400 }
      );
    }

    // Validate that requiredBadges is an array
    if (!Array.isArray(data.requiredBadges)) {
      return NextResponse.json(
        { error: 'requiredBadges must be an array' },
        { status: 400 }
      );
    }

    // Update opportunity with badge requirements
    const opportunity = await prisma.opportunity.update({
      where: { id: data.opportunityId },
      data: {
        requirements: JSON.stringify(data.requiredBadges),
      },
    });

    // Update all badges that should unlock this opportunity
    for (const badgeId of data.requiredBadges) {
      const badges = await prisma.proficiencyBadge.findMany({
        where: { badgeId },
      });

      for (const badge of badges) {
        const currentOpportunities = badge.projectOpportunitiesUnlocked 
          ? JSON.parse(badge.projectOpportunitiesUnlocked) 
          : [];
        
        if (!currentOpportunities.includes(data.opportunityId)) {
          currentOpportunities.push(data.opportunityId);
          
          await prisma.proficiencyBadge.update({
            where: { id: badge.id },
            data: {
              projectOpportunitiesUnlocked: JSON.stringify(currentOpportunities),
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...opportunity,
        requirements: opportunity.requirements ? JSON.parse(opportunity.requirements) : [],
      },
    });
  } catch (error) {
    console.error('Error linking opportunity to badges:', error);
    return NextResponse.json(
      { error: 'Failed to link opportunity to badges' },
      { status: 500 }
    );
  }
}