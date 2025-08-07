'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Award, 
  Building, 
  Leaf, 
  TrendingUp,
  Target,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Droplets,
  Recycle,
  Home
} from 'lucide-react';

interface SocialImpactMetrics {
  id: string;
  projectId: string;
  jobsCreated: number;
  jobsPlanned: number;
  trainingHoursProvided: number;
  localHirePercentage: number;
  minorityHirePercentage: number;
  womenHirePercentage: number;
  housingUnitsCreated: number;
  affordableUnitsCreated: number;
  affordabilityImprovement: number;
  communityBenefitScore: number;
  localSpendingAmount: number;
  localSpendingPercentage: number;
  greenBuildingCertification?: string;
  carbonFootprintReduction: number;
  energyEfficiencyImprovement: number;
  waterConservationAmount: number;
  wasteReductionAmount: number;
  economicMultiplierEffect: number;
  taxRevenueGenerated: number;
  propertyValueIncrease: number;
  socialValueCreated: number;
  investmentAmount: number;
  sroiRatio: number;
  milestonesCompleted: number;
  milestonesTotal: number;
  impactMilestones: string;
}

interface SocialImpactDashboardProps {
  projectId: string;
  editable?: boolean;
}

export function SocialImpactDashboard({ projectId, editable = false }: SocialImpactDashboardProps) {
  const [metrics, setMetrics] = useState<SocialImpactMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [milestones, setMilestones] = useState<any[]>([]);

  useEffect(() => {
    fetchMetrics();
  }, [projectId]);

  useEffect(() => {
    if (metrics?.impactMilestones) {
      try {
        const parsedMilestones = JSON.parse(metrics.impactMilestones);
        setMilestones(parsedMilestones);
      } catch (error) {
        console.error('Error parsing milestones:', error);
        setMilestones([]);
      }
    }
  }, [metrics]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/social-impact`);
      if (!response.ok) {
        if (response.status === 404) {
          setMetrics(null);
          return;
        }
        throw new Error('Failed to fetch social impact metrics');
      }
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateMetrics = async (updates: Partial<SocialImpactMetrics>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/social-impact`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update metrics');
      }

      const updatedMetrics = await response.json();
      setMetrics(updatedMetrics);
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update metrics');
    }
  };

  const getImpactLevel = (score: number) => {
    if (score >= 80) return { level: 'Exceptional', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 60) return { level: 'High', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 40) return { level: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (score >= 20) return { level: 'Low', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { level: 'Minimal', color: 'text-red-600', bg: 'bg-red-100' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number, decimals = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <div className="text-red-800">
          <strong>Error loading social impact metrics:</strong> {error}
        </div>
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <Target className="h-16 w-16 text-gray-400 mx-auto" />
          <h3 className="text-xl font-semibold text-gray-900">No Social Impact Metrics</h3>
          <p className="text-gray-600">
            Set up social impact tracking to measure the community benefits of your project.
          </p>
          {editable && (
            <Button onClick={() => setEditMode(true)}>
              Set Up Impact Tracking
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const impactLevel = getImpactLevel(metrics.communityBenefitScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Social Impact Dashboard</h2>
          <p className="text-gray-600">Track the community benefits and social return on investment</p>
        </div>
        {editable && (
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setEditMode(!editMode)}>
              {editMode ? 'Cancel' : 'Update Metrics'}
            </Button>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        )}
      </div>

      {/* Overall Impact Score */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Community Benefit Score</h3>
          <Badge className={`${impactLevel.bg} ${impactLevel.color}`}>
            {impactLevel.level} Impact
          </Badge>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Score</span>
              <span className="text-sm text-gray-600">{metrics.communityBenefitScore}/100</span>
            </div>
            <Progress value={metrics.communityBenefitScore} className="h-3" />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{metrics.communityBenefitScore}</div>
            <div className="text-sm text-gray-600">Impact Score</div>
          </div>
        </div>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Jobs Created */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Jobs Created</p>
              <p className="text-2xl font-bold text-blue-600">
                {metrics.jobsCreated}
              </p>
              <p className="text-xs text-gray-500">
                of {metrics.jobsPlanned} planned
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-2">
            <Progress 
              value={(metrics.jobsCreated / Math.max(metrics.jobsPlanned, 1)) * 100} 
              className="h-1"
            />
          </div>
        </Card>

        {/* Training Hours */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Training Hours</p>
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(metrics.trainingHoursProvided)}
              </p>
              <p className="text-xs text-gray-500">
                Skills development
              </p>
            </div>
            <Award className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        {/* Housing Units */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Housing Units</p>
              <p className="text-2xl font-bold text-purple-600">
                {metrics.housingUnitsCreated}
              </p>
              <p className="text-xs text-gray-500">
                {metrics.affordableUnitsCreated} affordable
              </p>
            </div>
            <Building className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        {/* SROI Ratio */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">SROI Ratio</p>
              <p className="text-2xl font-bold text-orange-600">
                {metrics.sroiRatio.toFixed(2)}:1
              </p>
              <p className="text-xs text-gray-500">
                Social return
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Diversity and Inclusion */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Diversity & Inclusion</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {metrics.localHirePercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Local Hire</div>
            <Progress value={metrics.localHirePercentage} className="h-2 mt-2" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {metrics.minorityHirePercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Minority Hire</div>
            <Progress value={metrics.minorityHirePercentage} className="h-2 mt-2" />
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {metrics.womenHirePercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Women Hire</div>
            <Progress value={metrics.womenHirePercentage} className="h-2 mt-2" />
          </div>
        </div>
      </Card>

      {/* Environmental Impact */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Environmental Impact</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.greenBuildingCertification && (
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Leaf className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="font-medium text-green-900">
                {metrics.greenBuildingCertification}
              </div>
              <div className="text-sm text-green-600">Certification</div>
            </div>
          )}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-blue-900">
              {metrics.energyEfficiencyImprovement.toFixed(1)}%
            </div>
            <div className="text-sm text-blue-600">Energy Efficiency</div>
          </div>
          <div className="text-center p-4 bg-cyan-50 rounded-lg">
            <Droplets className="h-8 w-8 text-cyan-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-cyan-900">
              {formatNumber(metrics.waterConservationAmount)}
            </div>
            <div className="text-sm text-cyan-600">Gallons Saved</div>
          </div>
          <div className="text-center p-4 bg-emerald-50 rounded-lg">
            <Recycle className="h-8 w-8 text-emerald-600 mx-auto mb-2" />
            <div className="text-xl font-bold text-emerald-900">
              {metrics.wasteReductionAmount.toFixed(1)}
            </div>
            <div className="text-sm text-emerald-600">Tons Diverted</div>
          </div>
        </div>
      </Card>

      {/* Economic Impact */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Economic Impact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.localSpendingAmount)}
            </div>
            <div className="text-sm text-gray-600">Local Spending</div>
            <div className="text-xs text-gray-500">
              {metrics.localSpendingPercentage.toFixed(1)}% of budget
            </div>
          </div>
          <div className="text-center">
            <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(metrics.taxRevenueGenerated)}
            </div>
            <div className="text-sm text-gray-600">Tax Revenue</div>
          </div>
          <div className="text-center">
            <Home className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(metrics.propertyValueIncrease)}
            </div>
            <div className="text-sm text-gray-600">Property Value Increase</div>
          </div>
        </div>
      </Card>

      {/* Social Return on Investment */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Return on Investment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Investment</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(metrics.investmentAmount)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Social Value Created</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.socialValueCreated)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">SROI Ratio</div>
            <div className="text-3xl font-bold text-blue-600">
              {metrics.sroiRatio.toFixed(2)}:1
            </div>
            <div className="text-xs text-gray-500">
              ${metrics.sroiRatio.toFixed(2)} social value per $1 invested
            </div>
          </div>
        </div>
      </Card>

      {/* Impact Milestones */}
      {milestones.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Impact Milestones</h3>
            <div className="text-sm text-gray-600">
              {metrics.milestonesCompleted} of {metrics.milestonesTotal} completed
            </div>
          </div>
          <div className="mb-4">
            <Progress 
              value={(metrics.milestonesCompleted / metrics.milestonesTotal) * 100} 
              className="h-2"
            />
          </div>
          <div className="space-y-3">
            {milestones.slice(0, 5).map((milestone, index) => {
              const isCompleted = milestone.completed || (metrics as any)[milestone.metric] >= milestone.target;
              return (
                <div key={milestone.id} className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>
                      {milestone.title}
                    </div>
                    <div className="text-sm text-gray-600">{milestone.description}</div>
                  </div>
                  <Badge className={isCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {isCompleted ? 'Completed' : 'In Progress'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}