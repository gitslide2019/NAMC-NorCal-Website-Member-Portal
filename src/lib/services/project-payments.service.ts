import { prisma } from '@/lib/prisma';
import { HubSpotBackboneService } from './hubspot-backbone.service';

export interface ProjectEscrowData {
  projectId: string;
  projectName: string;
  totalProjectValue: number;
  clientId: string;
  contractorId: string;
  paymentSchedule: any;
  retentionPercentage?: number;
  expectedCompletionDate?: Date;
}

export interface TaskPaymentData {
  escrowId: string;
  taskId: string;
  taskName: string;
  paymentAmount: number;
  contractorId: string;
  completionRequirements: any;
  verificationCriteria: any;
  approvalRequired?: boolean;
  photosRequired?: boolean;
}

export interface PaymentMilestoneData {
  escrowId: string;
  milestoneName: string;
  paymentAmount: number;
  paymentPercentage: number;
  deliverables: string[];
  verificationCriteria: any;
  dueDate?: Date;
  contractorId: string;
}

export interface EscrowPaymentData {
  escrowId: string;
  recipientId: string;
  amount: number;
  paymentType: 'TASK_COMPLETION' | 'MILESTONE' | 'RETENTION_RELEASE' | 'REFUND';
  paymentMethod: 'ACH' | 'WIRE' | 'CHECK' | 'STRIPE';
  transactionId: string;
}

export interface PaymentDisputeData {
  escrowId: string;
  paymentId?: string;
  disputeReason: string;
  disputeAmount: number;
  submittedBy: string;
  respondentId: string;
  evidenceProvided?: string[];
  supportingDocs?: string[];
}

export interface CashFlowProjectionData {
  escrowId: string;
  memberId: string;
  projectionDate: Date;
  projectedInflow: number;
  projectedOutflow: number;
  riskFactors?: string[];
  recommendations?: string[];
}

export interface ChangeOrderData {
  escrowId: string;
  changeOrderNumber: string;
  description: string;
  amountChange: number; // Can be positive or negative
  scheduleImpact: number; // Days added/removed
  reason: string;
  approvedBy: string;
}

export class ProjectPaymentsService {
  private hubspotService: HubSpotBackboneService;

  constructor() {
    this.hubspotService = new HubSpotBackboneService();
  }

  // Project Escrow Management
  async createProjectEscrow(data: ProjectEscrowData) {
    try {
      // Create escrow account with external payment processor
      const stripeAccountId = await this.createStripeEscrowAccount(data);
      
      // Create local escrow record
      const escrow = await prisma.projectEscrow.create({
        data: {
          projectId: data.projectId,
          projectName: data.projectName,
          totalProjectValue: data.totalProjectValue,
          clientId: data.clientId,
          contractorId: data.contractorId,
          paymentSchedule: JSON.stringify(data.paymentSchedule),
          retentionPercentage: data.retentionPercentage || 10,
          retentionAmount: (data.totalProjectValue * (data.retentionPercentage || 10)) / 100,
          expectedCompletionDate: data.expectedCompletionDate,
          stripeAccountId,
          escrowStatus: 'CREATED'
        },
        include: {
          client: true,
          contractor: true
        }
      });

      // Create HubSpot custom object
      await this.hubspotService.createCustomObject('project_escrows', {
        project_id: data.projectId,
        total_project_value: data.totalProjectValue,
        escrow_balance: 0,
        total_paid: 0,
        total_deposited: 0,
        client_id: data.clientId,
        contractor_id: data.contractorId,
        retention_percentage: data.retentionPercentage || 10,
        retention_amount: escrow.retentionAmount,
        escrow_status: 'CREATED'
      }, escrow.id);

      // Update local record with HubSpot ID
      await prisma.projectEscrow.update({
        where: { id: escrow.id },
        data: {
          hubspotSyncStatus: 'SYNCED',
          hubspotLastSync: new Date()
        }
      });

      return escrow;
    } catch (error) {
      console.error('Error creating project escrow:', error);
      throw new Error('Failed to create project escrow');
    }
  }

  async fundEscrow(escrowId: string, amount: number, paymentMethod: string) {
    try {
      const escrow = await prisma.projectEscrow.findUnique({
        where: { id: escrowId }
      });

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      // Process payment through external processor
      const transactionId = await this.processEscrowDeposit(
        escrow.stripeAccountId!,
        amount,
        paymentMethod
      );

      // Update escrow balance
      const updatedEscrow = await prisma.projectEscrow.update({
        where: { id: escrowId },
        data: {
          escrowBalance: escrow.escrowBalance + amount,
          totalDeposited: escrow.totalDeposited + amount,
          escrowStatus: escrow.escrowBalance + amount >= escrow.totalProjectValue ? 'FUNDED' : 'ACTIVE'
        }
      });

      // Create payment record
      await prisma.escrowPayment.create({
        data: {
          escrowId,
          recipientId: escrow.clientId, // Client is depositing
          amount,
          paymentType: 'REFUND', // This is a deposit, not a payment out
          transactionId,
          paymentMethod: paymentMethod as any,
          paymentStatus: 'COMPLETED'
        }
      });

      // Sync to HubSpot
      await this.hubspotService.updateCustomObject('project_escrows', escrow.hubspotObjectId!, {
        escrow_balance: updatedEscrow.escrowBalance,
        total_deposited: updatedEscrow.totalDeposited,
        escrow_status: updatedEscrow.escrowStatus
      });

      return updatedEscrow;
    } catch (error) {
      console.error('Error funding escrow:', error);
      throw new Error('Failed to fund escrow');
    }
  }

  // Task Payment Management
  async createTaskPayment(data: TaskPaymentData) {
    try {
      const taskPayment = await prisma.taskPayment.create({
        data: {
          escrowId: data.escrowId,
          taskId: data.taskId,
          taskName: data.taskName,
          paymentAmount: data.paymentAmount,
          contractorId: data.contractorId,
          completionRequirements: JSON.stringify(data.completionRequirements),
          verificationCriteria: JSON.stringify(data.verificationCriteria),
          approvalRequired: data.approvalRequired || false,
          photosRequired: data.photosRequired || false,
          paymentStatus: 'PENDING'
        },
        include: {
          contractor: true,
          escrow: true
        }
      });

      // Create HubSpot custom object
      await this.hubspotService.createCustomObject('task_payments', {
        escrow_id: data.escrowId,
        task_id: data.taskId,
        payment_amount: data.paymentAmount,
        contractor_id: data.contractorId,
        approval_required: data.approvalRequired || false,
        photos_required: data.photosRequired || false,
        payment_status: 'PENDING'
      }, taskPayment.id);

      return taskPayment;
    } catch (error) {
      console.error('Error creating task payment:', error);
      throw new Error('Failed to create task payment');
    }
  }

  async verifyTaskCompletion(
    taskPaymentId: string,
    qualityScore: number,
    photosSubmitted?: string[],
    verificationNotes?: string
  ) {
    try {
      const taskPayment = await prisma.taskPayment.findUnique({
        where: { id: taskPaymentId },
        include: { escrow: true }
      });

      if (!taskPayment) {
        throw new Error('Task payment not found');
      }

      // Update task payment with verification
      const updatedTaskPayment = await prisma.taskPayment.update({
        where: { id: taskPaymentId },
        data: {
          paymentStatus: taskPayment.approvalRequired ? 'VERIFIED' : 'APPROVED',
          qualityScore,
          photosSubmitted: photosSubmitted ? JSON.stringify(photosSubmitted) : null,
          verificationNotes,
          complianceCheck: true
        }
      });

      // If no approval required, process payment immediately
      if (!taskPayment.approvalRequired) {
        await this.processTaskPayment(taskPaymentId);
      }

      // Sync to HubSpot
      await this.hubspotService.updateCustomObject('task_payments', taskPayment.hubspotObjectId!, {
        payment_status: updatedTaskPayment.paymentStatus,
        quality_score: qualityScore,
        compliance_check: true
      });

      return updatedTaskPayment;
    } catch (error) {
      console.error('Error verifying task completion:', error);
      throw new Error('Failed to verify task completion');
    }
  }

  async approveTaskPayment(taskPaymentId: string, approvedBy: string) {
    try {
      const updatedTaskPayment = await prisma.taskPayment.update({
        where: { id: taskPaymentId },
        data: {
          paymentStatus: 'APPROVED',
          approvedBy,
          approvedDate: new Date()
        }
      });

      // Process the payment
      await this.processTaskPayment(taskPaymentId);

      return updatedTaskPayment;
    } catch (error) {
      console.error('Error approving task payment:', error);
      throw new Error('Failed to approve task payment');
    }
  }

  private async processTaskPayment(taskPaymentId: string) {
    try {
      const taskPayment = await prisma.taskPayment.findUnique({
        where: { id: taskPaymentId },
        include: { escrow: true, contractor: true }
      });

      if (!taskPayment) {
        throw new Error('Task payment not found');
      }

      // Check escrow balance
      if (taskPayment.escrow.escrowBalance < taskPayment.paymentAmount) {
        throw new Error('Insufficient escrow balance');
      }

      // Process payment through external processor
      const transactionId = await this.processEscrowPayment(
        taskPayment.escrow.stripeAccountId!,
        taskPayment.contractorId,
        taskPayment.paymentAmount
      );

      // Update task payment
      await prisma.taskPayment.update({
        where: { id: taskPaymentId },
        data: {
          paymentStatus: 'PAID',
          paidDate: new Date(),
          paymentTransactionId: transactionId
        }
      });

      // Update escrow balance
      await prisma.projectEscrow.update({
        where: { id: taskPayment.escrowId },
        data: {
          escrowBalance: taskPayment.escrow.escrowBalance - taskPayment.paymentAmount,
          totalPaid: taskPayment.escrow.totalPaid + taskPayment.paymentAmount,
          lastPaymentDate: new Date(),
          lastPaymentAmount: taskPayment.paymentAmount
        }
      });

      // Create escrow payment record
      await prisma.escrowPayment.create({
        data: {
          escrowId: taskPayment.escrowId,
          recipientId: taskPayment.contractorId,
          amount: taskPayment.paymentAmount,
          paymentType: 'TASK_COMPLETION',
          transactionId,
          paymentMethod: 'ACH', // Default method
          paymentStatus: 'COMPLETED'
        }
      });

      // Send payment notification to contractor
      await this.sendPaymentNotification(taskPayment.contractorId, {
        type: 'TASK_PAYMENT_COMPLETED',
        amount: taskPayment.paymentAmount,
        taskName: taskPayment.taskName,
        transactionId,
        projectName: taskPayment.escrow.projectName
      });

      // Sync payment completion to HubSpot
      await this.hubspotService.updateCustomObject('task_payments', taskPayment.hubspotObjectId!, {
        payment_status: 'PAID',
        paid_date: new Date().toISOString(),
        payment_transaction_id: transactionId
      });

      // Trigger HubSpot workflow for payment completion
      await this.hubspotService.triggerWorkflow('task_payment_completed', taskPayment.hubspotObjectId!);

      return transactionId;
    } catch (error) {
      console.error('Error processing task payment:', error);
      throw new Error('Failed to process task payment');
    }
  }

  // Payment Milestone Management
  async createPaymentMilestone(data: PaymentMilestoneData) {
    try {
      const milestone = await prisma.paymentMilestone.create({
        data: {
          escrowId: data.escrowId,
          milestoneName: data.milestoneName,
          paymentAmount: data.paymentAmount,
          paymentPercentage: data.paymentPercentage,
          deliverables: JSON.stringify(data.deliverables),
          verificationCriteria: JSON.stringify(data.verificationCriteria),
          dueDate: data.dueDate,
          contractorId: data.contractorId,
          milestoneStatus: 'PENDING'
        },
        include: {
          contractor: true,
          escrow: true
        }
      });

      // Create HubSpot custom object
      await this.hubspotService.createCustomObject('payment_milestones', {
        escrow_id: data.escrowId,
        milestone_name: data.milestoneName,
        payment_amount: data.paymentAmount,
        payment_percentage: data.paymentPercentage,
        contractor_id: data.contractorId,
        milestone_status: 'PENDING'
      }, milestone.id);

      return milestone;
    } catch (error) {
      console.error('Error creating payment milestone:', error);
      throw new Error('Failed to create payment milestone');
    }
  }

  async completeMilestone(milestoneId: string, verifiedBy: string) {
    try {
      const milestone = await prisma.paymentMilestone.findUnique({
        where: { id: milestoneId },
        include: { escrow: true }
      });

      if (!milestone) {
        throw new Error('Milestone not found');
      }

      // Update milestone status
      const updatedMilestone = await prisma.paymentMilestone.update({
        where: { id: milestoneId },
        data: {
          milestoneStatus: 'VERIFIED',
          completedDate: new Date(),
          verifiedBy,
          verificationDate: new Date()
        }
      });

      // Process milestone payment
      await this.processMilestonePayment(milestoneId);

      return updatedMilestone;
    } catch (error) {
      console.error('Error completing milestone:', error);
      throw new Error('Failed to complete milestone');
    }
  }

  private async processMilestonePayment(milestoneId: string) {
    try {
      const milestone = await prisma.paymentMilestone.findUnique({
        where: { id: milestoneId },
        include: { escrow: true }
      });

      if (!milestone) {
        throw new Error('Milestone not found');
      }

      // Check escrow balance
      if (milestone.escrow.escrowBalance < milestone.paymentAmount) {
        throw new Error('Insufficient escrow balance');
      }

      // Process payment
      const transactionId = await this.processEscrowPayment(
        milestone.escrow.stripeAccountId!,
        milestone.contractorId,
        milestone.paymentAmount
      );

      // Update milestone
      await prisma.paymentMilestone.update({
        where: { id: milestoneId },
        data: {
          milestoneStatus: 'PAID',
          paymentReleased: true,
          paymentDate: new Date(),
          paymentTransactionId: transactionId
        }
      });

      // Update escrow balance
      await prisma.projectEscrow.update({
        where: { id: milestone.escrowId },
        data: {
          escrowBalance: milestone.escrow.escrowBalance - milestone.paymentAmount,
          totalPaid: milestone.escrow.totalPaid + milestone.paymentAmount,
          lastPaymentDate: new Date(),
          lastPaymentAmount: milestone.paymentAmount
        }
      });

      // Create escrow payment record
      await prisma.escrowPayment.create({
        data: {
          escrowId: milestone.escrowId,
          recipientId: milestone.contractorId,
          amount: milestone.paymentAmount,
          paymentType: 'MILESTONE',
          transactionId,
          paymentMethod: 'ACH',
          paymentStatus: 'COMPLETED'
        }
      });

      return transactionId;
    } catch (error) {
      console.error('Error processing milestone payment:', error);
      throw new Error('Failed to process milestone payment');
    }
  }

  // Payment Dispute Management
  async createPaymentDispute(data: PaymentDisputeData) {
    try {
      const dispute = await prisma.paymentDispute.create({
        data: {
          escrowId: data.escrowId,
          paymentId: data.paymentId,
          disputeReason: data.disputeReason,
          disputeAmount: data.disputeAmount,
          submittedBy: data.submittedBy,
          respondentId: data.respondentId,
          evidenceProvided: data.evidenceProvided ? JSON.stringify(data.evidenceProvided) : null,
          supportingDocs: data.supportingDocs ? JSON.stringify(data.supportingDocs) : null,
          disputeStatus: 'SUBMITTED',
          responseDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        },
        include: {
          submitter: true,
          respondent: true,
          escrow: true
        }
      });

      // Create HubSpot ticket for dispute
      await this.hubspotService.createTicket({
        subject: `Payment Dispute - ${data.disputeReason}`,
        content: `Dispute Amount: $${data.disputeAmount}\nReason: ${data.disputeReason}`,
        pipeline: 'payment_disputes',
        priority: 'HIGH',
        hs_ticket_category: 'PAYMENT_DISPUTE'
      }, dispute.id);

      return dispute;
    } catch (error) {
      console.error('Error creating payment dispute:', error);
      throw new Error('Failed to create payment dispute');
    }
  }

  async requestMediation(disputeId: string, requestedBy: string) {
    try {
      const dispute = await prisma.paymentDispute.findUnique({
        where: { id: disputeId },
        include: { escrow: true }
      });

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      // Assign a mediator (in a real system, this would be more sophisticated)
      const mediatorId = await this.assignMediator(dispute.escrowId);

      const updatedDispute = await prisma.paymentDispute.update({
        where: { id: disputeId },
        data: {
          disputeStatus: 'MEDIATION',
          mediatorId,
          mediationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
        }
      });

      // Notify all parties about mediation
      await this.sendDisputeNotification(dispute.submittedBy, {
        type: 'MEDIATION_SCHEDULED',
        disputeId,
        mediationDate: updatedDispute.mediationDate!
      });

      await this.sendDisputeNotification(dispute.respondentId, {
        type: 'MEDIATION_SCHEDULED',
        disputeId,
        mediationDate: updatedDispute.mediationDate!
      });

      return updatedDispute;
    } catch (error) {
      console.error('Error requesting mediation:', error);
      throw new Error('Failed to request mediation');
    }
  }

  async resolveDispute(
    disputeId: string,
    resolution: string,
    resolutionAmount: number,
    resolvedBy: string
  ) {
    try {
      const dispute = await prisma.paymentDispute.findUnique({
        where: { id: disputeId },
        include: { escrow: true }
      });

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      const updatedDispute = await prisma.paymentDispute.update({
        where: { id: disputeId },
        data: {
          disputeStatus: 'RESOLVED',
          resolution,
          resolutionAmount,
          resolutionDate: new Date()
        }
      });

      // Process resolution payment if applicable
      if (resolutionAmount > 0) {
        await this.processResolutionPayment(disputeId, resolutionAmount);
      }

      // Notify parties of resolution
      await this.sendDisputeNotification(dispute.submittedBy, {
        type: 'DISPUTE_RESOLVED',
        disputeId,
        resolution,
        resolutionAmount
      });

      await this.sendDisputeNotification(dispute.respondentId, {
        type: 'DISPUTE_RESOLVED',
        disputeId,
        resolution,
        resolutionAmount
      });

      return updatedDispute;
    } catch (error) {
      console.error('Error resolving dispute:', error);
      throw new Error('Failed to resolve dispute');
    }
  }

  private async assignMediator(escrowId: string): Promise<string> {
    // In a real implementation, this would select an available mediator
    // For now, return a placeholder mediator ID
    return 'mediator_001';
  }

  private async processResolutionPayment(disputeId: string, amount: number) {
    try {
      const dispute = await prisma.paymentDispute.findUnique({
        where: { id: disputeId },
        include: { escrow: true }
      });

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      // Process payment based on resolution
      const transactionId = await this.processEscrowPayment(
        dispute.escrow.stripeAccountId!,
        dispute.submittedBy, // Assuming resolution favors the dispute submitter
        amount
      );

      // Create resolution payment record
      await prisma.escrowPayment.create({
        data: {
          escrowId: dispute.escrowId,
          recipientId: dispute.submittedBy,
          amount,
          paymentType: 'REFUND',
          transactionId,
          paymentMethod: 'ACH',
          paymentStatus: 'COMPLETED'
        }
      });

      return transactionId;
    } catch (error) {
      console.error('Error processing resolution payment:', error);
      throw new Error('Failed to process resolution payment');
    }
  }

  private async sendDisputeNotification(memberId: string, notificationData: {
    type: string;
    disputeId: string;
    mediationDate?: Date;
    resolution?: string;
    resolutionAmount?: number;
  }) {
    try {
      console.log(`Dispute notification sent to member ${memberId}:`, notificationData);
      // In a real implementation, send email/SMS notifications
    } catch (error) {
      console.error('Error sending dispute notification:', error);
    }
  }

  // Cash Flow Management
  async createCashFlowProjection(data: CashFlowProjectionData) {
    try {
      const projection = await prisma.cashFlowProjection.create({
        data: {
          escrowId: data.escrowId,
          memberId: data.memberId,
          projectionDate: data.projectionDate,
          projectedInflow: data.projectedInflow,
          projectedOutflow: data.projectedOutflow,
          netCashFlow: data.projectedInflow - data.projectedOutflow,
          confidenceScore: this.calculateConfidenceScore(data),
          riskFactors: data.riskFactors ? JSON.stringify(data.riskFactors) : null,
          recommendations: data.recommendations ? JSON.stringify(data.recommendations) : null
        },
        include: {
          escrow: true,
          member: true
        }
      });

      return projection;
    } catch (error) {
      console.error('Error creating cash flow projection:', error);
      throw new Error('Failed to create cash flow projection');
    }
  }

  async getCashFlowDashboard(memberId: string) {
    try {
      const escrows = await prisma.projectEscrow.findMany({
        where: {
          OR: [
            { clientId: memberId },
            { contractorId: memberId }
          ]
        },
        include: {
          taskPayments: true,
          paymentMilestones: true,
          escrowPayments: true,
          cashFlowProjections: {
            orderBy: { projectionDate: 'desc' },
            take: 1
          }
        }
      });

      const dashboardData = {
        totalEscrowBalance: escrows.reduce((sum, e) => sum + e.escrowBalance, 0),
        totalProjectValue: escrows.reduce((sum, e) => sum + e.totalProjectValue, 0),
        totalPaid: escrows.reduce((sum, e) => sum + e.totalPaid, 0),
        pendingPayments: escrows.reduce((sum, e) => 
          sum + e.taskPayments.filter(tp => tp.paymentStatus === 'APPROVED').length +
          e.paymentMilestones.filter(pm => pm.milestoneStatus === 'VERIFIED').length, 0
        ),
        activeEscrows: escrows.filter(e => e.escrowStatus === 'ACTIVE').length,
        recentProjections: escrows.flatMap(e => e.cashFlowProjections).slice(0, 5)
      };

      return dashboardData;
    } catch (error) {
      console.error('Error getting cash flow dashboard:', error);
      throw new Error('Failed to get cash flow dashboard');
    }
  }

  // External Payment Processor Integration (Placeholder methods)
  private async createStripeEscrowAccount(data: ProjectEscrowData): Promise<string> {
    // Placeholder for Stripe Connect escrow account creation
    // In production, this would create a Stripe Connect account for holding escrow funds
    return `stripe_escrow_${Date.now()}`;
  }

  private async processEscrowDeposit(accountId: string, amount: number, paymentMethod: string): Promise<string> {
    // Placeholder for processing escrow deposits
    // In production, this would handle ACH/wire transfers into escrow account
    return `deposit_${Date.now()}`;
  }

  private async processEscrowPayment(accountId: string, recipientId: string, amount: number): Promise<string> {
    // Placeholder for processing payments from escrow
    // In production, this would handle ACH/wire transfers from escrow to contractor
    return `payment_${Date.now()}`;
  }

  private calculateConfidenceScore(data: CashFlowProjectionData): number {
    // Simple confidence calculation based on data completeness and risk factors
    let score = 0.8; // Base confidence
    
    if (data.riskFactors && data.riskFactors.length > 0) {
      score -= data.riskFactors.length * 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, score));
  }

  // Change Order Management
  async processChangeOrder(data: ChangeOrderData) {
    try {
      const escrow = await prisma.projectEscrow.findUnique({
        where: { id: data.escrowId },
        include: {
          paymentMilestones: true,
          taskPayments: true
        }
      });

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      // Calculate new project value
      const newProjectValue = escrow.totalProjectValue + data.amountChange;
      const newRetentionAmount = (newProjectValue * escrow.retentionPercentage) / 100;

      // Update escrow with change order
      const updatedEscrow = await prisma.projectEscrow.update({
        where: { id: data.escrowId },
        data: {
          totalProjectValue: newProjectValue,
          retentionAmount: newRetentionAmount,
          // Update expected completion date if there's schedule impact
          expectedCompletionDate: data.scheduleImpact !== 0 && escrow.expectedCompletionDate
            ? new Date(new Date(escrow.expectedCompletionDate).getTime() + (data.scheduleImpact * 24 * 60 * 60 * 1000))
            : escrow.expectedCompletionDate
        }
      });

      // Adjust milestone amounts proportionally if project value changed
      if (data.amountChange !== 0) {
        const adjustmentRatio = newProjectValue / escrow.totalProjectValue;
        
        for (const milestone of escrow.paymentMilestones) {
          if (milestone.milestoneStatus === 'PENDING' || milestone.milestoneStatus === 'IN_PROGRESS') {
            const newAmount = milestone.paymentAmount * adjustmentRatio;
            
            await prisma.paymentMilestone.update({
              where: { id: milestone.id },
              data: {
                paymentAmount: newAmount
              }
            });
          }
        }
      }

      // Create change order record in HubSpot
      await this.hubspotService.createCustomObject('change_orders', {
        escrow_id: data.escrowId,
        change_order_number: data.changeOrderNumber,
        description: data.description,
        amount_change: data.amountChange,
        schedule_impact: data.scheduleImpact,
        reason: data.reason,
        approved_by: data.approvedBy,
        status: 'APPROVED'
      });

      // Update escrow in HubSpot
      await this.hubspotService.updateCustomObject('project_escrows', escrow.hubspotObjectId!, {
        total_project_value: newProjectValue,
        retention_amount: newRetentionAmount
      });

      return updatedEscrow;
    } catch (error) {
      console.error('Error processing change order:', error);
      throw new Error('Failed to process change order');
    }
  }

  // Retention Release Management
  async releaseRetention(escrowId: string, releasedBy: string) {
    try {
      const escrow = await prisma.projectEscrow.findUnique({
        where: { id: escrowId }
      });

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (escrow.escrowStatus !== 'COMPLETED') {
        throw new Error('Project must be completed before releasing retention');
      }

      // Process retention payment
      const transactionId = await this.processEscrowPayment(
        escrow.stripeAccountId!,
        escrow.contractorId,
        escrow.retentionAmount
      );

      // Update escrow
      await prisma.projectEscrow.update({
        where: { id: escrowId },
        data: {
          escrowBalance: escrow.escrowBalance - escrow.retentionAmount,
          totalPaid: escrow.totalPaid + escrow.retentionAmount,
          lastPaymentDate: new Date(),
          lastPaymentAmount: escrow.retentionAmount,
          escrowStatus: 'CLOSED'
        }
      });

      // Create retention payment record
      await prisma.escrowPayment.create({
        data: {
          escrowId,
          recipientId: escrow.contractorId,
          amount: escrow.retentionAmount,
          paymentType: 'RETENTION_RELEASE',
          transactionId,
          paymentMethod: 'ACH',
          paymentStatus: 'COMPLETED'
        }
      });

      // Send notification
      await this.sendPaymentNotification(escrow.contractorId, {
        type: 'RETENTION_RELEASED',
        amount: escrow.retentionAmount,
        projectName: escrow.projectName,
        transactionId
      });

      return transactionId;
    } catch (error) {
      console.error('Error releasing retention:', error);
      throw new Error('Failed to release retention');
    }
  }

  private async sendPaymentNotification(memberId: string, notificationData: {
    type: string;
    amount: number;
    taskName?: string;
    projectName?: string;
    transactionId: string;
  }) {
    try {
      // In a real implementation, this would send email/SMS notifications
      // For now, we'll create a notification record in the database
      console.log(`Payment notification sent to member ${memberId}:`, notificationData);
      
      // You could integrate with SendGrid, Twilio, or other notification services here
      // await sendEmail({
      //   to: memberEmail,
      //   subject: `Payment Processed - $${notificationData.amount}`,
      //   template: 'payment-notification',
      //   data: notificationData
      // });
      
    } catch (error) {
      console.error('Error sending payment notification:', error);
      // Don't throw error as this shouldn't block payment processing
    }
  }
}