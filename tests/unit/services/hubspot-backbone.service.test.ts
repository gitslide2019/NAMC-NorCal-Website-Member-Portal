import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service'

// Mock HubSpot client
const mockHubSpotClient = {
  crm: {
    contacts: {
      basicApi: {
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        getAll: vi.fn(),
      },
    },
    deals: {
      basicApi: {
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        getAll: vi.fn(),
      },
    },
    objects: {
      basicApi: {
        getById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        getAll: vi.fn(),
      },
      tasks: {
        basicApi: {
          getById: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          getAll: vi.fn(),
        },
        searchApi: {
          doSearch: vi.fn(),
        },
      },
    },
  },
  automation: {
    actions: {
      callbacksApi: {
        complete: vi.fn(),
      },
    },
  },
}

vi.mock('@hubspot/api-client', () => ({
  Client: vi.fn(() => mockHubSpotClient),
}))

describe('HubSpotBackboneService', () => {
  let service: HubSpotBackboneService
  
  beforeEach(() => {
    service = new HubSpotBackboneService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getMemberProfile', () => {
    it('should fetch member profile from HubSpot', async () => {
      const mockContact = {
        id: '123',
        properties: {
          email: 'test@example.com',
          firstname: 'John',
          lastname: 'Doe',
          company: 'Test Company',
          member_type: 'contractor',
          onboarding_progress: '50',
        },
      }

      mockHubSpotClient.crm.contacts.basicApi.getById.mockResolvedValue(mockContact)

      const result = await service.getMemberProfile('123')

      expect(mockHubSpotClient.crm.contacts.basicApi.getById).toHaveBeenCalledWith(
        '123',
        ['email', 'firstname', 'lastname', 'company', 'member_type', 'onboarding_progress']
      )
      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Test Company',
        memberType: 'contractor',
        onboardingProgress: 50,
      })
    })

    it('should handle API errors gracefully', async () => {
      mockHubSpotClient.crm.contacts.basicApi.getById.mockRejectedValue(
        new Error('HubSpot API Error')
      )

      await expect(service.getMemberProfile('123')).rejects.toThrow('HubSpot API Error')
    })
  })

  describe('createToolReservation', () => {
    it('should create tool reservation with associations', async () => {
      const reservationData = {
        memberId: 'member-123',
        toolId: 'tool-456',
        startDate: '2024-01-15',
        endDate: '2024-01-17',
        totalCost: 150,
      }

      const mockReservation = {
        id: 'reservation-789',
        properties: {
          start_date: '2024-01-15',
          end_date: '2024-01-17',
          total_cost: '150',
          status: 'confirmed',
        },
      }

      mockHubSpotClient.crm.objects.basicApi.create.mockResolvedValue(mockReservation)

      const result = await service.createToolReservation(reservationData)

      expect(mockHubSpotClient.crm.objects.basicApi.create).toHaveBeenCalledWith(
        'tool_reservations',
        {
          properties: {
            start_date: '2024-01-15',
            end_date: '2024-01-17',
            total_cost: 150,
            status: 'confirmed',
          },
          associations: [
            {
              to: { id: 'member-123' },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }],
            },
            {
              to: { id: 'tool-456' },
              types: [{ associationCategory: 'USER_DEFINED', associationTypeId: 'tool_to_reservation' }],
            },
          ],
        }
      )
      expect(result).toEqual(mockReservation)
    })
  })

  describe('createTask', () => {
    it('should create task with proper associations', async () => {
      const taskData = {
        subject: 'Test Task',
        description: 'Test task description',
        priority: 'HIGH',
        type: 'TODO',
        assigneeId: 'assignee-123',
        memberId: 'member-456',
        projectId: 'project-789',
        dueDate: new Date('2024-01-20'),
      }

      const mockTask = {
        id: 'task-999',
        properties: {
          hs_task_subject: 'Test Task',
          hs_task_body: 'Test task description',
          hs_task_status: 'NOT_STARTED',
          hs_task_priority: 'HIGH',
          hs_task_type: 'TODO',
          hubspot_owner_id: 'assignee-123',
          hs_task_due_date: '2024-01-20T00:00:00.000Z',
        },
      }

      mockHubSpotClient.crm.objects.tasks.basicApi.create.mockResolvedValue(mockTask)

      const result = await service.createTask(taskData)

      expect(mockHubSpotClient.crm.objects.tasks.basicApi.create).toHaveBeenCalledWith({
        properties: {
          hs_task_subject: 'Test Task',
          hs_task_body: 'Test task description',
          hs_task_status: 'NOT_STARTED',
          hs_task_priority: 'HIGH',
          hs_task_type: 'TODO',
          hubspot_owner_id: 'assignee-123',
          hs_task_due_date: '2024-01-20T00:00:00.000Z',
        },
        associations: [
          {
            to: { id: 'member-456' },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }],
          },
          {
            to: { id: 'project-789' },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 214 }],
          },
        ],
      })
      expect(result).toEqual(mockTask)
    })

    it('should create task without project association when projectId is not provided', async () => {
      const taskData = {
        subject: 'Test Task',
        description: 'Test task description',
        priority: 'MEDIUM',
        type: 'TODO',
        assigneeId: 'assignee-123',
        memberId: 'member-456',
      }

      const mockTask = {
        id: 'task-999',
        properties: {
          hs_task_subject: 'Test Task',
          hs_task_body: 'Test task description',
          hs_task_status: 'NOT_STARTED',
          hs_task_priority: 'MEDIUM',
          hs_task_type: 'TODO',
          hubspot_owner_id: 'assignee-123',
        },
      }

      mockHubSpotClient.crm.objects.tasks.basicApi.create.mockResolvedValue(mockTask)

      await service.createTask(taskData)

      expect(mockHubSpotClient.crm.objects.tasks.basicApi.create).toHaveBeenCalledWith({
        properties: {
          hs_task_subject: 'Test Task',
          hs_task_body: 'Test task description',
          hs_task_status: 'NOT_STARTED',
          hs_task_priority: 'MEDIUM',
          hs_task_type: 'TODO',
          hubspot_owner_id: 'assignee-123',
          hs_task_due_date: undefined,
        },
        associations: [
          {
            to: { id: 'member-456' },
            types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 204 }],
          },
        ],
      })
    })
  })

  describe('completeTask', () => {
    it('should update task status to completed', async () => {
      const taskId = 'task-123'
      const completedBy = 'user-456'
      const completionNotes = 'Task completed successfully'

      mockHubSpotClient.crm.objects.tasks.basicApi.update.mockResolvedValue({})
      mockHubSpotClient.crm.objects.tasks.basicApi.getById.mockResolvedValue({
        id: taskId,
        associations: {
          deals: [{ id: 'deal-789' }],
        },
      })

      await service.completeTask(taskId, completedBy, completionNotes)

      expect(mockHubSpotClient.crm.objects.tasks.basicApi.update).toHaveBeenCalledWith(taskId, {
        properties: {
          hs_task_status: 'COMPLETED',
          completed_by: completedBy,
          completion_date: expect.any(String),
          completion_notes: completionNotes,
        },
      })
    })
  })

  describe('getMemberTasks', () => {
    it('should fetch member tasks with status filter', async () => {
      const memberId = 'member-123'
      const status = 'IN_PROGRESS'

      const mockTasks = {
        results: [
          {
            id: 'task-1',
            properties: {
              hs_task_subject: 'Task 1',
              hs_task_status: 'IN_PROGRESS',
            },
          },
          {
            id: 'task-2',
            properties: {
              hs_task_subject: 'Task 2',
              hs_task_status: 'IN_PROGRESS',
            },
          },
        ],
      }

      mockHubSpotClient.crm.objects.tasks.searchApi.doSearch.mockResolvedValue(mockTasks)

      const result = await service.getMemberTasks(memberId, status)

      expect(mockHubSpotClient.crm.objects.tasks.searchApi.doSearch).toHaveBeenCalledWith({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'associations.contact',
                operator: 'EQ',
                value: memberId,
              },
              {
                propertyName: 'hs_task_status',
                operator: 'EQ',
                value: status,
              },
            ],
          },
        ],
        properties: [
          'hs_task_subject',
          'hs_task_body',
          'hs_task_status',
          'hs_task_priority',
          'hs_task_due_date',
          'hubspot_owner_id',
        ],
        associations: ['contacts', 'deals'],
      })
      expect(result).toEqual(mockTasks.results)
    })

    it('should fetch all member tasks when no status filter provided', async () => {
      const memberId = 'member-123'

      const mockTasks = {
        results: [
          {
            id: 'task-1',
            properties: {
              hs_task_subject: 'Task 1',
              hs_task_status: 'NOT_STARTED',
            },
          },
        ],
      }

      mockHubSpotClient.crm.objects.tasks.searchApi.doSearch.mockResolvedValue(mockTasks)

      await service.getMemberTasks(memberId)

      expect(mockHubSpotClient.crm.objects.tasks.searchApi.doSearch).toHaveBeenCalledWith({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'associations.contact',
                operator: 'EQ',
                value: memberId,
              },
            ],
          },
        ],
        properties: [
          'hs_task_subject',
          'hs_task_body',
          'hs_task_status',
          'hs_task_priority',
          'hs_task_due_date',
          'hubspot_owner_id',
        ],
        associations: ['contacts', 'deals'],
      })
    })
  })

  describe('createCostEstimate', () => {
    it('should create cost estimate custom object', async () => {
      const estimateData = {
        projectName: 'Test Project',
        projectType: 'residential',
        totalEstimate: 50000,
        rsMeansData: { materials: 30000, labor: 20000 },
        confidenceScore: 85,
        memberId: 'member-123',
        forBidding: false,
      }

      const mockEstimate = {
        id: 'estimate-456',
        properties: {
          project_name: 'Test Project',
          project_type: 'residential',
          total_estimate: '50000',
          confidence_score: '85',
        },
      }

      mockHubSpotClient.crm.objects.basicApi.create.mockResolvedValue(mockEstimate)

      const result = await service.createCostEstimate(estimateData)

      expect(mockHubSpotClient.crm.objects.basicApi.create).toHaveBeenCalledWith(
        'cost_estimates',
        {
          properties: {
            project_name: 'Test Project',
            project_type: 'residential',
            total_estimate: 50000,
            rs_means_data: JSON.stringify({ materials: 30000, labor: 20000 }),
            confidence_score: 85,
          },
          associations: [
            {
              to: { id: 'member-123' },
              types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 1 }],
            },
          ],
        }
      )
      expect(result).toEqual(mockEstimate)
    })
  })

  describe('createContactFromOCR', () => {
    it('should create contact from OCR data', async () => {
      const ocrData = {
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Smith',
        company: 'Smith Construction',
        phone: '555-1234',
        website: 'smithconstruction.com',
        confidence: 92,
      }
      const scannedBy = 'scanner-user-123'

      const mockContact = {
        id: 'contact-789',
        properties: {
          email: 'john@example.com',
          firstname: 'John',
          lastname: 'Smith',
          company: 'Smith Construction',
        },
      }

      mockHubSpotClient.crm.contacts.basicApi.create.mockResolvedValue(mockContact)

      const result = await service.createContactFromOCR(ocrData, scannedBy)

      expect(mockHubSpotClient.crm.contacts.basicApi.create).toHaveBeenCalledWith({
        properties: {
          email: 'john@example.com',
          firstname: 'John',
          lastname: 'Smith',
          company: 'Smith Construction',
          phone: '555-1234',
          website: 'smithconstruction.com',
          lead_source: 'business_card_scan',
          scanned_by: scannedBy,
          ocr_confidence: 92,
        },
      })
      expect(result).toEqual(mockContact)
    })
  })
})