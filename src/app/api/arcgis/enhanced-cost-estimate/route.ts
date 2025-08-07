import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { arcgisEnhancedCostEstimationService } from '@/lib/services/arcgis-enhanced-cost-estimation.service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      type,
      location,
      specifications,
      timeline
    } = body;

    // Validate required fields
    if (!name || !type || !location || !location.latitude || !location.longitude) {
      return NextResponse.json(
        { error: 'Project name, type, and location coordinates are required' },
        { status: 400 }
      );
    }

    // Validate project type
    if (!['residential', 'commercial', 'industrial'].includes(type)) {
      return NextResponse.json(
        { error: 'Project type must be residential, commercial, or industrial' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      return NextResponse.json(
        { error: 'Location coordinates must be valid numbers' },
        { status: 400 }
      );
    }

    if (location.latitude < -90 || location.latitude > 90 || 
        location.longitude < -180 || location.longitude > 180) {
      return NextResponse.json(
        { error: 'Location coordinates must be within valid ranges' },
        { status: 400 }
      );
    }

    // Generate enhanced cost estimate
    const estimate = await arcgisEnhancedCostEstimationService.generateEnhancedEstimate({
      name,
      type,
      location,
      specifications: specifications || {},
      timeline: timeline || '6 months'
    });

    return NextResponse.json({
      success: true,
      data: estimate
    });
  } catch (error) {
    console.error('Error generating enhanced cost estimate:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ArcGIS') || error.message.includes('spatial analysis')) {
        return NextResponse.json(
          { error: 'Failed to perform spatial analysis. Please check location coordinates.' },
          { status: 422 }
        );
      }
      
      if (error.message.includes('RS Means') || error.message.includes('cost data')) {
        return NextResponse.json(
          { error: 'Failed to retrieve cost data. Please try again later.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate enhanced cost estimate' },
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
    const estimateId = searchParams.get('id');

    if (!estimateId) {
      return NextResponse.json(
        { error: 'Estimate ID is required' },
        { status: 400 }
      );
    }

    // Mock implementation - replace with actual database query
    const estimate = await getMemberEstimate(session.user.id, estimateId);

    if (!estimate) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: estimate
    });
  } catch (error) {
    console.error('Error retrieving cost estimate:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve cost estimate' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { estimateId, updates } = body;

    if (!estimateId) {
      return NextResponse.json(
        { error: 'Estimate ID is required' },
        { status: 400 }
      );
    }

    // Validate that user owns the estimate
    const existingEstimate = await getMemberEstimate(session.user.id, estimateId);
    if (!existingEstimate) {
      return NextResponse.json(
        { error: 'Estimate not found or access denied' },
        { status: 404 }
      );
    }

    // Update estimate (mock implementation)
    const updatedEstimate = await updateEstimate(estimateId, updates);

    return NextResponse.json({
      success: true,
      data: updatedEstimate
    });
  } catch (error) {
    console.error('Error updating cost estimate:', error);
    return NextResponse.json(
      { error: 'Failed to update cost estimate' },
      { status: 500 }
    );
  }
}

// Mock database functions - replace with actual implementations
async function getMemberEstimate(memberId: string, estimateId: string) {
  // Mock implementation
  return {
    id: estimateId,
    projectName: 'Sample Project',
    memberId,
    // ... other estimate data
  };
}

async function updateEstimate(estimateId: string, updates: any) {
  // Mock implementation
  return {
    id: estimateId,
    ...updates,
    updatedAt: new Date()
  };
}