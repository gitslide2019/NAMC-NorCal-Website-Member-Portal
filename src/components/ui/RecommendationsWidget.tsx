'use client';

import React, { useState } from 'react';
import { 
  Lightbulb, 
  ArrowRight, 
  X, 
  RefreshCw,
  TrendingUp,
  BookOpen,
  Wrench,
  Users,
  ShoppingBag,
  Target
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCrossFeatureIntegration, CrossFeatureRecommendation } from '@/hooks/useCrossFeatureIntegration';
import Link from 'next/link';

interface RecommendationsWidgetProps {
  maxRecommendations?: number;
  showHeader?: boolean;
  compact?: boolean;
  className?: string;
}

export function RecommendationsWidget({ 
  maxRecommendations = 5, 
  showHeader = true,
  compact = false,
  className = ''
}: RecommendationsWidgetProps) {
  const {
    recommendations,
    isLoading,
    error,
    fetchRecommendations,
    trackRecommendationClick
  } = useCrossFeatureIntegration();

  const [dismissedRecommendations, setDismissedRecommendations] = useState<Set<string>>(new Set());

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'tool':
        return <Wrench className="h-4 w-4" />;
      case 'course':
        return <BookOpen className="h-4 w-4" />;
      case 'project':
        return <Target className="h-4 w-4" />;
      case 'product':
        return <ShoppingBag className="h-4 w-4" />;
      case 'mentor':
      case 'committee':
        return <Users className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const handleRecommendationClick = async (recommendation: CrossFeatureRecommendation, index: number) => {
    await trackRecommendationClick(recommendation.type, `${recommendation.type}-${index}`);
  };

  const handleDismissRecommendation = (index: number) => {
    setDismissedRecommendations(prev => new Set([...prev, index.toString()]));
  };

  const handleRefresh = () => {
    fetchRecommendations();
    setDismissedRecommendations(new Set());
  };

  const visibleRecommendations = recommendations
    .filter((_, index) => !dismissedRecommendations.has(index.toString()))
    .slice(0, maxRecommendations);

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading recommendations...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center py-4">
          <p className="text-red-600 mb-2">Failed to load recommendations</p>
          <Button onClick={handleRefresh} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  if (visibleRecommendations.length === 0) {
    return (
      <Card className={`p-4 ${className}`}>
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-900">Recommendations</h3>
            </div>
            <Button onClick={handleRefresh} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="text-center py-8">
          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">You're all caught up!</h4>
          <p className="text-gray-600">
            Keep using the platform and we'll suggest new opportunities for you.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      {showHeader && (
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              Recommendations
            </h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {visibleRecommendations.length}
            </span>
          </div>
          <Button onClick={handleRefresh} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className={compact ? 'p-2' : 'p-4'}>
        <div className="space-y-3">
          {visibleRecommendations.map((recommendation, index) => (
            <div
              key={index}
              className={`border-l-4 rounded-lg p-3 ${getPriorityColor(recommendation.priority)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    {getRecommendationIcon(recommendation.type)}
                    <h4 className="font-medium text-gray-900 text-sm">
                      {recommendation.title}
                    </h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      recommendation.priority === 'high' 
                        ? 'bg-red-100 text-red-800'
                        : recommendation.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {recommendation.priority}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-2">
                    {recommendation.description}
                  </p>
                  
                  <p className="text-xs text-gray-500 mb-3">
                    {recommendation.reason}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <Link 
                      href={recommendation.actionUrl}
                      onClick={() => handleRecommendationClick(recommendation, index)}
                    >
                      <Button size="sm" className="text-xs">
                        Take Action
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </Link>
                    
                    <span className="text-xs text-gray-400">
                      from {recommendation.featureSource}
                    </span>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleDismissRecommendation(index)}
                  size="sm"
                  variant="outline"
                  className="ml-2 h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {recommendations.length > maxRecommendations && (
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-500">
              Showing {maxRecommendations} of {recommendations.length} recommendations
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// Compact version for sidebars
export function CompactRecommendationsWidget(props: Omit<RecommendationsWidgetProps, 'compact'>) {
  return <RecommendationsWidget {...props} compact={true} maxRecommendations={3} />;
}

// High priority only version
export function HighPriorityRecommendationsWidget(props: RecommendationsWidgetProps) {
  const { recommendations } = useCrossFeatureIntegration();
  const highPriorityCount = recommendations.filter(r => r.priority === 'high').length;
  
  if (highPriorityCount === 0) {
    return null;
  }
  
  return (
    <div className="mb-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-2">
          <div className="bg-red-500 rounded-full p-1">
            <Lightbulb className="h-4 w-4 text-white" />
          </div>
          <h4 className="font-medium text-red-900">High Priority Actions</h4>
        </div>
        <p className="text-sm text-red-700 mb-3">
          You have {highPriorityCount} high-priority recommendations that could significantly impact your success.
        </p>
        <RecommendationsWidget 
          {...props} 
          maxRecommendations={highPriorityCount}
          showHeader={false}
          className="bg-white"
        />
      </div>
    </div>
  );
}