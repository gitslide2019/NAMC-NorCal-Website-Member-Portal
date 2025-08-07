import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { mediaManagementService } from '@/lib/services/media-management.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mediaContent = await mediaManagementService.getMediaContent(params.id);
    
    if (!mediaContent) {
      return NextResponse.json(
        { error: 'Media content not found' },
        { status: 404 }
      );
    }

    // Track view event
    const session = await getServerSession(authOptions);
    await mediaManagementService.trackEvent({
      contentId: params.id,
      userId: session?.user?.id,
      eventType: 'view',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      referrer: request.headers.get('referer') || undefined
    });

    return NextResponse.json(mediaContent);
  } catch (error) {
    console.error('Error fetching media content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media content' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // Check if user is author or admin
    const existingContent = await mediaManagementService.getMediaContent(params.id);
    if (!existingContent) {
      return NextResponse.json(
        { error: 'Media content not found' },
        { status: 404 }
      );
    }

    if (existingContent.authorId !== session.user.id && session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    const updatedContent = await mediaManagementService.updateMediaContent(params.id, data);

    return NextResponse.json(updatedContent);
  } catch (error) {
    console.error('Error updating media content:', error);
    return NextResponse.json(
      { error: 'Failed to update media content' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is author or admin
    const existingContent = await mediaManagementService.getMediaContent(params.id);
    if (!existingContent) {
      return NextResponse.json(
        { error: 'Media content not found' },
        { status: 404 }
      );
    }

    if (existingContent.authorId !== session.user.id && session.user.memberType !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Permission denied' },
        { status: 403 }
      );
    }

    await mediaManagementService.deleteMediaContent(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting media content:', error);
    return NextResponse.json(
      { error: 'Failed to delete media content' },
      { status: 500 }
    );
  }
}