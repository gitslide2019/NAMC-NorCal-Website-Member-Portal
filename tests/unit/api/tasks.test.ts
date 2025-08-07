import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, PUT } from '@/app/api/tasks/route'
import { NextRequest } from 'next/server'

// Mock HubSpot service
const mockHubSpotService = {
  createTask: vi.fn(),
  getMemberTasks: vi.fn(),
  updateTask: vi.fn(),
  assignTaskToMember: vi.fn(),
  completeTask: vi.fn(),
}

vi.mock('@/lib/services/hubspot-backbone.service', () => ({
  HubSpotBackboneService: vi.fn(() => mockHubSpotService),
}))

describe('/api/tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/tasks', () => {
    it('should return member tasks', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          subject: 'Complete foundation work',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: '2024-01-20',
        },
        {
          id: 'task-2',
          subject: 'Order materials',
          status: 'NOT_STARTED',
          priority: 'MEDIUM',
          dueDate: '2024-01-18',
        },
      ]

      mockHubSpotService.getMemberTasks.mockResolvedValue(mockTasks)

      const request = new NextRequest(
        'http://localhost:3000/api/tasks?memberId=member-123&status=IN_PROGRESS'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tasks).toEqual(mockTasks)
      expect(mockHubSpotService.getMemberTasks).toHaveBeenCalledWith(
        'member-123',
        'IN_PROGRESS'
      )
    })
  })

  describe('POST /api/tasks', () => {
    it('should create new task', async () => {
      const taskData = {
        subject: 'Install electrical fixtures',
        description: 'Install all light fixtures in main floor',
        priority: 'HIGH',
        assigneeId: 'member-456',
        projectId: 'project-789',
        dueDate: '2024-01-25',
      }

      const createdTask = {
        id: 'task-new',
        ...taskData,
        status: 'NOT_STARTED',
        createdAt: new Date().toISOString(),
      }

      mockHubSpotService.createTask.mockResolvedValue(createdTask)

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.task).toEqual(createdTask)
      expect(mockHubSpotService.createTask).toHaveBeenCalledWith(taskData)
    })
  })

  describe('PUT /api/tasks', () => {
    it('should update task status', async () => {
      const updateData = {
        taskId: 'task-123',
        status: 'COMPLETED',
        completedBy: 'member-456',
        completionNotes: 'Task completed successfully',
      }

      mockHubSpotService.completeTask.mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await PUT(request)

      expect(response.status).toBe(200)
      expect(mockHubSpotService.completeTask).toHaveBeenCalledWith(
        'task-123',
        'member-456',
        'Task completed successfully'
      )
    })
  })
})