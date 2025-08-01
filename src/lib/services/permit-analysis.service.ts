import { ClaudeConstructionAssistantService } from './claude-construction-assistant.service';
import { useShovelsAPI } from '@/hooks/useShovelsAPI';

interface ShovelsPermit {
  id: string;
  permit_number: string;
  permit_type: string;
  status: 'issued' | 'pending' | 'expired' | 'rejected' | 'under_review';
  issued_date: string;
  expiration_date?: string;
  valuation: number;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    latitude?: number;
    longitude?: number;
  };
  contractor?: {
    name: string;
    license_number?: string;
    phone?: string;
  };
  owner?: {
    name: string;
    phone?: string;
  };
}

interface EnhancedPermit extends ShovelsPermit {
  claudeAnalysis: {
    opportunityScore: number;
    complexityScore: number;
    riskFactors: string[];
    projectComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
    competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    timelineEstimate: number;
    keyRequirements: string[];
    recommendations: string[];
    costRangeEstimate?: {
      low: number;
      high: number;
      confidence: number;
    };
  };
  analysisDate: Date;
}

interface PermitSearchParams {
  city?: string;
  state?: string;
  permitType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  minValuation?: number;
  maxValuation?: number;
  limit?: number;
}

interface MemberPreferences {
  serviceRadius: number;
  preferredCities: string[];
  excludedCities: string[];
  preferredProjectTypes: string[];
  excludedProjectTypes: string[];
  minProjectValue?: number;
  maxProjectValue?: number;
  minMatchScore: number;
}

export class PermitAnalysisService {
  private claudeService: ClaudeConstructionAssistantService;
  private shovelsAPI: any; // Will be initialized from hook

  constructor() {
    this.claudeService = new ClaudeConstructionAssistantService();
  }

  /**
   * Initialize the Shovels API connection
   */
  initializeShovelsAPI(shovelsAPIHook: any) {
    this.shovelsAPI = shovelsAPIHook;
  }

  /**
   * Search for permits with optional AI analysis
   */
  async searchPermits(
    params: PermitSearchParams,
    includeAIAnalysis: boolean = false,
    memberProfile?: any
  ): Promise<ShovelsPermit[] | EnhancedPermit[]> {
    if (!this.shovelsAPI) {
      throw new Error('Shovels API not initialized. Please configure API key.');
    }

    try {
      // Search permits using Shovels API
      const permits = await this.shovelsAPI.searchPermits({
        city: params.city,
        state: params.state || 'CA', // Default to California for NAMC NorCal
        permitType: params.permitType,
        status: params.status,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        limit: params.limit || 50
      });

      // Filter by valuation if specified
      let filteredPermits = permits;
      if (params.minValuation || params.maxValuation) {
        filteredPermits = permits.filter((permit: ShovelsPermit) => {
          if (!permit.valuation) return false;
          if (params.minValuation && permit.valuation < params.minValuation) return false;
          if (params.maxValuation && permit.valuation > params.maxValuation) return false;
          return true;
        });
      }

      if (!includeAIAnalysis) {
        return filteredPermits;
      }

      // Add AI analysis to each permit
      const enhancedPermits: EnhancedPermit[] = [];
      
      for (const permit of filteredPermits.slice(0, 10)) { // Limit to 10 for API cost control
        try {
          const analysisInput = {
            permitNumber: permit.permit_number,
            permitType: permit.permit_type,
            description: permit.description,
            valuation: permit.valuation,
            address: permit.address,
            contractorName: permit.contractor?.name,
            ownerName: permit.owner?.name
          };

          const claudeAnalysis = await this.claudeService.analyzePermit(
            analysisInput,
            memberProfile
          );

          enhancedPermits.push({
            ...permit,
            claudeAnalysis,
            analysisDate: new Date()
          });

          // Rate limiting: wait 1 second between Claude API calls
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Failed to analyze permit ${permit.permit_number}:`, error);
          // Add permit without analysis rather than failing completely
          enhancedPermits.push({
            ...permit,
            claudeAnalysis: {
              opportunityScore: 0.5,
              complexityScore: 0.5,
              riskFactors: ['Analysis unavailable'],
              projectComplexity: 'MEDIUM',
              competitionLevel: 'MEDIUM',
              timelineEstimate: 90,
              keyRequirements: ['Analysis pending'],
              recommendations: ['Manual review recommended']
            },
            analysisDate: new Date()
          });
        }
      }

      return enhancedPermits;
    } catch (error) {
      console.error('Error searching permits:', error);
      throw new Error('Failed to search permits');
    }
  }

  /**
   * Get detailed analysis for a specific permit
   */
  async analyzeSpecificPermit(
    permitId: string,
    memberProfile?: any
  ): Promise<EnhancedPermit> {
    if (!this.shovelsAPI) {
      throw new Error('Shovels API not initialized');
    }

    try {
      // Get permit details from Shovels API
      const permit = await this.shovelsAPI.getPermitDetails(permitId);
      if (!permit) {
        throw new Error('Permit not found');
      }

      // Analyze with Claude
      const analysisInput = {
        permitNumber: permit.permit_number,
        permitType: permit.permit_type,
        description: permit.description,
        valuation: permit.valuation,
        address: permit.address,
        contractorName: permit.contractor?.name,
        ownerName: permit.owner?.name
      };

      const claudeAnalysis = await this.claudeService.analyzePermit(
        analysisInput,
        memberProfile
      );

      return {
        ...permit,
        claudeAnalysis,
        analysisDate: new Date()
      };
    } catch (error) {
      console.error('Error analyzing specific permit:', error);
      throw new Error('Failed to analyze permit');
    }
  }

  /**
   * Find opportunities for a specific member based on their preferences
   */
  async findOpportunities(
    memberId: string,
    memberProfile: any,
    preferences: MemberPreferences
  ): Promise<EnhancedPermit[]> {
    try {
      // Build search parameters based on member preferences
      const searchParams: PermitSearchParams = {
        state: 'CA', // NAMC NorCal focuses on California
        limit: 25,
        minValuation: preferences.minProjectValue,
        maxValuation: preferences.maxProjectValue
      };

      // Search in preferred cities
      const opportunities: EnhancedPermit[] = [];
      
      const citiesToSearch = preferences.preferredCities.length > 0 
        ? preferences.preferredCities 
        : ['San Francisco', 'Oakland', 'San Jose', 'Fremont', 'Berkeley']; // Default Bay Area cities

      for (const city of citiesToSearch.slice(0, 3)) { // Limit to 3 cities for API cost control
        if (preferences.excludedCities.includes(city)) continue;

        const citySearchParams = { ...searchParams, city };
        const permits = await this.searchPermits(citySearchParams, true, memberProfile) as EnhancedPermit[];

        // Filter by AI match score and project types
        const relevantPermits = permits.filter(permit => {
          // Check opportunity score meets minimum threshold
          if (permit.claudeAnalysis.opportunityScore < preferences.minMatchScore) {
            return false;
          }

          // Check project type preferences
          if (preferences.excludedProjectTypes.some(excluded => 
            permit.permit_type.toLowerCase().includes(excluded.toLowerCase())
          )) {
            return false;
          }

          if (preferences.preferredProjectTypes.length > 0) {
            const hasPreferredType = preferences.preferredProjectTypes.some(preferred =>
              permit.permit_type.toLowerCase().includes(preferred.toLowerCase()) ||
              permit.description.toLowerCase().includes(preferred.toLowerCase())
            );
            if (!hasPreferredType) return false;
          }

          return true;
        });

        opportunities.push(...relevantPermits);

        // Rate limiting between cities
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Sort by opportunity score (highest first)
      return opportunities.sort((a, b) => 
        b.claudeAnalysis.opportunityScore - a.claudeAnalysis.opportunityScore
      );
    } catch (error) {
      console.error('Error finding opportunities:', error);
      throw new Error('Failed to find opportunities');
    }
  }

  /**
   * Generate cost estimate for a permit
   */
  async estimatePermitCost(
    permit: ShovelsPermit,
    memberProfile?: any
  ): Promise<any> {
    try {
      const projectInput = {
        projectDescription: permit.description,
        location: `${permit.address.city}, ${permit.address.state}`,
        projectType: permit.permit_type,
        scope: [permit.description], // We'll parse this better in production
        timeline: undefined, // Could be estimated from permit dates
        specialRequirements: []
      };

      const costEstimate = await this.claudeService.estimateProjectCost(
        projectInput,
        memberProfile
      );

      return {
        permitId: permit.id,
        permitNumber: permit.permit_number,
        ...costEstimate,
        createdAt: new Date()
      };
    } catch (error) {
      console.error('Error estimating permit cost:', error);
      throw new Error('Failed to estimate permit cost');
    }
  }

  /**
   * Get market intelligence for a specific area
   */
  async getMarketIntelligence(city: string, state: string = 'CA'): Promise<any> {
    try {
      // Get recent permits for market analysis
      const recentPermits = await this.searchPermits({
        city,
        state,
        dateFrom: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 90 days
        limit: 100
      });

      if (!recentPermits.length) {
        return {
          city,
          state,
          message: 'No recent permit data available',
          permitCount: 0
        };
      }

      // Calculate market statistics
      const totalValue = recentPermits.reduce((sum, permit) => sum + (permit.valuation || 0), 0);
      const permitTypes = recentPermits.reduce((types, permit) => {
        types[permit.permit_type] = (types[permit.permit_type] || 0) + 1;
        return types;
      }, {} as Record<string, number>);

      const averageValue = totalValue / recentPermits.length;
      const mostCommonType = Object.entries(permitTypes).sort((a, b) => b[1] - a[1])[0];

      return {
        city,
        state,
        period: 'Last 90 days',
        permitCount: recentPermits.length,
        totalValue,
        averageValue,
        mostCommonPermitType: mostCommonType[0],
        permitTypeDistribution: permitTypes,
        topContractors: this.getTopContractors(recentPermits),
        marketTrends: 'Analysis would require historical data comparison'
      };
    } catch (error) {
      console.error('Error getting market intelligence:', error);
      throw new Error('Failed to get market intelligence');
    }
  }

  /**
   * Helper method to extract top contractors from permits
   */
  private getTopContractors(permits: ShovelsPermit[]): any[] {
    const contractors = permits.reduce((acc, permit) => {
      if (permit.contractor?.name) {
        if (!acc[permit.contractor.name]) {
          acc[permit.contractor.name] = {
            name: permit.contractor.name,
            permitCount: 0,
            totalValue: 0,
            license: permit.contractor.license_number
          };
        }
        acc[permit.contractor.name].permitCount++;
        acc[permit.contractor.name].totalValue += permit.valuation || 0;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(contractors)
      .sort((a: any, b: any) => b.permitCount - a.permitCount)
      .slice(0, 10);
  }
}

export default PermitAnalysisService;