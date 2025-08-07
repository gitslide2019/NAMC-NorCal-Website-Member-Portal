import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/tools/route'
import { NextRequest } from 'next/server'

// Mock the tool lending service
const mockToolService = {
  getAvailableTools: vi.fn(),
  createTool: vi.fn(),
  searchTools: vi.fn(),
  getToolById: vi.fn(),
}

vi.mock('@/lib/services/tool-lending.service', () => ({
  ToolLendingService: vi.fn(() => mockToolService),
}))

// Mock authentication
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}))

describe('/api/tools', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/tools', () => {
    it('should return available tools', async () => {
      const mockTools = [
        {
          id: 'tool-1',
          name: 'Circular Saw',
          category: 'power_tools',
          dailyRate: 25,
          isAvailable: true,
        },
        {
          id: 'tool-2',
          name: 'Drill Press',
          category: 'power_tools',
          dailyRate: 35,
          isAvailable: true,
        },
      ]

      mockToolService.getAvailableTools.mockResolvedValue(mockTools)

      const request = new NextRequest('http://localhost:3000/api/tools')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tools).toEqual(mockTools)
      expect(mockToolService.getAvailableTools).toHaveBeenCalled()
    })

    it('should handle search parameters', async () => {
      const mockSearchResults = [
        {
          id: 'tool-3',
          name: 'Hammer Drill',
          category: 'power_tools',
          dailyRate: 30,
          isAvailable: true,
        },
      ]

      mockToolService.searchTools.mockResolvedValue(mockSearchResults)

      const request = new NextRequest(
        'http://localhost:3000/api/tools?search=drill&category=power_tools&maxRate=50'
      )
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.tools).toEqual(mockSearchResults)
      expect(mockToolService.searchTools).toHaveBeenCalledWith({
        search: 'drill',
        category: 'power_tools',
        maxRate: 50,
      })
    })
  })

  describe('POST /api/tools', () => {
    it('should create new tool', async () => {
      const newTool = {
        name: 'Angle Grinder',
        category: 'power_tools',
        dailyRate: 20,
        description: 'Professional angle grinder',
        serialNumber: 'AG-12345',
      }

      const createdTool = {
        id: 'tool-new',
        ...newTool,
        isAvailable: true,
        createdAt: new Date().toISOString(),
      }

      mockToolService.createTool.mockResolvedValue(createdTool)

      const request = new NextRequest('http://localhost:3000/api/tools', {
        method: 'POST',
        body: JSON.stringify(newTool),
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.tool).toEqual(createdTool)
      expect(mockToolService.createTool).toHaveBeenCalledWith(newTool)
    })
  })
})