import { useState, useEffect } from 'react';

export interface ProjectEscrow {
  id: string;
  projectId: string;
  projectName: string;
  totalProjectValue: number;
  escrowBalance: number;
  totalPaid: number;
  totalDeposited: number;
  clientId: string;
  contractorId: string;
  retentionPercentage: number;
  retentionAmount: number;
  escrowStatus: string;
  expectedCompletionDate?: string;
  actualCompletionDate?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
}

export interface TaskPayment {
  id: string;
  escrowId: string;
  taskId: string;
  taskName: string;
  paymentAmount: number;
  contractorId: string;
  paymentStatus: string;
  qualityScore?: number;
  photosRequired: boolean;
  photosSubmitted?: string[];
  verificationNotes?: string;
  approvedBy?: string;
  approvedDate?: string;
  paidDate?: string;
}

export interface PaymentMilestone {
  id: string;
  escrowId: string;
  milestoneName: string;
  paymentAmount: number;
  paymentPercentage: number;
  deliverables: string[];
  milestoneStatus: string;
  dueDate?: string;
  completedDate?: string;
  verifiedBy?: string;
  paymentReleased: boolean;
  contractorId: string;
}

export interface PaymentDispute {
  id: string;
  escrowId: string;
  disputeReason: string;
  disputeAmount: number;
  submittedBy: string;
  respondentId: string;
  disputeStatus: string;
  evidenceProvided?: string[];
  supportingDocs?: string[];
  resolution?: string;
  resolutionAmount?: number;
  resolutionDate?: string;
}

export interface CashFlowProjection {
  id: string;
  escrowId: string;
  projectionDate: string;
  projectedInflow: number;
  projectedOutflow: number;
  netCashFlow: number;
  confidenceScore: number;
  riskFactors?: string[];
  recommendations?: string[];
}

export interface CashFlowDashboard {
  totalEscrowBalance: number;
  totalProjectValue: number;
  totalPaid: number;
  pendingPayments: number;
  activeEscrows: number;
  recentProjections: CashFlowProjection[];
}

export function useProjectPayments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<CashFlowDashboard | null>(null);

  // Create Project Escrow
  const createProjectEscrow = async (data: {
    projectId: string;
    projectName: string;
    totalProjectValue: number;
    clientId: string;
    contractorId: string;
    paymentSchedule?: any;
    retentionPercentage?: number;
    expectedCompletionDate?: string;
  }): Promise<ProjectEscrow | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/escrow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project escrow');
      }

      const escrow = await response.json();
      return escrow;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Fund Escrow
  const fundEscrow = async (escrowId: string, amount: number, paymentMethod: string): Promise<ProjectEscrow | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/escrow/${escrowId}/fund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, paymentMethod }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fund escrow');
      }

      const escrow = await response.json();
      return escrow;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create Task Payment
  const createTaskPayment = async (data: {
    escrowId: string;
    taskId: string;
    taskName: string;
    paymentAmount: number;
    contractorId: string;
    completionRequirements?: any;
    verificationCriteria?: any;
    approvalRequired?: boolean;
    photosRequired?: boolean;
  }): Promise<TaskPayment | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create task payment');
      }

      const taskPayment = await response.json();
      return taskPayment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Verify Task Completion
  const verifyTaskCompletion = async (
    taskPaymentId: string,
    qualityScore: number,
    photosSubmitted?: string[],
    verificationNotes?: string
  ): Promise<TaskPayment | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/tasks/${taskPaymentId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          qualityScore,
          photosSubmitted,
          verificationNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify task completion');
      }

      const taskPayment = await response.json();
      return taskPayment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Approve Task Payment
  const approveTaskPayment = async (taskPaymentId: string): Promise<TaskPayment | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/tasks/${taskPaymentId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve task payment');
      }

      const taskPayment = await response.json();
      return taskPayment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create Payment Milestone
  const createPaymentMilestone = async (data: {
    escrowId: string;
    milestoneName: string;
    paymentAmount: number;
    paymentPercentage: number;
    deliverables: string[];
    verificationCriteria?: any;
    dueDate?: string;
    contractorId: string;
  }): Promise<PaymentMilestone | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/milestones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment milestone');
      }

      const milestone = await response.json();
      return milestone;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Complete Milestone
  const completeMilestone = async (milestoneId: string): Promise<PaymentMilestone | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/payments/milestones/${milestoneId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete milestone');
      }

      const milestone = await response.json();
      return milestone;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create Payment Dispute
  const createPaymentDispute = async (data: {
    escrowId: string;
    paymentId?: string;
    disputeReason: string;
    disputeAmount: number;
    respondentId: string;
    evidenceProvided?: string[];
    supportingDocs?: string[];
  }): Promise<PaymentDispute | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment dispute');
      }

      const dispute = await response.json();
      return dispute;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Create Cash Flow Projection
  const createCashFlowProjection = async (data: {
    escrowId: string;
    projectionDate: string;
    projectedInflow: number;
    projectedOutflow: number;
    riskFactors?: string[];
    recommendations?: string[];
  }): Promise<CashFlowProjection | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/payments/cash-flow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create cash flow projection');
      }

      const projection = await response.json();
      return projection;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Load Cash Flow Dashboard
  const loadCashFlowDashboard = async (memberId?: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = memberId ? `/api/payments/escrow?memberId=${memberId}` : '/api/payments/escrow';
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load cash flow dashboard');
      }

      const dashboardData = await response.json();
      setDashboard(dashboardData);
      return dashboardData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    dashboard,
    createProjectEscrow,
    fundEscrow,
    createTaskPayment,
    verifyTaskCompletion,
    approveTaskPayment,
    createPaymentMilestone,
    completeMilestone,
    createPaymentDispute,
    createCashFlowProjection,
    loadCashFlowDashboard,
  };
}