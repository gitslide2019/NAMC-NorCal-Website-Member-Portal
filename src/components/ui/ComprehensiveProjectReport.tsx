'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Download, 
  Share2, 
  MapPin, 
  DollarSign, 
  Users, 
  Calendar,
  TrendingUp,
  Building,
  Target,
  Award,
  Zap,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { MapboxMap } from './MapboxMap';
import { ProjectLocationAnalytics } from './ProjectLocationAnalytics';
import { SpatialBusinessIntelligence } from './SpatialBusinessIntelligence';
import { useArcGISIntegration } from '@/hooks/useArcGISIntegration';
import { SpatialAnalysisResult } from '@/lib/services/arcgis-online.service';

interface ProjectData {
  id: string;
  name: string;
  type: 'residential' | 'commercial' | 'industrial';
  status: 'planning' | 'active' | 'completed';
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  budget: {
    total: number;
    allocated: number;
    spent: number;
    remaining: number;
  };
  timeline: {
    startDate: Date;
    endDate: Date;
    currentPhase: string;
    completionPercentage: number;
  };
  socialImpact: {
    jobsCreated: number;
    jobsPlanned: number;
    trainingHours: number;
    localHirePercentage: number;
    minorityHirePercentage: number;
    communityBenefitScore: number;
  };
  funding: {
    memberFunding: number;
    sponsorFunding: number;
    crowdFunding: number;
    totalRaised: number;
  };
}

interface ComprehensiveProjectReportProps {
  project: ProjectData;
  onExport?: (format: 'pdf' | 'excel' | 'csv') => void;
  onShare?: () => void;
  className?: string;
}

export const ComprehensiveProjectReport: React.FC<ComprehensiveProjectReportProps> = ({
  project,
  onExport,
  onShare,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isGenerating, setIsGenerating] = useState(false);
  const [spatialAnalysis, setSpatialAnalysis] = useState<SpatialAnalysisResult | null>(null);
  const [showMap, setShowMap] = useState(false);

  const { performSpatialAnalysis, isLoading } = useArcGISIntegration();

  const budgetUtilization = (project.budget.spent / project.budget.total) * 100;
  const fundingProgress = (project.funding.totalRaised / project.budget.total) * 100;
  const socialImpactProgress = (project.socialImpact.jobsCreated / project.socialImpact.jobsPlanned) * 100;

  // Load spatial analysis for the project location
  useEffect(() => {
    if (project.location.latitude && project.location.longitude) {
      loadSpatialAnalysis();
    }
  }, [project.location]);

  const loadSpatialAnalysis = async () => {
    try {
      const analysis = await performSpatialAnalysis(
        project.location.latitude,
        project.location.longitude,
        { projectType: project.type }
      );
      setSpatialAnalysis(analysis);
    } catch (error) {
      console.error('Error loading spatial analysis:', error);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setIsGenerating(true);
    try {
      if (onExport) {
        await onExport(format);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOpportunityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <FileText className="h-8 w-8 mr-3" />
            Project Report
          </h1>
          <p className="text-gray-600 mt-2">{project.name}</p>
          <div className="flex items-center space-x-4 mt-2">
            <Badge className={getStatusColor(project.status)}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Badge>
            <span className="text-sm text-gray-500 flex items-center">
              <MapPin className="h-4 w-4 mr-1" />
              {project.location.address}
            </span>
            {spatialAnalysis && (
              <Badge variant="outline" className={getOpportunityScoreColor(spatialAnalysis.businessOpportunityScore)}>
                Opportunity Score: {spatialAnalysis.businessOpportunityScore}
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setShowMap(!showMap)}
            disabled={isLoading}
          >
            <MapPin className="h-4 w-4 mr-2" />
            {showMap ? 'Hide Map' : 'Show Map'}
          </Button>
          <Button variant="outline" onClick={onShare} disabled={isGenerating}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <div className="relative">
            <Button 
              variant="outline" 
              disabled={isGenerating}
              onClick={() => handleExport('pdf')}
            >
              <Download className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Export PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      {showMap && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Project Location & Spatial Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MapboxMap
              options={{
                center: [project.location.longitude, project.location.latitude],
                zoom: 14,
                showArcGISData: true,
                enableInteractiveAnalysis: true
              }}
              projects={[{
                id: project.id,
                name: project.name,
                coordinates: [project.location.longitude, project.location.latitude],
                type: project.type,
                status: project.status,
                budget: project.budget.total,
                socialImpact: project.socialImpact
              }]}
              height="400px"
              showAnalysisPanel={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Budget</p>
                <p className="text-2xl font-bold">${(project.budget.total / 1000).toFixed(0)}K</p>
                <p className="text-xs text-gray-500">
                  {budgetUtilization.toFixed(1)}% utilized
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Jobs Created</p>
                <p className="text-2xl font-bold">{project.socialImpact.jobsCreated}</p>
                <p className="text-xs text-gray-500">
                  of {project.socialImpact.jobsPlanned} planned
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-50 text-green-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion</p>
                <p className="text-2xl font-bold">{project.timeline.completionPercentage}%</p>
                <p className="text-xs text-gray-500">
                  {project.timeline.currentPhase}
                </p>
              </div>
              <div className="p-3 rounded-full bg-purple-50 text-purple-600">
                <Target className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Community Impact</p>
                <p className="text-2xl font-bold">{project.socialImpact.communityBenefitScore}</p>
                <p className="text-xs text-gray-500">
                  Benefit Score
                </p>
              </div>
              <div className="p-3 rounded-full bg-orange-50 text-orange-600">
                <Award className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="social">Social Impact</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="location">Location</TabsTrigger>
              <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Project Summary */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Project Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Project Type:</span>
                      <span className="font-medium capitalize">{project.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-medium">
                        {project.timeline.startDate.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected Completion:</span>
                      <span className="font-medium">
                        {project.timeline.endDate.toLocaleDateString()}
                      </span>
                    </div>
                    {spatialAnalysis && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Market Opportunity:</span>
                        <span className={`font-medium ${getOpportunityScoreColor(spatialAnalysis.businessOpportunityScore)}`}>
                          {spatialAnalysis.businessOpportunityScore}/100
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Overview */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Progress Overview</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Project Completion</span>
                        <span className="text-sm font-medium">{project.timeline.completionPercentage}%</span>
                      </div>
                      <Progress value={project.timeline.completionPercentage} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Budget Utilization</span>
                        <span className="text-sm font-medium">{budgetUtilization.toFixed(1)}%</span>
                      </div>
                      <Progress value={budgetUtilization} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-gray-600">Social Impact Goals</span>
                        <span className="text-sm font-medium">{socialImpactProgress.toFixed(1)}%</span>
                      </div>
                      <Progress value={socialImpactProgress} className="h-2" />
                    </div>

                    {spatialAnalysis && (
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">Market Position</span>
                          <span className="text-sm font-medium">
                            {spatialAnalysis.businessOpportunityScore > 70 ? 'Excellent' :
                             spatialAnalysis.businessOpportunityScore > 40 ? 'Good' : 'Fair'}
                          </span>
                        </div>
                        <Progress value={spatialAnalysis.businessOpportunityScore} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ArcGIS Insights */}
              {spatialAnalysis && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Location Intelligence Summary
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600 font-medium">Population:</span>
                      <span className="ml-2">{spatialAnalysis.demographics.population.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Median Income:</span>
                      <span className="ml-2">${spatialAnalysis.demographics.medianIncome.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-blue-600 font-medium">Construction Permits:</span>
                      <span className="ml-2">{spatialAnalysis.marketAnalysis.constructionActivity.permitCount}</span>
                    </div>
                  </div>
                  {spatialAnalysis.recommendations.length > 0 && (
                    <div className="mt-3">
                      <span className="text-blue-600 font-medium">Key Recommendation:</span>
                      <span className="ml-2 text-blue-700">{spatialAnalysis.recommendations[0]}</span>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="location" className="space-y-6 mt-6">
              {spatialAnalysis ? (
                <ProjectLocationAnalytics
                  projectId={project.id}
                  location={project.location}
                  projectType={project.type}
                  onAnalysisComplete={(analysis) => setSpatialAnalysis(analysis)}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
                    <p className="text-gray-600">Loading location analysis...</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="intelligence" className="space-y-6 mt-6">
              {spatialAnalysis ? (
                <SpatialBusinessIntelligence
                  locations={[{
                    id: project.id,
                    name: project.name,
                    latitude: project.location.latitude,
                    longitude: project.location.longitude,
                    type: 'current'
                  }]}
                  onLocationSelect={(locationId) => console.log('Selected location:', locationId)}
                />
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
                    <p className="text-gray-600">Loading business intelligence...</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Add other tab contents as needed */}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComprehensiveProjectReport;
      jobsPlanned: number;
      trainingHoursProvided: number;
      completionRate: number;
    };
    diversity: {
      localHirePercentage: number;
      minorityHirePercentage: number;
      womenHirePercentage: number;
    };
    housing: {
      unitsCreated: number;
      affordableUnits: number;
      affordabilityImprovement: number;
    };
    community: {
      benefitScore: number;
      localSpending: number;
      localSpendingPercentage: number;
    };
  };
  environmentalImpact: {
    certification?: string;
    carbonReduction: number;
    energyEfficiency: number;
    waterConservation: number;
    wasteReduction: number;
  };
  economicImpact: {
    multiplierEffect: number;
    taxRevenue: number;
    propertyValueIncrease: number;
    localEconomicImpact: number;
  };
  financialSummary: {
    totalBudget: number;
    spentAmount: number;
    fundingSources: {
      memberFunding: number;
      sponsorFunding: number;
      crowdFunding: number;
    };
    expenseBreakdown: {
      categories: Record<string, number>;
      total: number;
      percentages: Record<string, number>;
    };
  };
  milestones: {
    completed: number;
    total: number;
    completionRate: number;
    details: any[];
  };
  recommendations: string[];
}

interface ComprehensiveProjectReportProps {
  projectId: string;
  reportType?: 'comprehensive' | 'financial' | 'social' | 'environmental' | 'funder';
}

export function ComprehensiveProjectReport({ 
  projectId, 
  reportType = 'comprehensive' 
}: ComprehensiveProjectReportProps) {
  const [report, setReport] = useState<ComprehensiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReportType, setSelectedReportType] = useState(reportType);

  useEffect(() => {
    fetchReport();
  }, [projectId, selectedReportType]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/social-impact/reports?type=${selectedReportType}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }
      const data = await response.json();
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (format: 'pdf' | 'json') => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/social-impact/reports?type=${selectedReportType}&format=${format}`
      );
      
      if (format === 'pdf') {
        // Handle PDF download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report?.project.name}-${selectedReportType}-report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Handle JSON download
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report?.project.name}-${selectedReportType}-report.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading report:', error);
    }
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

  const getImpactLevel = (score: number) => {
    if (score >= 80) return { level: 'Exceptional', color: 'text-green-600', bg: 'bg-green-100' };
    if (score >= 60) return { level: 'High', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (score >= 40) return { level: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    if (score >= 20) return { level: 'Low', color: 'text-orange-600', bg: 'bg-orange-100' };
    return { level: 'Minimal', color: 'text-red-600', bg: 'bg-red-100' };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
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
          <strong>Error loading report:</strong> {error}
        </div>
      </Alert>
    );
  }

  if (!report) {
    return (
      <Card className="p-8 text-center">
        <div className="space-y-4">
          <FileText className="h-16 w-16 text-gray-400 mx-auto" />
          <h3 className="text-xl font-semibold text-gray-900">No Report Data</h3>
          <p className="text-gray-600">
            Unable to generate report. Please ensure project has budget and social impact data.
          </p>
        </div>
      </Card>
    );
  }

  const impactLevel = getImpactLevel(report.executiveSummary.communityBenefitScore);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Impact Report</h2>
          <p className="text-gray-600">{report.project.name}</p>
          <p className="text-sm text-gray-500">
            Generated on {new Date(report.generatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedReportType}
            onChange={(e) => setSelectedReportType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="comprehensive">Comprehensive</option>
            <option value="financial">Financial</option>
            <option value="social">Social Impact</option>
            <option value="environmental">Environmental</option>
            <option value="funder">Funder Report</option>
          </select>
          <Button variant="outline" onClick={() => downloadReport('json')}>
            <Download className="h-4 w-4 mr-2" />
            JSON
          </Button>
          <Button variant="outline" onClick={() => downloadReport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {report.executiveSummary.communityBenefitScore}
            </div>
            <div className="text-sm text-gray-600">Community Benefit Score</div>
            <Badge className={`${impactLevel.bg} ${impactLevel.color} mt-1`}>
              {impactLevel.level}
            </Badge>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {report.executiveSummary.sroiRatio.toFixed(2)}:1
            </div>
            <div className="text-sm text-gray-600">Social ROI</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(report.executiveSummary.totalSocialValue)}
            </div>
            <div className="text-sm text-gray-600">Social Value Created</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(report.executiveSummary.totalInvestment)}
            </div>
            <div className="text-sm text-gray-600">Total Investment</div>
          </div>
        </div>

        {/* Key Achievements */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Key Achievements</h4>
          <div className="space-y-2">
            {report.executiveSummary.keyAchievements.map((achievement, index) => (
              <div key={index} className="flex items-start space-x-2">
                <Award className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{achievement}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Social Impact Metrics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Impact Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Employment */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Users className="h-4 w-4 mr-2 text-blue-600" />
              Employment
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Jobs Created</span>
                <span className="text-sm font-medium">{report.socialImpact.employment.jobsCreated}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Jobs Planned</span>
                <span className="text-sm font-medium">{report.socialImpact.employment.jobsPlanned}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Training Hours</span>
                <span className="text-sm font-medium">{formatNumber(report.socialImpact.employment.trainingHoursProvided)}</span>
              </div>
              <Progress 
                value={report.socialImpact.employment.completionRate} 
                className="h-2 mt-2"
              />
              <div className="text-xs text-gray-500">
                {report.socialImpact.employment.completionRate.toFixed(1)}% completion rate
              </div>
            </div>
          </div>

          {/* Diversity */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Target className="h-4 w-4 mr-2 text-green-600" />
              Diversity
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Local Hire</span>
                <span className="text-sm font-medium">{report.socialImpact.diversity.localHirePercentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Minority Hire</span>
                <span className="text-sm font-medium">{report.socialImpact.diversity.minorityHirePercentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Women Hire</span>
                <span className="text-sm font-medium">{report.socialImpact.diversity.womenHirePercentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Housing */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Building className="h-4 w-4 mr-2 text-purple-600" />
              Housing
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Units Created</span>
                <span className="text-sm font-medium">{report.socialImpact.housing.unitsCreated}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Affordable Units</span>
                <span className="text-sm font-medium">{report.socialImpact.housing.affordableUnits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Affordability Improvement</span>
                <span className="text-sm font-medium">{report.socialImpact.housing.affordabilityImprovement.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Activity className="h-4 w-4 mr-2 text-orange-600" />
              Community
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Benefit Score</span>
                <span className="text-sm font-medium">{report.socialImpact.community.benefitScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Local Spending</span>
                <span className="text-sm font-medium">{formatCurrency(report.socialImpact.community.localSpending)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Local Spending %</span>
                <span className="text-sm font-medium">{report.socialImpact.community.localSpendingPercentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Financial Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Budget Overview */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Budget Overview</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Budget</span>
                <span className="font-medium">{formatCurrency(report.financialSummary.totalBudget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount Spent</span>
                <span className="font-medium">{formatCurrency(report.financialSummary.spentAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Utilization Rate</span>
                <span className="font-medium">
                  {((report.financialSummary.spentAmount / report.financialSummary.totalBudget) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress 
                value={(report.financialSummary.spentAmount / report.financialSummary.totalBudget) * 100} 
                className="h-2"
              />
            </div>
          </div>

          {/* Funding Sources */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Funding Sources</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Member Funding</span>
                <span className="font-medium">{formatCurrency(report.financialSummary.fundingSources.memberFunding)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Sponsor Funding</span>
                <span className="font-medium">{formatCurrency(report.financialSummary.fundingSources.sponsorFunding)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Crowdfunding</span>
                <span className="font-medium">{formatCurrency(report.financialSummary.fundingSources.crowdFunding)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3">Expense Breakdown</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(report.financialSummary.expenseBreakdown.categories).map(([category, amount]) => (
              <div key={category} className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(amount as number)}
                </div>
                <div className="text-sm text-gray-600">{category}</div>
                <div className="text-xs text-gray-500">
                  {report.financialSummary.expenseBreakdown.percentages[category]?.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Environmental Impact */}
      {(report.environmentalImpact.certification || 
        report.environmentalImpact.carbonReduction > 0 || 
        report.environmentalImpact.energyEfficiency > 0) && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Leaf className="h-5 w-5 mr-2 text-green-600" />
            Environmental Impact
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {report.environmentalImpact.certification && (
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="font-medium text-green-900">
                  {report.environmentalImpact.certification}
                </div>
                <div className="text-sm text-green-600">Certification</div>
              </div>
            )}
            {report.environmentalImpact.carbonReduction > 0 && (
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-xl font-bold text-blue-900">
                  {formatNumber(report.environmentalImpact.carbonReduction, 1)}
                </div>
                <div className="text-sm text-blue-600">CO2 Reduction (tons)</div>
              </div>
            )}
            {report.environmentalImpact.energyEfficiency > 0 && (
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-xl font-bold text-yellow-900">
                  {report.environmentalImpact.energyEfficiency.toFixed(1)}%
                </div>
                <div className="text-sm text-yellow-600">Energy Efficiency</div>
              </div>
            )}
            {report.environmentalImpact.waterConservation > 0 && (
              <div className="text-center p-4 bg-cyan-50 rounded-lg">
                <div className="text-xl font-bold text-cyan-900">
                  {formatNumber(report.environmentalImpact.waterConservation)}
                </div>
                <div className="text-sm text-cyan-600">Gallons Saved</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Milestones Progress */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Milestone Progress</h3>
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-2xl font-bold text-blue-600">
              {report.milestones.completed}
            </span>
            <span className="text-gray-600"> of {report.milestones.total} completed</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-medium text-gray-900">
              {report.milestones.completionRate.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Completion Rate</div>
          </div>
        </div>
        <Progress value={report.milestones.completionRate} className="h-3 mb-4" />
        
        {/* Recent Milestones */}
        <div className="space-y-2">
          {report.milestones.details.slice(0, 5).map((milestone, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  milestone.completed ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-sm text-gray-900">{milestone.title}</span>
              </div>
              <Badge className={milestone.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {milestone.completed ? 'Completed' : 'In Progress'}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
          <div className="space-y-3">
            {report.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-blue-900">{recommendation}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}