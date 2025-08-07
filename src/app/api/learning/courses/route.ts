import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SponsoredLearningService } from '@/lib/services/sponsored-learning.service';

const sponsoredLearningService = new SponsoredLearningService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');

    const courses = await sponsoredLearningService.getCoursesByCategory(
      category || undefined,
      subcategory || undefined
    );

    return NextResponse.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
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
    if (!data.title || !data.category || !data.sponsorId || !data.partnershipType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, category, sponsorId, partnershipType' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'BUSINESS_DEVELOPMENT'];
    if (!validCategories.includes(data.category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be one of: ' + validCategories.join(', ') },
        { status: 400 }
      );
    }

    // Validate difficulty level
    const validDifficultyLevels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
    if (data.difficultyLevel && !validDifficultyLevels.includes(data.difficultyLevel)) {
      return NextResponse.json(
        { error: 'Invalid difficulty level. Must be one of: ' + validDifficultyLevels.join(', ') },
        { status: 400 }
      );
    }

    const course = await sponsoredLearningService.createSponsoredCourse({
      title: data.title,
      description: data.description,
      category: data.category,
      subcategory: data.subcategory,
      sponsorId: data.sponsorId,
      partnershipType: data.partnershipType,
      contentUrl: data.contentUrl,
      duration: data.duration,
      difficultyLevel: data.difficultyLevel || 'BEGINNER',
      badgeId: data.badgeId,
      badgeRequired: data.badgeRequired || false,
      prerequisites: data.prerequisites,
      learningObjectives: data.learningObjectives,
      assessmentCriteria: data.assessmentCriteria,
      certificateTemplate: data.certificateTemplate,
      revenueSharePercentage: data.revenueSharePercentage,
    });

    return NextResponse.json({
      success: true,
      data: course,
    });
  } catch (error) {
    console.error('Error creating course:', error);
    return NextResponse.json(
      { error: 'Failed to create course' },
      { status: 500 }
    );
  }
}