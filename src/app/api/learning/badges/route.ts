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
    const memberId = searchParams.get('memberId') || session.user.id;
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    // Check if user can access the requested member's badges
    if (memberId !== session.user.id && session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let badges;
    if (category && !memberId) {
      // Get badges by category (public view)
      badges = await proficiencyBadgesService.getBadgesByCategory(category);
    } else {
      // Get member's badges
      badges = await proficiencyBadgesService.getMemberBadges(memberId, status || undefined);
    }

    return NextResponse.json({
      success: true,
      data: badges,
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json(
      { error: 'Failed to fetch badges' },
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

    // Check if user is admin (only admins can manually award badges)
    if (session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.memberId || !data.badgeId || !data.badgeName || !data.category || !data.skillArea) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, badgeId, badgeName, category, skillArea' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'BUSINESS_DEVELOPMENT', 'COURSE_COMPLETION'];
    if (!validCategories.includes(data.category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be one of: ' + validCategories.join(', ') },
        { status: 400 }
      );
    }

    // Validate level
    const validLevels = ['BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
    if (data.level && !validLevels.includes(data.level)) {
      return NextResponse.json(
        { error: 'Invalid level. Must be one of: ' + validLevels.join(', ') },
        { status: 400 }
      );
    }

    const badge = await proficiencyBadgesService.awardProficiencyBadge({
      memberId: data.memberId,
      courseId: data.courseId,
      badgeId: data.badgeId,
      badgeName: data.badgeName,
      category: data.category,
      skillArea: data.skillArea,
      level: data.level || 'BASIC',
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      requiresContinuingEd: data.requiresContinuingEd || false,
      projectOpportunitiesUnlocked: data.projectOpportunitiesUnlocked,
      digitalCertificateUrl: data.digitalCertificateUrl,
    });

    return NextResponse.json({
      success: true,
      data: badge,
    });
  } catch (error) {
    console.error('Error awarding badge:', error);
    if (error instanceof Error && error.message === 'Member already has this badge') {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: 'Failed to award badge' },
      { status: 500 }
    );
  }
}