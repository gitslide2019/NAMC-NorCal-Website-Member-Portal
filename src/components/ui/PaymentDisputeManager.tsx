'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useProjectPayments, PaymentDispute } from '@/hooks/useProjectPayments';

interface PaymentDisputeManagerProps {
  escrowId: string;
  onDisputeUpdate?: (dispute: PaymentDispute) => void;
}

export function PaymentDisputeManager({ 
  escrowId, 
  onDisputeUpdate 
}: PaymentDisputeManagerProps) {
  const { createPaymentDispute, loading, error } = useProjectPayments();
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDispute, setNewDispute] = useState({
    disputeReason: '',
    disputeAmount: 0,
    respondentId: '',
    evidenceProvided: [''],
    supportingDocs: ['']
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Load disputes for this escrow
  useEffect(() => {
    loadDisputes();
  }, [escrowId]);

  const loadDisputes = async () => {
    try {
      // In a real implementation, you would fetch disputes from the API
      // For now, we'll use placeholder data
      setDisputes([]);
    } catch (error) {
      console.error('Error loading disputes:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles([...selectedFiles, ...files]);
    
    // In a real implementation, you would upload files to storage
    const fileUrls = files.map(file => `https://example.com/evidence/${Date.now()}-${file.name}`);
    setNewDispute({
      ...newDispute,
      supportingDocs: [...newDispute.supportingDocs.filter(doc => doc.trim() !== ''), ...fileUrls]
    });
  };

  const handleCreateDispute = async () => {
    if (!newDispute.disputeReason || !newDispute.respondentId || newDispute.disputeAmount <= 0) {
      return;
    }

    const result = await createPaymentDispute({
      escrowId,
      disputeReason: newDispute.disputeReason,
      disputeAmount: newDispute.disputeAmount,
      respondentId: newDispute.respondentId,
      evidenceProvided: newDispute.evidenceProvided.filter(e => e.trim() !== ''),
      supportingDocs: newDispute.supportingDocs.filter(d => d.trim() !== '')
    });

    if (result) {
      setDisputes([...disputes, result]);
      setNewDispute({
        disputeReason: '',
        disputeAmount: 0,
        respondentId: '',
        evidenceProvided: [''],
        supportingDocs: ['']
      });
      setSelectedFiles([]);
      setShowCreateForm(false);
      
      if (onDisputeUpdate) {
        onDisputeUpdate(result);
      }
    }
  };

  const addEvidenceField = () => {
    setNewDispute({
      ...newDispute,
      evidenceProvided: [...newDispute.evidenceProvided, '']
    });
  };

  const updateEvidence = (index: number, value: string) => {
    const updated = [...newDispute.evidenceProvided];
    updated[index] = value;
    setNewDispute({
      ...newDispute,
      evidenceProvided: updated
    });
  };

  const removeEvidence = (index: number) => {
    setNewDispute({
      ...newDispute,
      evidenceProvided: newDispute.evidenceProvided.filter((_, i) => i !== index)
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'text-yellow-600';
      case 'UNDER_REVIEW': return 'text-blue-600';
      case 'MEDIATION': return 'text-purple-600';
      case 'RESOLVED': return 'text-green-600';
      case 'CLOSED': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'SUBMITTED': return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'UNDER_REVIEW': return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'MEDIATION': return `${baseClasses} bg-purple-100 text-purple-800`;
      case 'RESOLVED': return `${baseClasses} bg-green-100 text-green-800`;
      case 'CLOSED': return `${baseClasses} bg-gray-100 text-gray-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getUrgencyLevel = (dispute: PaymentDispute) => {
    const daysSinceSubmission = Math.floor(
      (new Date().getTime() - new Date(dispute.createdAt || '').getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceSubmission > 14) return { level: 'High', color: 'text-red-600' };
    if (daysSinceSubmission > 7) return { level: 'Medium', color: 'text-yellow-600' };
    return { level: 'Low', color: 'text-green-600' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Payment Disputes
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Manage payment disputes and resolution process
            </p>
          </div>
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-red-600 hover:bg-red-700"
          >
            {showCreateForm ? 'Cancel' : 'File Dispute'}
          </Button>
        </div>

        {/* Dispute Statistics */}
        <div className="grid grid-cols-4 gap-4 mt-6 text-sm">
          <div className="text-center">
            <p className="text-gray-600">Total Disputes</p>
            <p className="font-semibold text-lg">{disputes.length}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Active</p>
            <p className="font-semibold text-lg text-yellow-600">
              {disputes.filter(d => ['SUBMITTED', 'UNDER_REVIEW', 'MEDIATION'].includes(d.disputeStatus)).length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Resolved</p>
            <p className="font-semibold text-lg text-green-600">
              {disputes.filter(d => d.disputeStatus === 'RESOLVED').length}
            </p>
          </div>
          <div className="text-center">
            <p className="text-gray-600">Total Amount</p>
            <p className="font-semibold text-lg">
              ${disputes.reduce((sum, d) => sum + d.disputeAmount, 0).toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Create Dispute Form */}
      {showCreateForm && (
        <Card className="p-6">
          <h4 className="font-medium text-gray-900 mb-4">File Payment Dispute</h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dispute Reason
                </label>
                <select
                  value={newDispute.disputeReason}
                  onChange={(e) => setNewDispute({
                    ...newDispute,
                    disputeReason: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select reason...</option>
                  <option value="Work not completed">Work not completed</option>
                  <option value="Quality issues">Quality issues</option>
                  <option value="Incorrect payment amount">Incorrect payment amount</option>
                  <option value="Unauthorized charges">Unauthorized charges</option>
                  <option value="Contract violation">Contract violation</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dispute Amount ($)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newDispute.disputeAmount}
                  onChange={(e) => setNewDispute({
                    ...newDispute,
                    disputeAmount: Number(e.target.value)
                  })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Respondent (Member ID)
              </label>
              <Input
                value={newDispute.respondentId}
                onChange={(e) => setNewDispute({
                  ...newDispute,
                  respondentId: e.target.value
                })}
                placeholder="Enter member ID of the other party"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evidence Description
              </label>
              {newDispute.evidenceProvided.map((evidence, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <textarea
                    value={evidence}
                    onChange={(e) => updateEvidence(index, e.target.value)}
                    placeholder="Describe the evidence supporting your dispute..."
                    rows={2}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {newDispute.evidenceProvided.length > 1 && (
                    <Button
                      onClick={() => removeEvidence(index)}
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
                onClick={addEvidenceField}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                Add Evidence
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supporting Documents
              </label>
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedFiles.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-green-600">
                    {selectedFiles.length} file(s) selected
                  </p>
                  <ul className="text-xs text-gray-500 mt-1">
                    {selectedFiles.map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Filing a dispute will pause related payments until resolution. 
                    Ensure you have sufficient evidence to support your claim.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleCreateDispute}
                disabled={loading || !newDispute.disputeReason || !newDispute.respondentId || newDispute.disputeAmount <= 0}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? 'Filing...' : 'File Dispute'}
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

      {/* Disputes List */}
      <div className="space-y-4">
        {disputes.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-600">No payment disputes filed.</p>
            <p className="text-sm text-gray-500 mt-2">
              Disputes will appear here when filed by project participants.
            </p>
          </Card>
        ) : (
          disputes.map((dispute) => {
            const urgency = getUrgencyLevel(dispute);
            
            return (
              <Card key={dispute.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {dispute.disputeReason}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Amount: ${dispute.disputeAmount.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-gray-500">
                        Filed: {new Date(dispute.createdAt || '').toLocaleDateString()}
                      </span>
                      <span className={`font-medium ${urgency.color}`}>
                        Urgency: {urgency.level}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={getStatusBadge(dispute.disputeStatus)}>
                      {dispute.disputeStatus}
                    </span>
                    {dispute.responseDeadline && (
                      <p className="text-xs text-gray-500 mt-1">
                        Response due: {new Date(dispute.responseDeadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Evidence */}
                {dispute.evidenceProvided && dispute.evidenceProvided.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Evidence:</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {dispute.evidenceProvided.map((evidence, index) => (
                        <li key={index} className="bg-gray-50 p-2 rounded">
                          {evidence}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Supporting Documents */}
                {dispute.supportingDocs && dispute.supportingDocs.length > 0 && (
                  <div className="mb-4">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Supporting Documents:</h5>
                    <div className="flex flex-wrap gap-2">
                      {dispute.supportingDocs.map((doc, index) => (
                        <a
                          key={index}
                          href={doc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200"
                        >
                          Document {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resolution */}
                {dispute.resolution && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <h5 className="text-sm font-medium text-green-800 mb-2">Resolution:</h5>
                    <p className="text-sm text-green-700">{dispute.resolution}</p>
                    {dispute.resolutionAmount && (
                      <p className="text-sm text-green-700 mt-1">
                        <strong>Resolution Amount:</strong> ${dispute.resolutionAmount.toLocaleString()}
                      </p>
                    )}
                    {dispute.resolutionDate && (
                      <p className="text-sm text-green-600 mt-1">
                        Resolved on {new Date(dispute.resolutionDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  {dispute.disputeStatus === 'SUBMITTED' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Request Mediation
                    </Button>
                  )}
                  
                  {dispute.disputeStatus === 'UNDER_REVIEW' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 hover:text-green-700"
                    >
                      Accept Resolution
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-600 hover:text-gray-700"
                  >
                    View Details
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}