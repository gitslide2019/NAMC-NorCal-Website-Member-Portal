'use client';

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  Award,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useCrossFeatureIntegration } from '@/hooks/useCrossFeatureIntegration';

interface EngagementScoreWidgetProps {
  showDetails?: boolean;
  className?: string;
}

export function EngagementScoreWidget({ 
  showDetails = true,
  className = ''
}: EngagementScoreWidgetProps) {
  const {
    engagementScore,
    isLoading,
    error,
    fetchEngagementScore,
    getEngagementLevel
  } = useCrossFeatureIntegration();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getEngagementIcon = (level: string) => {
    switch (level) {
      case 'high':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'medium':
        return <Minus className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const getEngagementMessage = (level: string, score: number) => {
    switch (level) {
      case 'high':
        return `Excellent! You're highly engaged with a score of ${score}`;
      case 'medium':
        return `Good progress! Your engagement score is ${score}`;
      case 'low':
        return `Let's boost your engagement! Current score: ${score}`;
      default:
        return 'Loading engagement data...';
    }
  };

  if (isLoading) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading engagement score...</span>
        </div>
      </Card>
    );
  }

  if (error || !engagementScore) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center py-4">
          <p className="text-red-600 mb-2">Failed to load engagement score</p>
          <Button onClick={fetchEngagementScore} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  const engagementLevel = getEngagementLevel();

  return (
    <Card className={className}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Engagement Score</h3>
          </div>
          <Button onClick={fetchEngagementScore} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Score Display */}
        <div className="text-center mb-6">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getScoreBackground(engagementScore.overallScore)} mb-3`}>
            <span className={`text-2xl font-bold ${getScoreColor(engagementScore.overallScore)}`}>
              {engagementScore.overallScore}
            </span>
          </div>
          
          <div className="flex items-center justify-center space-x-2 mb-2">
            {getEngagementIcon(engagementLevel)}
            <span className="font-medium text-gray-900 capitalize">
              {engagementLevel} Engagement
            </span>
          </div>
          
          <p className="text-sm text-gray-600">
            {getEngagementMessage(engagementLevel, engagementScore.overallScore)}
          </p>
        </div>

        {/* Feature Breakdown */}
        {showDetails && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 mb-3">Feature Activity</h4>
            
            {Object.entries(engagementScore.featureScores).map(([feature, score]) => (
              <div key={feature} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {feature.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        score >= 80 ? 'bg-green-500' :
                        score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, score)}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-medium ${getScoreColor(score)}`}>
                    {score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {engagementScore.recommendations.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Award className="h-4 w-4 mr-2 text-yellow-500" />
              Quick Wins
            </h4>
            <div className="space-y-2">
              {engagementScore.recommendations.slice(0, 3).map((recommendation, index) => (
                <div key={index} className="text-sm text-gray-600 flex items-start">
                  <span className="text-yellow-500 mr-2">•</span>
                  {recommendation}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Activity */}
        <div className="mt-4 pt-4 border-t text-center">
          <p className="text-xs text-gray-500">
            Last activity: {new Date(engagementScore.lastActivity).toLocaleDateString()}
          </p>
        </div>
      </div>
    </Card>
  );
}

// Compact version for smaller spaces
export function CompactEngagementScoreWidget({ className = '' }: { className?: string }) {
  const { engagementScore, getEngagementLevel } = useCrossFeatureIntegration();

  if (!engagementScore) {
    return null;
  }

  const engagementLevel = getEngagementLevel();

  return (
    <div className={`flex items-center space-x-3 p-3 bg-white rounded-lg border ${className}`}>
      <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getScoreBackground(engagementScore.overallScore)}`}>
        <span className={`text-lg font-bold ${getScoreColor(engagementScore.overallScore)}`}>
          {engagementScore.overallScore}
        </span>
      </div>
      
      <div className="flex-1">
        <div className="flex items-center space-x-1">
          {getEngagementIcon(engagementLevel)}
          <span className="font-medium text-gray-900 text-sm capitalize">
            {engagementLevel}
          </span>
        </div>
        <p className="text-xs text-gray-600">Engagement Score</p>
      </div>
    </div>
  );
}

function getScoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBackground(score: number) {
  if (score >= 80) return 'bg-green-100';
  if (score >= 50) return 'bg-yellow-100';
  return 'bg-red-100';
}

function getEngagementIcon(level: string) {
  switch (level) {
    case 'high':
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    case 'medium':
      return <Minus className="h-4 w-4 text-yellow-600" />;
    case 'low':
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    default:
      return <Activity className="h-4 w-4 text-gray-400" />;
  }
}