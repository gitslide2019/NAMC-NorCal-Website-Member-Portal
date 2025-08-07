import { ImageAnnotatorClient } from '@google-cloud/vision';
import { HubSpotBackboneService } from './hubspot-backbone.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface OCRExtractedData {
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  confidence: number;
  rawText: string;
  boundingBoxes: Array<{
    text: string;
    confidence: number;
    vertices: Array<{ x: number; y: number }>;
  }>;
}

export interface BusinessCardData {
  id: string;
  scannedBy: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  notes?: string;
  imageUrl?: string;
  ocrConfidence?: number;
  isProcessed: boolean;
  contactCreated: boolean;
  hubspotContactId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactCreationResult {
  success: boolean;
  contactId?: string;
  hubspotContactId?: string;
  isDuplicate?: boolean;
  mergedWith?: string;
  error?: string;
}

export class OCRBusinessCardService {
  private visionClient: ImageAnnotatorClient;
  private hubspotService: HubSpotBackboneService;

  constructor() {
    // Initialize Google Vision client
    this.visionClient = new ImageAnnotatorClient({
      keyFilename: process.env.GOOGLE_VISION_CREDENTIALS_PATH,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    
    this.hubspotService = new HubSpotBackboneService({
      accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
      portalId: process.env.HUBSPOT_PORTAL_ID,
    });
  }

  /**
   * Process business card image with Google Vision OCR
   */
  async processBusinessCardImage(
    imageBuffer: Buffer,
    scannedBy: string,
    imageUrl?: string
  ): Promise<BusinessCardData> {
    try {
      // Create initial business card record
      const businessCard = await prisma.businessCard.create({
        data: {
          scannedBy,
          imageUrl,
          isProcessed: false,
          contactCreated: false,
        },
      });

      // Log processing start
      await this.logProcessingStep(
        businessCard.id,
        'UPLOAD',
        'SUCCESS',
        'Business card image uploaded successfully'
      );

      // Perform OCR processing
      const ocrData = await this.performOCR(imageBuffer);
      
      // Log OCR processing
      await this.logProcessingStep(
        businessCard.id,
        'OCR_PROCESSING',
        'SUCCESS',
        'OCR processing completed',
        JSON.stringify(ocrData)
      );

      // Extract structured data from OCR results
      const extractedData = await this.extractStructuredData(ocrData);
      
      // Validate and enhance data with AI assistance
      const validatedData = await this.validateAndEnhanceData(extractedData);
      
      // Update business card with extracted data
      const updatedCard = await prisma.businessCard.update({
        where: { id: businessCard.id },
        data: {
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          company: validatedData.company,
          title: validatedData.title,
          email: validatedData.email,
          phone: validatedData.phone,
          website: validatedData.website,
          address: validatedData.address,
          ocrConfidence: validatedData.confidence,
          isProcessed: true,
        },
      });

      // Log validation completion
      await this.logProcessingStep(
        businessCard.id,
        'VALIDATION',
        'SUCCESS',
        'Data validation and enhancement completed',
        JSON.stringify(validatedData)
      );

      return updatedCard;
    } catch (error) {
      console.error('Error processing business card:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Perform OCR using Google Vision API
   */
  private async performOCR(imageBuffer: Buffer): Promise<OCRExtractedData> {
    try {
      const [result] = await this.visionClient.textDetection({
        image: { content: imageBuffer },
      });

      const detections = result.textAnnotations || [];
      
      if (detections.length === 0) {
        throw new Error('No text detected in the image');
      }

      // First annotation contains the full text
      const fullText = detections[0]?.description || '';
      
      // Individual word/phrase annotations with bounding boxes
      const boundingBoxes = detections.slice(1).map(annotation => ({
        text: annotation.description || '',
        confidence: annotation.confidence || 0,
        vertices: annotation.boundingPoly?.vertices?.map(vertex => ({
          x: vertex.x || 0,
          y: vertex.y || 0,
        })) || [],
      }));

      return {
        rawText: fullText,
        boundingBoxes,
        confidence: this.calculateOverallConfidence(boundingBoxes),
      };
    } catch (error) {
      console.error('Google Vision OCR error:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Extract structured data from OCR results using pattern matching
   */
  private async extractStructuredData(ocrData: OCRExtractedData): Promise<OCRExtractedData> {
    const text = ocrData.rawText;
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const extractedData: Partial<OCRExtractedData> = {
      ...ocrData,
    };

    // Email pattern
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatch = text.match(emailRegex);
    if (emailMatch) {
      extractedData.email = emailMatch[0];
    }

    // Phone pattern (various formats)
    const phoneRegex = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
      extractedData.phone = phoneMatch[0];
    }

    // Website pattern
    const websiteRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:\/[^\s]*)?/g;
    const websiteMatch = text.match(websiteRegex);
    if (websiteMatch) {
      extractedData.website = websiteMatch[0];
    }

    // Name extraction (typically first few lines)
    if (lines.length > 0) {
      const firstLine = lines[0];
      const nameParts = firstLine.split(' ').filter(part => part.length > 1);
      if (nameParts.length >= 2) {
        extractedData.firstName = nameParts[0];
        extractedData.lastName = nameParts.slice(1).join(' ');
      } else if (nameParts.length === 1) {
        extractedData.firstName = nameParts[0];
      }
    }

    // Company extraction (look for common company indicators)
    const companyIndicators = ['LLC', 'Inc', 'Corp', 'Company', 'Construction', 'Contractors', 'Services'];
    for (const line of lines) {
      if (companyIndicators.some(indicator => 
        line.toUpperCase().includes(indicator.toUpperCase())
      )) {
        extractedData.company = line;
        break;
      }
    }

    // Title extraction (look for common titles)
    const titleIndicators = ['CEO', 'President', 'Manager', 'Director', 'Contractor', 'Owner', 'Founder'];
    for (const line of lines) {
      if (titleIndicators.some(title => 
        line.toUpperCase().includes(title.toUpperCase())
      )) {
        extractedData.title = line;
        break;
      }
    }

    // Address extraction (look for patterns with numbers and common address words)
    const addressIndicators = ['Street', 'St', 'Avenue', 'Ave', 'Road', 'Rd', 'Drive', 'Dr', 'Lane', 'Ln'];
    for (const line of lines) {
      if (addressIndicators.some(addr => 
        line.toUpperCase().includes(addr.toUpperCase())
      ) && /\d/.test(line)) {
        extractedData.address = line;
        break;
      }
    }

    return extractedData as OCRExtractedData;
  }

  /**
   * Validate and enhance extracted data using AI assistance
   */
  private async validateAndEnhanceData(data: OCRExtractedData): Promise<OCRExtractedData> {
    // Basic validation and cleanup
    const cleanedData = { ...data };

    // Clean phone number
    if (cleanedData.phone) {
      cleanedData.phone = cleanedData.phone.replace(/[^\d+]/g, '');
      if (cleanedData.phone.length === 10) {
        cleanedData.phone = `+1${cleanedData.phone}`;
      }
    }

    // Clean email
    if (cleanedData.email) {
      cleanedData.email = cleanedData.email.toLowerCase().trim();
    }

    // Clean website
    if (cleanedData.website) {
      if (!cleanedData.website.startsWith('http')) {
        cleanedData.website = `https://${cleanedData.website}`;
      }
    }

    // Validate email format
    if (cleanedData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanedData.email)) {
        delete cleanedData.email;
      }
    }

    // Calculate confidence score based on extracted fields
    let confidenceScore = data.confidence;
    const fieldsFound = [
      cleanedData.firstName,
      cleanedData.lastName,
      cleanedData.company,
      cleanedData.email,
      cleanedData.phone,
    ].filter(Boolean).length;

    // Boost confidence based on number of fields extracted
    confidenceScore = Math.min(confidenceScore + (fieldsFound * 0.1), 1.0);
    cleanedData.confidence = confidenceScore;

    return cleanedData;
  }

  /**
   * Calculate overall confidence from bounding boxes
   */
  private calculateOverallConfidence(boundingBoxes: Array<{ confidence: number }>): number {
    if (boundingBoxes.length === 0) return 0;
    
    const totalConfidence = boundingBoxes.reduce((sum, box) => sum + box.confidence, 0);
    return totalConfidence / boundingBoxes.length;
  }

  /**
   * Create contact from business card data
   */
  async createContactFromBusinessCard(
    businessCardId: string,
    verifiedData?: Partial<OCRExtractedData>
  ): Promise<ContactCreationResult> {
    try {
      const businessCard = await prisma.businessCard.findUnique({
        where: { id: businessCardId },
      });

      if (!businessCard) {
        throw new Error('Business card not found');
      }

      // Use verified data if provided, otherwise use extracted data
      const contactData = {
        firstName: verifiedData?.firstName || businessCard.firstName,
        lastName: verifiedData?.lastName || businessCard.lastName,
        company: verifiedData?.company || businessCard.company,
        title: verifiedData?.title || businessCard.title,
        email: verifiedData?.email || businessCard.email,
        phone: verifiedData?.phone || businessCard.phone,
        website: verifiedData?.website || businessCard.website,
        address: verifiedData?.address || businessCard.address,
      };

      // Check for duplicates
      const duplicateCheck = await this.checkForDuplicates(contactData);
      if (duplicateCheck.isDuplicate) {
        return {
          success: true,
          isDuplicate: true,
          mergedWith: duplicateCheck.existingContactId,
          contactId: duplicateCheck.existingContactId,
        };
      }

      // Create HubSpot contact
      const hubspotContact = await this.hubspotService.createContactFromOCR(
        {
          ...contactData,
          confidence: businessCard.ocrConfidence || 0,
        },
        businessCard.scannedBy
      );

      // Update business card with contact information
      await prisma.businessCard.update({
        where: { id: businessCardId },
        data: {
          contactCreated: true,
          hubspotContactId: hubspotContact.id,
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date(),
        },
      });

      // Log contact creation
      await this.logProcessingStep(
        businessCardId,
        'CONTACT_CREATION',
        'SUCCESS',
        'Contact created successfully in HubSpot',
        JSON.stringify({ hubspotContactId: hubspotContact.id })
      );

      return {
        success: true,
        contactId: businessCardId,
        hubspotContactId: hubspotContact.id,
        isDuplicate: false,
      };
    } catch (error) {
      console.error('Error creating contact from business card:', error);
      
      // Log error
      await this.logProcessingStep(
        businessCardId,
        'CONTACT_CREATION',
        'ERROR',
        error.message
      );

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check for duplicate contacts
   */
  private async checkForDuplicates(contactData: any): Promise<{
    isDuplicate: boolean;
    existingContactId?: string;
  }> {
    // First check local database
    if (contactData.email) {
      const existingCard = await prisma.businessCard.findFirst({
        where: {
          email: contactData.email,
          contactCreated: true,
        },
      });

      if (existingCard) {
        return {
          isDuplicate: true,
          existingContactId: existingCard.hubspotContactId || existingCard.id,
        };
      }
    }

    // Then check HubSpot for duplicates
    try {
      const hubspotDuplicateCheck = await this.hubspotService.checkForDuplicateContacts(
        contactData.email,
        contactData.phone,
        contactData.firstName,
        contactData.lastName,
        contactData.company
      );

      if (hubspotDuplicateCheck.isDuplicate) {
        return {
          isDuplicate: true,
          existingContactId: hubspotDuplicateCheck.existingContactId,
        };
      }
    } catch (error) {
      console.error('Error checking HubSpot duplicates:', error);
      // Continue with local check if HubSpot fails
    }

    // Check local database by phone and name/company as fallback
    if (contactData.phone) {
      const existingCard = await prisma.businessCard.findFirst({
        where: {
          phone: contactData.phone,
          contactCreated: true,
        },
      });

      if (existingCard) {
        return {
          isDuplicate: true,
          existingContactId: existingCard.hubspotContactId || existingCard.id,
        };
      }
    }

    if (contactData.firstName && contactData.lastName && contactData.company) {
      const existingCard = await prisma.businessCard.findFirst({
        where: {
          firstName: contactData.firstName,
          lastName: contactData.lastName,
          company: contactData.company,
          contactCreated: true,
        },
      });

      if (existingCard) {
        return {
          isDuplicate: true,
          existingContactId: existingCard.hubspotContactId || existingCard.id,
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Get business card by ID
   */
  async getBusinessCard(id: string): Promise<BusinessCardData | null> {
    return await prisma.businessCard.findUnique({
      where: { id },
    });
  }

  /**
   * Get business cards for a member
   */
  async getMemberBusinessCards(memberId: string): Promise<BusinessCardData[]> {
    return await prisma.businessCard.findMany({
      where: { scannedBy: memberId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update business card data
   */
  async updateBusinessCard(
    id: string,
    updates: Partial<OCRExtractedData>
  ): Promise<BusinessCardData> {
    return await prisma.businessCard.update({
      where: { id },
      data: {
        firstName: updates.firstName,
        lastName: updates.lastName,
        company: updates.company,
        title: updates.title,
        email: updates.email,
        phone: updates.phone,
        website: updates.website,
        address: updates.address,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete business card
   */
  async deleteBusinessCard(id: string): Promise<void> {
    await prisma.businessCard.delete({
      where: { id },
    });
  }

  /**
   * Log processing step
   */
  private async logProcessingStep(
    businessCardId: string,
    step: string,
    status: string,
    message?: string,
    data?: string
  ): Promise<void> {
    const startTime = Date.now();
    
    await prisma.oCRProcessingLog.create({
      data: {
        businessCardId,
        processingStep: step,
        status,
        errorMessage: status === 'ERROR' ? message : undefined,
        rawOcrData: step === 'OCR_PROCESSING' && data ? data : undefined,
        processedData: step === 'VALIDATION' && data ? data : undefined,
        processingTime: Date.now() - startTime,
      },
    });
  }

  /**
   * Get processing logs for a business card
   */
  async getProcessingLogs(businessCardId: string) {
    return await prisma.oCRProcessingLog.findMany({
      where: { businessCardId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Invite contact to NAMC membership
   */
  async inviteToMembership(businessCardId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const businessCard = await prisma.businessCard.findUnique({
        where: { id: businessCardId },
      });

      if (!businessCard || !businessCard.hubspotContactId) {
        throw new Error('Business card or HubSpot contact not found');
      }

      await this.hubspotService.inviteContactToMembership(businessCard.hubspotContactId);

      // Update local record
      await prisma.businessCard.update({
        where: { id: businessCardId },
        data: {
          notes: businessCard.notes 
            ? `${businessCard.notes}\n\nMembership invitation sent on ${new Date().toLocaleDateString()}`
            : `Membership invitation sent on ${new Date().toLocaleDateString()}`,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Error inviting contact to membership:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to invite contact',
      };
    }
  }

  /**
   * Create networking task for follow-up
   */
  async createNetworkingTask(
    businessCardId: string,
    assigneeId: string,
    taskType: 'follow_up' | 'meeting_request' | 'project_discussion' = 'follow_up',
    dueDate?: Date
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const businessCard = await prisma.businessCard.findUnique({
        where: { id: businessCardId },
      });

      if (!businessCard || !businessCard.hubspotContactId) {
        throw new Error('Business card or HubSpot contact not found');
      }

      const task = await this.hubspotService.createNetworkingTask(
        businessCard.hubspotContactId,
        assigneeId,
        taskType,
        dueDate
      );

      // Update local record with task reference
      await prisma.businessCard.update({
        where: { id: businessCardId },
        data: {
          notes: businessCard.notes 
            ? `${businessCard.notes}\n\nNetworking task created: ${taskType} (${new Date().toLocaleDateString()})`
            : `Networking task created: ${taskType} (${new Date().toLocaleDateString()})`,
        },
      });

      return {
        success: true,
        taskId: task.id,
      };
    } catch (error) {
      console.error('Error creating networking task:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create networking task',
      };
    }
  }

  /**
   * Get business cards with networking opportunities
   */
  async getNetworkingOpportunities(memberId: string): Promise<{
    recentScans: BusinessCardData[];
    pendingFollowUps: BusinessCardData[];
    potentialMembers: BusinessCardData[];
  }> {
    const businessCards = await prisma.businessCard.findMany({
      where: { scannedBy: memberId },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      recentScans: businessCards.filter(card => 
        new Date(card.createdAt) > oneWeekAgo
      ).slice(0, 5),
      
      pendingFollowUps: businessCards.filter(card => 
        card.contactCreated && 
        new Date(card.createdAt) > oneMonthAgo &&
        (!card.notes || !card.notes.includes('follow_up'))
      ).slice(0, 10),
      
      potentialMembers: businessCards.filter(card => 
        card.contactCreated && 
        card.company && 
        (!card.notes || !card.notes.includes('Membership invitation sent'))
      ).slice(0, 10),
    };
  }

  /**
   * Retry failed processing
   */
  async retryProcessing(businessCardId: string): Promise<BusinessCardData> {
    const businessCard = await prisma.businessCard.findUnique({
      where: { id: businessCardId },
    });

    if (!businessCard || !businessCard.imageUrl) {
      throw new Error('Business card or image not found');
    }

    // Reset processing status
    await prisma.businessCard.update({
      where: { id: businessCardId },
      data: {
        isProcessed: false,
        contactCreated: false,
        hubspotSyncStatus: 'PENDING',
      },
    });

    // Re-process the image (would need to fetch from imageUrl)
    // This is a simplified version - in practice, you'd fetch the image from storage
    throw new Error('Retry processing requires image re-fetch implementation');
  }
}