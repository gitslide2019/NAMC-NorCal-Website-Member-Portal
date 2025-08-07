import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { mediaManagementService } from '@/lib/services/media-management.service';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const blogPost = await mediaManagementService.getMediaContentBySlug(params.slug);
    
    if (!blogPost || blogPost.contentType !== 'blog') {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Comments are already included in the blog post response
    const comments = blogPost.comments || [];

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching blog comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog comments' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
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
    
    // Get blog post
    const blogPost = await mediaManagementService.getMediaContentBySlug(params.slug);
    if (!blogPost || blogPost.contentType !== 'blog') {
      return NextResponse.json(
        { error: 'Blog post not found' },
        { status: 404 }
      );
    }

    // Check if comments are allowed
    if (!blogPost.allowComments) {
      return NextResponse.json(
        { error: 'Comments are not allowed on this post' },
        { status: 403 }
      );
    }

    const comment = await mediaManagementService.createComment({
      contentId: blogPost.id,
      authorId: session.user.id,
      parentId: data.parentId,
      comment: data.comment,
      status: 'pending' // Comments require moderation
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Error creating blog comment:', error);
    return NextResponse.json(
      { error: 'Failed to create blog comment' },
      { status: 500 }
    );
  }
}