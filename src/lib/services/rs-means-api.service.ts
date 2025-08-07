import { PrismaClient } from '@prisma/client';

export interface RSMeansLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface RSMeansCostData {
  itemCode: string;
  description: string;
  unit: string;
  materialCost: number;
  laborCost: number;
  equipmentCost: number;
  totalCost: number;
  laborHours: number;
  locationFactor: number;
  priceDate: string;
  source: string;
  confidence?: number;
  lastUpdated?: string;
}

export interface RSMeansEstimate {
  totalMaterialCost: number;
  totalLaborCost: number;
  totalEquipmentCost: number;
  totalCost: number;
  totalLaborHours: number;
  locationFactor: number;
  overhead: number;
  profit: number;
  grandTotal: number;
  items: RSMeansCostData[];
  estimateId?: string;
  confidence: number;
  marketAdjustments: MarketAdjustment[];
}

export interface MaterialSpecification {
  material: string;
  type: string;
  quantity: number;
  unit: string;
  grade?: string;
  dimensions?: string;
  quality?: 'standard' | 'premium' | 'economy';
}

export interface LocalLaborRate {
  trade: string;
  baseRate: number;
  adjustedRate: number;
  locationFactor: number;
  unionRate?: number;
  prevailingWage?: number;
  source: string;
  effectiveDate: string;
}

export interface MaterialPricing {
  material: string;
  supplier: string;
  unitPrice: number;
  unit: string;
  availability: 'in-stock' | 'order' | 'special-order';
  leadTime: number;
  minimumOrder?: number;
  priceDate: string;
  location: string;
}

export interface MarketAdjustment {
  factor: string;
  adjustment: number;
  reason: string;
  confidence: number;
}

export class RSMeansAPIService {
  private apiKey: string;
  private baseUrl: string;
  private cache: Map<string, RSMeansCostData>;
  private prisma: PrismaClient;
  private cacheExpiryHours: number = 24; // Cache expires after 24 hours

  constructor() {
    this.apiKey = process.env.RS_MEANS_API_KEY || '';
    this.baseUrl = process.env.RS_MEANS_BASE_URL || 'https://api.rsmeans.com/v1';
    this.cache = new Map();
    this.prisma = new PrismaClient();
    
    if (!this.apiKey) {
      console.warn('RS_MEANS_API_KEY not found. Using mock data for development.');
    }
  }

  async getCostData(
    constructionElement: string,
    location: RSMeansLocation,
    specifications: MaterialSpecification[],
    costEstimateId?: string
  ): Promise<RSMeansCostData> {
    const cacheKey = `${constructionElement}_${location.latitude}_${location.longitude}_${JSON.stringify(specifications)}`;
    
    // Check memory cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      if (this.isCacheValid(cached.lastUpdated)) {
        return cached;
      }
    }

    // Check database cache
    const dbCached = await this.getFromDatabaseCache(cacheKey);
    if (dbCached && this.isCacheValid(dbCached.lastUpdated)) {
      this.cache.set(cacheKey, dbCached);
      return dbCached;
    }

    try {
      let costData: RSMeansCostData;

      if (!this.apiKey) {
        // Return mock data for development
        costData = await this.getMockCostData(constructionElement, specifications, location);
      } else {
        // Get real data from RS Means API
        const locationFactor = await this.getLocationFactor(location);
        const localLaborRates = await this.getLocalLaborRates(location, constructionElement);
        const materialPricing = await this.getLocalMaterialPricing(location, specifications);
        const itemCode = await this.findItemCode(constructionElement, specifications);
        
        const response = await fetch(`${this.baseUrl}/cost-data/${itemCode}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`RS Means API error: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Apply local labor rates and material pricing
        const adjustedLaborCost = this.applyLocalLaborRates(data.laborCost, localLaborRates, locationFactor);
        const adjustedMaterialCost = this.applyLocalMaterialPricing(data.materialCost, materialPricing, locationFactor);
        
        costData = {
          itemCode: data.itemCode,
          description: data.description,
          unit: data.unit,
          materialCost: adjustedMaterialCost,
          laborCost: adjustedLaborCost,
          equipmentCost: data.equipmentCost * locationFactor,
          totalCost: adjustedMaterialCost + adjustedLaborCost + (data.equipmentCost * locationFactor),
          laborHours: data.laborHours,
          locationFactor,
          priceDate: data.priceDate || new Date().toISOString().split('T')[0],
          source: 'RS Means API',
          confidence: this.calculateConfidence(data, localLaborRates, materialPricing),
          lastUpdated: new Date().toISOString()
        };
      }

      // Cache in memory and database
      this.cache.set(cacheKey, costData);
      await this.saveToDatabaseCache(cacheKey, costData, costEstimateId);
      
      return costData;
    } catch (error) {
      console.error('Error fetching RS Means data:', error);
      // Fallback to mock data
      const mockData = await this.getMockCostData(constructionElement, specifications, location);
      mockData.confidence = 0.6; // Lower confidence for mock data
      return mockData;
    }
  }

  async getLocationFactor(location: RSMeansLocation): Promise<number> {
    try {
      if (!this.apiKey) {
        return this.getMockLocationFactor(location);
      }

      const response = await fetch(`${this.baseUrl}/location-factors`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          city: location.city,
          state: location.state,
          zipCode: location.zipCode
        })
      });

      if (!response.ok) {
        throw new Error(`Location factor API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.locationFactor || 1.0;
    } catch (error) {
      console.error('Error fetching location factor:', error);
      return this.getMockLocationFactor(location);
    }
  }

  async getLocalLaborRates(location: RSMeansLocation, trade: string): Promise<LocalLaborRate[]> {
    try {
      if (!this.apiKey) {
        return this.getMockLocalLaborRates(location, trade);
      }

      const response = await fetch(`${this.baseUrl}/labor-rates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            city: location.city,
            state: location.state,
            zipCode: location.zipCode
          },
          trade,
          includeUnion: true,
          includePrevailingWage: true
        })
      });

      if (!response.ok) {
        throw new Error(`Labor rates API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.laborRates || this.getMockLocalLaborRates(location, trade);
    } catch (error) {
      console.error('Error fetching local labor rates:', error);
      return this.getMockLocalLaborRates(location, trade);
    }
  }

  async getLocalMaterialPricing(location: RSMeansLocation, specifications: MaterialSpecification[]): Promise<MaterialPricing[]> {
    try {
      if (!this.apiKey) {
        return this.getMockMaterialPricing(location, specifications);
      }

      const response = await fetch(`${this.baseUrl}/material-pricing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            city: location.city,
            state: location.state,
            zipCode: location.zipCode
          },
          materials: specifications.map(spec => ({
            material: spec.material,
            type: spec.type,
            unit: spec.unit,
            quality: spec.quality || 'standard'
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Material pricing API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.materialPricing || this.getMockMaterialPricing(location, specifications);
    } catch (error) {
      console.error('Error fetching local material pricing:', error);
      return this.getMockMaterialPricing(location, specifications);
    }
  }

  async findItemCode(
    constructionElement: string,
    specifications: MaterialSpecification[]
  ): Promise<string> {
    try {
      if (!this.apiKey) {
        return this.getMockItemCode(constructionElement);
      }

      const searchQuery = {
        element: constructionElement,
        specifications: specifications.map(spec => ({
          material: spec.material,
          type: spec.type,
          unit: spec.unit
        }))
      };

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchQuery)
      });

      if (!response.ok) {
        throw new Error(`Item search API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.items?.[0]?.itemCode || this.getMockItemCode(constructionElement);
    } catch (error) {
      console.error('Error finding item code:', error);
      return this.getMockItemCode(constructionElement);
    }
  }

  async generateEstimate(
    elements: Array<{
      element: string;
      specifications: MaterialSpecification[];
      quantity: number;
    }>,
    location: RSMeansLocation,
    overheadPercentage: number = 15,
    profitPercentage: number = 10,
    costEstimateId?: string
  ): Promise<RSMeansEstimate> {
    const items: RSMeansCostData[] = [];
    let totalMaterialCost = 0;
    let totalLaborCost = 0;
    let totalEquipmentCost = 0;
    let totalLaborHours = 0;
    let totalConfidence = 0;

    // Get market adjustments for the location
    const marketAdjustments = await this.getMarketAdjustments(location);

    for (const element of elements) {
      const costData = await this.getCostData(element.element, location, element.specifications, costEstimateId);
      
      const itemCost: RSMeansCostData = {
        ...costData,
        materialCost: costData.materialCost * element.quantity,
        laborCost: costData.laborCost * element.quantity,
        equipmentCost: costData.equipmentCost * element.quantity,
        totalCost: costData.totalCost * element.quantity,
        laborHours: costData.laborHours * element.quantity
      };

      items.push(itemCost);
      totalMaterialCost += itemCost.materialCost;
      totalLaborCost += itemCost.laborCost;
      totalEquipmentCost += itemCost.equipmentCost;
      totalLaborHours += itemCost.laborHours;
      totalConfidence += (costData.confidence || 0.8);
    }

    // Apply market adjustments
    const adjustmentFactor = this.calculateMarketAdjustmentFactor(marketAdjustments);
    totalMaterialCost *= adjustmentFactor;
    totalLaborCost *= adjustmentFactor;
    totalEquipmentCost *= adjustmentFactor;

    const subtotal = totalMaterialCost + totalLaborCost + totalEquipmentCost;
    const overhead = subtotal * (overheadPercentage / 100);
    const profit = (subtotal + overhead) * (profitPercentage / 100);
    const grandTotal = subtotal + overhead + profit;

    // Calculate overall confidence
    const overallConfidence = items.length > 0 ? totalConfidence / items.length : 0.8;

    return {
      totalMaterialCost,
      totalLaborCost,
      totalEquipmentCost,
      totalCost: subtotal,
      totalLaborHours,
      locationFactor: items[0]?.locationFactor || 1.0,
      overhead,
      profit,
      grandTotal,
      items,
      estimateId: costEstimateId,
      confidence: overallConfidence,
      marketAdjustments
    };
  }

  private async getMarketAdjustments(location: RSMeansLocation): Promise<MarketAdjustment[]> {
    // Mock market adjustments - in real implementation, this would fetch from RS Means or other market data sources
    const adjustments: MarketAdjustment[] = [];

    // Seasonal adjustment
    const month = new Date().getMonth();
    if (month >= 5 && month <= 8) { // Summer construction season
      adjustments.push({
        factor: 'seasonal_demand',
        adjustment: 1.05,
        reason: 'High construction season demand',
        confidence: 0.8
      });
    }

    // Regional market conditions
    const locationFactor = this.getMockLocationFactor(location);
    if (locationFactor > 1.2) {
      adjustments.push({
        factor: 'high_cost_area',
        adjustment: 1.03,
        reason: 'High cost metropolitan area premium',
        confidence: 0.9
      });
    }

    // Supply chain considerations
    adjustments.push({
      factor: 'supply_chain',
      adjustment: 1.02,
      reason: 'Current supply chain conditions',
      confidence: 0.7
    });

    return adjustments;
  }

  private calculateMarketAdjustmentFactor(adjustments: MarketAdjustment[]): number {
    return adjustments.reduce((factor, adjustment) => {
      return factor * adjustment.adjustment;
    }, 1.0);
  }

  // Mock data methods for development
  private async getMockCostData(
    constructionElement: string,
    specifications: MaterialSpecification[],
    location: RSMeansLocation
  ): Promise<RSMeansCostData> {
    const mockData = {
      'framing': { material: 120, labor: 80, equipment: 20, hours: 8 },
      'drywall': { material: 45, labor: 35, equipment: 5, hours: 4 },
      'flooring': { material: 85, labor: 55, equipment: 10, hours: 6 },
      'roofing': { material: 150, labor: 100, equipment: 25, hours: 10 },
      'electrical': { material: 200, labor: 150, equipment: 30, hours: 12 },
      'plumbing': { material: 180, labor: 120, equipment: 25, hours: 10 },
      'hvac': { material: 300, labor: 200, equipment: 50, hours: 16 },
      'foundation': { material: 250, labor: 180, equipment: 70, hours: 20 },
      'siding': { material: 90, labor: 70, equipment: 15, hours: 8 },
      'windows': { material: 400, labor: 100, equipment: 20, hours: 6 }
    };

    const elementKey = constructionElement.toLowerCase();
    const baseCosts = mockData[elementKey] || mockData['framing'];
    
    const totalQuantity = specifications.reduce((sum, spec) => sum + spec.quantity, 0) || 1;
    const locationFactor = 1.15; // Mock Bay Area factor

    return {
      itemCode: `MOCK_${elementKey.toUpperCase()}_001`,
      description: `Mock ${constructionElement} cost data`,
      unit: specifications[0]?.unit || 'SF',
      materialCost: baseCosts.material * locationFactor * totalQuantity,
      laborCost: baseCosts.labor * locationFactor * totalQuantity,
      equipmentCost: baseCosts.equipment * locationFactor * totalQuantity,
      totalCost: (baseCosts.material + baseCosts.labor + baseCosts.equipment) * locationFactor * totalQuantity,
      laborHours: baseCosts.hours * totalQuantity,
      locationFactor,
      priceDate: new Date().toISOString().split('T')[0],
      source: 'Mock Data (Development)',
      confidence: 0.7,
      lastUpdated: new Date().toISOString()
    };
  }

  private getMockLocalLaborRates(location: RSMeansLocation, trade: string): LocalLaborRate[] {
    const baseTrades = {
      'carpenter': 45,
      'electrician': 65,
      'plumber': 60,
      'hvac': 55,
      'general': 40,
      'concrete': 50,
      'roofer': 48,
      'painter': 35,
      'flooring': 42,
      'drywall': 38
    };

    const baseRate = baseTrades[trade.toLowerCase()] || baseTrades['general'];
    const locationFactor = this.getMockLocationFactor(location);
    
    return [{
      trade,
      baseRate,
      adjustedRate: baseRate * locationFactor,
      locationFactor,
      unionRate: baseRate * locationFactor * 1.3,
      prevailingWage: baseRate * locationFactor * 1.5,
      source: 'Mock Local Labor Data',
      effectiveDate: new Date().toISOString().split('T')[0]
    }];
  }

  private getMockMaterialPricing(location: RSMeansLocation, specifications: MaterialSpecification[]): MaterialPricing[] {
    const mockSuppliers = ['Home Depot', 'Lowes', 'Local Supplier', 'Specialty Supplier'];
    
    return specifications.map(spec => {
      const basePrice = this.getMockMaterialBasePrice(spec.material);
      const locationFactor = this.getMockLocationFactor(location);
      const qualityMultiplier = spec.quality === 'premium' ? 1.5 : spec.quality === 'economy' ? 0.8 : 1.0;
      
      return {
        material: spec.material,
        supplier: mockSuppliers[Math.floor(Math.random() * mockSuppliers.length)],
        unitPrice: basePrice * locationFactor * qualityMultiplier,
        unit: spec.unit,
        availability: Math.random() > 0.3 ? 'in-stock' : 'order',
        leadTime: Math.random() > 0.7 ? 7 : 0,
        minimumOrder: Math.random() > 0.5 ? 100 : undefined,
        priceDate: new Date().toISOString().split('T')[0],
        location: location.city || 'Local Area'
      };
    });
  }

  private getMockMaterialBasePrice(material: string): number {
    const materialPrices = {
      'lumber': 8.50,
      'drywall': 12.00,
      'concrete': 120.00,
      'steel': 0.85,
      'insulation': 1.25,
      'roofing': 3.50,
      'flooring': 4.75,
      'paint': 45.00,
      'electrical': 2.50,
      'plumbing': 3.25
    };

    const materialKey = Object.keys(materialPrices).find(key => 
      material.toLowerCase().includes(key)
    );

    return materialPrices[materialKey] || 5.00;
  }

  private getMockLocationFactor(location: RSMeansLocation): number {
    // Mock location factors based on general US regions
    const { latitude, longitude } = location;
    
    // Bay Area approximation
    if (latitude >= 37.0 && latitude <= 38.0 && longitude >= -123.0 && longitude <= -121.0) {
      return 1.25; // High cost area
    }
    
    // California general
    if (latitude >= 32.0 && latitude <= 42.0 && longitude >= -125.0 && longitude <= -114.0) {
      return 1.15;
    }
    
    // Default US average
    return 1.0;
  }

  private getMockItemCode(constructionElement: string): string {
    const elementMap = {
      'framing': '06110-100-1000',
      'drywall': '09210-100-1000',
      'flooring': '09650-100-1000',
      'roofing': '07310-100-1000',
      'electrical': '16050-100-1000',
      'plumbing': '15050-100-1000',
      'hvac': '15800-100-1000',
      'foundation': '03300-100-1000',
      'siding': '07460-100-1000',
      'windows': '08520-100-1000'
    };

    return elementMap[constructionElement.toLowerCase()] || '00000-100-1000';
  }

  // Caching utility methods
  private isCacheValid(lastUpdated?: string): boolean {
    if (!lastUpdated) return false;
    
    const cacheTime = new Date(lastUpdated);
    const now = new Date();
    const hoursDiff = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff < this.cacheExpiryHours;
  }

  private async getFromDatabaseCache(cacheKey: string): Promise<RSMeansCostData | null> {
    try {
      const cached = await this.prisma.rSMeansCache.findFirst({
        where: {
          cacheKey,
          updatedAt: {
            gte: new Date(Date.now() - this.cacheExpiryHours * 60 * 60 * 1000)
          }
        }
      });

      if (!cached) return null;

      return {
        itemCode: cached.itemCode,
        description: cached.description,
        unit: cached.unit,
        materialCost: cached.materialCost,
        laborCost: cached.laborCost,
        equipmentCost: cached.equipmentCost,
        totalCost: cached.totalCost,
        laborHours: cached.laborHours,
        locationFactor: cached.locationFactor,
        priceDate: cached.priceDate,
        source: cached.source,
        confidence: cached.confidence || 0.8,
        lastUpdated: cached.updatedAt.toISOString()
      };
    } catch (error) {
      console.error('Error reading from database cache:', error);
      return null;
    }
  }

  private async saveToDatabaseCache(cacheKey: string, costData: RSMeansCostData, costEstimateId?: string): Promise<void> {
    try {
      await this.prisma.rSMeansCache.upsert({
        where: { cacheKey },
        update: {
          itemCode: costData.itemCode,
          description: costData.description,
          unit: costData.unit,
          materialCost: costData.materialCost,
          laborCost: costData.laborCost,
          equipmentCost: costData.equipmentCost,
          totalCost: costData.totalCost,
          laborHours: costData.laborHours,
          locationFactor: costData.locationFactor,
          priceDate: costData.priceDate,
          source: costData.source,
          confidence: costData.confidence || 0.8,
          updatedAt: new Date()
        },
        create: {
          cacheKey,
          itemCode: costData.itemCode,
          description: costData.description,
          unit: costData.unit,
          materialCost: costData.materialCost,
          laborCost: costData.laborCost,
          equipmentCost: costData.equipmentCost,
          totalCost: costData.totalCost,
          laborHours: costData.laborHours,
          locationFactor: costData.locationFactor,
          priceDate: costData.priceDate,
          source: costData.source,
          confidence: costData.confidence || 0.8,
          costEstimateId
        }
      });
    } catch (error) {
      console.error('Error saving to database cache:', error);
    }
  }

  private applyLocalLaborRates(baseLaborCost: number, localRates: LocalLaborRate[], locationFactor: number): number {
    if (localRates.length === 0) {
      return baseLaborCost * locationFactor;
    }

    // Use the most relevant local rate (first one for now, could be enhanced with trade matching)
    const primaryRate = localRates[0];
    const adjustment = primaryRate.adjustedRate / primaryRate.baseRate;
    
    return baseLaborCost * adjustment * locationFactor;
  }

  private applyLocalMaterialPricing(baseMaterialCost: number, materialPricing: MaterialPricing[], locationFactor: number): number {
    if (materialPricing.length === 0) {
      return baseMaterialCost * locationFactor;
    }

    // Calculate weighted average of local material prices
    const totalWeight = materialPricing.length;
    const weightedPrice = materialPricing.reduce((sum, pricing) => {
      return sum + (pricing.unitPrice / totalWeight);
    }, 0);

    // Apply adjustment factor based on local vs base pricing
    const adjustment = weightedPrice > 0 ? Math.min(weightedPrice / baseMaterialCost, 2.0) : 1.0;
    
    return baseMaterialCost * adjustment * locationFactor;
  }

  private calculateConfidence(apiData: any, laborRates: LocalLaborRate[], materialPricing: MaterialPricing[]): number {
    let confidence = 0.8; // Base confidence for RS Means data

    // Increase confidence if we have local labor rates
    if (laborRates.length > 0) {
      confidence += 0.1;
    }

    // Increase confidence if we have local material pricing
    if (materialPricing.length > 0) {
      confidence += 0.1;
    }

    // Decrease confidence if data is old
    if (apiData.priceDate) {
      const dataAge = (Date.now() - new Date(apiData.priceDate).getTime()) / (1000 * 60 * 60 * 24);
      if (dataAge > 90) { // More than 3 months old
        confidence -= 0.2;
      }
    }

    return Math.max(0.3, Math.min(1.0, confidence));
  }

  // Utility methods
  async validateApiConnection(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }

      const response = await fetch(`${this.baseUrl}/health`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.ok;
    } catch (error) {
      console.error('RS Means API connection validation failed:', error);
      return false;
    }
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    
    try {
      await this.prisma.rSMeansCache.deleteMany({
        where: {
          updatedAt: {
            lt: new Date(Date.now() - this.cacheExpiryHours * 60 * 60 * 1000)
          }
        }
      });
    } catch (error) {
      console.error('Error clearing database cache:', error);
    }
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  async getDatabaseCacheSize(): Promise<number> {
    try {
      return await this.prisma.rSMeansCache.count();
    } catch (error) {
      console.error('Error getting database cache size:', error);
      return 0;
    }
  }
}