'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useProjectPayments, PaymentMilestone, ProjectEscrow } from '@/hooks/useProjectPayments';

interface MilestonePaymentManagerProps {
  escrow: ProjectEscrow;
  onMilestoneUpdate?: (milestone: PaymentMilestone) => void;
}

export function MilestonePaymentManager({ 
  escrow, 
  onMilestoneUpdate 
}: MilestonePaymentManagerProps) {
  const { 
    createPaymentMilestone, 
    completeMilestone, 
    loading, 
    error 
  } = useProjectPayments();
  
  const [milestones, setMilestones] = useState<PaymentMilestone[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMilestone, setNewMilestone] = useState({
    milestoneName: '',
    paymentPercentage: 0,
    deliverables: [''],
    dueDate: '',
    verificationCriteria: {}
  });

  // Load milestones for this escrow
  useEffect(() => {
    loadMilestones();
  }, [escrow.id]);

  const loadMilestones = async () => {
    try {
      // In a real implementation, you would fetch milestones from the API
      // For now, we'll use placeholder data
      setMilestones([]);
    } catch (error) {
      console.error('Error loading milestones:', error);
    }
  };

  const handleCreateMilestone = async () => {
    if (!newMilestone.milestoneName || newMilestone.paymentPercentage <= 0) {
      return;
    }

    const paymentAmount = (escrow.totalProjectValue * newMilestone.paymentPercentage) / 100;

    const result = await createPaymentMilestone({
      escrowId: escrow.id,
      milestoneName: newMilestone.milestoneName,
      paymentAmount,
      paymentPercentage: newMilestone.paymentPercentage,
      deliverables: newMilestone.deliverables.filter(d => d.trim() !== ''),
      verificationCriteria: newMilestone.verificationCriteria,
      dueDate: newMilestone.dueDate || undefined,
      contractorId: escrow.contractorId
    });

    if (result) {
      setMilestones([...milestones, result]);
      setNewMilestone({
        milestoneName: '',
        paymentPercentage: 0,
        deliverables: [''],
        dueDate: '',
        verificationCriteria: {}
      });
      setShowCreateForm(false);
      
      if (onMilestoneUpdate) {
        onMilestoneUpdate(result);
      }
    }
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    const result = await completeMilestone(milestoneId);
    
    if (result) {
      setMilestones(milestones.map(m => 
        m.id === milestoneId ? result : m
      ));
      
      if (onMilestoneUpdate) {
        onMilestoneUpdate(result);
      }
    }
  };

  const addDeliverable = () => {
    setNewMilestone({
      ...newMilestone,
      deliverables: [...newMilestone.deliverables, '']
    });
  };

  const updateDeliverable = (index: number, value: string) => {
    const updated = [...newMilestone.deliverables];
    updated[index] = value;
    setNewMilestone({
      ...newMilestone,
      deliverables: updated
    });
  };

  const removeDeliverable = (index: number) => {
    setNewMilestone({
      ...newMilestone,
      deliverables: newMilestone.deliverables.filter((_, i) => i !== index)
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600';
      case 'IN_PROGRESS': return 'text-blue-600';
      case 'COMPLETED': return 'text-green-600';
      case 'VERIFIED': return 'text-green-700';
      case 'PAID': return 'text-green-800';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'PENDING': return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'IN_PROGRESS': return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'COMPLETED': return `${baseClasses} bg-green-100 text-green-800`;
      case 'VERIFIED': return `${baseClasses} bg-green-200 text-green-900`;
      case 'PAID': return `${baseClasses} bg-green-300 text-green-900`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const calculateProgressPercentage = () => {
    if (milestones.length === 0) return 0;
    const completedMilestones = milestones.filter(m => 
      m.milestoneStatus === 'PAID' || m.milestoneStatus === 'VERIFIED'
    );
    return (completedMilestones.length / milestones.length) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Project Progress Overview */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Payment Milestones - {escrow.projectName}
          </h3>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {showCreateForm ? 'Cancel' : 'Add Milestone'}
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Project Progress</span>
            <span>{calculateProgressPercentage().toFixed(1)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${calculateProgressPercentage()}%` }}
            />
          </div>
        </div>

        {/* Project Financial Summary */}
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <p className="text-gray-600">Total Value</p>
            <p className="font-semibold text-lg">${escrow.totalProjectValue.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Escrow Balance</p>
            <p className="font-semibold text-lg">${escrow.escrowBalance.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Total Paid</p>
            <p className="font-semibold text-lg">${escrow.totalPaid.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Retention</p>
            <p className="font-semibold text-lg">${escrow.retentionAmount.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Create Milestone Form */}
      {showCreateForm && (
        <Card className="p-6">
          <h4 className="font-medium text-gray-900 mb-4">Create New Milestone</h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Milestone Name
                </label>
                <Input
                  value={newMilestone.milestoneName}
                  onChange={(e) => setNewMilestone({
                    ...newMilestone,
                    milestoneName: e.target.value
                  })}
                  placeholder="e.g., Foundation Complete"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Percentage
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={newMilestone.paymentPercentage}
                  onChange={(e) => setNewMilestone({
                    ...newMilestone,
                    paymentPercentage: Number(e.target.value)
                  })}
                  placeholder="25"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date (Optional)
              </label>
              <Input
                type="date"
                value={newMilestone.dueDate}
                onChange={(e) => setNewMilestone({
                  ...newMilestone,
                  dueDate: e.target.value
                })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Deliverables
              </label>
              {newMilestone.deliverables.map((deliverable, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={deliverable}
                    onChange={(e) => updateDeliverable(index, e.target.value)}
                    placeholder="Describe deliverable..."
                    className="flex-1"
                  />
                  {newMilestone.deliverables.length > 1 && (
                    <Button
                      onClick={() => removeDeliverable(index)}
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
                onClick={addDeliverable}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Add Deliverable
              </Button>
            </div>

            {newMilestone.paymentPercentage > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-blue-800 text-sm">
                  <strong>Payment Amount:</strong> ${((escrow.totalProjectValue * newMilestone.paymentPercentage) / 100).toLocaleString()}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleCreateMilestone}
                disabled={loading || !newMilestone.milestoneName || newMilestone.paymentPercentage <= 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Creating...' : 'Create Milestone'}
              </Button>
              <Button
                onClick={() => setShowCreateForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Milestones List */}
      <div className="space-y-4">
        {milestones.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-600">No milestones created yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Create milestones to track project progress and automate payments.
            </p>
          </Card>
        ) : (
          milestones.map((milestone) => (
            <Card key={milestone.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {milestone.milestoneName}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    ${milestone.paymentAmount.toLocaleString()} ({milestone.paymentPercentage}% of project)
                  </p>
                  {milestone.dueDate && (
                    <p className="text-sm text-gray-500 mt-1">
                      Due: {new Date(milestone.dueDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <span className={getStatusBadge(milestone.milestoneStatus)}>
                  {milestone.milestoneStatus}
                </span>
              </div>

              {/* Deliverables */}
              {milestone.deliverables.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Deliverables:</h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {milestone.deliverables.map((deliverable, index) => (
                      <li key={index} className="flex items-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                        {deliverable}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {milestone.milestoneStatus === 'COMPLETED' && (
                  <Button
                    onClick={() => handleCompleteMilestone(milestone.id)}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Processing...' : 'Verify & Release Payment'}
                  </Button>
                )}
                
                {milestone.milestoneStatus === 'PAID' && (
                  <div className="flex items-center text-green-600">
                    <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Payment Released
                    {milestone.completedDate && (
                      <span className="ml-2 text-sm text-gray-500">
                        on {new Date(milestone.completedDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}