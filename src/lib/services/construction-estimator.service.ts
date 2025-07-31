/**
 * Construction Estimator Service
 * 
 * AI-powered construction cost estimation service that provides intelligent
 * project cost analysis using OpenAI, historical data, and regional factors
 */

import OpenAI from 'openai'
import { estimatePDFService } from './estimate-pdf.service'
import { 
  ConstructionProject, 
  ConstructionEstimate, 
  EstimateCostBreakdown,
  MaterialEstimate,
  LaborEstimate,
  EquipmentEstimate,
  SubcontractorEstimate,
  EstimateRisk,
  ComparableProject
} from '@/types/construction-project.types'

// Regional cost multipliers (example data - would come from database)
const REGIONAL_MULTIPLIERS: Record<string, number> = {
  'CA-SF': 1.35,  // San Francisco Bay Area
  'CA-LA': 1.25,  // Los Angeles
  'CA-SD': 1.20,  // San Diego
  'CA-SAC': 1.10, // Sacramento
  'CA-OTHER': 1.15, // Other California
  'DEFAULT': 1.00
}

// Seasonal adjustment factors
const SEASONAL_FACTORS: Record<string, number> = {
  'winter': 1.05,  // Higher costs due to weather delays
  'spring': 0.98,  // Optimal conditions
  'summer': 1.00,  // Standard conditions
  'fall': 0.99     // Good conditions
}

// Trade labor rates (example - would be database driven)
const TRADE_RATES: Record<string, { rate: number, unit: string }> = {
  'general_labor': { rate: 45, unit: 'hour' },
  'carpenter': { rate: 65, unit: 'hour' },
  'electrician': { rate: 85, unit: 'hour' },
  'plumber': { rate: 80, unit: 'hour' },
  'hvac_tech': { rate: 75, unit: 'hour' },
  'mason': { rate: 70, unit: 'hour' },
  'roofer': { rate: 60, unit: 'hour' },
  'painter': { rate: 55, unit: 'hour' },
  'flooring': { rate: 50, unit: 'hour' },
  'concrete': { rate: 65, unit: 'hour' }
}

export class ConstructionEstimatorService {
  private openai: OpenAI
  private historicalData: Map<string, ComparableProject[]> = new Map()
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    })
    
    // Initialize with some mock historical data (would be loaded from database)
    this.loadHistoricalData()
  }
  
  /**
   * Generate comprehensive cost estimate for a construction project
   */
  async generateEstimate(project: Partial<ConstructionProject>): Promise<ConstructionEstimate> {
    try {
      // Step 1: Analyze project requirements
      const projectAnalysis = await this.analyzeProjectRequirements(project)
      
      // Step 2: Calculate base costs
      const baseCosts = await this.calculateBaseCosts(project, projectAnalysis)
      
      // Step 3: Apply regional adjustments
      const regionalAdjustment = this.getRegionalAdjustment(project.location?.city, project.location?.state)
      
      // Step 4: Apply seasonal adjustments
      const seasonalAdjustment = this.getSeasonalAdjustment()
      
      // Step 5: Calculate complexity factor
      const complexityFactor = await this.calculateComplexityFactor(project, projectAnalysis)
      
      // Step 6: Find comparable projects
      const comparableProjects = this.findComparableProjects(project)
      
      // Step 7: Identify risks
      const risks = await this.identifyRisks(project, projectAnalysis)
      
      // Step 8: Generate recommendations
      const recommendations = await this.generateRecommendations(project, baseCosts, risks)
      
      // Step 9: Calculate final costs
      const finalCosts = this.calculateFinalCosts(
        baseCosts,
        regionalAdjustment,
        seasonalAdjustment,
        complexityFactor
      )
      
      // Create estimate object
      const estimate: ConstructionEstimate = {
        id: this.generateEstimateId(),
        projectId: project.id || 'draft',
        version: 1,
        createdAt: new Date(),
        createdBy: 'system',
        costBreakdown: finalCosts,
        aiAnalysis: {
          confidence: this.calculateConfidence(project, comparableProjects),
          assumptions: projectAnalysis.assumptions,
          risks,
          recommendations,
          comparableProjects
        },
        regionalAdjustment: (regionalAdjustment - 1) * 100,
        seasonalAdjustment: (seasonalAdjustment - 1) * 100,
        complexityFactor,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: 'draft'
      }
      
      return estimate
    } catch (error) {
      console.error('Error generating estimate:', error)
      throw new Error('Failed to generate construction estimate')
    }
  }
  
  /**
   * Analyze project requirements using AI
   */
  private async analyzeProjectRequirements(project: Partial<ConstructionProject>) {
    const prompt = `
    Analyze the following construction project and provide detailed insights:
    
    Project Type: ${project.category}
    Subcategory: ${project.subcategory || 'Not specified'}
    Location: ${project.location?.city}, ${project.location?.state}
    Square Footage: ${project.specifications?.squareFootage || 'Not specified'}
    Stories: ${project.specifications?.stories || 'Not specified'}
    Special Requirements: ${project.specifications?.specialRequirements?.join(', ') || 'None'}
    
    Provide:
    1. Key construction phases for this project type
    2. Major material categories and rough quantities
    3. Required trades and estimated labor hours
    4. Potential challenges or complexities
    5. Any assumptions made in the analysis
    
    Format as JSON with keys: phases, materials, labor, challenges, assumptions
    `
    
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an experienced construction estimator with 20+ years of experience in residential, commercial, and industrial projects.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
      
      return JSON.parse(response.choices[0].message.content || '{}')
    } catch (error) {
      console.error('Error analyzing project:', error)
      return {
        phases: ['Foundation', 'Framing', 'Roofing', 'MEP', 'Interior', 'Finishing'],
        materials: [],
        labor: [],
        challenges: [],
        assumptions: ['Standard construction practices', 'No major site issues']
      }
    }
  }
  
  /**
   * Calculate base construction costs
   */
  private async calculateBaseCosts(
    project: Partial<ConstructionProject>,
    analysis: any
  ): Promise<EstimateCostBreakdown> {
    const sqft = project.specifications?.squareFootage || 2000 // default
    
    // Material costs
    const materials = await this.estimateMaterials(project, analysis, sqft)
    
    // Labor costs
    const labor = await this.estimateLabor(project, analysis, sqft)
    
    // Equipment costs
    const equipment = await this.estimateEquipment(project, analysis)
    
    // Subcontractor costs
    const subcontractors = await this.estimateSubcontractors(project, analysis)
    
    // Calculate indirect costs
    const permits = this.estimatePermitCosts(project)
    const insurance = sqft * 0.5 // $0.50 per sqft
    const bonding = (materials.reduce((sum, m) => sum + m.subtotal, 0) + 
                    labor.reduce((sum, l) => sum + l.total, 0)) * 0.02 // 2% of direct costs
    const overhead = sqft * 5 // $5 per sqft
    
    // Calculate totals
    const materialTotal = materials.reduce((sum, m) => sum + m.subtotal, 0)
    const laborTotal = labor.reduce((sum, l) => sum + l.total, 0)
    const equipmentTotal = equipment.reduce((sum, e) => sum + e.total, 0)
    const subcontractorTotal = subcontractors.reduce((sum, s) => sum + s.amount, 0)
    
    const subtotal = materialTotal + laborTotal + equipmentTotal + subcontractorTotal + 
                    permits + insurance + bonding + overhead
    
    const contingency = subtotal * 0.1 // 10% contingency
    const profitMargin = subtotal * 0.15 // 15% profit
    const total = subtotal + contingency + profitMargin
    
    return {
      materials,
      labor,
      equipment,
      subcontractors,
      permits,
      insurance,
      bonding,
      overhead,
      subtotal,
      contingency,
      profitMargin,
      total
    }
  }
  
  /**
   * Estimate material costs
   */
  private async estimateMaterials(
    project: Partial<ConstructionProject>,
    analysis: any,
    sqft: number
  ): Promise<MaterialEstimate[]> {
    const materials: MaterialEstimate[] = []
    
    // Foundation materials
    if (project.category) {
      materials.push({
        category: 'Foundation',
        items: [
          {
            name: 'Concrete',
            quantity: Math.ceil(sqft * 0.5),
            unit: 'cubic yards',
            unitCost: 150,
            totalCost: Math.ceil(sqft * 0.5) * 150
          },
          {
            name: 'Rebar',
            quantity: Math.ceil(sqft * 2),
            unit: 'lbs',
            unitCost: 0.75,
            totalCost: Math.ceil(sqft * 2) * 0.75
          }
        ],
        subtotal: 0
      })
    }
    
    // Framing materials
    materials.push({
      category: 'Framing',
      items: [
        {
          name: 'Lumber',
          quantity: Math.ceil(sqft * 1.5),
          unit: 'board feet',
          unitCost: 1.2,
          totalCost: Math.ceil(sqft * 1.5) * 1.2
        },
        {
          name: 'OSB Sheathing',
          quantity: Math.ceil(sqft / 32),
          unit: 'sheets',
          unitCost: 25,
          totalCost: Math.ceil(sqft / 32) * 25
        }
      ],
      subtotal: 0
    })
    
    // Add more material categories based on project type...
    
    // Calculate subtotals
    materials.forEach(category => {
      category.subtotal = category.items.reduce((sum, item) => sum + item.totalCost, 0)
    })
    
    return materials
  }
  
  /**
   * Estimate labor costs
   */
  private async estimateLabor(
    project: Partial<ConstructionProject>,
    analysis: any,
    sqft: number
  ): Promise<LaborEstimate[]> {
    const labor: LaborEstimate[] = []
    
    // General labor
    labor.push({
      trade: 'General Labor',
      workers: 4,
      hours: Math.ceil(sqft * 0.1),
      rate: TRADE_RATES.general_labor.rate,
      total: 4 * Math.ceil(sqft * 0.1) * TRADE_RATES.general_labor.rate
    })
    
    // Carpentry
    labor.push({
      trade: 'Carpentry',
      workers: 3,
      hours: Math.ceil(sqft * 0.15),
      rate: TRADE_RATES.carpenter.rate,
      total: 3 * Math.ceil(sqft * 0.15) * TRADE_RATES.carpenter.rate
    })
    
    // Electrical
    labor.push({
      trade: 'Electrical',
      workers: 2,
      hours: Math.ceil(sqft * 0.08),
      rate: TRADE_RATES.electrician.rate,
      total: 2 * Math.ceil(sqft * 0.08) * TRADE_RATES.electrician.rate
    })
    
    // Plumbing
    labor.push({
      trade: 'Plumbing',
      workers: 2,
      hours: Math.ceil(sqft * 0.06),
      rate: TRADE_RATES.plumber.rate,
      total: 2 * Math.ceil(sqft * 0.06) * TRADE_RATES.plumber.rate
    })
    
    return labor
  }
  
  /**
   * Estimate equipment costs
   */
  private async estimateEquipment(
    project: Partial<ConstructionProject>,
    analysis: any
  ): Promise<EquipmentEstimate[]> {
    const equipment: EquipmentEstimate[] = []
    const projectDuration = 120 // days (example)
    
    equipment.push({
      name: 'Crane',
      type: 'rental',
      duration: 10,
      unit: 'day',
      rate: 1200,
      total: 10 * 1200
    })
    
    equipment.push({
      name: 'Excavator',
      type: 'rental',
      duration: 5,
      unit: 'day',
      rate: 800,
      total: 5 * 800
    })
    
    equipment.push({
      name: 'Scaffolding',
      type: 'rental',
      duration: 60,
      unit: 'day',
      rate: 150,
      total: 60 * 150
    })
    
    return equipment
  }
  
  /**
   * Estimate subcontractor costs
   */
  private async estimateSubcontractors(
    project: Partial<ConstructionProject>,
    analysis: any
  ): Promise<SubcontractorEstimate[]> {
    const sqft = project.specifications?.squareFootage || 2000
    const subcontractors: SubcontractorEstimate[] = []
    
    subcontractors.push({
      trade: 'HVAC',
      scope: 'Complete HVAC system installation',
      amount: sqft * 6,
      includesMaterials: true
    })
    
    subcontractors.push({
      trade: 'Roofing',
      scope: 'Complete roofing system',
      amount: sqft * 4,
      includesMaterials: true
    })
    
    subcontractors.push({
      trade: 'Flooring',
      scope: 'All flooring installation',
      amount: sqft * 5,
      includesMaterials: false
    })
    
    return subcontractors
  }
  
  /**
   * Estimate permit costs based on project type and location
   */
  private estimatePermitCosts(project: Partial<ConstructionProject>): number {
    const baseCost = project.specifications?.squareFootage || 2000
    let permitCost = baseCost * 1.5 // $1.50 per sqft base
    
    // Adjust for project type
    switch (project.category) {
      case 'commercial':
        permitCost *= 1.5
        break
      case 'industrial':
        permitCost *= 1.8
        break
      case 'residential':
      default:
        permitCost *= 1.0
    }
    
    return Math.round(permitCost)
  }
  
  /**
   * Calculate complexity factor based on project characteristics
   */
  private async calculateComplexityFactor(
    project: Partial<ConstructionProject>,
    analysis: any
  ): Promise<number> {
    let factor = 1.0
    
    // Height complexity
    const stories = project.specifications?.stories || 1
    if (stories > 3) factor += 0.1
    if (stories > 5) factor += 0.2
    
    // Special requirements
    const specialReqs = project.specifications?.specialRequirements || []
    factor += specialReqs.length * 0.05
    
    // Green certifications
    const greenCerts = project.specifications?.greenCertifications || []
    factor += greenCerts.length * 0.1
    
    // Site challenges from analysis
    const challenges = analysis.challenges || []
    factor += challenges.length * 0.03
    
    return Math.max(1.0, Math.min(2.0, factor)) // Cap between 1.0 and 2.0
  }
  
  /**
   * Get regional cost adjustment multiplier
   */
  private getRegionalAdjustment(city?: string, state?: string): number {
    if (!city || !state) return REGIONAL_MULTIPLIERS.DEFAULT
    
    // Check for specific city
    const cityKey = `${state}-${city.toUpperCase()}`
    if (REGIONAL_MULTIPLIERS[cityKey]) {
      return REGIONAL_MULTIPLIERS[cityKey]
    }
    
    // Check for state
    const stateKey = `${state}-OTHER`
    if (REGIONAL_MULTIPLIERS[stateKey]) {
      return REGIONAL_MULTIPLIERS[stateKey]
    }
    
    return REGIONAL_MULTIPLIERS.DEFAULT
  }
  
  /**
   * Get seasonal adjustment based on current season
   */
  private getSeasonalAdjustment(): number {
    const month = new Date().getMonth()
    
    if (month >= 11 || month <= 1) return SEASONAL_FACTORS.winter
    if (month >= 2 && month <= 4) return SEASONAL_FACTORS.spring
    if (month >= 5 && month <= 7) return SEASONAL_FACTORS.summer
    return SEASONAL_FACTORS.fall
  }
  
  /**
   * Find comparable projects from historical data
   */
  private findComparableProjects(project: Partial<ConstructionProject>): ComparableProject[] {
    const comparables: ComparableProject[] = []
    const projectSqft = project.specifications?.squareFootage || 0
    
    // Get projects of same category
    const categoryProjects = this.historicalData.get(project.category || '') || []
    
    // Score and sort by similarity
    const scored = categoryProjects.map(comp => {
      let similarity = 100
      
      // Size difference (up to 30 points deduction)
      const sizeDiff = Math.abs(comp.size - projectSqft) / projectSqft
      similarity -= Math.min(30, sizeDiff * 100)
      
      // Location difference (up to 20 points deduction)
      if (comp.location !== `${project.location?.city}, ${project.location?.state}`) {
        similarity -= 20
      }
      
      // Age of project (up to 10 points deduction)
      const ageYears = (Date.now() - comp.completedDate.getTime()) / (365 * 24 * 60 * 60 * 1000)
      similarity -= Math.min(10, ageYears * 2)
      
      return {
        ...comp,
        similarity: Math.max(0, Math.round(similarity))
      }
    })
    
    // Return top 5 most similar
    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
  }
  
  /**
   * Identify project risks using AI analysis
   */
  private async identifyRisks(
    project: Partial<ConstructionProject>,
    analysis: any
  ): Promise<EstimateRisk[]> {
    const risks: EstimateRisk[] = []
    
    // Cost risks
    if (project.specifications?.squareFootage && project.specifications.squareFootage > 10000) {
      risks.push({
        category: 'cost',
        description: 'Large project size may lead to material price fluctuations',
        probability: 'medium',
        impact: 'high',
        mitigation: 'Lock in material prices early with suppliers'
      })
    }
    
    // Schedule risks
    const season = this.getSeasonalAdjustment()
    if (season === SEASONAL_FACTORS.winter) {
      risks.push({
        category: 'schedule',
        description: 'Winter weather conditions may cause delays',
        probability: 'high',
        impact: 'medium',
        mitigation: 'Build weather contingency days into schedule'
      })
    }
    
    // Regulatory risks
    if (project.specifications?.greenCertifications && project.specifications.greenCertifications.length > 0) {
      risks.push({
        category: 'regulatory',
        description: 'Green certification requirements may add complexity',
        probability: 'medium',
        impact: 'medium',
        mitigation: 'Engage certification consultant early in process'
      })
    }
    
    // Add risks from AI analysis
    const aiChallenges = analysis.challenges || []
    aiChallenges.forEach((challenge: string) => {
      risks.push({
        category: 'quality',
        description: challenge,
        probability: 'medium',
        impact: 'medium'
      })
    })
    
    return risks
  }
  
  /**
   * Generate AI-powered recommendations
   */
  private async generateRecommendations(
    project: Partial<ConstructionProject>,
    costs: EstimateCostBreakdown,
    risks: EstimateRisk[]
  ): Promise<string[]> {
    const recommendations: string[] = []
    
    // Cost-saving recommendations
    if (costs.total > 1000000) {
      recommendations.push('Consider value engineering sessions to identify cost reduction opportunities')
    }
    
    // Material recommendations
    const materialCostRatio = costs.materials.reduce((sum, m) => sum + m.subtotal, 0) / costs.subtotal
    if (materialCostRatio > 0.4) {
      recommendations.push('Material costs are high - consider bulk purchasing agreements or alternative materials')
    }
    
    // Schedule recommendations
    if (project.timeline?.estimatedEndDate) {
      const duration = new Date(project.timeline.estimatedEndDate).getTime() - 
                      new Date(project.timeline.estimatedStartDate).getTime()
      const days = duration / (24 * 60 * 60 * 1000)
      if (days < 90) {
        recommendations.push('Aggressive timeline - consider pre-ordering long-lead materials')
      }
    }
    
    // Risk-based recommendations
    const highRisks = risks.filter(r => r.impact === 'high')
    if (highRisks.length > 0) {
      recommendations.push('Multiple high-impact risks identified - recommend comprehensive risk management plan')
    }
    
    return recommendations
  }
  
  /**
   * Calculate final costs with all adjustments
   */
  private calculateFinalCosts(
    baseCosts: EstimateCostBreakdown,
    regionalAdjustment: number,
    seasonalAdjustment: number,
    complexityFactor: number
  ): EstimateCostBreakdown {
    const totalAdjustment = regionalAdjustment * seasonalAdjustment * complexityFactor
    
    // Apply adjustments to direct costs only
    const adjustedMaterials = baseCosts.materials.map(category => ({
      ...category,
      items: category.items.map(item => ({
        ...item,
        unitCost: item.unitCost * totalAdjustment,
        totalCost: item.totalCost * totalAdjustment
      })),
      subtotal: category.subtotal * totalAdjustment
    }))
    
    const adjustedLabor = baseCosts.labor.map(trade => ({
      ...trade,
      rate: trade.rate * regionalAdjustment, // Labor only gets regional adjustment
      total: trade.total * regionalAdjustment
    }))
    
    const adjustedEquipment = baseCosts.equipment.map(item => ({
      ...item,
      rate: item.rate * regionalAdjustment,
      total: item.total * regionalAdjustment
    }))
    
    const adjustedSubcontractors = baseCosts.subcontractors.map(sub => ({
      ...sub,
      amount: sub.amount * totalAdjustment
    }))
    
    // Recalculate totals
    const materialTotal = adjustedMaterials.reduce((sum, m) => sum + m.subtotal, 0)
    const laborTotal = adjustedLabor.reduce((sum, l) => sum + l.total, 0)
    const equipmentTotal = adjustedEquipment.reduce((sum, e) => sum + e.total, 0)
    const subcontractorTotal = adjustedSubcontractors.reduce((sum, s) => sum + s.amount, 0)
    
    const adjustedSubtotal = materialTotal + laborTotal + equipmentTotal + subcontractorTotal +
                            baseCosts.permits + baseCosts.insurance + baseCosts.bonding + baseCosts.overhead
    
    const adjustedContingency = adjustedSubtotal * 0.1
    const adjustedProfitMargin = adjustedSubtotal * 0.15
    const adjustedTotal = adjustedSubtotal + adjustedContingency + adjustedProfitMargin
    
    return {
      materials: adjustedMaterials,
      labor: adjustedLabor,
      equipment: adjustedEquipment,
      subcontractors: adjustedSubcontractors,
      permits: baseCosts.permits,
      insurance: baseCosts.insurance,
      bonding: baseCosts.bonding,
      overhead: baseCosts.overhead,
      subtotal: adjustedSubtotal,
      contingency: adjustedContingency,
      profitMargin: adjustedProfitMargin,
      total: adjustedTotal
    }
  }
  
  /**
   * Calculate confidence score for the estimate
   */
  private calculateConfidence(
    project: Partial<ConstructionProject>,
    comparables: ComparableProject[]
  ): number {
    let confidence = 50 // Base confidence
    
    // Project details completeness
    if (project.specifications?.squareFootage) confidence += 10
    if (project.location?.address) confidence += 5
    if (project.specifications?.stories) confidence += 5
    if (project.timeline?.estimatedStartDate) confidence += 5
    
    // Comparable projects
    const avgSimilarity = comparables.reduce((sum, c) => sum + c.similarity, 0) / (comparables.length || 1)
    confidence += Math.min(20, avgSimilarity / 5)
    
    // Cap at 95
    return Math.min(95, Math.round(confidence))
  }
  
  /**
   * Generate unique estimate ID
   */
  private generateEstimateId(): string {
    return `EST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Load historical project data (mock implementation)
   */
  private loadHistoricalData() {
    // In real implementation, this would load from database
    const mockProjects: ComparableProject[] = [
      {
        title: 'Oakland Office Building',
        location: 'Oakland, CA',
        completedDate: new Date('2023-06-15'),
        size: 15000,
        cost: 3750000,
        costPerSqFt: 250,
        similarity: 0
      },
      {
        title: 'San Francisco Retail Center',
        location: 'San Francisco, CA',
        completedDate: new Date('2023-09-20'),
        size: 8500,
        cost: 2550000,
        costPerSqFt: 300,
        similarity: 0
      },
      {
        title: 'Sacramento Warehouse',
        location: 'Sacramento, CA',
        completedDate: new Date('2024-01-10'),
        size: 25000,
        cost: 3750000,
        costPerSqFt: 150,
        similarity: 0
      }
    ]
    
    this.historicalData.set('commercial', mockProjects)
  }
  
  /**
   * Update historical data with completed project
   */
  async updateHistoricalData(project: ConstructionProject, actualCost: number) {
    const comparable: ComparableProject = {
      title: project.title,
      location: `${project.location.city}, ${project.location.state}`,
      completedDate: project.completedAt || new Date(),
      size: project.specifications.squareFootage || 0,
      cost: actualCost,
      costPerSqFt: actualCost / (project.specifications.squareFootage || 1),
      similarity: 100
    }
    
    const categoryProjects = this.historicalData.get(project.category) || []
    categoryProjects.push(comparable)
    this.historicalData.set(project.category, categoryProjects)
  }
  
  /**
   * Generate and download PDF estimate
   */
  async generateEstimatePDF(
    project: ConstructionProject,
    estimate: ConstructionEstimate,
    companyInfo?: {
      name: string
      logo?: string
      address?: string
      phone?: string
      email?: string
      license?: string
    }
  ): Promise<Blob> {
    return await estimatePDFService.generateEstimatePDF(project, estimate, companyInfo)
  }
  
  /**
   * Send estimate via email with PDF attachment
   */
  async sendEstimateEmail(
    project: ConstructionProject,
    estimate: ConstructionEstimate,
    recipientEmail: string,
    recipientName: string,
    senderInfo: {
      name: string
      email: string
      phone?: string
      company: string
      license?: string
    }
  ): Promise<boolean> {
    try {
      // Generate PDF
      const pdfBlob = await this.generateEstimatePDF(project, estimate, senderInfo)
      
      // Generate email template
      const emailTemplate = estimatePDFService.generateEmailTemplate(
        project,
        estimate,
        recipientName
      )
      
      // Create email data
      const emailData = {
        to: recipientEmail,
        from: senderInfo.email,
        subject: emailTemplate.subject,
        html: emailTemplate.body.replace(/\n/g, '<br>'),
        attachments: [
          {
            filename: `Estimate-${project.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`,
            content: Buffer.from(await pdfBlob.arrayBuffer()),
            type: 'application/pdf'
          }
        ]
      }
      
      // Send email via API
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      })
      
      if (!response.ok) {
        throw new Error('Failed to send email')
      }
      
      return true
    } catch (error) {
      console.error('Error sending estimate email:', error)
      return false
    }
  }
  
  /**
   * Create estimate link for sharing
   */
  async createEstimateShareLink(
    project: ConstructionProject,
    estimate: ConstructionEstimate
  ): Promise<{ link: string; expires: Date }> {
    const shareToken = this.generateShareToken()
    const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    // Store share data (in real implementation, save to database)
    const shareData = {
      token: shareToken,
      projectId: project.id,
      estimateId: estimate.id,
      expires: expirationDate,
      accessCount: 0,
      maxAccess: 10
    }
    
    // Return shareable link
    return {
      link: `${process.env.NEXT_PUBLIC_APP_URL}/estimate/shared/${shareToken}`,
      expires: expirationDate
    }
  }
  
  /**
   * Track estimate interactions for analytics
   */
  async trackEstimateInteraction(
    estimateId: string,
    action: 'viewed' | 'downloaded' | 'shared' | 'accepted' | 'rejected',
    metadata?: Record<string, any>
  ) {
    try {
      const interaction = {
        estimateId,
        action,
        timestamp: new Date(),
        metadata,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server'
      }
      
      // Store interaction (in real implementation, save to database/analytics)
      console.log('Estimate interaction tracked:', interaction)
      
      // Could also send to analytics service like Google Analytics, Mixpanel, etc.
    } catch (error) {
      console.error('Error tracking estimate interaction:', error)
    }
  }
  
  /**
   * Generate secure share token
   */
  private generateShareToken(): string {
    return crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36)
  }
}

// Export singleton instance
export const constructionEstimatorService = new ConstructionEstimatorService()