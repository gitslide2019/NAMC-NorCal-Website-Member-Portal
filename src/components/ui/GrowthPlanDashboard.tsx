'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  Clock, 
  Target, 
  TrendingUp, 
  Calendar, 
  Users, 
  DollarSign,
  AlertTriangle,
  ArrowRight,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  actionItems: Array<{
    id: string;
    task: string;
    estimatedHours: number;
    resources: string[];
    dependencies: string[];
  }>;
  successMetrics: Array<{
    metric: string;
    target: string;
    measurement: string;
  }>;
  status: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
}

interface RoadmapPhase {
  id: string;
  name: string;
  duration: string;
  description: string;
  milestones: string[];
  objectives: string[];
}

interface GrowthPlanData {
  id: string;
  planName: string;
  currentPhase: string;
  progressScore: number;
  generatedPlan?: {
    executiveSummary: string;
    situationAnalysis: any;
    strategicObjectives: any[];
    roadmap: {
      phases: RoadmapPhase[];
      timeline: any;
      keyPerformanceIndicators: any[];
    };
    milestones: Milestone[];
    riskAssessment: any[];
    resourceRequirements: any;
    recommendations: string[];
    nextSteps: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface GrowthPlanDashboardProps {
  planData: GrowthPlanData;
  onUpdateProgress: (planId: string, progress: number) => Promise<void>;
  onUpdateMilestone: (planId: string, milestoneId: string, status: string) => Promise<void>;
  isLoading?: boolean;
}

export function GrowthPlanDashboard({ 
  planData, 
  onUpdateProgress, 
  onUpdateMilestone,
  isLoading = false 
}: GrowthPlanDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  const milestones = planData.generatedPlan?.milestones || [];
  const roadmap = planData.generatedPlan?.roadmap;
  const completedMilestones = milestones.filter(m => m.status === 'completed');
  const inProgressMilestones = milestones.filter(m => m.status === 'in_progress');
  const upcomingMilestones = milestones.filter(m => m.status === 'not_started');

  const handleMilestoneStatusChange = async (milestoneId: string, newStatus: string) => {
    try {
      await onUpdateMilestone(planData.id, milestoneId, newStatus);
    } catch (error) {
      console.error('Error updating milestone:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-600" />;
      case 'not_started': return <Target className="w-5 h-5 text-gray-400" />;
      default: return <Target className="w-5 h-5 text-gray-400" />;
    }
  };

  const getCurrentPhaseIndex = () => {
    if (!roadmap?.phases) return 0;
    const phaseMap: Record<string, number> = {
      'assessment_completed': 0,
      'plan_generated': 0,
      'planning': 1,
      'implementation': 2,
      'scaling': 3,
      'completed': 3
    };
    return phaseMap[planData.currentPhase] || 0;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{planData.planName}</h1>
          <p className="text-gray-600 mt-1">
            Current Phase: <span className="font-medium capitalize">
              {planData.currentPhase.replace('_', ' ')}
            </span>
          </p>
        </div>
        <div className="text-right">
          <div className="text-4xl font-bold text-yellow-600 mb-1">
            {Math.round(planData.progressScore)}%
          </div>
          <div className="text-sm text-gray-600">Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Overall Progress</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{completedMilestones.length} of {milestones.length} milestones completed</span>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-4 rounded-full transition-all duration-500"
            style={{ width: `${planData.progressScore}%` }}
          />
        </div>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold text-green-600">{completedMilestones.length}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold text-blue-600">{inProgressMilestones.length}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold text-gray-600">{upcomingMilestones.length}</div>
            <div className="text-sm text-gray-600">Upcoming</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold text-yellow-600">
              {roadmap?.phases?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Phases</div>
          </div>
        </div>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Executive Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Executive Summary</h3>
              <p className="text-gray-700 leading-relaxed">
                {planData.generatedPlan?.executiveSummary || 'No summary available'}
              </p>
            </Card>

            {/* Next Steps */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Immediate Next Steps</h3>
              <div className="space-y-3">
                {(planData.generatedPlan?.nextSteps || []).map((step, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-yellow-800">{index + 1}</span>
                    </div>
                    <p className="text-gray-700 text-sm">{step}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Strategic Objectives */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Strategic Objectives</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(planData.generatedPlan?.strategicObjectives || []).map((objective, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={getPriorityColor(objective.priority)}>
                      {objective.priority}
                    </Badge>
                    <span className="text-xs text-gray-500">{objective.timeline}</span>
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">{objective.objective}</h4>
                  <p className="text-sm text-gray-600">{objective.rationale}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Key Recommendations */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Key Recommendations</h3>
            <div className="space-y-2">
              {(planData.generatedPlan?.recommendations || []).map((recommendation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <ArrowRight className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                  <p className="text-gray-700 text-sm">{recommendation}</p>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-6">
          {roadmap && (
            <>
              {/* Timeline Overview */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Timeline Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {new Date(roadmap.timeline.startDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">Start Date</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {roadmap.timeline.totalDuration}
                    </div>
                    <div className="text-sm text-gray-600">Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {new Date(roadmap.timeline.endDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600">Target End</div>
                  </div>
                </div>
              </Card>

              {/* Phases */}
              <div className="space-y-4">
                {roadmap.phases.map((phase, index) => {
                  const isCurrentPhase = index === getCurrentPhaseIndex();
                  const isCompleted = index < getCurrentPhaseIndex();
                  
                  return (
                    <Card key={phase.id} className={`p-6 ${isCurrentPhase ? 'ring-2 ring-yellow-500' : ''}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCompleted ? 'bg-green-100 text-green-600' :
                            isCurrentPhase ? 'bg-yellow-100 text-yellow-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {isCompleted ? <CheckCircle className="w-5 h-5" /> : index + 1}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{phase.name}</h3>
                            <p className="text-sm text-gray-600">{phase.duration}</p>
                          </div>
                        </div>
                        {isCurrentPhase && (
                          <Badge className="bg-yellow-100 text-yellow-800">Current Phase</Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-700 mb-4">{phase.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Objectives</h4>
                          <ul className="space-y-1">
                            {phase.objectives.map((objective, objIndex) => (
                              <li key={objIndex} className="text-sm text-gray-600 flex items-start gap-2">
                                <ArrowRight className="w-3 h-3 mt-1 flex-shrink-0" />
                                {objective}
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Key Milestones</h4>
                          <div className="space-y-1">
                            {phase.milestones.map(milestoneId => {
                              const milestone = milestones.find(m => m.id === milestoneId);
                              return milestone ? (
                                <div key={milestoneId} className="text-sm text-gray-600 flex items-center gap-2">
                                  {getStatusIcon(milestone.status)}
                                  {milestone.title}
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Milestones List */}
            <div className="lg:col-span-2 space-y-4">
              {milestones.map(milestone => (
                <Card 
                  key={milestone.id} 
                  className={`p-4 cursor-pointer transition-all ${
                    selectedMilestone?.id === milestone.id ? 'ring-2 ring-yellow-500' : ''
                  }`}
                  onClick={() => setSelectedMilestone(milestone)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(milestone.status)}
                      <div>
                        <h3 className="font-medium text-gray-900">{milestone.title}</h3>
                        <p className="text-sm text-gray-600">{milestone.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(milestone.priority)}>
                        {milestone.priority}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(milestone.targetDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3">{milestone.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      {milestone.actionItems.length} action items
                    </div>
                    <div className="flex gap-2">
                      {milestone.status === 'not_started' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMilestoneStatusChange(milestone.id, 'in_progress');
                          }}
                        >
                          <Play className="w-3 h-3 mr-1" />
                          Start
                        </Button>
                      )}
                      {milestone.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMilestoneStatusChange(milestone.id, 'completed');
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Complete
                        </Button>
                      )}
                      {milestone.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMilestoneStatusChange(milestone.id, 'in_progress');
                          }}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Milestone Details */}
            <div className="space-y-4">
              {selectedMilestone ? (
                <>
                  <Card className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Milestone Details</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-600">Status:</span>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(selectedMilestone.status)}
                          <span className="capitalize">{selectedMilestone.status.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Target Date:</span>
                        <p className="text-sm text-gray-900 mt-1">
                          {new Date(selectedMilestone.targetDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-600">Priority:</span>
                        <Badge className={`${getPriorityColor(selectedMilestone.priority)} mt-1`}>
                          {selectedMilestone.priority}
                        </Badge>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Action Items</h3>
                    <div className="space-y-2">
                      {selectedMilestone.actionItems.map(item => (
                        <div key={item.id} className="border-l-2 border-gray-200 pl-3">
                          <p className="text-sm font-medium text-gray-900">{item.task}</p>
                          <p className="text-xs text-gray-600">
                            Est. {item.estimatedHours}h • {item.resources.join(', ')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Success Metrics</h3>
                    <div className="space-y-2">
                      {selectedMilestone.successMetrics.map((metric, index) => (
                        <div key={index} className="border-l-2 border-green-200 pl-3">
                          <p className="text-sm font-medium text-gray-900">{metric.metric}</p>
                          <p className="text-xs text-gray-600">
                            Target: {metric.target} • {metric.measurement}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              ) : (
                <Card className="p-8 text-center">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Select a milestone to view details</p>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 text-center">
              <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{Math.round(planData.progressScore)}%</div>
              <div className="text-sm text-gray-600">Overall Progress</div>
            </Card>
            
            <Card className="p-4 text-center">
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {Math.round((Date.now() - new Date(planData.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-sm text-gray-600">Days Active</div>
            </Card>
            
            <Card className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{completedMilestones.length}</div>
              <div className="text-sm text-gray-600">Completed Milestones</div>
            </Card>
            
            <Card className="p-4 text-center">
              <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{inProgressMilestones.length}</div>
              <div className="text-sm text-gray-600">Active Milestones</div>
            </Card>
          </div>

          {/* KPIs */}
          {roadmap?.keyPerformanceIndicators && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Key Performance Indicators</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roadmap.keyPerformanceIndicators.map((kpi, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{kpi.name}</h4>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Baseline: {kpi.baseline}</span>
                      <span className="text-gray-600">Target: {kpi.target}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Timeframe: {kpi.timeframe}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          {planData.generatedPlan?.resourceRequirements && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Financial Resources */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold">Financial Resources</h3>
                </div>
                <div className="space-y-3">
                  {planData.generatedPlan.resourceRequirements.financial.map((item: any, index: number) => (
                    <div key={index} className="border-l-2 border-green-200 pl-3">
                      <p className="text-sm font-medium text-gray-900">{item.item}</p>
                      <p className="text-xs text-gray-600">{item.amount} • {item.timing}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Human Resources */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Human Resources</h3>
                </div>
                <div className="space-y-3">
                  {planData.generatedPlan.resourceRequirements.human.map((item: any, index: number) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-3">
                      <p className="text-sm font-medium text-gray-900">{item.role}</p>
                      <p className="text-xs text-gray-600">
                        Skills: {item.skills.join(', ')} • {item.timing}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Technology Resources */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold">Technology Resources</h3>
                </div>
                <div className="space-y-3">
                  {planData.generatedPlan.resourceRequirements.technology.map((item: any, index: number) => (
                    <div key={index} className="border-l-2 border-purple-200 pl-3">
                      <p className="text-sm font-medium text-gray-900">{item.tool}</p>
                      <p className="text-xs text-gray-600">{item.purpose} • {item.timing}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Risk Assessment */}
          {planData.generatedPlan?.riskAssessment && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-lg font-semibold">Risk Assessment</h3>
              </div>
              <div className="space-y-4">
                {planData.generatedPlan.riskAssessment.map((risk: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{risk.risk}</h4>
                      <div className="flex gap-2">
                        <Badge className={getPriorityColor(risk.probability)}>
                          {risk.probability} probability
                        </Badge>
                        <Badge className={getPriorityColor(risk.impact)}>
                          {risk.impact} impact
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Mitigation:</span> {risk.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}