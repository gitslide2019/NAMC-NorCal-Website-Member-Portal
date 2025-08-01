import Anthropic from '@anthropic-ai/sdk';

interface PermitAnalysisInput {
  permitNumber: string;
  permitType: string;
  description: string;
  valuation?: number;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  contractorName?: string;
  ownerName?: string;
}

interface ProjectEstimationInput {
  projectDescription: string;
  location: string;
  projectType: string;
  scope: string[];
  timeline?: string;
  specialRequirements?: string[];
}

interface MemberProfile {
  specialties: string[];
  serviceAreas: string[];
  pastProjects?: any[];
  teamSize?: number;
  certifications?: string[];
}

interface PermitAnalysisResult {
  opportunityScore: number; // 0-1
  complexityScore: number; // 0-1
  riskFactors: string[];
  projectComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
  competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timelineEstimate: number; // days
  keyRequirements: string[];
  recommendations: string[];
  costRangeEstimate?: {
    low: number;
    high: number;
    confidence: number;
  };
}

interface CostEstimationResult {
  totalEstimate: number;
  breakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  confidenceLevel: number; // 0-1
  riskFactors: string[];
  recommendations: string[];
  assumptions: string[];
  timeline: {
    phases: {
      name: string;
      duration: number; // days
      cost: number;
    }[];
    totalDuration: number;
  };
}

interface OpportunityMatchResult {
  matchScore: number; // 0-1
  strengths: string[];
  challenges: string[];
  recommendations: string[];
  conversionProbability: number; // 0-1
}

export class ClaudeConstructionAssistantService {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Claude API key not configured. Please set CLAUDE_API_KEY or ANTHROPIC_API_KEY environment variable.');
    }
    
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  /**
   * Analyze a construction permit for opportunities and insights
   */
  async analyzePermit(permit: PermitAnalysisInput, memberProfile?: MemberProfile): Promise<PermitAnalysisResult> {
    const prompt = `You are an expert construction industry analyst. Analyze this building permit and provide insights for construction contractors.

PERMIT DETAILS:
- Permit Number: ${permit.permitNumber}
- Type: ${permit.permitType}
- Description: ${permit.description}
- Valuation: ${permit.valuation ? `$${permit.valuation.toLocaleString()}` : 'Not specified'}
- Location: ${permit.address.street}, ${permit.address.city}, ${permit.address.state} ${permit.address.zip}
- Contractor: ${permit.contractorName || 'Not specified'}
- Owner: ${permit.ownerName || 'Not specified'}

${memberProfile ? `
CONTRACTOR PROFILE:
- Specialties: ${memberProfile.specialties.join(', ')}
- Service Areas: ${memberProfile.serviceAreas.join(', ')}
- Team Size: ${memberProfile.teamSize || 'Not specified'}
- Certifications: ${memberProfile.certifications?.join(', ') || 'Not specified'}
` : ''}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "opportunityScore": number (0-1, how good this opportunity is),
  "complexityScore": number (0-1, how complex the project is),
  "riskFactors": string[] (potential risks and challenges),
  "projectComplexity": "LOW" | "MEDIUM" | "HIGH",
  "competitionLevel": "LOW" | "MEDIUM" | "HIGH",
  "timelineEstimate": number (estimated days to complete),
  "keyRequirements": string[] (main requirements and scope items),
  "recommendations": string[] (actionable advice for the contractor),
  "costRangeEstimate": {
    "low": number,
    "high": number,
    "confidence": number (0-1)
  }
}

Consider factors like:
- Project scope and complexity
- Market conditions in ${permit.address.city}, ${permit.address.state}
- Permit type and requirements
- Competition likely for this type of work
- Timeline based on project size and complexity
- Regulatory requirements and approvals needed`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Extract JSON from the response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      
      throw new Error('Could not parse Claude response');
    } catch (error) {
      console.error('Error analyzing permit with Claude:', error);
      throw new Error('Failed to analyze permit with AI assistant');
    }
  }

  /**
   * Generate cost estimation for a construction project
   */
  async estimateProjectCost(project: ProjectEstimationInput, memberProfile?: MemberProfile): Promise<CostEstimationResult> {
    const prompt = `You are an expert construction cost estimator. Provide a detailed cost estimate for this construction project.

PROJECT DETAILS:
- Description: ${project.projectDescription}
- Location: ${project.location}
- Type: ${project.projectType}
- Scope: ${project.scope.join(', ')}
- Timeline: ${project.timeline || 'Not specified'}
- Special Requirements: ${project.specialRequirements?.join(', ') || 'None specified'}

${memberProfile ? `
CONTRACTOR PROFILE:
- Specialties: ${memberProfile.specialties.join(', ')}
- Service Areas: ${memberProfile.serviceAreas.join(', ')}
- Team Size: ${memberProfile.teamSize || 'Not specified'}
` : ''}

Provide a comprehensive cost estimate in JSON format:
{
  "totalEstimate": number,
  "breakdown": [
    {
      "category": string,
      "amount": number,
      "percentage": number
    }
  ],
  "confidenceLevel": number (0-1),
  "riskFactors": string[],
  "recommendations": string[],
  "assumptions": string[],
  "timeline": {
    "phases": [
      {
        "name": string,
        "duration": number (days),
        "cost": number
      }
    ],
    "totalDuration": number
  }
}

Consider current market rates in ${project.location}, material costs, labor costs, permits, and overhead. Break down costs by major categories like materials, labor, permits, equipment, and overhead.`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      
      throw new Error('Could not parse Claude response');
    } catch (error) {
      console.error('Error estimating cost with Claude:', error);
      throw new Error('Failed to estimate project cost with AI assistant');
    }
  }

  /**
   * Evaluate how well a permit matches a member's profile
   */
  async matchOpportunity(permit: PermitAnalysisInput, memberProfile: MemberProfile): Promise<OpportunityMatchResult> {
    const prompt = `You are an expert at matching construction opportunities to contractor capabilities. Evaluate how well this permit matches the contractor's profile.

PERMIT DETAILS:
- Type: ${permit.permitType}
- Description: ${permit.description}
- Valuation: ${permit.valuation ? `$${permit.valuation.toLocaleString()}` : 'Not specified'}
- Location: ${permit.address.city}, ${permit.address.state}

CONTRACTOR PROFILE:
- Specialties: ${memberProfile.specialties.join(', ')}
- Service Areas: ${memberProfile.serviceAreas.join(', ')}
- Team Size: ${memberProfile.teamSize || 'Not specified'}
- Certifications: ${memberProfile.certifications?.join(', ') || 'Not specified'}

Provide a match analysis in JSON format:
{
  "matchScore": number (0-1, overall fit),
  "strengths": string[] (why this is a good match),
  "challenges": string[] (potential obstacles or gaps),
  "recommendations": string[] (how to improve chances of success),
  "conversionProbability": number (0-1, likelihood of winning the project)
}

Consider:
- Specialty alignment with project requirements
- Geographic proximity and service area coverage
- Team capacity and project size
- Past experience with similar projects
- Competitive advantages
- Market conditions and competition level`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.content[0];
      if (content.type === 'text') {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
      
      throw new Error('Could not parse Claude response');
    } catch (error) {
      console.error('Error matching opportunity with Claude:', error);
      throw new Error('Failed to match opportunity with AI assistant');
    }
  }

  /**
   * General construction assistant chat
   */
  async chatWithAssistant(message: string, context?: {
    permitId?: string;
    projectId?: string;
    conversationHistory?: { role: string; content: string }[];
  }): Promise<string> {
    const systemPrompt = `You are a knowledgeable construction industry assistant specializing in helping NAMC (National Association of Minority Contractors) members with:

- Construction project analysis and planning
- Permit requirements and building codes
- Cost estimation and budgeting
- Project management and scheduling
- Business development and bidding strategies
- Industry best practices and standards
- Regulatory compliance and safety requirements

Provide practical, actionable advice based on construction industry expertise. Be concise but thorough, and always consider the unique challenges and opportunities facing minority-owned construction businesses.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if provided
    if (context?.conversationHistory) {
      messages.push(...context.conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })));
    }

    messages.push({ role: 'user', content: message });

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: messages
      });

      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      
      throw new Error('Could not get text response from Claude');
    } catch (error) {
      console.error('Error chatting with Claude:', error);
      throw new Error('Failed to get response from AI assistant');
    }
  }

  /**
   * Analyze multiple permits and rank them by opportunity score
   */
  async rankOpportunities(permits: PermitAnalysisInput[], memberProfile: MemberProfile): Promise<Array<{ permitNumber: string; score: number; analysis: PermitAnalysisResult }>> {
    const results = [];

    for (const permit of permits) {
      try {
        const analysis = await this.analyzePermit(permit, memberProfile);
        results.push({
          permitNumber: permit.permitNumber,
          score: analysis.opportunityScore,
          analysis
        });

        // Rate limiting: wait 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error analyzing permit ${permit.permitNumber}:`, error);
        // Continue with other permits
      }
    }

    // Sort by opportunity score (highest first)
    return results.sort((a, b) => b.score - a.score);
  }
}

export default ClaudeConstructionAssistantService;