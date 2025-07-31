import React, { useState } from 'react';
import { 
  CheckSquare, 
  Square, 
  Trash2, 
  Users, 
  Calendar, 
  Tag, 
  MoreHorizontal,
  X,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import ConfirmDialog from './ConfirmDialog';

interface BulkActionsProps {
  selectedItems: string[];
  totalItems: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkDelete: (itemIds: string[]) => void;
  onBulkAssign: (itemIds: string[], assigneeId: string) => void;
  onBulkUpdateStatus: (itemIds: string[], status: string) => void;
  onBulkUpdatePriority: (itemIds: string[], priority: string) => void;
  onBulkUpdateDueDate: (itemIds: string[], dueDate: string) => void;
  isLoading?: boolean;
  itemType?: 'tasks' | 'projects';
}

const BulkActions: React.FC<BulkActionsProps> = ({
  selectedItems,
  totalItems,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkAssign,
  onBulkUpdateStatus,
  onBulkUpdatePriority,
  onBulkUpdateDueDate,
  isLoading = false,
  itemType = 'tasks'
}) => {
  const [showActions, setShowActions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const selectedCount = selectedItems.length;
  const allSelected = selectedCount === totalItems && totalItems > 0;
  const someSelected = selectedCount > 0 && !allSelected;

  const handleSelectToggle = () => {
    if (allSelected || someSelected) {
      onDeselectAll();
    } else {
      onSelectAll();
    }
  };

  const handleBulkAction = async (action: string, ...args: any[]) => {
    setActionLoading(action);
    try {
      switch (action) {
        case 'delete':
          await onBulkDelete(selectedItems);
          break;
        case 'assign':
          await onBulkAssign(selectedItems, args[0]);
          break;
        case 'status':
          await onBulkUpdateStatus(selectedItems, args[0]);
          break;
        case 'priority':
          await onBulkUpdatePriority(selectedItems, args[0]);
          break;
        case 'dueDate':
          await onBulkUpdateDueDate(selectedItems, args[0]);
          break;
      }
      setShowActions(false);
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 bg-white rounded-lg shadow-lg border border-gray-200 p-4"
        >
          <div className="flex items-center space-x-4">
            {/* Selection Indicator */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSelectToggle}
                className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
                disabled={isLoading}
              >
                {allSelected ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : someSelected ? (
                  <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded"></div>
                  </div>
                ) : (
                  <Square className="w-5 h-5" />
                )}
                <span className="font-medium">
                  {selectedCount} {itemType} selected
                </span>
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActions(!showActions)}
                className="flex items-center space-x-1"
                disabled={isLoading}
              >
                <MoreHorizontal className="w-4 h-4" />
                <span>Actions</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onDeselectAll}
                className="p-2"
                disabled={isLoading}
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Expanded Actions */}
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className="grid grid-cols-2 gap-2">
                  {/* Status Updates */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      Status
                    </label>
                    <div className="space-y-1">
                      {['not_started', 'in_progress', 'completed', 'on_hold'].map((status) => (
                        <Button
                          key={status}
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkAction('status', status)}
                          disabled={actionLoading === 'status'}
                          className="w-full text-left justify-start text-xs"
                        >
                          {status.replace('_', ' ').toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Priority Updates */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                      Priority
                    </label>
                    <div className="space-y-1">
                      {['low', 'medium', 'high', 'critical'].map((priority) => (
                        <Button
                          key={priority}
                          variant="outline"
                          size="sm"
                          onClick={() => handleBulkAction('priority', priority)}
                          disabled={actionLoading === 'priority'}
                          className="w-full text-left justify-start text-xs"
                        >
                          <Tag className="w-3 h-3 mr-2" />
                          {priority.toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Additional Actions */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAssignModal(true)}
                      disabled={actionLoading === 'assign'}
                      className="flex items-center space-x-1 text-xs"
                    >
                      <Users className="w-3 h-3" />
                      <span>Assign</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const dueDate = prompt('Enter due date (YYYY-MM-DD):');
                        if (dueDate) handleBulkAction('dueDate', dueDate);
                      }}
                      disabled={actionLoading === 'dueDate'}
                      className="flex items-center space-x-1 text-xs"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>Due Date</span>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowActions(false)}
                      className="text-xs"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          handleBulkAction('delete');
          setShowDeleteConfirm(false);
        }}
        title="Delete Selected Items"
        message={`Are you sure you want to delete ${selectedCount} ${itemType}? This action cannot be undone.`}
        type="danger"
        confirmText="Delete"
        isLoading={actionLoading === 'delete'}
      />

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Assign {itemType}</h3>
            <p className="text-gray-600 mb-4">
              Assign {selectedCount} selected {itemType} to:
            </p>
            
            <div className="space-y-2 mb-6">
              {/* Mock assignees - replace with actual data */}
              {[
                { id: 'user1', name: 'Jane Smith', role: 'Project Manager' },
                { id: 'user2', name: 'Bob Johnson', role: 'Developer' },
                { id: 'user3', name: 'Alice Brown', role: 'Designer' }
              ].map((user) => (
                <Button
                  key={user.id}
                  variant="outline"
                  onClick={() => {
                    handleBulkAction('assign', user.id);
                    setShowAssignModal(false);
                  }}
                  disabled={actionLoading === 'assign'}
                  className="w-full text-left justify-start"
                >
                  <Users className="w-4 h-4 mr-2" />
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.role}</div>
                  </div>
                </Button>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowAssignModal(false)}
                disabled={actionLoading === 'assign'}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BulkActions;