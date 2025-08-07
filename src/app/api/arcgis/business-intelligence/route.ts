import { NextRequest, NextResponse } from 'next/server';
import { arcgisService } from '@/lib/services/arcgis-online.service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude') || '');
    const longitude = parseFloat(searchParams.get('longitude') || '');
    const industryType = searchParams.get('industryType') || 'construction';

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Track member usage
    await arcgisService.trackMemberUsage(session.user.id, 'business_intelligence');

    // Get business intelligence data
    const businessIntelligence = await arcgisService.getLocationBusinessIntelligence(
      latitude,
      longitude,
      industryType
    );

    return NextResponse.json({
      success: true,
      data: businessIntelligence
    });
  } catch (error) {
    console.error('Error getting business intelligence:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('usage limit') || error.message.includes('expired')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to get business intelligence' },
      { status: 500 }
    );
  }
}