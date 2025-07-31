import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import Button from './Button';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  variant?: 'button' | 'dropdown';
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  showLabel = false,
  variant = 'button',
  className = ''
}) => {
  const { theme, actualTheme, setTheme, toggleTheme } = useTheme();

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor }
  ];

  const currentOption = themeOptions.find(option => option.value === theme);
  const IconComponent = currentOption?.icon || Sun;

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }[size];

  if (variant === 'dropdown') {
    return (
      <div className={`relative ${className}`}>
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {themeOptions.map((option) => {
            const OptionIcon = option.icon;
            const isActive = theme === option.value;
            
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value as any)}
                className={`relative flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
                }`}
                title={`Switch to ${option.label.toLowerCase()} theme`}
              >
                <OptionIcon className={iconSize} />
                {showLabel && <span>{option.label}</span>}
                {isActive && (
                  <motion.div
                    layoutId="theme-indicator"
                    className="absolute inset-0 bg-white dark:bg-gray-700 rounded-md"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={toggleTheme}
      className={`relative ${className}`}
      title={`Current theme: ${currentOption?.label}. Click to switch to next theme.`}
      aria-label={`Switch theme. Current: ${currentOption?.label}`}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex items-center space-x-2"
      >
        <IconComponent className={iconSize} />
        {showLabel && (
          <span className="text-sm font-medium">
            {currentOption?.label}
          </span>
        )}
      </motion.div>
      
      {/* Theme indicator */}
      <div className="absolute -top-1 -right-1">
        <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
          actualTheme === 'dark' 
            ? 'bg-indigo-600' 
            : 'bg-amber-500'
        }`} />
      </div>
    </Button>
  );
};

export default ThemeToggle;