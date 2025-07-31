import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  preventDefault?: boolean;
}

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
  preventDefault = true
}: UseKeyboardShortcutsOptions) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when user is typing in inputs, textareas, or contenteditable elements
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true' ||
      target.closest('[contenteditable="true"]')
    ) {
      return;
    }

    const matchingShortcut = shortcuts.find(shortcut => {
      const keyMatches = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatches = (shortcut.ctrlKey || false) === event.ctrlKey;
      const shiftMatches = (shortcut.shiftKey || false) === event.shiftKey;
      const altMatches = (shortcut.altKey || false) === event.altKey;
      const metaMatches = (shortcut.metaKey || false) === event.metaKey;

      return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
    });

    if (matchingShortcut) {
      if (preventDefault) {
        event.preventDefault();
        event.stopPropagation();
      }
      matchingShortcut.action();
    }
  }, [shortcuts, enabled, preventDefault]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
};

// Common keyboard shortcut combinations
export const KEYBOARD_SHORTCUTS = {
  // Navigation
  NEW_PROJECT: { key: 'n', ctrlKey: true, description: 'Create new project', category: 'Navigation' },
  NEW_TASK: { key: 't', ctrlKey: true, description: 'Create new task', category: 'Navigation' },
  SEARCH: { key: 'k', ctrlKey: true, description: 'Search projects/tasks', category: 'Navigation' },
  NOTIFICATIONS: { key: 'i', ctrlKey: true, description: 'Toggle notifications', category: 'Navigation' },
  
  // Views
  PROJECTS_VIEW: { key: 'p', ctrlKey: true, description: 'Switch to projects view', category: 'Views' },
  TASKS_VIEW: { key: 'y', ctrlKey: true, description: 'Switch to tasks view', category: 'Views' },
  
  // Actions
  SAVE: { key: 's', ctrlKey: true, description: 'Save current form', category: 'Actions' },
  REFRESH: { key: 'r', ctrlKey: true, description: 'Refresh current view', category: 'Actions' },
  HELP: { key: '?', description: 'Show keyboard shortcuts help', category: 'Help' },
  
  // Task Management
  MARK_COMPLETE: { key: 'Enter', ctrlKey: true, description: 'Mark selected task as complete', category: 'Tasks' },
  ASSIGN_TASK: { key: 'a', ctrlKey: true, description: 'Assign selected task', category: 'Tasks' },
  
  // Bulk Operations
  SELECT_ALL: { key: 'a', ctrlKey: true, shiftKey: true, description: 'Select all items', category: 'Bulk' },
  BULK_DELETE: { key: 'Delete', ctrlKey: true, description: 'Delete selected items', category: 'Bulk' },
  
  // Modal Controls
  CLOSE_MODAL: { key: 'Escape', description: 'Close current modal/dialog', category: 'Modal' },
  CONFIRM_ACTION: { key: 'Enter', description: 'Confirm current action', category: 'Modal' },
};

// Helper to format shortcut for display
export const formatShortcut = (shortcut: Partial<KeyboardShortcut>): string => {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) parts.push('Ctrl');
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.altKey) parts.push('Alt');
  if (shortcut.metaKey) parts.push('Cmd');
  
  if (shortcut.key) {
    const key = shortcut.key === ' ' ? 'Space' : shortcut.key;
    parts.push(key.charAt(0).toUpperCase() + key.slice(1));
  }
  
  return parts.join(' + ');
};

// Group shortcuts by category
export const groupShortcutsByCategory = (shortcuts: KeyboardShortcut[]) => {
  return shortcuts.reduce((groups, shortcut) => {
    const category = shortcut.category || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    return groups;
  }, {} as Record<string, KeyboardShortcut[]>);
};

export default useKeyboardShortcuts;