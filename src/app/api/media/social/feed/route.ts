import { NextRequest, NextResponse } from 'next/server';
import { socialMediaIntegrationService } from '@/lib/services/social-media-integration.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const feed = await socialMediaIntegrationService.getRecentSocialMediaFeed(limit);

    return NextResponse.json(feed);
  } catch (error) {
    console.error('Error fetching social media feed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social media feed' },
      { status: 500 }
    );
  }
}