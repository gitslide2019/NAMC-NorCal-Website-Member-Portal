'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface CancellationPolicy {
  allowCancellation: boolean;
  cancellationDeadlineHours: number;
  refundPolicy: 'FULL' | 'PARTIAL' | 'NO_REFUND';
  partialRefundPercentage?: number;
}

interface BookingPolicyManagerProps {
  contractorId?: string;
  onPolicyUpdate?: (policy: CancellationPolicy) => void;
}

export function BookingPolicyManager({ contractorId, onPolicyUpdate }: BookingPolicyManagerProps) {
  const [policy, setPolicy] = useState<CancellationPolicy>({
    allowCancellation: true,
    cancellationDeadlineHours: 24,
    refundPolicy: 'PARTIAL',
    partialRefundPercentage: 50
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchCurrentPolicy = async () => {
      try {
        const response = await fetch('/api/scheduling/contractor-schedule');
        if (response.ok) {
          const schedule = await response.json();
          if (schedule.cancellationPolicy) {
            setPolicy(schedule.cancellationPolicy);
          }
        }
      } catch (err) {
        console.error('Error fetching current policy:', err);
      }
    };

    fetchCurrentPolicy();
  }, []);

  const handlePolicyChange = (field: keyof CancellationPolicy, value: any) => {
    setPolicy(prev => ({
      ...prev,
      [field]: value
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/scheduling/contractor-schedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancellationPolicy: policy
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update policy');
      }

      setSaved(true);
      onPolicyUpdate?.(policy);
      
      // Clear saved status after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking & Cancellation Policy</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          Policy updated successfully!
        </div>
      )}

      <div className="space-y-6">
        {/* Allow Cancellation */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={policy.allowCancellation}
              onChange={(e) => handlePolicyChange('allowCancellation', e.target.checked)}
              className="mr-2"
            />
            <span className="font-medium">Allow appointment cancellations</span>
          </label>
          <p className="text-sm text-gray-600 mt-1">
            When disabled, clients cannot cancel their appointments
          </p>
        </div>

        {policy.allowCancellation && (
          <>
            {/* Cancellation Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Deadline (hours before appointment)
              </label>
              <Input
                type="number"
                value={policy.cancellationDeadlineHours}
                onChange={(e) => handlePolicyChange('cancellationDeadlineHours', parseInt(e.target.value) || 0)}
                min="1"
                max="168"
                className="w-32"
              />
              <p className="text-sm text-gray-600 mt-1">
                Clients must cancel at least this many hours before their appointment
              </p>
            </div>

            {/* Refund Policy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Refund Policy
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="FULL"
                    checked={policy.refundPolicy === 'FULL'}
                    onChange={(e) => handlePolicyChange('refundPolicy', e.target.value)}
                    className="mr-2"
                  />
                  <span>Full Refund</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="PARTIAL"
                    checked={policy.refundPolicy === 'PARTIAL'}
                    onChange={(e) => handlePolicyChange('refundPolicy', e.target.value)}
                    className="mr-2"
                  />
                  <span>Partial Refund</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="NO_REFUND"
                    checked={policy.refundPolicy === 'NO_REFUND'}
                    onChange={(e) => handlePolicyChange('refundPolicy', e.target.value)}
                    className="mr-2"
                  />
                  <span>No Refund</span>
                </label>
              </div>
            </div>

            {/* Partial Refund Percentage */}
            {policy.refundPolicy === 'PARTIAL' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partial Refund Percentage
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={policy.partialRefundPercentage || 50}
                    onChange={(e) => handlePolicyChange('partialRefundPercentage', parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    className="w-24"
                  />
                  <span>%</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Percentage of deposit to refund when cancelled within the deadline
                </p>
              </div>
            )}
          </>
        )}

        {/* Policy Preview */}
        <div className="bg-gray-50 p-4 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">Policy Preview</h4>
          <div className="text-sm text-gray-700 space-y-1">
            {policy.allowCancellation ? (
              <>
                <p>• Cancellations are allowed up to {policy.cancellationDeadlineHours} hours before the appointment</p>
                {policy.refundPolicy === 'FULL' && (
                  <p>• Full refund will be provided for timely cancellations</p>
                )}
                {policy.refundPolicy === 'PARTIAL' && (
                  <p>• {policy.partialRefundPercentage}% refund will be provided for timely cancellations</p>
                )}
                {policy.refundPolicy === 'NO_REFUND' && (
                  <p>• No refund will be provided for cancellations</p>
                )}
                <p>• Cancellations made after the deadline will not receive any refund</p>
              </>
            ) : (
              <p>• Appointment cancellations are not allowed</p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={loading}
            className="px-6"
          >
            {loading ? 'Saving...' : 'Save Policy'}
          </Button>
        </div>
      </div>
    </Card>
  );
}