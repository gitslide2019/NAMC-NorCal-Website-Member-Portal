import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { socialMediaIntegrationService } from '@/lib/services/social-media-integration.service';

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
    const { contentId, platforms, customMessage } = data;

    if (!contentId || !platforms || !Array.isArray(platforms)) {
      return NextResponse.json(
        { error: 'Content ID and platforms array are required' },
        { status: 400 }
      );
    }

    const results = await socialMediaIntegrationService.shareContentToSocialMedia(
      contentId,
      platforms,
      customMessage
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error sharing content to social media:', error);
    return NextResponse.json(
      { error: 'Failed to share content to social media' },
      { status: 500 }
    );
  }
}