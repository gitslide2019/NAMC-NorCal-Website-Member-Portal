import { ImageAnnotatorClient } from '@google-cloud/vision';

interface VisionAnalysisResult {
  text: string;
  confidence: number;
  boundingBoxes: Array<{
    text: string;
    vertices: Array<{ x: number; y: number }>;
  }>;
}

interface DocumentAnalysisResult {
  documentType: string;
  extractedData: Record<string, any>;
  confidence: number;
  issues: string[];
}

export class GoogleVisionAPIService {
  private client: ImageAnnotatorClient;

  constructor() {
    // Initialize with environment variables or service account
    this.client = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_VISION_KEY_FILE,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
  }

  async analyzeImage(imageBuffer: Buffer): Promise<VisionAnalysisResult> {
    try {
      const [result] = await this.client.textDetection({
        image: { content: imageBuffer },
      });

      const detections = result.textAnnotations || [];
      const fullText = detections[0]?.description || '';

      const boundingBoxes = detections.slice(1).map(detection => ({
        text: detection.description || '',
        vertices: detection.boundingPoly?.vertices || []
      }));

      return {
        text: fullText,
        confidence: this.calculateConfidence(detections),
        boundingBoxes
      };
    } catch (error) {
      console.error('Google Vision API error:', error);
      throw new Error('Failed to analyze image with Google Vision API');
    }
  }

  async analyzeDocument(imageBuffer: Buffer): Promise<DocumentAnalysisResult> {
    try {
      const visionResult = await this.analyzeImage(imageBuffer);
      const documentType = this.detectDocumentType(visionResult.text);
      
      let extractedData: Record<string, any> = {};
      let issues: string[] = [];

      switch (documentType) {
        case 'contract':
          extractedData = this.extractContractData(visionResult.text);
          issues = this.validateContractData(extractedData);
          break;
        case 'permit':
          extractedData = this.extractPermitData(visionResult.text);
          issues = this.validatePermitData(extractedData);
          break;
        case 'invoice':
          extractedData = this.extractInvoiceData(visionResult.text);
          issues = this.validateInvoiceData(extractedData);
          break;
        case 'license':
          extractedData = this.extractLicenseData(visionResult.text);
          issues = this.validateLicenseData(extractedData);
          break;
        default:
          extractedData = { rawText: visionResult.text };
          issues = ['Unknown document type'];
      }

      return {
        documentType,
        extractedData,
        confidence: visionResult.confidence,
        issues
      };
    } catch (error) {
      console.error('Document analysis error:', error);
      throw new Error('Failed to analyze document');
    }
  }

  private calculateConfidence(detections: any[]): number {
    if (!detections.length) return 0;
    
    // Simple confidence calculation based on number of detected text elements
    const baseConfidence = Math.min(detections.length / 10, 1) * 100;
    return Math.round(baseConfidence);
  }

  private detectDocumentType(text: string): string {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('contract') || lowerText.includes('agreement')) {
      return 'contract';
    }
    if (lowerText.includes('permit') || lowerText.includes('building permit')) {
      return 'permit';
    }
    if (lowerText.includes('invoice') || lowerText.includes('bill')) {
      return 'invoice';
    }
    if (lowerText.includes('license') || lowerText.includes('certification')) {
      return 'license';
    }
    
    return 'unknown';
  }

  private extractContractData(text: string): Record<string, any> {
    const data: Record<string, any> = {};
    
    // Extract common contract fields using regex patterns
    const patterns = {
      contractNumber: /contract\s*(?:number|#)?\s*:?\s*([A-Z0-9-]+)/i,
      effectiveDate: /effective\s*date\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i,
      expirationDate: /expir(?:ation|es?)\s*date\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i,
      contractValue: /(?:total|contract)\s*(?:value|amount)\s*:?\s*\$?([0-9,]+\.?[0-9]*)/i,
      parties: /between\s+(.+?)\s+and\s+(.+?)(?:\s|$)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        data[key] = match[1].trim();
      }
    }

    return data;
  }

  private extractPermitData(text: string): Record<string, any> {
    const data: Record<string, any> = {};
    
    const patterns = {
      permitNumber: /permit\s*(?:number|#)?\s*:?\s*([A-Z0-9-]+)/i,
      issueDate: /issue\s*date\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i,
      expirationDate: /expir(?:ation|es?)\s*date\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i,
      projectAddress: /(?:project\s*)?address\s*:?\s*(.+?)(?:\n|$)/i,
      permitType: /permit\s*type\s*:?\s*(.+?)(?:\n|$)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        data[key] = match[1].trim();
      }
    }

    return data;
  }

  private extractInvoiceData(text: string): Record<string, any> {
    const data: Record<string, any> = {};
    
    const patterns = {
      invoiceNumber: /invoice\s*(?:number|#)?\s*:?\s*([A-Z0-9-]+)/i,
      invoiceDate: /invoice\s*date\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i,
      dueDate: /due\s*date\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i,
      totalAmount: /total\s*:?\s*\$?([0-9,]+\.?[0-9]*)/i,
      vendorName: /(?:from|vendor)\s*:?\s*(.+?)(?:\n|$)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        data[key] = match[1].trim();
      }
    }

    return data;
  }

  private extractLicenseData(text: string): Record<string, any> {
    const data: Record<string, any> = {};
    
    const patterns = {
      licenseNumber: /license\s*(?:number|#)?\s*:?\s*([A-Z0-9-]+)/i,
      issueDate: /issue\s*date\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i,
      expirationDate: /expir(?:ation|es?)\s*date\s*:?\s*([0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4})/i,
      licenseType: /license\s*type\s*:?\s*(.+?)(?:\n|$)/i,
      holderName: /(?:holder|name)\s*:?\s*(.+?)(?:\n|$)/i
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = text.match(pattern);
      if (match) {
        data[key] = match[1].trim();
      }
    }

    return data;
  }

  private validateContractData(data: Record<string, any>): string[] {
    const issues: string[] = [];
    
    if (!data.contractNumber) {
      issues.push('Contract number not found');
    }
    if (!data.effectiveDate) {
      issues.push('Effective date not found');
    }
    if (!data.contractValue) {
      issues.push('Contract value not found');
    }
    if (!data.parties) {
      issues.push('Contract parties not clearly identified');
    }

    return issues;
  }

  private validatePermitData(data: Record<string, any>): string[] {
    const issues: string[] = [];
    
    if (!data.permitNumber) {
      issues.push('Permit number not found');
    }
    if (!data.issueDate) {
      issues.push('Issue date not found');
    }
    if (!data.projectAddress) {
      issues.push('Project address not found');
    }

    return issues;
  }

  private validateInvoiceData(data: Record<string, any>): string[] {
    const issues: string[] = [];
    
    if (!data.invoiceNumber) {
      issues.push('Invoice number not found');
    }
    if (!data.totalAmount) {
      issues.push('Total amount not found');
    }
    if (!data.vendorName) {
      issues.push('Vendor name not found');
    }

    return issues;
  }

  private validateLicenseData(data: Record<string, any>): string[] {
    const issues: string[] = [];
    
    if (!data.licenseNumber) {
      issues.push('License number not found');
    }
    if (!data.expirationDate) {
      issues.push('Expiration date not found');
    }
    if (!data.licenseType) {
      issues.push('License type not found');
    }

    return issues;
  }
}

export const googleVisionService = new GoogleVisionAPIService();