import React from 'react';
import { X, Keyboard } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from './Button';
import { KEYBOARD_SHORTCUTS, groupShortcutsByCategory, formatShortcut } from '@/hooks/useKeyboardShortcuts';

// Define the type here since it's not exported
type KeyboardShortcut = {
  id?: string;
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
};

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  shortcuts
}) => {
  if (!isOpen) return null;

  const groupedShortcuts = groupShortcutsByCategory(shortcuts);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Keyboard className="w-6 h-6 mr-2 text-blue-600" />
              Keyboard Shortcuts
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="p-2"
              aria-label="Close shortcuts help"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="mt-2 text-gray-600">
            Use these keyboard shortcuts to navigate and work more efficiently
          </p>
        </div>

        {/* Shortcuts List */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="grid gap-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category}>
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                  {category}
                </h3>
                <div className="grid gap-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {shortcut.description}
                        </p>
                      </div>
                      <div className="ml-4">
                        <ShortcutKeys shortcut={shortcut} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">?</kbd> to toggle this dialog
            </p>
            <Button onClick={onClose}>
              Got it
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const ShortcutKeys: React.FC<{ shortcut: KeyboardShortcut }> = ({ shortcut }) => {
  const keys = [];
  
  if (shortcut.ctrlKey) keys.push('Ctrl');
  if (shortcut.shiftKey) keys.push('Shift');
  if (shortcut.altKey) keys.push('Alt');
  if (shortcut.metaKey) keys.push('Cmd');
  
  if (shortcut.key) {
    const key = shortcut.key === ' ' ? 'Space' : shortcut.key;
    keys.push(key.charAt(0).toUpperCase() + key.slice(1));
  }

  return (
    <div className="flex items-center space-x-1">
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          {index > 0 && <span className="text-gray-400 text-xs">+</span>}
          <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono text-gray-800 shadow-sm">
            {key}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  );
};

export default KeyboardShortcutsHelp;