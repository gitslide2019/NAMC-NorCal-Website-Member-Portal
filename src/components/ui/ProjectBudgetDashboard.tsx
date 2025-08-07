'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  PlusCircle,
  FileText,
  Users,
  Target
} from 'lucide-react';

interface ProjectBudget {
  id: string;
  projectId: string;
  projectName: string;
  totalBudget: number;
  allocatedFunds: number;
  spentAmount: number;
  remainingFunds: number;
  memberFunding: number;
  sponsorFunding: number;
  crowdFunding: number;
  contractValue: number;
  profitMargin: number;
  budgetStatus: 'ACTIVE' | 'OVER_BUDGET' | 'COMPLETED' | 'CANCELLED';
  alertThreshold: number;
  approvalRequired: boolean;
  expenses: BudgetExpense[];
  fundingCampaigns: FundingCampaign[];
  socialImpactMetrics?: SocialImpactMetrics;
}

interface BudgetExpense {
  id: string;
  expenseCategory: string;
  description: string;
  amount: number;
  expenseDate: string;
  vendor?: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
}

interface FundingCampaign {
  id: string;
  campaignTitle: string;
  targetAmount: number;
  raisedAmount: number;
  campaignType: string;
  campaignStatus: string;
  startDate: string;
  endDate: string;
}

interface SocialImpactMetrics {
  jobsCreated: number;
  jobsPlanned: number;
  trainingHoursProvided: number;
  localHirePercentage: number;
  communityBenefitScore: number;
  sroiRatio: number;
}

interface ProjectBudgetDashboardProps {
  projectId: string;
  memberId: string;
}

export function ProjectBudgetDashboard({ projectId, memberId }: ProjectBudgetDashboardProps) {
  const [budget, setBudget] = useState<ProjectBudget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  useEffect(() => {
    fetchBudgetData();
  }, [projectId]);

  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/budget`);
      if (!response.ok) {
        throw new Error('Failed to fetch budget data');
      }
      const data = await response.json();
      setBudget(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getBudgetStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500';
      case 'OVER_BUDGET': return 'bg-red-500';
      case 'COMPLETED': return 'bg-blue-500';
      case 'CANCELLED': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getBudgetUtilization = () => {
    if (!budget) return 0;
    return (budget.spentAmount / budget.totalBudget) * 100;
  };

  const isOverThreshold = () => {
    if (!budget) return false;
    return getBudgetUtilization() >= (budget.alertThreshold * 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <div className="text-red-800">
          <strong>Error loading budget data:</strong> {error}
        </div>
      </Alert>
    );
  }

  if (!budget) {
    return (
      <Card className="p-6 text-center">
        <div className="space-y-4">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto" />
          <h3 className="text-lg font-semibold text-gray-900">No Budget Found</h3>
          <p className="text-gray-600">This project doesn't have a budget set up yet.</p>
          <Button onClick={() => window.location.href = `/member/projects/${projectId}/budget/create`}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Budget
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{budget.projectName} Budget</h2>
          <div className="flex items-center space-x-2 mt-1">
            <Badge className={getBudgetStatusColor(budget.budgetStatus)}>
              {budget.budgetStatus.replace('_', ' ')}
            </Badge>
            {isOverThreshold() && (
              <Badge className="bg-yellow-500">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Alert Threshold Reached
              </Badge>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowExpenseForm(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
          <Button variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Budget Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(budget.totalBudget)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Spent Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(budget.spentAmount)}
              </p>
              <p className="text-xs text-gray-500">
                {getBudgetUtilization().toFixed(1)}% of budget
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Remaining Funds</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(budget.remainingFunds)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Profit Margin</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(budget.profitMargin)}
              </p>
              <p className="text-xs text-gray-500">
                {((budget.profitMargin / budget.contractValue) * 100).toFixed(1)}%
              </p>
            </div>
            <Target className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Budget Progress Bar */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Budget Utilization</h3>
            <span className="text-sm text-gray-600">
              {formatCurrency(budget.spentAmount)} / {formatCurrency(budget.totalBudget)}
            </span>
          </div>
          <Progress 
            value={getBudgetUtilization()} 
            className={`h-3 ${isOverThreshold() ? 'bg-red-100' : 'bg-green-100'}`}
          />
          {isOverThreshold() && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <div className="text-yellow-800">
                <strong>Budget Alert:</strong> You've reached {getBudgetUtilization().toFixed(1)}% of your budget threshold.
              </div>
            </Alert>
          )}
        </div>
      </Card>

      {/* Funding Sources */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Funding Sources</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-600">Member Funding</p>
            <p className="text-xl font-bold text-blue-900">
              {formatCurrency(budget.memberFunding)}
            </p>
            <p className="text-xs text-blue-600">
              {((budget.memberFunding / budget.totalBudget) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm font-medium text-green-600">Sponsor Funding</p>
            <p className="text-xl font-bold text-green-900">
              {formatCurrency(budget.sponsorFunding)}
            </p>
            <p className="text-xs text-green-600">
              {((budget.sponsorFunding / budget.totalBudget) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm font-medium text-purple-600">Crowdfunding</p>
            <p className="text-xl font-bold text-purple-900">
              {formatCurrency(budget.crowdFunding)}
            </p>
            <p className="text-xs text-purple-600">
              {((budget.crowdFunding / budget.totalBudget) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </Card>

      {/* Active Funding Campaigns */}
      {budget.fundingCampaigns.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Active Funding Campaigns</h3>
            <Button variant="outline" size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
          <div className="space-y-4">
            {budget.fundingCampaigns.map((campaign) => (
              <div key={campaign.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{campaign.campaignTitle}</h4>
                  <Badge>{campaign.campaignType}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>
                      {formatCurrency(campaign.raisedAmount)} / {formatCurrency(campaign.targetAmount)}
                    </span>
                  </div>
                  <Progress 
                    value={(campaign.raisedAmount / campaign.targetAmount) * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Started: {new Date(campaign.startDate).toLocaleDateString()}</span>
                    <span>Ends: {new Date(campaign.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Social Impact Preview */}
      {budget.socialImpactMetrics && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Social Impact Overview</h3>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              View Full Report
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {budget.socialImpactMetrics.jobsCreated}
              </p>
              <p className="text-sm text-gray-600">Jobs Created</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {budget.socialImpactMetrics.trainingHoursProvided}
              </p>
              <p className="text-sm text-gray-600">Training Hours</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {budget.socialImpactMetrics.localHirePercentage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Local Hire</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {budget.socialImpactMetrics.sroiRatio.toFixed(2)}:1
              </p>
              <p className="text-sm text-gray-600">SROI Ratio</p>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Expenses */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {budget.expenses.slice(0, 5).map((expense) => (
            <div key={expense.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{expense.description}</p>
                <p className="text-sm text-gray-600">
                  {expense.expenseCategory} • {expense.vendor} • {new Date(expense.expenseDate).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{formatCurrency(expense.amount)}</p>
                <Badge 
                  className={
                    expense.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    expense.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }
                >
                  {expense.approvalStatus}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}