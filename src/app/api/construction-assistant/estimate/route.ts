import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GeminiCameraAIService } from '@/lib/services/gemini-camera-ai.service';
import { RSMeansAPIService } from '@/lib/services/rs-means-api.service';
import { AIEnhancedCostEstimationService } from '@/lib/services/ai-enhanced-cost-estimation.service';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const cameraAIService = new GeminiCameraAIService();
const rsMeansService = new RSMeansAPIService();
const aiEnhancedService = new AIEnhancedCostEstimationService();
const hubspotService = new HubSpotBackboneService();

interface FormalEstimateRequest {
  cameraAnalysisId: string;
  projectDetails: {
    name: string;
    type: string;
    location: {
      latitude: number;
      longitude: number;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    timeline?: {
      startDate: string;
      endDate: string;
    };
  };
  businessParameters: {
    overheadPercentage: number;
    profitMarginPercentage: number;
    contingencyPercentage: number;
    bondingPercentage?: number;
    insurancePercentage?: number;
  };
  validationRequirements: {
    requirePhysicalVerification: boolean;
    confidenceThreshold: number;
    highRiskItemThreshold: number;
  };
}

interface FormalEstimateResponse {
  estimateId: string;
  projectName: string;
  totalEstimate: number;
  breakdown: {
    materials: number;
    labor: number;
    equipment: number;
    subtotal: number;
    overhead: number;
    profit: number;
    contingency: number;
    bonding?: number;
    insurance?: number;
    grandTotal: number;
  };
  confidence: {
    overall: number;
    highRiskItems: number;
    verificationRequired: number;
  };
  timeline: {
    estimatedDuration: number; // days
    criticalPath: string[];
    milestones: Array<{
      name: string;
      date: string;
      dependencies: string[];
    }>;
  };
  procurement: {
    immediateOrders: Array<{
      material: string;
      quantity: number;
      unit: string;
      estimatedCost: number;
      leadTime: number;
      supplier?: string;
    }>;
    longLeadItems: Array<{
      material: string;
      quantity: number;
      unit: string;
      estimatedCost: number;
      leadTime: number;
      orderBy: string;
    }>;
  };
  riskAssessment: {
    highRiskItems: Array<{
      item: string;
      risk: string;
      impact: 'low' | 'medium' | 'high';
      mitigation: string;
      additionalCost: number;
    }>;
    weatherFactors: string[];
    marketConditions: string[];
    regulatoryRisks: string[];
  };
  qualityControl: {
    inspectionPoints: string[];
    testingRequirements: string[];
    complianceChecks: string[];
  };
  exportOptions: {
    pdfUrl?: string;
    excelUrl?: string;
    csvUrl?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Check if this is a new-style estimate request or legacy formal estimate
    if (body.elements && body.location) {
      // New AI-enhanced estimate request
      const estimate = await generateAIEnhancedEstimate(body, session.user.id);
      return NextResponse.json({
        success: true,
        estimate
      });
    } else {
      // Legacy formal estimate request
      const estimate = await generateFormalEstimate(body, session.user.id);
      return NextResponse.json({
        success: true,
        estimate
      });
    }
  } catch (error) {
    console.error('Estimate generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate estimate' },
      { status: 500 }
    );
  }
}

async function generateAIEnhancedEstimate(
  request: {
    elements: Array<{
      element: string;
      specifications: any[];
      quantity: number;
    }>;
    location: any;
    projectType: string;
    overheadPercentage: number;
    profitPercentage: number;
  },
  memberId: string
) {
  try {
    // Generate AI-enhanced estimate
    const estimate = await aiEnhancedService.generateEnhancedEstimate(
      request.elements,
      request.location,
      request.projectType,
      request.overheadPercentage,
      request.profitPercentage
    );

    // Save to HubSpot
    await hubspotService.createCostEstimate({
      memberId,
      projectName: `${request.projectType} Project`,
      projectType: request.projectType,
      totalEstimate: estimate.grandTotal,
      rsMeansData: estimate,
      aiAdjustments: {
        marketConditions: estimate.marketAdjustments,
        confidenceInterval: estimate.confidenceInterval,
        crossValidation: estimate.crossValidation
      },
      confidenceScore: estimate.confidence * 100,
      forBidding: true
    });

    return estimate;
  } catch (error) {
    console.error('AI-enhanced estimate generation error:', error);
    throw error;
  }
}

async function generateFormalEstimate(
  request: FormalEstimateRequest,
  memberId: string
): Promise<FormalEstimateResponse> {
  // In a real implementation, you would retrieve the camera analysis
  // For now, we'll create a comprehensive mock estimate
  
  const estimateId = `EST_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  
  // Get location factor from RS Means
  const locationFactor = await rsMeansService.getLocationFactor({
    latitude: request.projectDetails.location.latitude,
    longitude: request.projectDetails.location.longitude,
    city: request.projectDetails.location.city,
    state: request.projectDetails.location.state,
    zipCode: request.projectDetails.location.zipCode
  });

  // Mock construction elements (in real implementation, from camera analysis)
  const mockElements = [
    {
      element: 'Foundation',
      specifications: [
        { material: 'Concrete', type: 'Ready-mix 3000 PSI', quantity: 25, unit: 'CY' },
        { material: 'Rebar', type: '#4 Grade 60', quantity: 2000, unit: 'LF' }
      ],
      quantity: 1
    },
    {
      element: 'Framing',
      specifications: [
        { material: 'Lumber', type: '2x8 Douglas Fir', quantity: 150, unit: 'LF' },
        { material: 'Lumber', type: '2x4 Douglas Fir', quantity: 300, unit: 'LF' }
      ],
      quantity: 1
    },
    {
      element: 'Roofing',
      specifications: [
        { material: 'Shingles', type: 'Asphalt 30-year', quantity: 25, unit: 'SQ' },
        { material: 'Underlayment', type: 'Synthetic', quantity: 2500, unit: 'SF' }
      ],
      quantity: 1
    }
  ];

  // Generate RS Means estimate
  const rsMeansEstimate = await rsMeansService.generateEstimate(
    mockElements,
    request.projectDetails.location,
    request.businessParameters.overheadPercentage,
    request.businessParameters.profitMarginPercentage
  );

  // Calculate additional costs
  const subtotal = rsMeansEstimate.totalCost;
  const overhead = subtotal * (request.businessParameters.overheadPercentage / 100);
  const profit = (subtotal + overhead) * (request.businessParameters.profitMarginPercentage / 100);
  const contingency = (subtotal + overhead + profit) * (request.businessParameters.contingencyPercentage / 100);
  
  const bonding = request.businessParameters.bondingPercentage 
    ? (subtotal + overhead + profit + contingency) * (request.businessParameters.bondingPercentage / 100)
    : 0;
    
  const insurance = request.businessParameters.insurancePercentage
    ? (subtotal + overhead + profit + contingency) * (request.businessParameters.insurancePercentage / 100)
    : 0;

  const grandTotal = subtotal + overhead + profit + contingency + bonding + insurance;

  // Generate timeline
  const estimatedDuration = Math.ceil(rsMeansEstimate.totalLaborHours / 8 / 4); // Assuming 4 workers, 8 hours/day
  
  const timeline = {
    estimatedDuration,
    criticalPath: ['Foundation', 'Framing', 'Roofing', 'Finishes'],
    milestones: [
      {
        name: 'Foundation Complete',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dependencies: ['Permits', 'Site Preparation']
      },
      {
        name: 'Framing Complete',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dependencies: ['Foundation Complete']
      },
      {
        name: 'Roofing Complete',
        date: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        dependencies: ['Framing Complete']
      }
    ]
  };

  // Generate procurement lists
  const procurement = {
    immediateOrders: [
      {
        material: 'Concrete Ready-mix 3000 PSI',
        quantity: 25,
        unit: 'CY',
        estimatedCost: 3750,
        leadTime: 1,
        supplier: 'Local Ready-Mix'
      },
      {
        material: 'Rebar #4 Grade 60',
        quantity: 2000,
        unit: 'LF',
        estimatedCost: 1200,
        leadTime: 3,
        supplier: 'Steel Supply Co'
      }
    ],
    longLeadItems: [
      {
        material: 'Asphalt Shingles 30-year',
        quantity: 25,
        unit: 'SQ',
        estimatedCost: 2500,
        leadTime: 14,
        orderBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    ]
  };

  // Risk assessment
  const riskAssessment = {
    highRiskItems: [
      {
        item: 'Foundation excavation',
        risk: 'Unknown soil conditions',
        impact: 'medium' as const,
        mitigation: 'Conduct soil test before excavation',
        additionalCost: 2500
      },
      {
        item: 'Weather delays',
        risk: 'Rain during concrete pour',
        impact: 'low' as const,
        mitigation: 'Monitor weather and schedule accordingly',
        additionalCost: 500
      }
    ],
    weatherFactors: ['Rainy season: Nov-Mar', 'High winds possible'],
    marketConditions: ['Lumber prices volatile', 'Labor shortage in area'],
    regulatoryRisks: ['New building code effective Jan 1', 'Permit delays possible']
  };

  // Quality control
  const qualityControl = {
    inspectionPoints: [
      'Foundation inspection before concrete pour',
      'Framing inspection before drywall',
      'Final inspection before occupancy'
    ],
    testingRequirements: [
      'Concrete strength test at 7 and 28 days',
      'Electrical system testing',
      'Plumbing pressure test'
    ],
    complianceChecks: [
      'Building code compliance review',
      'Energy efficiency requirements',
      'ADA compliance verification'
    ]
  };

  // Calculate confidence metrics
  const confidence = {
    overall: 85, // Mock confidence score
    highRiskItems: riskAssessment.highRiskItems.length,
    verificationRequired: mockElements.filter(el => 
      el.specifications.some(spec => Math.random() < 0.3) // Mock verification requirement
    ).length
  };

  const estimate: FormalEstimateResponse = {
    estimateId,
    projectName: request.projectDetails.name,
    totalEstimate: grandTotal,
    breakdown: {
      materials: rsMeansEstimate.totalMaterialCost,
      labor: rsMeansEstimate.totalLaborCost,
      equipment: rsMeansEstimate.totalEquipmentCost,
      subtotal,
      overhead,
      profit,
      contingency,
      bonding: bonding > 0 ? bonding : undefined,
      insurance: insurance > 0 ? insurance : undefined,
      grandTotal
    },
    confidence,
    timeline,
    procurement,
    riskAssessment,
    qualityControl,
    exportOptions: {
      // URLs would be generated by export service
      pdfUrl: `/api/estimates/${estimateId}/export/pdf`,
      excelUrl: `/api/estimates/${estimateId}/export/excel`,
      csvUrl: `/api/estimates/${estimateId}/export/csv`
    }
  };

  // Save estimate to HubSpot
  await hubspotService.createCostEstimate({
    memberId,
    projectName: request.projectDetails.name,
    projectType: request.projectDetails.type,
    totalEstimate: grandTotal,
    rsMeansData: rsMeansEstimate,
    aiAdjustments: {
      locationFactor,
      businessParameters: request.businessParameters,
      riskAssessment
    },
    confidenceScore: confidence.overall,
    forBidding: true
  });

  return estimate;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const estimateId = searchParams.get('estimateId');

    if (estimateId) {
      // Return specific estimate (mock implementation)
      return NextResponse.json({
        success: true,
        estimate: {
          estimateId,
          status: 'completed',
          createdAt: new Date().toISOString()
        }
      });
    }

    // Return user's estimates
    return NextResponse.json({
      success: true,
      estimates: []
    });
  } catch (error) {
    console.error('Estimate retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve estimates' },
      { status: 500 }
    );
  }
}