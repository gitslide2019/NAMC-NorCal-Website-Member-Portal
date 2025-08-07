import OpenAI from 'openai';
import { RSMeansAPIService } from './rs-means-api.service';

export interface MaterialSpecification {
  material: string;
  type: string;
  grade?: string;
  dimensions?: string;
  quantity: number;
  unit: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  confidence: number;
  verificationRequired: boolean;
  notes?: string;
}

export interface ConstructionElement {
  element: string;
  category: 'structural' | 'electrical' | 'plumbing' | 'hvac' | 'finishes' | 'exterior' | 'foundation';
  specifications: MaterialSpecification[];
  estimatedCost: number;
  laborHours: number;
  complexity: 'low' | 'medium' | 'high';
  riskFactors: string[];
  confidence: number;
}

export interface QualityAssessment {
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor';
  structuralIntegrity: number; // 0-100
  complianceIssues: string[];
  safetyHazards: string[];
  immediateActions: string[];
  recommendations: string[];
}

export interface WorkflowAction {
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  category: 'verification' | 'procurement' | 'planning' | 'compliance' | 'safety';
  estimatedTime: number; // hours
  estimatedCost: number;
  dependencies: string[];
  assignedTo?: string;
  dueDate?: Date;
}

export interface CameraAnalysisResult {
  sessionId: string;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  sceneDescription: string;
  constructionElements: ConstructionElement[];
  qualityAssessment: QualityAssessment;
  totalEstimatedCost: number;
  overallConfidence: number;
  workflowActions: WorkflowAction[];
  rsMeansIntegration: {
    locationFactor: number;
    priceDate: string;
    dataSource: string;
  };
  nextSteps: string[];
  procurementList: MaterialSpecification[];
}

export interface CameraSession {
  sessionId: string;
  memberId: string;
  projectId?: string;
  startTime: Date;
  endTime?: Date;
  frames: CameraFrame[];
  aggregatedAnalysis?: CameraAnalysisResult;
  status: 'active' | 'completed' | 'cancelled';
}

export interface CameraFrame {
  frameId: string;
  timestamp: Date;
  imageData: string; // base64
  analysis: CameraAnalysisResult;
  selected: boolean;
}

export class GeminiCameraAIService {
  private openai: OpenAI;
  private rsMeansService: RSMeansAPIService;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.rsMeansService = new RSMeansAPIService();
  }

  async analyzeConstructionScene(
    imageData: string,
    sessionId: string,
    location?: { latitude: number; longitude: number; address?: string },
    projectContext?: string
  ): Promise<CameraAnalysisResult> {
    try {
      const prompt = this.buildStructuredAnalysisPrompt(projectContext, location);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: imageData,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0.1
      });

      const analysisText = response.choices[0]?.message?.content || '';

      // Parse the structured response
      const analysis = this.parseStructuredResponse(analysisText, sessionId, location);
      
      // Integrate with RS Means for cost calculations
      if (this.rsMeansService && location) {
        analysis.constructionElements = await this.enhanceWithRSMeansData(
          analysis.constructionElements,
          location
        );
        analysis.totalEstimatedCost = this.calculateTotalCost(analysis.constructionElements);
      }

      // Generate workflow actions
      analysis.workflowActions = this.generateWorkflowActions(analysis);
      analysis.nextSteps = this.generateNextSteps(analysis);
      analysis.procurementList = this.extractProcurementList(analysis);

      return analysis;
    } catch (error) {
      console.error('Error analyzing construction scene:', error);
      throw new Error(`Failed to analyze construction scene: ${error.message}`);
    }
  }

  private buildStructuredAnalysisPrompt(
    projectContext?: string,
    location?: { latitude: number; longitude: number; address?: string }
  ): string {
    return `You are an expert construction analyst with 20+ years of experience in cost estimation, material identification, and quality assessment. Analyze this construction scene image with extreme precision and provide a comprehensive structured analysis.

ANALYSIS REQUIREMENTS:
1. Identify ALL visible construction elements with precise specifications
2. Estimate quantities using visual measurement techniques
3. Assess material conditions and quality
4. Identify potential compliance and safety issues
5. Provide confidence scores for all assessments
6. Flag items requiring physical verification

CONTEXT:
${projectContext ? `Project Context: ${projectContext}` : 'No specific project context provided'}
${location ? `Location: ${location.address || `${location.latitude}, ${location.longitude}`}` : 'Location not specified'}

RESPONSE FORMAT (JSON):
{
  "sceneDescription": "Detailed description of what you observe in the construction scene",
  "constructionElements": [
    {
      "element": "Specific construction element name",
      "category": "structural|electrical|plumbing|hvac|finishes|exterior|foundation",
      "specifications": [
        {
          "material": "Exact material name",
          "type": "Specific type/grade",
          "dimensions": "Precise dimensions if measurable",
          "quantity": number,
          "unit": "measurement unit",
          "condition": "excellent|good|fair|poor|damaged",
          "confidence": 0-100,
          "verificationRequired": boolean,
          "notes": "Additional observations"
        }
      ],
      "complexity": "low|medium|high",
      "riskFactors": ["List of potential risks or challenges"],
      "confidence": 0-100
    }
  ],
  "qualityAssessment": {
    "overallCondition": "excellent|good|fair|poor",
    "structuralIntegrity": 0-100,
    "complianceIssues": ["List of potential code violations"],
    "safetyHazards": ["List of safety concerns"],
    "immediateActions": ["Urgent actions needed"],
    "recommendations": ["Professional recommendations"]
  },
  "measurementNotes": "Explain how quantities were estimated and what verification is needed",
  "confidenceFactors": "Explain what affects confidence levels and what additional data would improve accuracy"
}

CRITICAL INSTRUCTIONS:
- Be extremely conservative with confidence scores - only use high confidence (80+) when you're certain
- Always flag items requiring physical verification when measurements are estimated
- Identify materials by specific names, not generic terms
- Consider regional construction practices and codes
- Note any unusual or non-standard construction methods
- Assess both current condition and potential future issues`;
  }

  private parseStructuredResponse(
    analysisText: string,
    sessionId: string,
    location?: { latitude: number; longitude: number; address?: string }
  ): CameraAnalysisResult {
    try {
      // Extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in analysis response');
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      // Calculate overall confidence as weighted average
      const overallConfidence = this.calculateOverallConfidence(parsedData.constructionElements);

      return {
        sessionId,
        timestamp: new Date(),
        location,
        sceneDescription: parsedData.sceneDescription,
        constructionElements: parsedData.constructionElements.map((element: any) => ({
          ...element,
          estimatedCost: 0, // Will be filled by RS Means integration
          laborHours: this.estimateLaborHours(element)
        })),
        qualityAssessment: parsedData.qualityAssessment,
        totalEstimatedCost: 0, // Will be calculated after RS Means integration
        overallConfidence,
        workflowActions: [], // Will be generated
        rsMeansIntegration: {
          locationFactor: 1.0, // Will be updated with actual data
          priceDate: new Date().toISOString().split('T')[0],
          dataSource: 'RS Means'
        },
        nextSteps: [], // Will be generated
        procurementList: [] // Will be extracted
      };
    } catch (error) {
      console.error('Error parsing structured response:', error);
      throw new Error(`Failed to parse analysis response: ${error.message}`);
    }
  }

  private calculateOverallConfidence(elements: ConstructionElement[]): number {
    if (!elements || elements.length === 0) return 0;
    
    const totalConfidence = elements.reduce((sum, element) => sum + element.confidence, 0);
    return Math.round(totalConfidence / elements.length);
  }

  private estimateLaborHours(element: any): number {
    // Basic labor hour estimation based on element complexity and quantity
    const baseHours = {
      'structural': 8,
      'electrical': 4,
      'plumbing': 6,
      'hvac': 10,
      'finishes': 3,
      'exterior': 5,
      'foundation': 12
    };

    const complexityMultiplier = {
      'low': 0.7,
      'medium': 1.0,
      'high': 1.5
    };

    const base = baseHours[element.category] || 4;
    const multiplier = complexityMultiplier[element.complexity] || 1.0;
    
    return Math.round(base * multiplier);
  }

  private async enhanceWithRSMeansData(
    elements: ConstructionElement[],
    location: { latitude: number; longitude: number; address?: string }
  ): Promise<ConstructionElement[]> {
    if (!this.rsMeansService) return elements;

    try {
      const enhancedElements = await Promise.all(
        elements.map(async (element) => {
          const costData = await this.rsMeansService.getCostData(
            element.element,
            {
              latitude: location.latitude,
              longitude: location.longitude,
              address: location.address
            },
            element.specifications
          );

          return {
            ...element,
            estimatedCost: costData.totalCost || 0,
            laborHours: costData.laborHours || element.laborHours
          };
        })
      );

      return enhancedElements;
    } catch (error) {
      console.error('Error enhancing with RS Means data:', error);
      return elements; // Return original elements if RS Means integration fails
    }
  }

  private calculateTotalCost(elements: ConstructionElement[]): number {
    return elements.reduce((total, element) => total + element.estimatedCost, 0);
  }

  private generateWorkflowActions(analysis: CameraAnalysisResult): WorkflowAction[] {
    const actions: WorkflowAction[] = [];

    // Generate verification actions for low-confidence items
    analysis.constructionElements.forEach((element) => {
      element.specifications.forEach((spec) => {
        if (spec.verificationRequired || spec.confidence < 70) {
          actions.push({
            priority: spec.confidence < 50 ? 'high' : 'medium',
            action: `Verify ${spec.material} specifications and quantities`,
            category: 'verification',
            estimatedTime: 2,
            estimatedCost: 0,
            dependencies: [],
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
          });
        }
      });
    });

    // Generate procurement actions
    const procurementItems = this.extractProcurementList(analysis);
    if (procurementItems.length > 0) {
      actions.push({
        priority: 'medium',
        action: `Procure ${procurementItems.length} material items`,
        category: 'procurement',
        estimatedTime: 4,
        estimatedCost: procurementItems.reduce((sum, item) => sum + (item.quantity * 100), 0), // Rough estimate
        dependencies: ['verification'],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
      });
    }

    // Generate safety actions
    if (analysis.qualityAssessment.safetyHazards.length > 0) {
      actions.push({
        priority: 'critical',
        action: `Address ${analysis.qualityAssessment.safetyHazards.length} safety hazards`,
        category: 'safety',
        estimatedTime: 8,
        estimatedCost: 500,
        dependencies: [],
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      });
    }

    // Generate compliance actions
    if (analysis.qualityAssessment.complianceIssues.length > 0) {
      actions.push({
        priority: 'high',
        action: `Resolve ${analysis.qualityAssessment.complianceIssues.length} compliance issues`,
        category: 'compliance',
        estimatedTime: 6,
        estimatedCost: 1000,
        dependencies: [],
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
      });
    }

    return actions.sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  private generateNextSteps(analysis: CameraAnalysisResult): string[] {
    const steps: string[] = [];

    // Immediate actions based on quality assessment
    if (analysis.qualityAssessment.immediateActions.length > 0) {
      steps.push(...analysis.qualityAssessment.immediateActions);
    }

    // Verification steps for low-confidence items
    const lowConfidenceItems = analysis.constructionElements.filter(
      element => element.confidence < 70
    );
    if (lowConfidenceItems.length > 0) {
      steps.push(`Physically verify ${lowConfidenceItems.length} construction elements with low confidence scores`);
    }

    // Planning steps
    if (analysis.totalEstimatedCost > 10000) {
      steps.push('Schedule detailed cost review meeting with project stakeholders');
    }

    steps.push('Update project timeline based on identified scope and complexity');
    steps.push('Coordinate with subcontractors for specialized work identified');

    return steps;
  }

  private extractProcurementList(analysis: CameraAnalysisResult): MaterialSpecification[] {
    const procurementList: MaterialSpecification[] = [];

    analysis.constructionElements.forEach((element) => {
      element.specifications.forEach((spec) => {
        if (spec.quantity > 0 && spec.condition !== 'excellent') {
          procurementList.push({
            ...spec,
            notes: `Required for ${element.element} - ${element.category}`
          });
        }
      });
    });

    return procurementList;
  }

  async createCameraSession(
    memberId: string,
    projectId?: string
  ): Promise<CameraSession> {
    const sessionId = `cam_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      sessionId,
      memberId,
      projectId,
      startTime: new Date(),
      frames: [],
      status: 'active'
    };
  }

  async addFrameToSession(
    session: CameraSession,
    imageData: string,
    location?: { latitude: number; longitude: number; address?: string }
  ): Promise<CameraFrame> {
    const frameId = `frame_${Date.now()}_${session.frames.length}`;
    
    const analysis = await this.analyzeConstructionScene(
      imageData,
      session.sessionId,
      location
    );

    const frame: CameraFrame = {
      frameId,
      timestamp: new Date(),
      imageData,
      analysis,
      selected: false
    };

    session.frames.push(frame);
    
    return frame;
  }

  async aggregateSessionAnalysis(session: CameraSession): Promise<CameraAnalysisResult> {
    if (session.frames.length === 0) {
      throw new Error('No frames available for aggregation');
    }

    const selectedFrames = session.frames.filter(frame => frame.selected);
    const framesToAnalyze = selectedFrames.length > 0 ? selectedFrames : session.frames;

    // Aggregate construction elements from all frames
    const allElements: ConstructionElement[] = [];
    const allWorkflowActions: WorkflowAction[] = [];
    let totalCost = 0;
    let totalConfidence = 0;

    framesToAnalyze.forEach((frame) => {
      allElements.push(...frame.analysis.constructionElements);
      allWorkflowActions.push(...frame.analysis.workflowActions);
      totalCost += frame.analysis.totalEstimatedCost;
      totalConfidence += frame.analysis.overallConfidence;
    });

    // Deduplicate and merge similar elements
    const mergedElements = this.mergeConstructionElements(allElements);
    const mergedActions = this.mergeWorkflowActions(allWorkflowActions);

    const aggregatedAnalysis: CameraAnalysisResult = {
      sessionId: session.sessionId,
      timestamp: new Date(),
      location: framesToAnalyze[0]?.analysis.location,
      sceneDescription: `Aggregated analysis from ${framesToAnalyze.length} camera frames`,
      constructionElements: mergedElements,
      qualityAssessment: this.aggregateQualityAssessment(framesToAnalyze),
      totalEstimatedCost: this.calculateTotalCost(mergedElements),
      overallConfidence: Math.round(totalConfidence / framesToAnalyze.length),
      workflowActions: mergedActions,
      rsMeansIntegration: framesToAnalyze[0]?.analysis.rsMeansIntegration || {
        locationFactor: 1.0,
        priceDate: new Date().toISOString().split('T')[0],
        dataSource: 'RS Means'
      },
      nextSteps: this.generateNextSteps({
        constructionElements: mergedElements,
        qualityAssessment: this.aggregateQualityAssessment(framesToAnalyze),
        totalEstimatedCost: this.calculateTotalCost(mergedElements)
      } as CameraAnalysisResult),
      procurementList: this.extractProcurementList({
        constructionElements: mergedElements
      } as CameraAnalysisResult)
    };

    session.aggregatedAnalysis = aggregatedAnalysis;
    session.endTime = new Date();
    session.status = 'completed';

    return aggregatedAnalysis;
  }

  private mergeConstructionElements(elements: ConstructionElement[]): ConstructionElement[] {
    const elementMap = new Map<string, ConstructionElement>();

    elements.forEach((element) => {
      const key = `${element.element}_${element.category}`;
      
      if (elementMap.has(key)) {
        const existing = elementMap.get(key)!;
        // Merge specifications and take higher confidence values
        existing.specifications.push(...element.specifications);
        existing.estimatedCost += element.estimatedCost;
        existing.laborHours += element.laborHours;
        existing.confidence = Math.max(existing.confidence, element.confidence);
        existing.riskFactors = [...new Set([...existing.riskFactors, ...element.riskFactors])];
      } else {
        elementMap.set(key, { ...element });
      }
    });

    return Array.from(elementMap.values());
  }

  private mergeWorkflowActions(actions: WorkflowAction[]): WorkflowAction[] {
    const actionMap = new Map<string, WorkflowAction>();

    actions.forEach((action) => {
      const key = `${action.action}_${action.category}`;
      
      if (actionMap.has(key)) {
        const existing = actionMap.get(key)!;
        existing.estimatedTime += action.estimatedTime;
        existing.estimatedCost += action.estimatedCost;
        existing.dependencies = [...new Set([...existing.dependencies, ...action.dependencies])];
      } else {
        actionMap.set(key, { ...action });
      }
    });

    return Array.from(actionMap.values());
  }

  private aggregateQualityAssessment(frames: CameraFrame[]): QualityAssessment {
    const assessments = frames.map(frame => frame.analysis.qualityAssessment);
    
    const allComplianceIssues = assessments.flatMap(a => a.complianceIssues);
    const allSafetyHazards = assessments.flatMap(a => a.safetyHazards);
    const allImmediateActions = assessments.flatMap(a => a.immediateActions);
    const allRecommendations = assessments.flatMap(a => a.recommendations);

    const avgStructuralIntegrity = assessments.reduce((sum, a) => sum + a.structuralIntegrity, 0) / assessments.length;

    // Determine overall condition based on worst case
    const conditions = assessments.map(a => a.overallCondition);
    const conditionPriority = { 'poor': 0, 'fair': 1, 'good': 2, 'excellent': 3 };
    const worstCondition = conditions.reduce((worst, current) => 
      conditionPriority[current] < conditionPriority[worst] ? current : worst
    );

    return {
      overallCondition: worstCondition,
      structuralIntegrity: Math.round(avgStructuralIntegrity),
      complianceIssues: [...new Set(allComplianceIssues)],
      safetyHazards: [...new Set(allSafetyHazards)],
      immediateActions: [...new Set(allImmediateActions)],
      recommendations: [...new Set(allRecommendations)]
    };
  }
}