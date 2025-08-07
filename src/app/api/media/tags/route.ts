import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { mediaManagementService } from '@/lib/services/media-management.service';

export async function GET(request: NextRequest) {
  try {
    const tags = await mediaManagementService.getTags();

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching media tags:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media tags' },
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
    
    // Generate slug from name if not provided
    if (!data.slug) {
      data.slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    const tag = await mediaManagementService.createTag(data);

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating media tag:', error);
    return NextResponse.json(
      { error: 'Failed to create media tag' },
      { status: 500 }
    );
  }
}