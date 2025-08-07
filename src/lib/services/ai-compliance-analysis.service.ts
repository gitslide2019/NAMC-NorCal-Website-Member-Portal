import { Anthropic } from '@anthropic-ai/sdk';
import { GoogleVisionAPI } from './google-vision-api.service';

export interface ComplianceAnalysisRequest {
  documentId: string;
  documentType: string;
  documentName: string;
  documentContent?: string;
  documentUrl?: string;
  memberId: string;
  projectId?: string;
  location?: string;
  projectType?: string;
}

export interface ComplianceIssue {
  issueType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  recommendation?: string;
  regulationReference?: string;
  pageNumber?: number;
  sectionReference?: string;
}

export interface ComplianceAnalysisResult {
  complianceScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_ACTION';
  issues: ComplianceIssue[];
  aiRecommendations: string[];
  regulatoryRequirements: string[];
  locationBasedRules?: string[];
}

export interface RegulatoryDatabase {
  [key: string]: {
    title: string;
    description: string;
    requirements: string[];
    penalties: string[];
    applicableStates: string[];
    applicableProjectTypes: string[];
    effectiveDate: string;
    lastUpdated: string;
  };
}

export class AIComplianceAnalysisService {
  private anthropic: Anthropic;
  private visionAPI: GoogleVisionAPI;
  private regulatoryDatabase: RegulatoryDatabase;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
    this.visionAPI = new GoogleVisionAPI();
    this.regulatoryDatabase = this.initializeRegulatoryDatabase();
  }

  async analyzeDocument(request: ComplianceAnalysisRequest): Promise<ComplianceAnalysisResult> {
    try {
      // Extract document content if not provided
      let documentContent = request.documentContent;
      if (!documentContent && request.documentUrl) {
        documentContent = await this.extractDocumentContent(request.documentUrl);
      }

      if (!documentContent) {
        throw new Error('No document content available for analysis');
      }

      // Get location-based regulatory requirements
      const locationBasedRules = await this.getLocationBasedRules(
        request.location || 'California',
        request.projectType || 'GENERAL'
      );

      // Perform AI compliance analysis
      const analysisResult = await this.performAIAnalysis(
        documentContent,
        request.documentType,
        request.projectType || 'GENERAL',
        locationBasedRules
      );

      // Calculate overall compliance score
      const complianceScore = this.calculateComplianceScore(analysisResult.issues);
      const riskLevel = this.determineRiskLevel(analysisResult.issues);
      const complianceStatus = this.determineComplianceStatus(complianceScore, analysisResult.issues);

      return {
        complianceScore,
        riskLevel,
        complianceStatus,
        issues: analysisResult.issues,
        aiRecommendations: analysisResult.recommendations,
        regulatoryRequirements: analysisResult.regulatoryRequirements,
        locationBasedRules
      };
    } catch (error) {
      console.error('Error in compliance analysis:', error);
      throw new Error(`Compliance analysis failed: ${error.message}`);
    }
  }

  private async extractDocumentContent(documentUrl: string): Promise<string> {
    try {
      // If it's an image document, use OCR
      if (this.isImageDocument(documentUrl)) {
        return await this.visionAPI.extractTextFromImage(documentUrl);
      }

      // For PDF documents, we would need a PDF parsing library
      // For now, return a placeholder
      return 'Document content extraction not implemented for this file type';
    } catch (error) {
      console.error('Error extracting document content:', error);
      throw error;
    }
  }

  private isImageDocument(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff'];
    return imageExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  private async performAIAnalysis(
    documentContent: string,
    documentType: string,
    projectType: string,
    locationBasedRules: string[]
  ): Promise<{
    issues: ComplianceIssue[];
    recommendations: string[];
    regulatoryRequirements: string[];
  }> {
    const prompt = this.buildComplianceAnalysisPrompt(
      documentContent,
      documentType,
      projectType,
      locationBasedRules
    );

    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const analysisText = response.content[0].type === 'text' ? response.content[0].text : '';
    return this.parseAIAnalysisResponse(analysisText);
  }

  private buildComplianceAnalysisPrompt(
    documentContent: string,
    documentType: string,
    projectType: string,
    locationBasedRules: string[]
  ): string {
    return `
You are an expert construction compliance analyst. Analyze the following ${documentType} document for regulatory compliance issues.

Document Type: ${documentType}
Project Type: ${projectType}
Location-Based Rules: ${locationBasedRules.join(', ')}

Document Content:
${documentContent}

Please analyze this document and provide:

1. COMPLIANCE ISSUES (if any):
   - Issue Type (e.g., MISSING_CLAUSE, REGULATORY_VIOLATION, INCOMPLETE_SECTION)
   - Severity (LOW, MEDIUM, HIGH, CRITICAL)
   - Description of the issue
   - Specific recommendation to fix it
   - Relevant regulation reference
   - Page/section reference if applicable

2. AI RECOMMENDATIONS:
   - General recommendations to improve compliance
   - Best practices for this document type
   - Preventive measures for future documents

3. REGULATORY REQUIREMENTS:
   - List of applicable regulations for this document type and project
   - Required clauses or sections that must be included
   - Mandatory disclosures or statements

Format your response as JSON with the following structure:
{
  "issues": [
    {
      "issueType": "string",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "description": "string",
      "recommendation": "string",
      "regulationReference": "string",
      "sectionReference": "string"
    }
  ],
  "recommendations": ["string"],
  "regulatoryRequirements": ["string"]
}

Focus on construction industry regulations, safety requirements, licensing, insurance, and contractual obligations.
`;
  }

  private parseAIAnalysisResponse(analysisText: string): {
    issues: ComplianceIssue[];
    recommendations: string[];
    regulatoryRequirements: string[];
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          issues: parsed.issues || [],
          recommendations: parsed.recommendations || [],
          regulatoryRequirements: parsed.regulatoryRequirements || []
        };
      }

      // Fallback: parse text manually
      return this.parseTextResponse(analysisText);
    } catch (error) {
      console.error('Error parsing AI analysis response:', error);
      return {
        issues: [],
        recommendations: ['Unable to parse compliance analysis. Manual review recommended.'],
        regulatoryRequirements: []
      };
    }
  }

  private parseTextResponse(text: string): {
    issues: ComplianceIssue[];
    recommendations: string[];
    regulatoryRequirements: string[];
  } {
    // Simple text parsing fallback
    const issues: ComplianceIssue[] = [];
    const recommendations: string[] = [];
    const regulatoryRequirements: string[] = [];

    const lines = text.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.toLowerCase().includes('compliance issue') || 
          trimmedLine.toLowerCase().includes('violation')) {
        issues.push({
          issueType: 'GENERAL_COMPLIANCE',
          severity: 'MEDIUM',
          description: trimmedLine,
          recommendation: 'Review and address this compliance concern'
        });
      } else if (trimmedLine.toLowerCase().includes('recommend')) {
        recommendations.push(trimmedLine);
      } else if (trimmedLine.toLowerCase().includes('regulation') || 
                 trimmedLine.toLowerCase().includes('requirement')) {
        regulatoryRequirements.push(trimmedLine);
      }
    }

    return { issues, recommendations, regulatoryRequirements };
  }

  private calculateComplianceScore(issues: ComplianceIssue[]): number {
    if (issues.length === 0) return 100;

    const severityWeights = {
      LOW: 5,
      MEDIUM: 15,
      HIGH: 30,
      CRITICAL: 50
    };

    const totalDeductions = issues.reduce((sum, issue) => {
      return sum + severityWeights[issue.severity];
    }, 0);

    return Math.max(0, 100 - totalDeductions);
  }

  private determineRiskLevel(issues: ComplianceIssue[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const hasCritical = issues.some(issue => issue.severity === 'CRITICAL');
    const hasHigh = issues.some(issue => issue.severity === 'HIGH');
    const mediumCount = issues.filter(issue => issue.severity === 'MEDIUM').length;

    if (hasCritical) return 'CRITICAL';
    if (hasHigh || mediumCount >= 3) return 'HIGH';
    if (mediumCount >= 1 || issues.length >= 3) return 'MEDIUM';
    return 'LOW';
  }

  private determineComplianceStatus(
    score: number, 
    issues: ComplianceIssue[]
  ): 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_ACTION' {
    const hasCritical = issues.some(issue => issue.severity === 'CRITICAL');
    const hasHigh = issues.some(issue => issue.severity === 'HIGH');

    if (hasCritical) return 'NON_COMPLIANT';
    if (hasHigh || score < 70) return 'REQUIRES_ACTION';
    return 'COMPLIANT';
  }

  private async getLocationBasedRules(location: string, projectType: string): Promise<string[]> {
    // In a real implementation, this would query a regulatory database
    // For now, return some common California construction regulations
    const californiaRules = [
      'California Building Code (CBC)',
      'California Environmental Quality Act (CEQA)',
      'Cal/OSHA Construction Safety Orders',
      'California Contractors State License Board Requirements',
      'Local Building Department Permits Required',
      'Prevailing Wage Requirements (if applicable)',
      'Workers\' Compensation Insurance Required',
      'General Liability Insurance Minimum $1M',
      'Contractor License Bond Requirements'
    ];

    // Filter based on project type
    if (projectType === 'RESIDENTIAL') {
      californiaRules.push(
        'California Residential Code',
        'Title 24 Energy Efficiency Standards',
        'California Green Building Standards (CALGreen)'
      );
    } else if (projectType === 'COMMERCIAL') {
      californiaRules.push(
        'Americans with Disabilities Act (ADA) Compliance',
        'California Commercial Building Code',
        'Fire Safety and Life Safety Code Compliance'
      );
    }

    return californiaRules;
  }

  private initializeRegulatoryDatabase(): RegulatoryDatabase {
    // This would be loaded from a real regulatory database
    return {
      'CBC_2022': {
        title: 'California Building Code 2022',
        description: 'State building code requirements for all construction projects',
        requirements: [
          'Building permits required for all structural work',
          'Licensed contractor required for projects over $500',
          'Inspection requirements at key milestones'
        ],
        penalties: [
          'Stop work orders for unpermitted work',
          'Fines up to $10,000 for violations',
          'Required demolition of non-compliant work'
        ],
        applicableStates: ['California'],
        applicableProjectTypes: ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL'],
        effectiveDate: '2023-01-01',
        lastUpdated: '2023-01-01'
      },
      'CALOSHA_CONSTRUCTION': {
        title: 'Cal/OSHA Construction Safety Orders',
        description: 'Workplace safety requirements for construction sites',
        requirements: [
          'Safety training for all workers',
          'Personal protective equipment (PPE) required',
          'Fall protection for work above 6 feet',
          'Hazard communication program'
        ],
        penalties: [
          'Citations and fines for safety violations',
          'Work stoppage for serious hazards',
          'Criminal charges for willful violations'
        ],
        applicableStates: ['California'],
        applicableProjectTypes: ['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL'],
        effectiveDate: '2023-01-01',
        lastUpdated: '2023-01-01'
      }
    };
  }

  async getRegulatoryUpdates(
    location?: string,
    projectType?: string
  ): Promise<Array<{
    title: string;
    description: string;
    effectiveDate: string;
    impactLevel: string;
    actionRequired?: string;
  }>> {
    // In a real implementation, this would fetch from a regulatory updates API
    return [
      {
        title: 'Updated California Building Code 2023',
        description: 'New energy efficiency requirements for residential construction',
        effectiveDate: '2024-01-01',
        impactLevel: 'MEDIUM',
        actionRequired: 'Review new Title 24 requirements for all residential projects'
      },
      {
        title: 'Cal/OSHA Heat Illness Prevention Updates',
        description: 'Enhanced requirements for outdoor construction work',
        effectiveDate: '2024-05-01',
        impactLevel: 'HIGH',
        actionRequired: 'Update safety programs and provide additional worker training'
      }
    ];
  }
}

// Google Vision API service for OCR
class GoogleVisionAPIService {
  async extractTextFromImage(imageUrl: string): Promise<string> {
    // This would integrate with Google Vision API
    // For now, return a placeholder
    return 'OCR text extraction not implemented';
  }
}

export { GoogleVisionAPIService as GoogleVisionAPI };