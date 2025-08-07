'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useProjectPayments, CashFlowDashboard as CashFlowData, CashFlowProjection } from '@/hooks/useProjectPayments';

interface CashFlowDashboardProps {
  memberId?: string;
}

export function CashFlowDashboard({ memberId }: CashFlowDashboardProps) {
  const { 
    loadCashFlowDashboard, 
    createCashFlowProjection, 
    dashboard, 
    loading, 
    error 
  } = useProjectPayments();
  
  const [selectedTimeframe, setSelectedTimeframe] = useState('30'); // days
  const [showProjectionForm, setShowProjectionForm] = useState(false);
  const [newProjection, setNewProjection] = useState({
    escrowId: '',
    projectionDate: '',
    projectedInflow: 0,
    projectedOutflow: 0,
    riskFactors: [''],
    recommendations: ['']
  });

  useEffect(() => {
    loadCashFlowDashboard(memberId);
  }, [memberId]);

  const handleCreateProjection = async () => {
    if (!newProjection.escrowId || !newProjection.projectionDate) {
      return;
    }

    const result = await createCashFlowProjection({
      escrowId: newProjection.escrowId,
      projectionDate: newProjection.projectionDate,
      projectedInflow: newProjection.projectedInflow,
      projectedOutflow: newProjection.projectedOutflow,
      riskFactors: newProjection.riskFactors.filter(r => r.trim() !== ''),
      recommendations: newProjection.recommendations.filter(r => r.trim() !== '')
    });

    if (result) {
      setNewProjection({
        escrowId: '',
        projectionDate: '',
        projectedInflow: 0,
        projectedOutflow: 0,
        riskFactors: [''],
        recommendations: ['']
      });
      setShowProjectionForm(false);
      loadCashFlowDashboard(memberId); // Refresh dashboard
    }
  };

  const addRiskFactor = () => {
    setNewProjection({
      ...newProjection,
      riskFactors: [...newProjection.riskFactors, '']
    });
  };

  const updateRiskFactor = (index: number, value: string) => {
    const updated = [...newProjection.riskFactors];
    updated[index] = value;
    setNewProjection({
      ...newProjection,
      riskFactors: updated
    });
  };

  const removeRiskFactor = (index: number) => {
    setNewProjection({
      ...newProjection,
      riskFactors: newProjection.riskFactors.filter((_, i) => i !== index)
    });
  };

  const addRecommendation = () => {
    setNewProjection({
      ...newProjection,
      recommendations: [...newProjection.recommendations, '']
    });
  };

  const updateRecommendation = (index: number, value: string) => {
    const updated = [...newProjection.recommendations];
    updated[index] = value;
    setNewProjection({
      ...newProjection,
      recommendations: updated
    });
  };

  const removeRecommendation = (index: number) => {
    setNewProjection({
      ...newProjection,
      recommendations: newProjection.recommendations.filter((_, i) => i !== index)
    });
  };

  const calculateCashFlowHealth = () => {
    if (!dashboard) return { status: 'Unknown', color: 'text-gray-600' };
    
    const utilizationRate = dashboard.totalEscrowBalance / Math.max(dashboard.totalProjectValue, 1);
    const paymentRatio = dashboard.totalPaid / Math.max(dashboard.totalProjectValue, 1);
    
    if (utilizationRate > 0.8 && paymentRatio < 0.3) {
      return { status: 'Excellent', color: 'text-green-600' };
    } else if (utilizationRate > 0.6 && paymentRatio < 0.5) {
      return { status: 'Good', color: 'text-green-500' };
    } else if (utilizationRate > 0.4) {
      return { status: 'Fair', color: 'text-yellow-600' };
    } else {
      return { status: 'Poor', color: 'text-red-600' };
    }
  };

  const getProjectionTrend = (projections: CashFlowProjection[]) => {
    if (projections.length < 2) return { trend: 'Stable', color: 'text-gray-600' };
    
    const latest = projections[0];
    const previous = projections[1];
    
    if (latest.netCashFlow > previous.netCashFlow * 1.1) {
      return { trend: 'Improving', color: 'text-green-600' };
    } else if (latest.netCashFlow < previous.netCashFlow * 0.9) {
      return { trend: 'Declining', color: 'text-red-600' };
    } else {
      return { trend: 'Stable', color: 'text-blue-600' };
    }
  };

  if (loading && !dashboard) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const cashFlowHealth = calculateCashFlowHealth();
  const projectionTrend = dashboard ? getProjectionTrend(dashboard.recentProjections) : { trend: 'Unknown', color: 'text-gray-600' };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cash Flow Dashboard</h2>
          <p className="text-gray-600 mt-1">Monitor project payments and financial health</p>
        </div>
        <div className="flex gap-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
          <Button
            onClick={() => setShowProjectionForm(!showProjectionForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showProjectionForm ? 'Cancel' : 'New Projection'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Key Metrics */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Escrow Balance</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${dashboard.totalEscrowBalance.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Paid</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    ${dashboard.totalPaid.toLocaleString()}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Payments</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {dashboard.pendingPayments}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Escrows</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {dashboard.activeEscrows}
                  </dd>
                </dl>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Cash Flow Health & Trends */}
      {dashboard && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cash Flow Health</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Overall Health:</span>
                <span className={`font-medium ${cashFlowHealth.color}`}>
                  {cashFlowHealth.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Projection Trend:</span>
                <span className={`font-medium ${projectionTrend.color}`}>
                  {projectionTrend.trend}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment Efficiency:</span>
                <span className="font-medium text-blue-600">
                  {dashboard.totalProjectValue > 0 
                    ? ((dashboard.totalPaid / dashboard.totalProjectValue) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Escrow Utilization:</span>
                <span className="font-medium text-green-600">
                  {dashboard.totalProjectValue > 0 
                    ? ((dashboard.totalEscrowBalance / dashboard.totalProjectValue) * 100).toFixed(1)
                    : 0}%
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Project Value:</span>
                <span className="font-medium text-gray-900">
                  ${dashboard.totalProjectValue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Available Balance:</span>
                <span className="font-medium text-green-600">
                  ${dashboard.totalEscrowBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payments Made:</span>
                <span className="font-medium text-blue-600">
                  ${dashboard.totalPaid.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Remaining Value:</span>
                <span className="font-medium text-gray-900">
                  ${(dashboard.totalProjectValue - dashboard.totalPaid).toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Create Projection Form */}
      {showProjectionForm && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create Cash Flow Projection</h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Escrow ID
                </label>
                <Input
                  value={newProjection.escrowId}
                  onChange={(e) => setNewProjection({
                    ...newProjection,
                    escrowId: e.target.value
                  })}
                  placeholder="Enter escrow ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Projection Date
                </label>
                <Input
                  type="date"
                  value={newProjection.projectionDate}
                  onChange={(e) => setNewProjection({
                    ...newProjection,
                    projectionDate: e.target.value
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Projected Inflow ($)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProjection.projectedInflow}
                  onChange={(e) => setNewProjection({
                    ...newProjection,
                    projectedInflow: Number(e.target.value)
                  })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Projected Outflow ($)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newProjection.projectedOutflow}
                  onChange={(e) => setNewProjection({
                    ...newProjection,
                    projectedOutflow: Number(e.target.value)
                  })}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Net Cash Flow Display */}
            {(newProjection.projectedInflow > 0 || newProjection.projectedOutflow > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-blue-800 text-sm">
                  <strong>Net Cash Flow:</strong> ${(newProjection.projectedInflow - newProjection.projectedOutflow).toLocaleString()}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Risk Factors
              </label>
              {newProjection.riskFactors.map((risk, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={risk}
                    onChange={(e) => updateRiskFactor(index, e.target.value)}
                    placeholder="Describe potential risk..."
                    className="flex-1"
                  />
                  {newProjection.riskFactors.length > 1 && (
                    <Button
                      onClick={() => removeRiskFactor(index)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                onClick={addRiskFactor}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Add Risk Factor
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recommendations
              </label>
              {newProjection.recommendations.map((rec, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={rec}
                    onChange={(e) => updateRecommendation(index, e.target.value)}
                    placeholder="Add recommendation..."
                    className="flex-1"
                  />
                  {newProjection.recommendations.length > 1 && (
                    <Button
                      onClick={() => removeRecommendation(index)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                onClick={addRecommendation}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Add Recommendation
              </Button>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCreateProjection}
                disabled={loading || !newProjection.escrowId || !newProjection.projectionDate}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Creating...' : 'Create Projection'}
              </Button>
              <Button
                onClick={() => setShowProjectionForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Recent Projections */}
      {dashboard && dashboard.recentProjections.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Cash Flow Projections</h3>
          
          <div className="space-y-4">
            {dashboard.recentProjections.map((projection) => (
              <div key={projection.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      Projection for {new Date(projection.projectionDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Confidence: {(projection.confidenceScore * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${projection.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${projection.netCashFlow.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Net Cash Flow</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Projected Inflow:</span>
                    <span className="ml-2 font-medium text-green-600">
                      ${projection.projectedInflow.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Projected Outflow:</span>
                    <span className="ml-2 font-medium text-red-600">
                      ${projection.projectedOutflow.toLocaleString()}
                    </span>
                  </div>
                </div>

                {projection.riskFactors && projection.riskFactors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Risk Factors:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {projection.riskFactors.map((risk, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {projection.recommendations && projection.recommendations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Recommendations:</p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {projection.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}