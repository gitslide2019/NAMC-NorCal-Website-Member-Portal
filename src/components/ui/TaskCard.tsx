'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  User,
  ArrowRight,
  MoreHorizontal,
  Edit,
  Trash2,
  UserPlus,
  MessageSquare,
  Flag
} from 'lucide-react';

interface Task {
  id: string;
  subject: string;
  description: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  type: string;
  dueDate?: string;
  assigneeId: string;
  createdAt: string;
  updatedAt: string;
  assignedBy?: string;
  assignedDate?: string;
  completedBy?: string;
  completionDate?: string;
  completionNotes?: string;
  delegatedFrom?: string;
  delegatedTo?: string;
  delegationDate?: string;
  delegationNotes?: string;
  associations: {
    contacts: any[];
    deals: any[];
    companies: any[];
  };
}

interface TaskCardProps {
  task: Task;
  currentUserId: string;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onComplete?: (taskId: string, notes?: string) => void;
  onDelegate?: (taskId: string) => void;
  onAssign?: (taskId: string) => void;
  compact?: boolean;
}

export function TaskCard({ 
  task, 
  currentUserId, 
  onEdit, 
  onDelete, 
  onComplete, 
  onDelegate, 
  onAssign,
  compact = false 
}: TaskCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'NOT_STARTED':
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'NOT_STARTED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  const isOverdue = () => {
    if (!task.dueDate || task.status === 'COMPLETED') return false;
    return new Date(task.dueDate) < new Date();
  };

  const canComplete = () => {
    return task.status !== 'COMPLETED' && (
      task.assigneeId === currentUserId || 
      task.assignedBy === currentUserId
    );
  };

  const canEdit = () => {
    return task.assigneeId === currentUserId || task.assignedBy === currentUserId;
  };

  const canDelegate = () => {
    return task.status !== 'COMPLETED' && task.assigneeId === currentUserId;
  };

  const handleComplete = async () => {
    if (!onComplete) return;
    
    try {
      await onComplete(task.id, completionNotes);
      setCompleting(false);
      setCompletionNotes('');
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-center space-x-3 flex-1">
          {getStatusIcon(task.status)}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-sm font-medium text-gray-900 truncate">
                {task.subject}
              </h4>
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(task.dueDate)}
              </div>
              
              {task.associations.deals.length > 0 && (
                <div className="flex items-center">
                  <User className="h-3 w-3 mr-1" />
                  Project
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {canComplete() && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => setCompleting(true)}
            >
              <CheckCircle2 className="h-4 w-4" />
            </Button>
          )}
          
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => setShowActions(!showActions)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className={`p-6 ${isOverdue() ? 'border-red-200 bg-red-50' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon(task.status)}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{task.subject}</h3>
            <div className="flex items-center space-x-2 mt-1">
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority}
              </Badge>
              <Badge className={getStatusColor(task.status)}>
                {task.status.replace('_', ' ')}
              </Badge>
              {isOverdue() && (
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  <Flag className="h-3 w-3 mr-1" />
                  Overdue
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowActions(!showActions)}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <div className="mb-4">
          <p className="text-gray-600">{task.description}</p>
        </div>
      )}

      {/* Task Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <Calendar className="h-4 w-4 mr-2" />
            <span className={isOverdue() ? 'text-red-600 font-medium' : ''}>
              {formatDate(task.dueDate)}
            </span>
          </div>
          
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <User className="h-4 w-4 mr-2" />
            <span>Type: {task.type}</span>
          </div>
          
          {task.associations.deals.length > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <User className="h-4 w-4 mr-2" />
              <span>Project Task</span>
            </div>
          )}
        </div>
        
        <div>
          <div className="text-sm text-gray-600 mb-2">
            <span className="font-medium">Created:</span> {new Date(task.createdAt).toLocaleDateString()}
          </div>
          
          {task.assignedBy && (
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-medium">Assigned by:</span> {task.assignedBy}
            </div>
          )}
          
          {task.delegatedFrom && (
            <div className="flex items-center text-sm text-gray-600">
              <ArrowRight className="h-4 w-4 mr-2" />
              <span>Delegated from {task.delegatedFrom}</span>
            </div>
          )}
        </div>
      </div>

      {/* Completion Details */}
      {task.status === 'COMPLETED' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center mb-2">
            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
            <span className="text-sm font-medium text-green-800">
              Completed by {task.completedBy} on {task.completionDate ? new Date(task.completionDate).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
          {task.completionNotes && (
            <p className="text-sm text-green-700">{task.completionNotes}</p>
          )}
        </div>
      )}

      {/* Delegation Details */}
      {task.delegatedTo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center mb-2">
            <ArrowRight className="h-4 w-4 text-blue-500 mr-2" />
            <span className="text-sm font-medium text-blue-800">
              Delegated to {task.delegatedTo} on {task.delegationDate ? new Date(task.delegationDate).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
          {task.delegationNotes && (
            <p className="text-sm text-blue-700">{task.delegationNotes}</p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
          {canComplete() && (
            <Button 
              size="sm" 
              onClick={() => setCompleting(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Complete
            </Button>
          )}
          
          {canEdit() && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onEdit?.(task)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          
          {canDelegate() && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onDelegate?.(task.id)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Delegate
            </Button>
          )}
          
          {onAssign && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onAssign?.(task.id)}
            >
              <User className="h-4 w-4 mr-2" />
              Reassign
            </Button>
          )}
          
          {canEdit() && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onDelete?.(task.id)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      )}

      {/* Completion Modal */}
      {completing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Complete Task
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Completion Notes (Optional)
              </label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any notes about task completion..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCompleting(false);
                  setCompletionNotes('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleComplete}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Task
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}