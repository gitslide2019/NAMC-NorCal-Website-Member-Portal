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
    const radius = parseInt(searchParams.get('radius') || '5000');

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: 'Valid latitude and longitude are required' },
        { status: 400 }
      );
    }

    if (radius < 500 || radius > 25000) {
      return NextResponse.json(
        { error: 'Radius must be between 500 and 25000 meters' },
        { status: 400 }
      );
    }

    // Track member usage
    await arcgisService.trackMemberUsage(session.user.id, 'market_analysis');

    // Get market analysis data
    const marketAnalysis = await arcgisService.getMarketAnalysis(
      latitude,
      longitude,
      radius
    );

    return NextResponse.json({
      success: true,
      data: marketAnalysis
    });
  } catch (error) {
    console.error('Error getting market analysis:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('usage limit') || error.message.includes('expired')) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to get market analysis' },
      { status: 500 }
    );
  }
}