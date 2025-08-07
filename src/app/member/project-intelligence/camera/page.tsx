'use client';

import React, { useState } from 'react';
import { CameraEstimator } from '@/components/ui/CameraEstimator';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Zap, 
  DollarSign, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  FileText,
  Share2
} from 'lucide-react';
import { motion } from 'framer-motion';

interface WorkflowAction {
  priority: 'critical' | 'high' | 'medium' | 'low';
  action: string;
  category: 'verification' | 'procurement' | 'planning' | 'compliance' | 'safety';
  estimatedTime: number;
  estimatedCost: number;
  dependencies: string[];
  dueDate?: Date;
}

interface CameraAnalysisResult {
  sessionId: string;
  timestamp: Date;
  sceneDescription: string;
  totalEstimatedCost: number;
  overallConfidence: number;
  workflowActions: WorkflowAction[];
  nextSteps: string[];
}

export default function CameraEstimatorPage() {
  const [recentAnalyses, setRecentAnalyses] = useState<CameraAnalysisResult[]>([]);
  const [generatedTasks, setGeneratedTasks] = useState<WorkflowAction[]>([]);
  const [showTaskCreation, setShowTaskCreation] = useState(false);

  const handleAnalysisComplete = (analysis: CameraAnalysisResult) => {
    setRecentAnalyses(prev => [analysis, ...prev.slice(0, 4)]); // Keep last 5 analyses
  };

  const handleWorkflowGenerated = (actions: WorkflowAction[]) => {
    setGeneratedTasks(actions);
    setShowTaskCreation(true);
  };

  const createProjectTasks = async () => {
    try {
      // In a real implementation, this would create tasks in HubSpot
      const response = await fetch('/api/projects/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: generatedTasks.map(action => ({
            title: action.action,
            description: `Generated from camera analysis - ${action.category}`,
            priority: action.priority,
            estimatedHours: action.estimatedTime,
            estimatedCost: action.estimatedCost,
            dueDate: action.dueDate,
            category: action.category
          }))
        })
      });

      if (response.ok) {
        alert('Tasks created successfully!');
        setShowTaskCreation(false);
        setGeneratedTasks([]);
      }
    } catch (error) {
      console.error('Error creating tasks:', error);
      alert('Failed to create tasks. Please try again.');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Camera className="w-8 h-8 text-blue-600" />
            AI Camera Cost Estimator
          </h1>
          <p className="text-gray-600 mt-2">
            Use your camera with AI analysis to get real-time construction cost estimates and project scoping
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Powered by Gemini AI
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            RS Means Integration
          </Badge>
        </div>
      </div>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 text-center">
          <Camera className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Live Analysis</h3>
          <p className="text-sm text-gray-600">
            Point your camera at construction sites for real-time material identification and cost analysis
          </p>
        </Card>
        
        <Card className="p-6 text-center">
          <FileText className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Instant Reports</h3>
          <p className="text-sm text-gray-600">
            Get detailed reports with material specifications, quantities, and cost breakdowns
          </p>
        </Card>
        
        <Card className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Workflow Integration</h3>
          <p className="text-sm text-gray-600">
            Automatically generate tasks and procurement lists for your project workflow
          </p>
        </Card>
      </div>

      {/* Camera Estimator Component */}
      <CameraEstimator
        onAnalysisComplete={handleAnalysisComplete}
        onWorkflowGenerated={handleWorkflowGenerated}
      />

      {/* Task Creation Modal */}
      {showTaskCreation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Create Project Tasks</h3>
              <Button
                onClick={() => setShowTaskCreation(false)}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>

            <p className="text-gray-600 mb-4">
              The AI analysis has generated {generatedTasks.length} recommended tasks. 
              Would you like to add these to your project workflow?
            </p>

            <div className="space-y-3 mb-6">
              {generatedTasks.map((task, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                      <h5 className="font-medium">{task.action}</h5>
                    </div>
                    <Badge variant="outline">{task.priority}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.estimatedTime}h
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${task.estimatedCost.toLocaleString()}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {task.category}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <Button onClick={createProjectTasks} className="flex-1">
                Create All Tasks
              </Button>
              <Button
                onClick={() => setShowTaskCreation(false)}
                variant="outline"
                className="flex-1"
              >
                Review Later
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Recent Analyses */}
      {recentAnalyses.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4">Recent Analyses</h3>
          <div className="space-y-4">
            {recentAnalyses.map((analysis, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium">Analysis #{analysis.sessionId.slice(-8)}</h4>
                    <p className="text-sm text-gray-600">
                      {analysis.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      ${analysis.totalEstimatedCost.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {analysis.overallConfidence}% confidence
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">
                  {analysis.sceneDescription.substring(0, 150)}...
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      {analysis.workflowActions.length} tasks generated
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4 text-blue-500" />
                      {analysis.nextSteps.length} next steps
                    </span>
                  </div>
                  
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    <Share2 className="w-3 h-3" />
                    Export
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* Usage Tips */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-blue-600" />
          Tips for Best Results
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Camera Positioning</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Hold camera steady for clear images</li>
              <li>• Ensure good lighting conditions</li>
              <li>• Capture multiple angles of the same area</li>
              <li>• Include reference objects for scale</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Analysis Accuracy</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• Enable location services for better pricing</li>
              <li>• Verify measurements for critical items</li>
              <li>• Review AI confidence scores carefully</li>
              <li>• Use multiple frames for complex scenes</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}