'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useProjectPayments, TaskPayment } from '@/hooks/useProjectPayments';

interface TaskPaymentVerificationProps {
  taskPayment: TaskPayment;
  onVerificationComplete?: (taskPayment: TaskPayment) => void;
}

export function TaskPaymentVerification({ 
  taskPayment, 
  onVerificationComplete 
}: TaskPaymentVerificationProps) {
  const { verifyTaskCompletion, approveTaskPayment, loading, error } = useProjectPayments();
  const [qualityScore, setQualityScore] = useState<number>(8);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [photosSubmitted, setPhotosSubmitted] = useState<string[]>([]);
  const [photoUpload, setPhotoUpload] = useState<File | null>(null);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhotoUpload(file);
    
    // In a real implementation, you would upload the file to a storage service
    // For now, we'll simulate with a placeholder URL
    const photoUrl = `https://example.com/photos/${Date.now()}-${file.name}`;
    setPhotosSubmitted([...photosSubmitted, photoUrl]);
  };

  const handleVerifyCompletion = async () => {
    const result = await verifyTaskCompletion(
      taskPayment.id,
      qualityScore,
      photosSubmitted.length > 0 ? photosSubmitted : undefined,
      verificationNotes || undefined
    );

    if (result && onVerificationComplete) {
      onVerificationComplete(result);
    }
  };

  const handleApprovePayment = async () => {
    const result = await approveTaskPayment(taskPayment.id);
    
    if (result && onVerificationComplete) {
      onVerificationComplete(result);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'text-yellow-600';
      case 'VERIFIED': return 'text-blue-600';
      case 'APPROVED': return 'text-green-600';
      case 'PAID': return 'text-green-800';
      case 'DISPUTED': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case 'PENDING': return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'VERIFIED': return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'APPROVED': return `${baseClasses} bg-green-100 text-green-800`;
      case 'PAID': return `${baseClasses} bg-green-200 text-green-900`;
      case 'DISPUTED': return `${baseClasses} bg-red-100 text-red-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Task Payment Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {taskPayment.taskName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Payment Amount: ${taskPayment.paymentAmount.toLocaleString()}
            </p>
          </div>
          <span className={getStatusBadge(taskPayment.paymentStatus)}>
            {taskPayment.paymentStatus}
          </span>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Verification Section */}
        {taskPayment.paymentStatus === 'PENDING' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Task Completion Verification</h4>
            
            {/* Quality Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quality Score (1-10)
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={qualityScore}
                onChange={(e) => setQualityScore(Number(e.target.value))}
                className="w-32"
              />
            </div>

            {/* Photo Upload */}
            {taskPayment.photosRequired && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required Photos
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {photosSubmitted.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-green-600">
                      {photosSubmitted.length} photo(s) uploaded
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Verification Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Notes
              </label>
              <textarea
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any notes about task completion..."
              />
            </div>

            <Button
              onClick={handleVerifyCompletion}
              disabled={loading || (taskPayment.photosRequired && photosSubmitted.length === 0)}
              className="w-full"
            >
              {loading ? 'Verifying...' : 'Verify Task Completion'}
            </Button>
          </div>
        )}

        {/* Approval Section */}
        {taskPayment.paymentStatus === 'VERIFIED' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Payment Approval</h4>
            
            {taskPayment.qualityScore && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-blue-800 text-sm">
                  <strong>Quality Score:</strong> {taskPayment.qualityScore}/10
                </p>
                {taskPayment.verificationNotes && (
                  <p className="text-blue-800 text-sm mt-2">
                    <strong>Notes:</strong> {taskPayment.verificationNotes}
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={handleApprovePayment}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Processing...' : 'Approve Payment'}
            </Button>
          </div>
        )}

        {/* Payment Status */}
        {(taskPayment.paymentStatus === 'APPROVED' || taskPayment.paymentStatus === 'PAID') && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  {taskPayment.paymentStatus === 'PAID' ? 'Payment Completed' : 'Payment Approved'}
                </p>
                {taskPayment.paidDate && (
                  <p className="text-sm text-green-700 mt-1">
                    Paid on {new Date(taskPayment.paidDate).toLocaleDateString()}
                  </p>
                )}
                {taskPayment.approvedDate && taskPayment.paymentStatus === 'APPROVED' && (
                  <p className="text-sm text-green-700 mt-1">
                    Approved on {new Date(taskPayment.approvedDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Payment Details */}
        <div className="border-t pt-4">
          <h5 className="font-medium text-gray-900 mb-3">Payment Details</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Task ID:</span>
              <span className="ml-2 font-medium">{taskPayment.taskId}</span>
            </div>
            <div>
              <span className="text-gray-600">Amount:</span>
              <span className="ml-2 font-medium">${taskPayment.paymentAmount.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-600">Photos Required:</span>
              <span className="ml-2 font-medium">{taskPayment.photosRequired ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <span className={`ml-2 font-medium ${getStatusColor(taskPayment.paymentStatus)}`}>
                {taskPayment.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}