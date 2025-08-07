import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GeminiCameraAIService } from '@/lib/services/gemini-camera-ai.service';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const cameraAIService = new GeminiCameraAIService();
const hubspotService = new HubSpotBackboneService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'analyze_frame':
        return await analyzeFrame(data, session.user.id);
      case 'create_session':
        return await createSession(data, session.user.id);
      case 'add_frame':
        return await addFrame(data, session.user.id);
      case 'aggregate_session':
        return await aggregateSession(data, session.user.id);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Camera AI API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function analyzeFrame(
  data: {
    imageData: string;
    location?: { latitude: number; longitude: number; address?: string };
    projectContext?: string;
  },
  memberId: string
) {
  try {
    const sessionId = `single_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const analysis = await cameraAIService.analyzeConstructionScene(
      data.imageData,
      sessionId,
      data.location,
      data.projectContext
    );

    // Save analysis to HubSpot
    await hubspotService.createCameraEstimate({
      memberId,
      sessionId: analysis.sessionId,
      sceneAnalysis: analysis.sceneDescription,
      materialAnalysis: JSON.stringify(analysis.constructionElements),
      estimatedCosts: JSON.stringify({
        totalCost: analysis.totalEstimatedCost,
        elements: analysis.constructionElements.map(el => ({
          element: el.element,
          cost: el.estimatedCost
        }))
      }),
      confidence: analysis.overallConfidence,
      mediaUrl: data.imageData.substring(0, 100) + '...' // Store reference, not full data
    });

    return NextResponse.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing frame:', error);
    return NextResponse.json(
      { error: 'Failed to analyze frame' },
      { status: 500 }
    );
  }
}

async function createSession(
  data: {
    projectId?: string;
  },
  memberId: string
) {
  try {
    const session = await cameraAIService.createCameraSession(
      memberId,
      data.projectId
    );

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        startTime: session.startTime,
        status: session.status
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

async function addFrame(
  data: {
    sessionId: string;
    imageData: string;
    location?: { latitude: number; longitude: number; address?: string };
  },
  memberId: string
) {
  try {
    // In a real implementation, you'd retrieve the session from storage
    // For now, we'll create a mock session
    const session = await cameraAIService.createCameraSession(memberId);
    session.sessionId = data.sessionId;

    const frame = await cameraAIService.addFrameToSession(
      session,
      data.imageData,
      data.location
    );

    return NextResponse.json({
      success: true,
      frame: {
        frameId: frame.frameId,
        timestamp: frame.timestamp,
        analysis: frame.analysis,
        selected: frame.selected
      }
    });
  } catch (error) {
    console.error('Error adding frame:', error);
    return NextResponse.json(
      { error: 'Failed to add frame' },
      { status: 500 }
    );
  }
}

async function aggregateSession(
  data: {
    sessionId: string;
    selectedFrameIds?: string[];
  },
  memberId: string
) {
  try {
    // In a real implementation, you'd retrieve the session from storage
    // For now, we'll return a mock aggregated analysis
    const mockSession = await cameraAIService.createCameraSession(memberId);
    mockSession.sessionId = data.sessionId;
    
    // Add some mock frames for aggregation
    if (mockSession.frames.length === 0) {
      // This would normally be retrieved from storage
      return NextResponse.json(
        { error: 'No frames found in session' },
        { status: 400 }
      );
    }

    const aggregatedAnalysis = await cameraAIService.aggregateSessionAnalysis(mockSession);

    // Save aggregated analysis to HubSpot
    await hubspotService.createCameraEstimate({
      memberId,
      sessionId: aggregatedAnalysis.sessionId,
      sceneAnalysis: aggregatedAnalysis.sceneDescription,
      materialAnalysis: JSON.stringify(aggregatedAnalysis.constructionElements),
      estimatedCosts: JSON.stringify({
        totalCost: aggregatedAnalysis.totalEstimatedCost,
        elements: aggregatedAnalysis.constructionElements.map(el => ({
          element: el.element,
          cost: el.estimatedCost
        }))
      }),
      confidence: aggregatedAnalysis.overallConfidence,
      mediaUrl: `session_${data.sessionId}`
    });

    return NextResponse.json({
      success: true,
      aggregatedAnalysis
    });
  } catch (error) {
    console.error('Error aggregating session:', error);
    return NextResponse.json(
      { error: 'Failed to aggregate session' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // In a real implementation, retrieve session from storage
      return NextResponse.json({
        success: true,
        session: {
          sessionId,
          status: 'active',
          frameCount: 0
        }
      });
    }

    // Return user's recent sessions
    return NextResponse.json({
      success: true,
      sessions: []
    });
  } catch (error) {
    console.error('Camera AI GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}