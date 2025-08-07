import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AIBidGeneratorService } from '@/lib/services/ai-bid-generator.service'

// Mock external dependencies
vi.mock('@/lib/services/rs-means-api.service', () => ({
  RSMeansAPIService: vi.fn(() => ({
    getCostData: vi.fn(),
    getLocationFactors: vi.fn(),
  })),
}))

vi.mock('@/lib/services/arcgis-online.service', () => ({
  ArcGISOnlineService: vi.fn(() => ({
    getMarketData: vi.fn(),
    getDemographicData: vi.fn(),
  })),
}))

vi.mock('@/lib/services/hubspot-backbone.service', () => ({
  HubSpotBackboneService: vi.fn(() => ({
    createAIGeneratedBid: vi.fn(),
    getMemberProfile: vi.fn(),
  })),
}))

// Mock Anthropic
const mockAnthropic = {
  messages: {
    create: vi.fn(),
  },
}

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(() => mockAnthropic),
}))

describe('AIBidGeneratorService', () => {
  let service: AIBidGeneratorService
  let mockRSMeansService: any
  let mockArcGISService: any
  let mockHubSpotService: any

  beforeEach(() => {
    service = new AIBidGeneratorService()
    mockRSMeansService = service['rsMeansService']
    mockArcGISService = service['arcgisService']
    mockHubSpotService = service['hubspotService']
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('generateBid', () => {
    it('should generate comprehensive bid with all data sources', async () => {
      const projectData = {
        name: 'Residential Addition',
        type: 'residential',
        location: 'San Francisco, CA',
        specifications: 'Two-story addition with kitchen and bathroom',
        squareFootage: 800,
        memberId: 'member-123',
      }

      // Mock RS Means data
      mockRSMeansService.getCostData.mockResolvedValue({
        materials: 45000,
        labor: 35000,
        equipment: 8000,
        overhead: 12000,
        locationFactor: 1.25,
      })

      // Mock ArcGIS market data
      mockArcGISService.getMarketData.mockResolvedValue({
        averageIncome: 95000,
        constructionActivity: 'high',
        permitVolume: 150,
        competitorDensity: 'medium',
      })

      // Mock member profile
      mockHubSpotService.getMemberProfile.mockResolvedValue({
        id: 'member-123',
        company: 'ABC Construction',
        specialties: ['residential', 'additions'],
        winRate: 0.65,
        averageMargin: 0.18,
      })

      // Mock AI response
      mockAnthropic.messages.create.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            totalBidAmount: 125000,
            breakdown: {
              materials: 56250,
              labor: 43750,
              equipment: 10000,
              permits: 3500,
              overhead: 7500,
              profit: 4000,
            },
            timeline: '12 weeks',
            riskFactors: ['Weather delays', 'Permit approval time'],
            competitivePosition: 'competitive',
            winProbability: 0.72,
            recommendations: ['Highlight experience with similar projects'],
          }),
        }],
      })

      const result = await service.generateBid(projectData)

      expect(mockRSMeansService.getCostData).toHaveBeenCalledWith({
        projectType: 'residential',
        location: 'San Francisco, CA',
        specifications: projectData.specifications,
        squareFootage: 800,
      })

      expect(mockArcGISService.getMarketData).toHaveBeenCalledWith('San Francisco, CA')

      expect(mockHubSpotService.getMemberProfile).toHaveBeenCalledWith('member-123')

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: expect.stringContaining('Generate a comprehensive construction bid'),
        }],
      })

      expect(result).toEqual({
        totalBidAmount: 125000,
        breakdown: {
          materials: 56250,
          labor: 43750,
          equipment: 10000,
          permits: 3500,
          overhead: 7500,
          profit: 4000,
        },
        timeline: '12 weeks',
        riskFactors: ['Weather delays', 'Permit approval time'],
        competitivePosition: 'competitive',
        winProbability: 0.72,
        recommendations: ['Highlight experience with similar projects'],
        confidenceScore: expect.any(Number),
        dataSourcesUsed: ['rs_means', 'arcgis', 'member_profile'],
      })
    })

    it('should handle missing data gracefully', async () => {
      const projectData = {
        name: 'Simple Project',
        type: 'commercial',
        location: 'Oakland, CA',
        specifications: 'Basic renovation',
        memberId: 'member-456',
      }

      // Mock partial data availability
      mockRSMeansService.getCostData.mockResolvedValue({
        materials: 25000,
        labor: 20000,
        locationFactor: 1.15,
      })

      mockArcGISService.getMarketData.mockRejectedValue(new Error('ArcGIS API unavailable'))

      mockHubSpotService.getMemberProfile.mockResolvedValue({
        id: 'member-456',
        company: 'XYZ Contractors',
      })

      mockAnthropic.messages.create.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            totalBidAmount: 65000,
            breakdown: {
              materials: 28750,
              labor: 23000,
              overhead: 8000,
              profit: 5250,
            },
            timeline: '8 weeks',
            riskFactors: ['Limited market data available'],
            competitivePosition: 'unknown',
            winProbability: 0.5,
            recommendations: ['Gather more local market intelligence'],
          }),
        }],
      })

      const result = await service.generateBid(projectData)

      expect(result.totalBidAmount).toBe(65000)
      expect(result.riskFactors).toContain('Limited market data available')
      expect(result.dataSourcesUsed).toEqual(['rs_means', 'member_profile'])
      expect(result.dataSourcesUsed).not.toContain('arcgis')
    })

    it('should handle AI service errors', async () => {
      const projectData = {
        name: 'Error Test Project',
        type: 'residential',
        location: 'Berkeley, CA',
        specifications: 'Test project',
        memberId: 'member-789',
      }

      mockRSMeansService.getCostData.mockResolvedValue({
        materials: 30000,
        labor: 25000,
      })

      mockArcGISService.getMarketData.mockResolvedValue({
        averageIncome: 85000,
      })

      mockHubSpotService.getMemberProfile.mockResolvedValue({
        id: 'member-789',
      })

      mockAnthropic.messages.create.mockRejectedValue(new Error('AI service unavailable'))

      await expect(service.generateBid(projectData)).rejects.toThrow('AI service unavailable')
    })
  })

  describe('analyzeBidCompetitiveness', () => {
    it('should analyze bid against market benchmarks', async () => {
      const bidData = {
        totalAmount: 100000,
        projectType: 'residential',
        location: 'San Jose, CA',
        breakdown: {
          materials: 60000,
          labor: 30000,
          overhead: 7000,
          profit: 3000,
        },
      }

      mockArcGISService.getMarketData.mockResolvedValue({
        averageBidRange: { min: 95000, max: 110000 },
        competitorCount: 12,
        recentWinningBids: [98000, 102000, 105000],
      })

      mockAnthropic.messages.create.mockResolvedValue({
        content: [{
          text: JSON.stringify({
            competitivenessScore: 85,
            position: 'competitive',
            strengths: ['Competitive pricing', 'Reasonable profit margin'],
            weaknesses: ['Could optimize material costs'],
            recommendations: ['Consider bulk purchasing discounts'],
            winProbability: 0.68,
            suggestedAdjustments: {
              materials: -2000,
              profit: +1000,
            },
          }),
        }],
      })

      const result = await service.analyzeBidCompetitiveness(bidData)

      expect(result.competitivenessScore).toBe(85)
      expect(result.position).toBe('competitive')
      expect(result.winProbability).toBe(0.68)
      expect(result.suggestedAdjustments).toEqual({
        materials: -2000,
        profit: +1000,
      })
    })
  })

  describe('generateBidDocument', () => {
    it('should create formatted bid document', async () => {
      const bidData = {
        projectName: 'Kitchen Renovation',
        contractorInfo: {
          company: 'Elite Construction',
          license: 'CA-123456',
          contact: 'John Smith',
        },
        totalAmount: 75000,
        breakdown: {
          materials: 45000,
          labor: 22000,
          permits: 3000,
          overhead: 3500,
          profit: 1500,
        },
        timeline: '10 weeks',
        terms: 'Net 30',
        warranty: '2 years',
      }

      const result = await service.generateBidDocument(bidData)

      expect(result).toContain('Kitchen Renovation')
      expect(result).toContain('Elite Construction')
      expect(result).toContain('$75,000')
      expect(result).toContain('Materials: $45,000')
      expect(result).toContain('Labor: $22,000')
      expect(result).toContain('10 weeks')
      expect(result).toContain('2 years')
    })
  })

  describe('trackBidOutcome', () => {
    it('should record bid outcome for learning', async () => {
      const outcomeData = {
        bidId: 'bid-123',
        memberId: 'member-456',
        outcome: 'won',
        actualAmount: 98000,
        estimatedAmount: 95000,
        competitorCount: 5,
        winningFactors: ['Price', 'Timeline', 'Experience'],
      }

      mockHubSpotService.updateBidOutcome = vi.fn().mockResolvedValue({})

      await service.trackBidOutcome(outcomeData)

      expect(mockHubSpotService.updateBidOutcome).toHaveBeenCalledWith('bid-123', {
        outcome: 'won',
        actualAmount: 98000,
        accuracy: expect.any(Number),
        competitorCount: 5,
        winningFactors: ['Price', 'Timeline', 'Experience'],
        recordedAt: expect.any(String),
      })
    })
  })
})