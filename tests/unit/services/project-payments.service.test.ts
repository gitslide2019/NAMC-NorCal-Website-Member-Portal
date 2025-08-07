import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ProjectPaymentsService } from '@/lib/services/project-payments.service'

// Mock Stripe
const mockStripe = {
  accounts: {
    create: vi.fn(),
    retrieve: vi.fn(),
  },
  transfers: {
    create: vi.fn(),
  },
  paymentIntents: {
    create: vi.fn(),
    confirm: vi.fn(),
    retrieve: vi.fn(),
  },
  charges: {
    create: vi.fn(),
  },
}

vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripe),
}))

// Mock HubSpot service
const mockHubSpotService = {
  createProjectEscrow: vi.fn(),
  updateEscrowBalance: vi.fn(),
  createTaskPayment: vi.fn(),
  updateTaskPaymentStatus: vi.fn(),
  createPaymentMilestone: vi.fn(),
  updateMilestoneStatus: vi.fn(),
  recordEscrowPayment: vi.fn(),
  createPaymentDispute: vi.fn(),
}

vi.mock('@/lib/services/hubspot-backbone.service', () => ({
  HubSpotBackboneService: vi.fn(() => mockHubSpotService),
}))

// Mock banking service
const mockBankingService = {
  createACHTransfer: vi.fn(),
  verifyBankAccount: vi.fn(),
  getAccountBalance: vi.fn(),
}

vi.mock('@/lib/services/banking-api.service', () => ({
  BankingAPIService: vi.fn(() => mockBankingService),
}))

describe('ProjectPaymentsService', () => {
  let service: ProjectPaymentsService

  beforeEach(() => {
    service = new ProjectPaymentsService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('createProjectEscrow', () => {
    it('should create escrow account with initial funding', async () => {
      const escrowData = {
        projectId: 'project-123',
        totalProjectValue: 100000,
        clientId: 'client-456',
        contractorId: 'contractor-789',
        paymentSchedule: [
          { milestone: 'Start', percentage: 20, amount: 20000 },
          { milestone: 'Midpoint', percentage: 50, amount: 50000 },
          { milestone: 'Completion', percentage: 30, amount: 30000 },
        ],
        retentionPercentage: 10,
      }

      const mockEscrowAccount = {
        id: 'escrow-999',
        balance: 100000,
        status: 'active',
      }

      mockHubSpotService.createProjectEscrow.mockResolvedValue(mockEscrowAccount)
      mockStripe.accounts.create.mockResolvedValue({
        id: 'acct_escrow_123',
        type: 'express',
      })

      const result = await service.createProjectEscrow(escrowData)

      expect(mockHubSpotService.createProjectEscrow).toHaveBeenCalledWith({
        projectId: 'project-123',
        totalProjectValue: 100000,
        escrowBalance: 100000,
        clientId: 'client-456',
        contractorId: 'contractor-789',
        paymentSchedule: escrowData.paymentSchedule,
        retentionPercentage: 10,
        retentionAmount: 10000,
        escrowStatus: 'active',
        stripeAccountId: 'acct_escrow_123',
      })

      expect(result).toEqual({
        escrowId: 'escrow-999',
        stripeAccountId: 'acct_escrow_123',
        totalValue: 100000,
        availableBalance: 100000,
        retentionAmount: 10000,
        status: 'active',
      })
    })

    it('should handle escrow creation errors', async () => {
      const escrowData = {
        projectId: 'project-error',
        totalProjectValue: 50000,
        clientId: 'client-123',
        contractorId: 'contractor-456',
        paymentSchedule: [],
        retentionPercentage: 5,
      }

      mockStripe.accounts.create.mockRejectedValue(new Error('Stripe account creation failed'))

      await expect(service.createProjectEscrow(escrowData)).rejects.toThrow(
        'Stripe account creation failed'
      )
    })
  })

  describe('processTaskPayment', () => {
    it('should release payment for completed task', async () => {
      const paymentData = {
        escrowId: 'escrow-123',
        taskId: 'task-456',
        contractorId: 'contractor-789',
        paymentAmount: 5000,
        completionEvidence: {
          photos: ['photo1.jpg', 'photo2.jpg'],
          description: 'Task completed as specified',
          qualityScore: 95,
        },
        approvedBy: 'supervisor-111',
      }

      const mockEscrow = {
        id: 'escrow-123',
        balance: 50000,
        stripeAccountId: 'acct_escrow_123',
      }

      const mockPayment = {
        id: 'payment-999',
        amount: 5000,
        status: 'succeeded',
        transferId: 'tr_payment_123',
      }

      mockHubSpotService.getProjectEscrow = vi.fn().mockResolvedValue(mockEscrow)
      mockStripe.transfers.create.mockResolvedValue({
        id: 'tr_payment_123',
        amount: 500000, // Stripe uses cents
        currency: 'usd',
        destination: 'contractor-stripe-account',
      })
      mockHubSpotService.createTaskPayment.mockResolvedValue(mockPayment)

      const result = await service.processTaskPayment(paymentData)

      expect(mockStripe.transfers.create).toHaveBeenCalledWith({
        amount: 500000, // $5000 in cents
        currency: 'usd',
        destination: expect.any(String),
        source_transaction: expect.any(String),
        metadata: {
          escrowId: 'escrow-123',
          taskId: 'task-456',
          contractorId: 'contractor-789',
        },
      })

      expect(mockHubSpotService.createTaskPayment).toHaveBeenCalledWith({
        escrowId: 'escrow-123',
        taskId: 'task-456',
        contractorId: 'contractor-789',
        paymentAmount: 5000,
        paymentStatus: 'completed',
        approvedBy: 'supervisor-111',
        completionEvidence: paymentData.completionEvidence,
        stripeTransferId: 'tr_payment_123',
      })

      expect(result).toEqual({
        paymentId: 'payment-999',
        amount: 5000,
        status: 'completed',
        transferId: 'tr_payment_123',
        processedAt: expect.any(String),
      })
    })

    it('should reject payment for insufficient escrow balance', async () => {
      const paymentData = {
        escrowId: 'escrow-low',
        taskId: 'task-456',
        contractorId: 'contractor-789',
        paymentAmount: 10000,
        completionEvidence: {},
        approvedBy: 'supervisor-111',
      }

      const mockEscrow = {
        id: 'escrow-low',
        balance: 5000, // Insufficient balance
        stripeAccountId: 'acct_escrow_low',
      }

      mockHubSpotService.getProjectEscrow = vi.fn().mockResolvedValue(mockEscrow)

      await expect(service.processTaskPayment(paymentData)).rejects.toThrow(
        'Insufficient escrow balance'
      )
    })
  })

  describe('processMilestonePayment', () => {
    it('should release milestone payment upon verification', async () => {
      const milestoneData = {
        escrowId: 'escrow-456',
        milestoneId: 'milestone-789',
        contractorId: 'contractor-123',
        paymentAmount: 25000,
        deliverables: ['Foundation complete', 'Plumbing rough-in'],
        verificationCriteria: ['Photos of completed work', 'Inspector approval'],
        verifiedBy: 'inspector-555',
      }

      const mockEscrow = {
        id: 'escrow-456',
        balance: 75000,
        stripeAccountId: 'acct_escrow_456',
      }

      mockHubSpotService.getProjectEscrow = vi.fn().mockResolvedValue(mockEscrow)
      mockStripe.transfers.create.mockResolvedValue({
        id: 'tr_milestone_456',
        amount: 2500000, // $25000 in cents
        currency: 'usd',
      })
      mockHubSpotService.updateMilestoneStatus.mockResolvedValue({
        id: 'milestone-789',
        status: 'paid',
      })

      const result = await service.processMilestonePayment(milestoneData)

      expect(mockHubSpotService.updateMilestoneStatus).toHaveBeenCalledWith('milestone-789', {
        milestoneStatus: 'paid',
        verifiedBy: 'inspector-555',
        verificationDate: expect.any(String),
        paymentReleased: true,
        paymentDate: expect.any(String),
        stripeTransferId: 'tr_milestone_456',
      })

      expect(result.status).toBe('paid')
      expect(result.amount).toBe(25000)
    })
  })

  describe('handlePaymentDispute', () => {
    it('should create dispute and freeze related payments', async () => {
      const disputeData = {
        paymentId: 'payment-123',
        disputeReason: 'Work not completed to specification',
        disputeAmount: 8000,
        submittedBy: 'client-456',
        respondentId: 'contractor-789',
        evidence: ['photo1.jpg', 'inspection_report.pdf'],
        supportingDocs: ['contract.pdf', 'change_order.pdf'],
      }

      const mockDispute = {
        id: 'dispute-999',
        status: 'open',
        mediatorAssigned: 'mediator-111',
      }

      mockHubSpotService.createPaymentDispute.mockResolvedValue(mockDispute)

      const result = await service.handlePaymentDispute(disputeData)

      expect(mockHubSpotService.createPaymentDispute).toHaveBeenCalledWith({
        paymentId: 'payment-123',
        disputeReason: 'Work not completed to specification',
        disputeAmount: 8000,
        submittedBy: 'client-456',
        respondentId: 'contractor-789',
        evidence: disputeData.evidence,
        supportingDocs: disputeData.supportingDocs,
        disputeStatus: 'open',
        submissionDate: expect.any(String),
        responseDeadline: expect.any(String),
      })

      expect(result).toEqual({
        disputeId: 'dispute-999',
        status: 'open',
        mediatorAssigned: 'mediator-111',
        responseDeadline: expect.any(String),
      })
    })
  })

  describe('generateCashFlowReport', () => {
    it('should generate comprehensive cash flow analysis', async () => {
      const reportParams = {
        escrowId: 'escrow-123',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        includeProjections: true,
      }

      const mockEscrowData = {
        id: 'escrow-123',
        totalProjectValue: 100000,
        currentBalance: 60000,
        totalPaid: 40000,
        retentionAmount: 10000,
        payments: [
          { date: '2024-01-15', amount: 20000, type: 'milestone' },
          { date: '2024-01-25', amount: 15000, type: 'task' },
          { date: '2024-01-30', amount: 5000, type: 'task' },
        ],
        upcomingMilestones: [
          { date: '2024-02-15', amount: 30000, description: 'Midpoint completion' },
          { date: '2024-03-01', amount: 30000, description: 'Final completion' },
        ],
      }

      mockHubSpotService.getEscrowCashFlowData = vi.fn().mockResolvedValue(mockEscrowData)

      const result = await service.generateCashFlowReport(reportParams)

      expect(result).toEqual({
        escrowId: 'escrow-123',
        reportPeriod: { start: '2024-01-01', end: '2024-01-31' },
        summary: {
          totalProjectValue: 100000,
          currentBalance: 60000,
          totalPaid: 40000,
          retentionHeld: 10000,
          availableForPayment: 50000, // currentBalance - retention
        },
        paymentHistory: mockEscrowData.payments,
        upcomingPayments: mockEscrowData.upcomingMilestones,
        projectedCashFlow: expect.any(Array),
        riskFactors: expect.any(Array),
      })
    })
  })

  describe('validatePaymentEligibility', () => {
    it('should validate task completion requirements', async () => {
      const validationData = {
        taskId: 'task-123',
        contractorId: 'contractor-456',
        completionEvidence: {
          photos: ['before.jpg', 'after.jpg'],
          description: 'Electrical work completed',
          qualityScore: 88,
        },
        requiredApprovals: ['supervisor', 'inspector'],
        receivedApprovals: ['supervisor'],
      }

      const result = await service.validatePaymentEligibility(validationData)

      expect(result).toEqual({
        eligible: false,
        missingRequirements: ['inspector approval'],
        qualityScore: 88,
        evidenceComplete: true,
        recommendedActions: ['Obtain inspector approval before payment release'],
      })
    })

    it('should approve payment when all requirements met', async () => {
      const validationData = {
        taskId: 'task-456',
        contractorId: 'contractor-789',
        completionEvidence: {
          photos: ['work1.jpg', 'work2.jpg', 'work3.jpg'],
          description: 'Plumbing installation complete with testing',
          qualityScore: 95,
        },
        requiredApprovals: ['supervisor', 'inspector'],
        receivedApprovals: ['supervisor', 'inspector'],
      }

      const result = await service.validatePaymentEligibility(validationData)

      expect(result).toEqual({
        eligible: true,
        missingRequirements: [],
        qualityScore: 95,
        evidenceComplete: true,
        recommendedActions: [],
      })
    })
  })
})