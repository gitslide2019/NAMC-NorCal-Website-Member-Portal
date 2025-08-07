import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProficiencyBadgesService } from '@/lib/services/proficiency-badges.service';

const proficiencyBadgesService = new ProficiencyBadgesService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.requiredBadges) {
      return NextResponse.json(
        { error: 'Missing required field: requiredBadges' },
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

    // Use provided memberId if admin, otherwise use session user ID
    const memberId = (data.memberId && session.user.memberType === 'ADMIN') 
      ? data.memberId 
      : session.user.id;

    const badgeRequirements = await proficiencyBadgesService.checkBadgeRequirements(
      memberId,
      data.requiredBadges
    );

    return NextResponse.json({
      success: true,
      data: badgeRequirements,
    });
  } catch (error) {
    console.error('Error checking badge requirements:', error);
    return NextResponse.json(
      { error: 'Failed to check badge requirements' },
      { status: 500 }
    );
  }
}