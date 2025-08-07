import { NextRequest, NextResponse } from 'next/server';
import { arcgisService } from '@/lib/services/arcgis-online.service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { latitude, longitude, projectType = 'residential' } = body;

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Track member usage
    await arcgisService.trackMemberUsage(session.user.id, 'spatial_analysis');

    // Perform spatial analysis
    const analysis = await arcgisService.performSpatialAnalysis(
      latitude,
      longitude,
      projectType
    );

    return NextResponse.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error performing spatial analysis:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('usage limit') || error.message.includes('expired')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to perform spatial analysis' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude') || '');
    const longitude = parseFloat(searchParams.get('longitude') || '');
    const projectType = searchParams.get('projectType') || 'residential';

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required' },
        { status: 400 }
      );
    }

    // Track member usage
    await arcgisService.trackMemberUsage(session.user.id, 'spatial_analysis');

    // Perform spatial analysis
    const analysis = await arcgisService.performSpatialAnalysis(
      latitude,
      longitude,
      projectType
    );

    return NextResponse.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Error performing spatial analysis:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('usage limit') || error.message.includes('expired')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to perform spatial analysis' },
      { status: 500 }
    );
  }
}