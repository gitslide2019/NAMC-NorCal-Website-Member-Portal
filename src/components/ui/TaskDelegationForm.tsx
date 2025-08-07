'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { 
  X, 
  User, 
  ArrowRight,
  MessageSquare
} from 'lucide-react';

interface TaskDelegationFormProps {
  taskId: string;
  taskSubject: string;
  currentAssignee: string;
  onSubmit: (data: {
    taskId: string;
    toMemberId: string;
    delegationNotes?: string;
  }) => Promise<void>;
  onCancel: () => void;
  members?: Array<{ id: string; name: string; email: string }>;
}

export function TaskDelegationForm({ 
  taskId,
  taskSubject,
  currentAssignee,
  onSubmit, 
  onCancel,
  members = []
}: TaskDelegationFormProps) {
  const [formData, setFormData] = useState({
    toMemberId: '',
    delegationNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.toMemberId) {
      newErrors.toMemberId = 'Please select a member to delegate to';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      await onSubmit({
        taskId,
        toMemberId: formData.toMemberId,
        delegationNotes: formData.delegationNotes || undefined
      });
    } catch (error) {
      console.error('Error delegating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const selectedMember = members.find(m => m.id === formData.toMemberId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Delegate Task</h2>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Task Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Task to Delegate</h3>
            <p className="text-gray-700">{taskSubject}</p>
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <User className="h-4 w-4 mr-1" />
              <span>Currently assigned to: {currentAssignee}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Delegate To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                Delegate To *
              </label>
              <select
                value={formData.toMemberId}
                onChange={(e) => handleInputChange('toMemberId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                  errors.toMemberId ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select a member...</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
              {errors.toMemberId && (
                <p className="mt-1 text-sm text-red-600">{errors.toMemberId}</p>
              )}
            </div>

            {/* Delegation Preview */}
            {selectedMember && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center space-x-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{currentAssignee}</div>
                    <div className="text-gray-600">Current Assignee</div>
                  </div>
                  
                  <ArrowRight className="h-5 w-5 text-blue-500" />
                  
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{selectedMember.name}</div>
                    <div className="text-gray-600">New Assignee</div>
                  </div>
                </div>
              </div>
            )}

            {/* Delegation Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="inline h-4 w-4 mr-1" />
                Delegation Notes
              </label>
              <textarea
                value={formData.delegationNotes}
                onChange={(e) => handleInputChange('delegationNotes', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any context or instructions for the new assignee..."
              />
              <p className="mt-1 text-xs text-gray-500">
                These notes will be visible to the new assignee and will help them understand the context of the delegation.
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !formData.toMemberId}>
                {loading ? 'Delegating...' : 'Delegate Task'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}