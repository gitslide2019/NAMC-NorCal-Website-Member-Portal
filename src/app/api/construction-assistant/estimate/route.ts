import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ClaudeConstructionAssistantService } from '@/lib/services/claude-construction-assistant.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { projectInput } = await req.json();

    if (!projectInput || !projectInput.projectName || !projectInput.description) {
      return NextResponse.json(
        { error: 'Project name and description are required' },
        { status: 400 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Initialize Claude service
    const claudeService = new ClaudeConstructionAssistantService();

    // Generate cost estimate using Claude
    const costEstimate = await claudeService.estimateProjectCost(
      projectInput,
      {
        specialties: ['General Construction'],
        serviceAreas: [user.location || 'California'],
        teamSize: 10 // This could be derived from user profile
      }
    );

    // Create enhanced estimate object with UI-friendly format
    const enhancedEstimate = {
      id: Date.now().toString(),
      projectName: projectInput.projectName,
      estimatedCost: {
        low: Math.round(costEstimate.totalEstimate * 0.85),
        high: Math.round(costEstimate.totalEstimate * 1.15),
        confidence: costEstimate.confidenceLevel
      },
      breakdown: costEstimate.breakdown.map((item: any, index: number) => ({
        category: item.category,
        cost: item.amount,
        percentage: item.percentage,
        confidence: costEstimate.confidenceLevel,
        notes: ''
      })),
      laborCosts: [
        {
          category: 'General Labor',
          hours: Math.round(costEstimate.totalEstimate * 0.3 / 65), // Estimate hours
          rate: 65,
          total: Math.round(costEstimate.totalEstimate * 0.3)
        },
        {
          category: 'Skilled Trades',
          hours: Math.round(costEstimate.totalEstimate * 0.2 / 85), // Estimate hours
          rate: 85,
          total: Math.round(costEstimate.totalEstimate * 0.2)
        }
      ],
      materialCosts: [
        {
          item: 'Materials Package',
          quantity: 1,
          unit: 'lot',
          unitCost: Math.round(costEstimate.totalEstimate * 0.4),
          total: Math.round(costEstimate.totalEstimate * 0.4)
        }
      ],
      timeline: costEstimate.timeline.phases.map(phase => ({
        phase: phase.name,
        duration: Math.ceil(phase.duration / 7), // Convert days to weeks
        startWeek: 1 // This would be calculated based on previous phases
      })),
      riskFactors: costEstimate.riskFactors,
      recommendations: costEstimate.recommendations,
      confidence: costEstimate.confidenceLevel,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    // Save estimate to database (optional - for now we'll return the estimate directly)
    try {
      await prisma.costEstimate.create({
        data: {
          memberId: user.id,
          projectName: projectInput.projectName || 'Untitled Project',
          projectType: projectInput.projectType || 'Commercial',
          location: projectInput.location || 'Not specified',
          squareFootage: projectInput.squareFootage,
          stories: projectInput.stories,
          duration: projectInput.duration,
          description: projectInput.description,
          scope: JSON.stringify(projectInput.scope || []),
          requirements: JSON.stringify(projectInput.requirements || []),
          totalEstimate: costEstimate.totalEstimate,
          costBreakdown: JSON.stringify(costEstimate.breakdown || {}),
          confidenceScore: costEstimate.confidenceLevel,
          riskLevel: Array.isArray(costEstimate.riskFactors) ? costEstimate.riskFactors.join(', ') : 'Medium',
          recommendations: JSON.stringify(costEstimate.recommendations || []),
          aiInsights: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            analysisDate: new Date().toISOString(),
            assumptions: costEstimate.assumptions || []
          })
        }
      });
    } catch (dbError) {
      console.error('Error saving estimate to database:', dbError);
      // Continue without failing - the estimate is still generated
    }

    return NextResponse.json(enhancedEstimate);

  } catch (error) {
    console.error('Construction assistant estimate error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI service configuration error. Please contact support.' },
          { status: 503 }
        );
      }
      
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable. Please try again in a moment.' },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}