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
    const radius = parseInt(searchParams.get('radius') || '1000');

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required' },
        { status: 400 }
      );
    }

    if (radius < 100 || radius > 10000) {
      return NextResponse.json(
        { error: 'Radius must be between 100 and 10000 meters' },
        { status: 400 }
      );
    }

    // Track member usage
    await arcgisService.trackMemberUsage(session.user.id, 'demographics');

    // Get demographic data
    const demographics = await arcgisService.getDemographicData(
      latitude,
      longitude,
      radius
    );

    return NextResponse.json({
      success: true,
      data: demographics
    });
  } catch (error) {
    console.error('Error getting demographic data:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('usage limit') || error.message.includes('expired')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to get demographic data' },
      { status: 500 }
    );
  }
}