import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProficiencyBadgesService } from '@/lib/services/proficiency-badges.service';

const proficiencyBadgesService = new ProficiencyBadgesService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('daysAhead') || '90');

    const expiringBadges = await proficiencyBadgesService.getExpiringBadges(daysAhead);

    // Filter to only show user's badges unless admin
    const filteredBadges = session.user.memberType === 'ADMIN' 
      ? expiringBadges 
      : expiringBadges.filter(badge => badge.memberId === session.user.id);

    return NextResponse.json({
      success: true,
      data: filteredBadges,
    });
  } catch (error) {
    console.error('Error fetching expiring badges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expiring badges' },
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
    if (!data.badgeId || data.continuingEdHours === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: badgeId, continuingEdHours' },
        { status: 400 }
      );
    }

    // Validate continuing education hours
    if (data.continuingEdHours < 0) {
      return NextResponse.json(
        { error: 'Continuing education hours must be a positive number' },
        { status: 400 }
      );
    }

    // Use session user ID if memberId not provided or if not admin
    const memberId = (data.memberId && session.user.memberType === 'ADMIN') 
      ? data.memberId 
      : session.user.id;

    const renewal = await proficiencyBadgesService.renewBadge({
      badgeId: data.badgeId,
      memberId,
      continuingEdHours: data.continuingEdHours,
      renewalAssessmentScore: data.renewalAssessmentScore,
      renewalEvidence: data.renewalEvidence,
    });

    return NextResponse.json({
      success: true,
      data: renewal,
    });
  } catch (error) {
    console.error('Error renewing badge:', error);
    if (error instanceof Error && (
      error.message === 'Badge not found' || 
      error.message === 'Badge does not require renewal'
    )) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to renew badge' },
      { status: 500 }
    );
  }
}