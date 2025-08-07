import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OCRBusinessCardService } from '@/lib/services/ocr-business-card.service'

// Mock Google Vision API
const mockVisionClient = {
  textDetection: vi.fn(),
}

vi.mock('@google-cloud/vision', () => ({
  ImageAnnotatorClient: vi.fn(() => mockVisionClient),
}))

// Mock HubSpot service
const mockHubSpotService = {
  createContactFromOCR: vi.fn(),
  searchExistingContacts: vi.fn(),
  mergeContacts: vi.fn(),
}

vi.mock('@/lib/services/hubspot-backbone.service', () => ({
  HubSpotBackboneService: vi.fn(() => mockHubSpotService),
}))

describe('OCRBusinessCardService', () => {
  let service: OCRBusinessCardService

  beforeEach(() => {
    service = new OCRBusinessCardService()
    vi.clearAllMocks()
  })

  describe('processBusinessCard', () => {
    it('should extract contact information from business card', async () => {
      const mockImageBuffer = Buffer.from('fake-image-data')
      const mockVisionResponse = [
        {
          textAnnotations: [
            {
              description: `John Smith
ABC Construction
General Contractor
555-123-4567
john@abcconstruction.com
www.abcconstruction.com
123 Main St, San Francisco, CA 94102`,
            },
          ],
        },
      ]

      mockVisionClient.textDetection.mockResolvedValue(mockVisionResponse)

      const result = await service.processBusinessCard(mockImageBuffer, 'scanner-user-123')

      expect(mockVisionClient.textDetection).toHaveBeenCalledWith({
        image: { content: mockImageBuffer.toString('base64') },
      })

      expect(result).toEqual({
        extractedData: {
          firstName: 'John',
          lastName: 'Smith',
          company: 'ABC Construction',
          title: 'General Contractor',
          email: 'john@abcconstruction.com',
          phone: '555-123-4567',
          website: 'www.abcconstruction.com',
          address: '123 Main St, San Francisco, CA 94102',
        },
        confidence: expect.any(Number),
        rawText: expect.any(String),
        processingTime: expect.any(Number),
      })
    })

    it('should handle low confidence OCR results', async () => {
      const mockImageBuffer = Buffer.from('blurry-image-data')
      const mockVisionResponse = [
        {
          textAnnotations: [
            {
              description: 'J0hn 5m1th\nABC C0n5truct10n\n555-1Z3-4567',
              // Simulating poor OCR quality
            },
          ],
        },
      ]

      mockVisionClient.textDetection.mockResolvedValue(mockVisionResponse)

      const result = await service.processBusinessCard(mockImageBuffer, 'scanner-user-123')

      expect(result.confidence).toBeLessThan(70)
      expect(result.extractedData.firstName).toBe('J0hn') // Should preserve OCR result
      expect(result.requiresManualReview).toBe(true)
    })

    it('should detect and handle duplicate contacts', async () => {
      const mockImageBuffer = Buffer.from('duplicate-card-data')
      const mockVisionResponse = [
        {
          textAnnotations: [
            {
              description: `Jane Doe
XYZ Contractors
jane@xyzcontractors.com
555-987-6543`,
            },
          ],
        },
      ]

      const existingContact = {
        id: 'existing-contact-123',
        email: 'jane@xyzcontractors.com',
        firstName: 'Jane',
        lastName: 'Doe',
        company: 'XYZ Contractors',
      }

      mockVisionClient.textDetection.mockResolvedValue(mockVisionResponse)
      mockHubSpotService.searchExistingContacts.mockResolvedValue([existingContact])

      const result = await service.processBusinessCard(mockImageBuffer, 'scanner-user-123')

      expect(result.duplicateDetected).toBe(true)
      expect(result.existingContact).toEqual(existingContact)
      expect(result.suggestedAction).toBe('merge')
    })

    it('should handle OCR processing errors', async () => {
      const mockImageBuffer = Buffer.from('corrupted-image-data')
      
      mockVisionClient.textDetection.mockRejectedValue(
        new Error('Image processing failed')
      )

      await expect(
        service.processBusinessCard(mockImageBuffer, 'scanner-user-123')
      ).rejects.toThrow('Image processing failed')
    })
  })

  describe('extractContactFields', () => {
    it('should extract email addresses correctly', () => {
      const text = 'Contact John at john.smith@construction.com or call 555-1234'
      
      const result = service['extractContactFields'](text)
      
      expect(result.email).toBe('john.smith@construction.com')
    })

    it('should extract phone numbers in various formats', () => {
      const testCases = [
        { text: 'Call 555-123-4567', expected: '555-123-4567' },
        { text: 'Phone: (555) 123-4567', expected: '(555) 123-4567' },
        { text: 'Mobile 555.123.4567', expected: '555.123.4567' },
        { text: 'Tel: +1 555 123 4567', expected: '+1 555 123 4567' },
      ]

      testCases.forEach(({ text, expected }) => {
        const result = service['extractContactFields'](text)
        expect(result.phone).toBe(expected)
      })
    })

    it('should extract website URLs', () => {
      const text = 'Visit our website at www.construction.com or https://build.net'
      
      const result = service['extractContactFields'](text)
      
      expect(result.website).toBe('www.construction.com')
    })

    it('should identify company names and titles', () => {
      const text = `John Smith
Senior Project Manager
ABC Construction Company
Licensed General Contractor`
      
      const result = service['extractContactFields'](text)
      
      expect(result.firstName).toBe('John')
      expect(result.lastName).toBe('Smith')
      expect(result.title).toBe('Senior Project Manager')
      expect(result.company).toBe('ABC Construction Company')
    })
  })

  describe('calculateConfidenceScore', () => {
    it('should give high confidence for complete, clear data', () => {
      const extractedData = {
        firstName: 'John',
        lastName: 'Smith',
        company: 'ABC Construction',
        email: 'john@abcconstruction.com',
        phone: '555-123-4567',
        website: 'www.abcconstruction.com',
        title: 'General Contractor',
      }

      const confidence = service['calculateConfidenceScore'](extractedData, 'clear text')
      
      expect(confidence).toBeGreaterThan(85)
    })

    it('should give low confidence for incomplete data', () => {
      const extractedData = {
        firstName: 'J0hn', // OCR error
        lastName: '', // Missing
        company: 'ABC C0nstruct10n', // OCR errors
        email: '', // Missing
        phone: '555-1Z3-4567', // OCR error
      }

      const confidence = service['calculateConfidenceScore'](extractedData, 'unclear text')
      
      expect(confidence).toBeLessThan(50)
    })
  })

  describe('createNetworkingTasks', () => {
    it('should create follow-up tasks for new contacts', async () => {
      const contactData = {
        id: 'contact-123',
        firstName: 'John',
        lastName: 'Smith',
        company: 'ABC Construction',
        email: 'john@abcconstruction.com',
      }

      const scannedBy = 'member-456'

      mockHubSpotService.createTask = vi.fn().mockResolvedValue({
        id: 'task-follow-up',
      })

      await service.createNetworkingTasks(contactData, scannedBy)

      expect(mockHubSpotService.createTask).toHaveBeenCalledWith({
        subject: 'Follow up with John Smith from ABC Construction',
        description: expect.stringContaining('Business card scanned'),
        type: 'CALL',
        priority: 'MEDIUM',
        assigneeId: scannedBy,
        dueDate: expect.any(Date),
        associations: {
          contactId: 'contact-123',
        },
      })
    })
  })

  describe('inviteToMembership', () => {
    it('should send membership invitation to qualified contacts', async () => {
      const contactData = {
        id: 'contact-789',
        firstName: 'Jane',
        lastName: 'Doe',
        company: 'XYZ Contractors',
        email: 'jane@xyzcontractors.com',
        title: 'General Contractor',
      }

      mockHubSpotService.createMembershipInvitation = vi.fn().mockResolvedValue({
        id: 'invitation-123',
        status: 'sent',
      })

      const result = await service.inviteToMembership(contactData, 'admin-user-123')

      expect(mockHubSpotService.createMembershipInvitation).toHaveBeenCalledWith({
        contactId: 'contact-789',
        invitedBy: 'admin-user-123',
        invitationType: 'business_card_scan',
        personalizedMessage: expect.stringContaining('Jane'),
      })

      expect(result.invitationSent).toBe(true)
      expect(result.invitationId).toBe('invitation-123')
    })
  })
})