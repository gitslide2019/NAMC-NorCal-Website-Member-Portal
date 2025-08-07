'use client';

import React from 'react';
import { Calendar, MapPin, Wrench, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Tool {
  id: string;
  name: string;
  category: string;
  description?: string;
  dailyRate: number;
  condition: string;
  location?: string;
  isAvailable: boolean;
  requiresTraining: boolean;
  imageUrl?: string;
  activeReservations: number;
  upcomingMaintenance: number;
  nextAvailableDate?: string;
  maintenanceScheduled?: string;
}

interface ToolCardProps {
  tool: Tool;
  onSelect?: (tool: Tool) => void;
  onReserve?: (tool: Tool) => void;
  compact?: boolean;
  showActions?: boolean;
}

const CONDITION_CONFIG = {
  EXCELLENT: {
    label: 'Excellent',
    color: 'text-green-600 bg-green-50 border-green-200',
    icon: CheckCircle
  },
  GOOD: {
    label: 'Good',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    icon: CheckCircle
  },
  FAIR: {
    label: 'Fair',
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    icon: AlertTriangle
  },
  NEEDS_REPAIR: {
    label: 'Needs Repair',
    color: 'text-red-600 bg-red-50 border-red-200',
    icon: AlertTriangle
  }
};

const CATEGORY_LABELS = {
  power_tools: 'Power Tools',
  hand_tools: 'Hand Tools',
  heavy_equipment: 'Heavy Equipment',
  safety_equipment: 'Safety Equipment',
  measuring_tools: 'Measuring Tools'
};

export function ToolCard({
  tool,
  onSelect,
  onReserve,
  compact = false,
  showActions = true
}: ToolCardProps) {
  const conditionConfig = CONDITION_CONFIG[tool.condition as keyof typeof CONDITION_CONFIG];
  const ConditionIcon = conditionConfig?.icon || AlertTriangle;
  
  const isUnavailable = !tool.isAvailable || tool.upcomingMaintenance > 0;
  const hasActiveReservations = tool.activeReservations > 0;

  const getAvailabilityStatus = () => {
    if (!tool.isAvailable) {
      return { text: 'Unavailable', color: 'text-red-600' };
    }
    if (tool.upcomingMaintenance > 0) {
      return { text: 'Maintenance Scheduled', color: 'text-orange-600' };
    }
    if (hasActiveReservations) {
      return { 
        text: tool.nextAvailableDate 
          ? `Available ${new Date(tool.nextAvailableDate).toLocaleDateString()}`
          : 'Currently Reserved',
        color: 'text-yellow-600'
      };
    }
    return { text: 'Available Now', color: 'text-green-600' };
  };

  const availabilityStatus = getAvailabilityStatus();

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(tool);
    }
  };

  const handleReserveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onReserve && !isUnavailable) {
      onReserve(tool);
    }
  };

  return (
    <Card 
      className={`group transition-all duration-200 hover:shadow-lg ${
        onSelect ? 'cursor-pointer hover:border-yellow-300' : ''
      } ${isUnavailable ? 'opacity-75' : ''}`}
      onClick={handleCardClick}
    >
      {/* Tool Image */}
      <div className="relative">
        {tool.imageUrl ? (
          <img
            src={tool.imageUrl}
            alt={tool.name}
            className={`w-full object-cover rounded-t-lg ${compact ? 'h-32' : 'h-48'}`}
          />
        ) : (
          <div className={`w-full bg-gray-100 rounded-t-lg flex items-center justify-center ${compact ? 'h-32' : 'h-48'}`}>
            <Wrench className="h-12 w-12 text-gray-400" />
          </div>
        )}
        
        {/* Availability Badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
          tool.isAvailable && !hasActiveReservations && tool.upcomingMaintenance === 0
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}>
          {tool.isAvailable && !hasActiveReservations && tool.upcomingMaintenance === 0 ? 'Available' : 'Unavailable'}
        </div>

        {/* Training Required Badge */}
        {tool.requiresTraining && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            Training Required
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Tool Name and Category */}
        <div>
          <h3 className="font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">
            {tool.name}
          </h3>
          <p className="text-sm text-gray-600">
            {CATEGORY_LABELS[tool.category as keyof typeof CATEGORY_LABELS] || tool.category}
          </p>
        </div>

        {/* Description */}
        {tool.description && !compact && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {tool.description}
          </p>
        )}

        {/* Tool Details */}
        <div className="space-y-2">
          {/* Daily Rate */}
          <div className="flex items-center text-sm">
            <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
            <span className="font-medium text-gray-900">${tool.dailyRate}/day</span>
          </div>

          {/* Condition */}
          <div className="flex items-center text-sm">
            <ConditionIcon className="h-4 w-4 text-gray-400 mr-2" />
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${conditionConfig?.color || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
              {conditionConfig?.label || tool.condition}
            </span>
          </div>

          {/* Location */}
          {tool.location && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-gray-400 mr-2" />
              <span>{tool.location}</span>
            </div>
          )}

          {/* Availability Status */}
          <div className="flex items-center text-sm">
            <Clock className="h-4 w-4 text-gray-400 mr-2" />
            <span className={availabilityStatus.color}>
              {availabilityStatus.text}
            </span>
          </div>
        </div>

        {/* Active Reservations Info */}
        {hasActiveReservations && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
            <p className="text-xs text-yellow-800">
              {tool.activeReservations} active reservation{tool.activeReservations !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Maintenance Info */}
        {tool.upcomingMaintenance > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
            <p className="text-xs text-orange-800">
              Maintenance scheduled
              {tool.maintenanceScheduled && (
                <span className="block">
                  {new Date(tool.maintenanceScheduled).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Actions */}
        {showActions && (
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCardClick}
              className="flex-1"
            >
              <Calendar className="h-4 w-4 mr-1" />
              View Calendar
            </Button>
            
            <Button
              size="sm"
              onClick={handleReserveClick}
              disabled={isUnavailable}
              className="flex-1"
            >
              Reserve
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}