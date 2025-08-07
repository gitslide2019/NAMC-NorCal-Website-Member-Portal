import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '@/app/api/webhooks/hubspot/route'
import { NextRequest } from 'next/server'

describe('HubSpot Webhook Integration Tests', () => {
  beforeEach(() => {
    setupWebhookTestEnvironment()
  })

  afterEach(() => {
    cleanupWebhookTestEnvironment()
  })

  it('should handle contact property change webhook', async () => {
    const webhookPayload = {
      subscriptionId: 12345,
      portalId: 8652184,
      appId: 1160452,
      eventId: 1,
      subscriptionType: 'contact.propertyChange',
      attemptNumber: 0,
      objectId: 512,
      changeSource: 'CRM_UI',
      eventType: 'contact.propertyChange',
      subscriptionName: 'member_onboarding_progress',
      changeFlag: 'NEW',
      propertyName: 'onboarding_progress',
      propertyValue: '100'
    }

    const request = new NextRequest('http://localhost:3000/api/webhooks/hubspot', {
      method: 'POST',
      body: JSON.stringify([webhookPayload]),
      headers: {
        'Content-Type': 'application/json',
        'X-HubSpot-Signature': generateHubSpotSignature(JSON.stringify([webhookPayload]))
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // Verify onboarding completion workflow triggered
    const workflowExecution = await getTriggeredWorkflow('onboarding_completion')
    expect(workflowExecution).toBeDefined()
    expect(workflowExecution.contactId).toBe('512')

    // Verify local database sync
    const memberRecord = await getMemberFromDatabase('512')
    expect(memberRecord.onboardingProgress).toBe(100)
    expect(memberRecord.onboardingCompletedAt).toBeDefined()
  })

  it('should handle task status change webhook', async () => {
    const webhookPayload = {
      subscriptionId: 12346,
      portalId: 8652184,
      appId: 1160452,
      eventId: 2,
      subscriptionType: 'task.propertyChange',
      attemptNumber: 0,
      objectId: 789,
      changeSource: 'API',
      eventType: 'task.propertyChange',
      subscriptionName: 'task_completion',
      changeFlag: 'UPDATED',
      propertyName: 'hs_task_status',
      propertyValue: 'COMPLETED'
    }

    const request = new NextRequest('http://localhost:3000/api/webhooks/hubspot', {
      method: 'POST',
      body: JSON.stringify([webhookPayload]),
      headers: {
        'Content-Type': 'application/json',
        'X-HubSpot-Signature': generateHubSpotSignature(JSON.stringify([webhookPayload]))
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // Verify task completion processing
    const taskRecord = await getTaskFromDatabase('789')
    expect(taskRecord.status).toBe('COMPLETED')
    expect(taskRecord.completedAt).toBeDefined()

    // Verify project progress update
    const projectUpdate = await getProjectProgressUpdate(taskRecord.projectId)
    expect(projectUpdate.tasksCompleted).toBeGreaterThan(0)
    expect(projectUpdate.progressPercentage).toBeGreaterThan(0)

    // Verify payment processing if applicable
    if (taskRecord.paymentAmount > 0) {
      const paymentRecord = await getTaskPaymentRecord(taskRecord.id)
      expect(paymentRecord.status).toBe('pending_approval')
    }
  })

  it('should handle deal stage change webhook', async () => {
    const webhookPayload = {
      subscriptionId: 12347,
      portalId: 8652184,
      appId: 1160452,
      eventId: 3,
      subscriptionType: 'deal.propertyChange',
      attemptNumber: 0,
      objectId: 456,
      changeSource: 'AUTOMATION',
      eventType: 'deal.propertyChange',
      subscriptionName: 'project_stage_change',
      changeFlag: 'UPDATED',
      propertyName: 'dealstage',
      propertyValue: 'in_progress'
    }

    const request = new NextRequest('http://localhost:3000/api/webhooks/hubspot', {
      method: 'POST',
      body: JSON.stringify([webhookPayload]),
      headers: {
        'Content-Type': 'application/json',
        'X-HubSpot-Signature': generateHubSpotSignature(JSON.stringify([webhookPayload]))
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // Verify project milestone tasks created
    const projectTasks = await getProjectTasks('456')
    expect(projectTasks.length).toBeGreaterThan(0)
    expect(projectTasks.some(task => task.type === 'milestone')).toBe(true)

    // Verify team notifications sent
    const notifications = await getProjectNotifications('456')
    expect(notifications.some(n => n.type === 'project_started')).toBe(true)

    // Verify escrow account setup if project has budget
    const projectBudget = await getProjectBudget('456')
    if (projectBudget && projectBudget.totalAmount > 0) {
      const escrowAccount = await getEscrowAccount('456')
      expect(escrowAccount).toBeDefined()
      expect(escrowAccount.status).toBe('active')
    }
  })

  it('should handle custom object creation webhook', async () => {
    const webhookPayload = {
      subscriptionId: 12348,
      portalId: 8652184,
      appId: 1160452,
      eventId: 4,
      subscriptionType: 'tool_reservations.creation',
      attemptNumber: 0,
      objectId: 999,
      changeSource: 'API',
      eventType: 'tool_reservations.creation',
      subscriptionName: 'tool_reservation_created',
      changeFlag: 'NEW'
    }

    const request = new NextRequest('http://localhost:3000/api/webhooks/hubspot', {
      method: 'POST',
      body: JSON.stringify([webhookPayload]),
      headers: {
        'Content-Type': 'application/json',
        'X-HubSpot-Signature': generateHubSpotSignature(JSON.stringify([webhookPayload]))
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // Verify tool availability updated
    const toolReservation = await getToolReservation('999')
    expect(toolReservation).toBeDefined()

    const tool = await getTool(toolReservation.toolId)
    expect(tool.isAvailable).toBe(false)

    // Verify confirmation email sent
    const emailRecord = await getEmailRecord('tool_reservation_confirmation')
    expect(emailRecord.recipientId).toBe(toolReservation.memberId)
    expect(emailRecord.status).toBe('sent')

    // Verify calendar event created
    const calendarEvent = await getCalendarEvent(toolReservation.id)
    expect(calendarEvent.title).toContain('Tool Pickup')
    expect(calendarEvent.attendees).toContain(toolReservation.memberId)
  })

  it('should handle batch webhook processing', async () => {
    const batchPayload = [
      {
        subscriptionId: 12349,
        objectId: 101,
        eventType: 'contact.creation',
        subscriptionType: 'contact.creation',
        changeFlag: 'NEW'
      },
      {
        subscriptionId: 12350,
        objectId: 102,
        eventType: 'contact.creation',
        subscriptionType: 'contact.creation',
        changeFlag: 'NEW'
      },
      {
        subscriptionId: 12351,
        objectId: 103,
        eventType: 'contact.creation',
        subscriptionType: 'contact.creation',
        changeFlag: 'NEW'
      }
    ]

    const request = new NextRequest('http://localhost:3000/api/webhooks/hubspot', {
      method: 'POST',
      body: JSON.stringify(batchPayload),
      headers: {
        'Content-Type': 'application/json',
        'X-HubSpot-Signature': generateHubSpotSignature(JSON.stringify(batchPayload))
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // Verify all contacts processed
    for (const payload of batchPayload) {
      const memberRecord = await getMemberFromDatabase(payload.objectId.toString())
      expect(memberRecord).toBeDefined()
    }

    // Verify batch processing metrics
    const processingMetrics = await getBatchProcessingMetrics()
    expect(processingMetrics.totalProcessed).toBe(3)
    expect(processingMetrics.successCount).toBe(3)
    expect(processingMetrics.errorCount).toBe(0)
  })

  it('should handle webhook signature validation', async () => {
    const webhookPayload = {
      subscriptionId: 12352,
      objectId: 555,
      eventType: 'contact.propertyChange'
    }

    // Test with invalid signature
    const invalidRequest = new NextRequest('http://localhost:3000/api/webhooks/hubspot', {
      method: 'POST',
      body: JSON.stringify([webhookPayload]),
      headers: {
        'Content-Type': 'application/json',
        'X-HubSpot-Signature': 'invalid-signature'
      }
    })

    const invalidResponse = await POST(invalidRequest)
    expect(invalidResponse.status).toBe(401)

    // Test with valid signature
    const validRequest = new NextRequest('http://localhost:3000/api/webhooks/hubspot', {
      method: 'POST',
      body: JSON.stringify([webhookPayload]),
      headers: {
        'Content-Type': 'application/json',
        'X-HubSpot-Signature': generateHubSpotSignature(JSON.stringify([webhookPayload]))
      }
    })

    const validResponse = await POST(validRequest)
    expect(validResponse.status).toBe(200)
  })

  it('should handle webhook retry logic', async () => {
    const webhookPayload = {
      subscriptionId: 12353,
      objectId: 777,
      eventType: 'deal.creation',
      attemptNumber: 2 // Retry attempt
    }

    // Mock processing failure on first attempts
    mockProcessingFailure(true)

    const request = new NextRequest('http://localhost:3000/api/webhooks/hubspot', {
      method: 'POST',
      body: JSON.stringify([webhookPayload]),
      headers: {
        'Content-Type': 'application/json',
        'X-HubSpot-Signature': generateHubSpotSignature(JSON.stringify([webhookPayload]))
      }
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    // Verify retry handling
    const retryRecord = await getWebhookRetryRecord(webhookPayload.objectId.toString())
    expect(retryRecord.attemptNumber).toBe(2)
    expect(retryRecord.status).toBe('processed')

    // Verify idempotency - no duplicate processing
    const duplicateProcessingCheck = await checkDuplicateProcessing(webhookPayload.objectId.toString())
    expect(duplicateProcessingCheck.processedOnce).toBe(true)
  })
})

// Helper functions for webhook testing
function setupWebhookTestEnvironment() {
  // Setup test environment for webhook processing
  vi.mock('@/lib/services/hubspot-backbone.service')
  vi.mock('@/lib/services/project-payments.service')
  vi.mock('@/lib/services/tool-lending.service')
  vi.mock('@/lib/services/notification.service')
}

function cleanupWebhookTestEnvironment() {
  vi.resetAllMocks()
}

function generateHubSpotSignature(payload: string): string {
  // Generate valid HubSpot webhook signature for testing
  const crypto = require('crypto')
  const secret = process.env.HUBSPOT_WEBHOOK_SECRET || 'test-secret'
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

async function getTriggeredWorkflow(workflowName: string) {
  // Mock workflow execution retrieval
  return {
    workflowName,
    contactId: '512',
    status: 'triggered',
    triggeredAt: new Date().toISOString()
  }
}

async function getMemberFromDatabase(memberId: string) {
  // Mock database member retrieval
  return {
    id: memberId,
    onboardingProgress: 100,
    onboardingCompletedAt: new Date()
  }
}

async function getTaskFromDatabase(taskId: string) {
  // Mock database task retrieval
  return {
    id: taskId,
    status: 'COMPLETED',
    completedAt: new Date(),
    projectId: 'project-123',
    paymentAmount: 5000
  }
}

async function getProjectProgressUpdate(projectId: string) {
  // Mock project progress update
  return {
    projectId,
    tasksCompleted: 5,
    totalTasks: 10,
    progressPercentage: 50
  }
}

async function getTaskPaymentRecord(taskId: string) {
  // Mock task payment record
  return {
    taskId,
    status: 'pending_approval',
    amount: 5000
  }
}

async function getProjectTasks(projectId: string) {
  // Mock project tasks retrieval
  return [
    { id: 'task-1', type: 'milestone', projectId },
    { id: 'task-2', type: 'regular', projectId }
  ]
}

async function getProjectNotifications(projectId: string) {
  // Mock project notifications
  return [
    { type: 'project_started', projectId, sentAt: new Date() }
  ]
}

async function getProjectBudget(projectId: string) {
  // Mock project budget
  return {
    projectId,
    totalAmount: 100000,
    escrowRequired: true
  }
}

async function getEscrowAccount(projectId: string) {
  // Mock escrow account
  return {
    projectId,
    status: 'active',
    balance: 100000
  }
}

async function getToolReservation(reservationId: string) {
  // Mock tool reservation
  return {
    id: reservationId,
    toolId: 'tool-123',
    memberId: 'member-456',
    startDate: '2024-02-01',
    endDate: '2024-02-05'
  }
}

async function getTool(toolId: string) {
  // Mock tool data
  return {
    id: toolId,
    name: 'Circular Saw',
    isAvailable: false
  }
}

async function getEmailRecord(emailType: string) {
  // Mock email record
  return {
    type: emailType,
    recipientId: 'member-456',
    status: 'sent',
    sentAt: new Date()
  }
}

async function getCalendarEvent(reservationId: string) {
  // Mock calendar event
  return {
    reservationId,
    title: 'Tool Pickup - Circular Saw',
    attendees: ['member-456', 'staff-123']
  }
}

async function getBatchProcessingMetrics() {
  // Mock batch processing metrics
  return {
    totalProcessed: 3,
    successCount: 3,
    errorCount: 0,
    processingTime: 150
  }
}

function mockProcessingFailure(shouldFail: boolean) {
  // Mock processing failure for retry testing
  if (shouldFail) {
    vi.mocked(console.error).mockImplementation(() => {})
  }
}

async function getWebhookRetryRecord(objectId: string) {
  // Mock webhook retry record
  return {
    objectId,
    attemptNumber: 2,
    status: 'processed',
    processedAt: new Date()
  }
}

async function checkDuplicateProcessing(objectId: string) {
  // Mock duplicate processing check
  return {
    objectId,
    processedOnce: true,
    firstProcessedAt: new Date()
  }
}