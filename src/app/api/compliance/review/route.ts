import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { AIComplianceAnalysisService } from '@/lib/services/ai-compliance-analysis.service';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const complianceService = new AIComplianceAnalysisService();
const hubspotService = new HubSpotBackboneService();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      documentId,
      documentType,
      documentName,
      documentContent,
      documentUrl,
      projectId,
      location,
      projectType
    } = body;

    if (!documentId || !documentType || !documentName) {
      return NextResponse.json(
        { error: 'Document ID, type, and name are required' },
        { status: 400 }
      );
    }

    // Perform AI compliance analysis
    const analysisResult = await complianceService.analyzeDocument({
      documentId,
      documentType,
      documentName,
      documentContent,
      documentUrl,
      memberId: session.user.id,
      projectId,
      location,
      projectType
    });

    // Create compliance review record
    const complianceReview = await prisma.complianceReview.create({
      data: {
        documentId,
        documentType,
        documentName,
        documentUrl,
        documentContent,
        memberId: session.user.id,
        projectId,
        complianceScore: analysisResult.complianceScore,
        riskLevel: analysisResult.riskLevel,
        complianceStatus: analysisResult.complianceStatus,
        issuesFound: analysisResult.issues.length,
        totalIssues: analysisResult.issues.length,
        aiRecommendations: JSON.stringify(analysisResult.aiRecommendations),
        regulatoryRequirements: JSON.stringify(analysisResult.regulatoryRequirements),
        locationBasedRules: JSON.stringify(analysisResult.locationBasedRules || []),
        reviewDate: new Date()
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Create compliance issues
    const complianceIssues = await Promise.all(
      analysisResult.issues.map(issue =>
        prisma.complianceIssue.create({
          data: {
            complianceReviewId: complianceReview.id,
            issueType: issue.issueType,
            severity: issue.severity,
            description: issue.description,
            recommendation: issue.recommendation,
            regulationReference: issue.regulationReference,
            pageNumber: issue.pageNumber,
            sectionReference: issue.sectionReference
          }
        })
      )
    );

    // Sync to HubSpot
    try {
      await hubspotService.createComplianceReview({
        localId: complianceReview.id,
        memberId: session.user.id,
        documentType,
        documentName,
        complianceScore: analysisResult.complianceScore,
        riskLevel: analysisResult.riskLevel,
        complianceStatus: analysisResult.complianceStatus,
        issuesFound: analysisResult.issues.length,
        aiRecommendations: analysisResult.aiRecommendations,
        regulatoryRequirements: analysisResult.regulatoryRequirements
      });
    } catch (hubspotError) {
      console.error('Failed to sync compliance review to HubSpot:', hubspotError);
      // Continue without failing the request
    }

    return NextResponse.json({
      success: true,
      complianceReview: {
        ...complianceReview,
        issues: complianceIssues,
        aiRecommendations: analysisResult.aiRecommendations,
        regulatoryRequirements: analysisResult.regulatoryRequirements,
        locationBasedRules: analysisResult.locationBasedRules
      }
    });

  } catch (error) {
    console.error('Error in compliance review:', error);
    return NextResponse.json(
      { error: 'Failed to perform compliance review' },
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
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');

    const where: any = {
      memberId: session.user.id
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.complianceStatus = status;
    }

    if (riskLevel) {
      where.riskLevel = riskLevel;
    }

    const complianceReviews = await prisma.complianceReview.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        issues: {
          orderBy: {
            severity: 'desc'
          }
        }
      },
      orderBy: {
        reviewDate: 'desc'
      }
    });

    // Parse JSON fields
    const formattedReviews = complianceReviews.map(review => ({
      ...review,
      aiRecommendations: review.aiRecommendations ? JSON.parse(review.aiRecommendations) : [],
      regulatoryRequirements: review.regulatoryRequirements ? JSON.parse(review.regulatoryRequirements) : [],
      locationBasedRules: review.locationBasedRules ? JSON.parse(review.locationBasedRules) : []
    }));

    return NextResponse.json({
      success: true,
      complianceReviews: formattedReviews
    });

  } catch (error) {
    console.error('Error fetching compliance reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compliance reviews' },
      { status: 500 }
    );
  }
}