import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { mediaManagementService } from '@/lib/services/media-management.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || undefined;
    const contentType = searchParams.get('contentType') || undefined;
    const categoryId = searchParams.get('categoryId') || undefined;
    const tagId = searchParams.get('tagId') || undefined;
    const status = searchParams.get('status') || 'published';
    const isPublic = searchParams.get('isPublic') !== 'false';
    const isFeatured = searchParams.get('isFeatured') === 'true' ? true : undefined;
    const authorId = searchParams.get('authorId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = (searchParams.get('sortBy') as any) || 'publishedAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';

    const result = await mediaManagementService.searchMediaContent({
      query,
      contentType,
      categoryId,
      tagId,
      status,
      isPublic,
      isFeatured,
      authorId,
      limit,
      offset,
      sortBy,
      sortOrder
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching media content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media content' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Generate slug from title if not provided
    if (!data.slug) {
      data.slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    // Set author to current user
    data.authorId = session.user.id;

    const mediaContent = await mediaManagementService.createMediaContent(data);

    return NextResponse.json(mediaContent, { status: 201 });
  } catch (error) {
    console.error('Error creating media content:', error);
    return NextResponse.json(
      { error: 'Failed to create media content' },
      { status: 500 }
    );
  }
}