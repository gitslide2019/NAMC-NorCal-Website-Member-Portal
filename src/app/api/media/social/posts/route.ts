import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { socialMediaIntegrationService } from '@/lib/services/social-media-integration.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform') || undefined;
    const isNamcOfficial = searchParams.get('isNamcOfficial') === 'true' ? true : undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = (searchParams.get('sortBy') as any) || 'publishedAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const result = await socialMediaIntegrationService.getSocialMediaPosts({
      platform,
      isNamcOfficial,
      limit,
      offset,
      sortBy,
      sortOrder
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching social media posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social media posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const data = await request.json();

    const post = await socialMediaIntegrationService.syncSocialMediaPost(data);

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    console.error('Error syncing social media post:', error);
    return NextResponse.json(
      { error: 'Failed to sync social media post' },
      { status: 500 }
    );
  }
}