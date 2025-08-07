'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin,
  Layers,
  Wrench,
  FileText,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MaterialSpecification {
  material: string;
  type: string;
  quantity: number;
  unit: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  confidence: number;
  verificationRequired: boolean;
  notes?: string;
}

interface ConstructionElement {
  element: string;
  category: 'structural' | 'electrical' | 'plumbing' | 'hvac' | 'finishes' | 'exterior' | 'foundation';
  specifications: MaterialSpecification[];
  estimatedCost: number;
  laborHours: number;
  complexity: 'low' | 'medium' | 'high';
  riskFactors: string[];
  confidence: number;
}

interface QualityAssessment {
  overallCondition: 'excellent' | 'good' | 'fair' | 'poor';
  structuralIntegrity: number;
  complianceIssues: string[];
  safetyHazards: string[];
  immediateActions: string[];
  recommendations: string[];
}

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
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  sceneDescription: string;
  constructionElements: ConstructionElement[];
  qualityAssessment: QualityAssessment;
  totalEstimatedCost: number;
  overallConfidence: number;
  workflowActions: WorkflowAction[];
  nextSteps: string[];
  procurementList: MaterialSpecification[];
}

interface CameraEstimatorProps {
  projectId?: string;
  onAnalysisComplete?: (analysis: CameraAnalysisResult) => void;
  onWorkflowGenerated?: (actions: WorkflowAction[]) => void;
}

export function CameraEstimator({ 
  projectId, 
  onAnalysisComplete, 
  onWorkflowGenerated 
}: CameraEstimatorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<CameraAnalysisResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedView, setSelectedView] = useState<'analysis' | 'workflow' | 'procurement'>('analysis');

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment' // Use back camera on mobile
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }

      // Get location if available
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => setLocation(position.coords),
          (error) => console.warn('Location access denied:', error)
        );
      }

      // Create camera session
      const response = await fetch('/api/construction-assistant/camera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_session',
          projectId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSessionId(data.session.sessionId);
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  }, [projectId]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Capture and analyze frame
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;

    setIsAnalyzing(true);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedFrames(prev => [...prev, imageData]);

      // Analyze frame
      const analysisData = {
        action: 'analyze_frame',
        imageData,
        location: location ? {
          latitude: location.latitude,
          longitude: location.longitude,
          address: undefined
        } : undefined,
        projectContext: projectId ? `Project ID: ${projectId}` : undefined
      };

      const response = await fetch('/api/construction-assistant/camera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(analysisData)
      });

      if (response.ok) {
        const data = await response.json();
        const analysis = {
          ...data.analysis,
          timestamp: new Date(data.analysis.timestamp)
        };
        
        setCurrentAnalysis(analysis);
        onAnalysisComplete?.(analysis);
        
        if (analysis.workflowActions?.length > 0) {
          onWorkflowGenerated?.(analysis.workflowActions);
        }
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      console.error('Error capturing frame:', error);
      alert('Failed to analyze frame. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, location, projectId, onAnalysisComplete, onWorkflowGenerated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      case 'damaged': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'structural': return <Layers className="w-4 h-4" />;
      case 'electrical': return <Zap className="w-4 h-4" />;
      case 'plumbing': return <Wrench className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Camera Interface */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="w-6 h-6" />
            Live Construction Analysis
          </h2>
          <div className="flex items-center gap-2">
            {location && (
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Location Enabled
              </Badge>
            )}
            {sessionId && (
              <Badge variant="outline">
                Session: {sessionId.slice(-8)}
              </Badge>
            )}
          </div>
        </div>

        <div className="relative">
          {/* Video Feed */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* AI Overlay */}
            <AnimatePresence>
              {showOverlay && currentAnalysis && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none"
                >
                  {/* Confidence Score */}
                  <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg">
                    <div className="text-sm font-medium">
                      Confidence: {currentAnalysis.overallConfidence}%
                    </div>
                  </div>

                  {/* Cost Estimate */}
                  <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg">
                    <div className="text-sm font-medium flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      ${currentAnalysis.totalEstimatedCost.toLocaleString()}
                    </div>
                  </div>

                  {/* Element Highlights */}
                  {currentAnalysis.constructionElements.map((element, index) => (
                    <div
                      key={index}
                      className="absolute bg-blue-500/20 border-2 border-blue-500 rounded"
                      style={{
                        top: `${20 + index * 15}%`,
                        left: `${10 + index * 10}%`,
                        width: '20%',
                        height: '15%'
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                        {element.element} ({element.confidence}%)
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading Overlay */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-6 text-center">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-sm font-medium">Analyzing construction scene...</p>
                </div>
              </div>
            )}
          </div>

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            {!isStreaming ? (
              <Button onClick={startCamera} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Start Camera
              </Button>
            ) : (
              <>
                <Button
                  onClick={captureFrame}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  {isAnalyzing ? 'Analyzing...' : 'Capture & Analyze'}
                </Button>
                <Button
                  onClick={stopCamera}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Stop Camera
                </Button>
              </>
            )}
            
            <Button
              onClick={() => setShowOverlay(!showOverlay)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              {showOverlay ? 'Hide' : 'Show'} Overlay
            </Button>
          </div>
        </div>
      </Card>

      {/* Analysis Results */}
      {currentAnalysis && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold">Analysis Results</h3>
            <div className="flex gap-2">
              <Button
                onClick={() => setSelectedView('analysis')}
                variant={selectedView === 'analysis' ? 'default' : 'outline'}
                size="sm"
              >
                Analysis
              </Button>
              <Button
                onClick={() => setSelectedView('workflow')}
                variant={selectedView === 'workflow' ? 'default' : 'outline'}
                size="sm"
              >
                Workflow ({currentAnalysis.workflowActions.length})
              </Button>
              <Button
                onClick={() => setSelectedView('procurement')}
                variant={selectedView === 'procurement' ? 'default' : 'outline'}
                size="sm"
              >
                Procurement ({currentAnalysis.procurementList.length})
              </Button>
            </div>
          </div>

          {selectedView === 'analysis' && (
            <div className="space-y-6">
              {/* Scene Description */}
              <div>
                <h4 className="font-semibold mb-2">Scene Description</h4>
                <p className="text-gray-600">{currentAnalysis.sceneDescription}</p>
              </div>

              {/* Construction Elements */}
              <div>
                <h4 className="font-semibold mb-3">Construction Elements</h4>
                <div className="grid gap-4">
                  {currentAnalysis.constructionElements.map((element, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(element.category)}
                          <h5 className="font-medium">{element.element}</h5>
                          <Badge variant="outline">{element.category}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${element.estimatedCost.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">{element.laborHours}h labor</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h6 className="text-sm font-medium mb-2">Specifications</h6>
                          <div className="space-y-2">
                            {element.specifications.map((spec, specIndex) => (
                              <div key={specIndex} className="text-sm">
                                <div className="flex items-center justify-between">
                                  <span>{spec.material} ({spec.type})</span>
                                  <span className={getConditionColor(spec.condition)}>
                                    {spec.condition}
                                  </span>
                                </div>
                                <div className="text-gray-500">
                                  {spec.quantity} {spec.unit} • {spec.confidence}% confidence
                                  {spec.verificationRequired && (
                                    <span className="text-orange-500 ml-2">⚠ Verify</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h6 className="text-sm font-medium mb-2">Risk Factors</h6>
                          <div className="space-y-1">
                            {element.riskFactors.map((risk, riskIndex) => (
                              <div key={riskIndex} className="text-sm text-orange-600 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                {risk}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Quality Assessment */}
              <div>
                <h4 className="font-semibold mb-3">Quality Assessment</h4>
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="mb-3">
                        <span className="text-sm text-gray-500">Overall Condition:</span>
                        <span className={`ml-2 font-medium ${getConditionColor(currentAnalysis.qualityAssessment.overallCondition)}`}>
                          {currentAnalysis.qualityAssessment.overallCondition}
                        </span>
                      </div>
                      <div className="mb-3">
                        <span className="text-sm text-gray-500">Structural Integrity:</span>
                        <span className="ml-2 font-medium">
                          {currentAnalysis.qualityAssessment.structuralIntegrity}%
                        </span>
                      </div>
                    </div>

                    <div>
                      {currentAnalysis.qualityAssessment.safetyHazards.length > 0 && (
                        <div className="mb-3">
                          <h6 className="text-sm font-medium text-red-600 mb-1">Safety Hazards</h6>
                          <ul className="text-sm space-y-1">
                            {currentAnalysis.qualityAssessment.safetyHazards.map((hazard, index) => (
                              <li key={index} className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="w-3 h-3" />
                                {hazard}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {currentAnalysis.qualityAssessment.complianceIssues.length > 0 && (
                        <div>
                          <h6 className="text-sm font-medium text-orange-600 mb-1">Compliance Issues</h6>
                          <ul className="text-sm space-y-1">
                            {currentAnalysis.qualityAssessment.complianceIssues.map((issue, index) => (
                              <li key={index} className="flex items-center gap-1 text-orange-600">
                                <AlertTriangle className="w-3 h-3" />
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {selectedView === 'workflow' && (
            <div className="space-y-4">
              {currentAnalysis.workflowActions.map((action, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${getPriorityColor(action.priority)}`}></div>
                      <h5 className="font-medium">{action.action}</h5>
                      <Badge variant="outline">{action.category}</Badge>
                    </div>
                    <Badge variant="outline">{action.priority}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {action.estimatedTime}h
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      ${action.estimatedCost.toLocaleString()}
                    </div>
                    {action.dueDate && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Due: {action.dueDate.toLocaleDateString()}
                      </div>
                    )}
                    {action.dependencies.length > 0 && (
                      <div className="text-xs">
                        Depends on: {action.dependencies.join(', ')}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {selectedView === 'procurement' && (
            <div className="space-y-4">
              {currentAnalysis.procurementList.map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-medium">{item.material}</h5>
                      <p className="text-sm text-gray-600">{item.type}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{item.quantity} {item.unit}</div>
                      <div className={`text-sm ${getConditionColor(item.condition)}`}>
                        {item.condition}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      Confidence: {item.confidence}%
                      {item.verificationRequired && (
                        <span className="text-orange-500 ml-2">⚠ Verification Required</span>
                      )}
                    </div>
                  </div>
                  
                  {item.notes && (
                    <p className="text-sm text-gray-600 mt-2">{item.notes}</p>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Next Steps */}
          <div className="mt-6">
            <h4 className="font-semibold mb-3">Recommended Next Steps</h4>
            <div className="space-y-2">
              {currentAnalysis.nextSteps.map((step, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {step}
                </div>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="flex gap-2 mt-6">
            <Button
              onClick={() => {
                const dataStr = JSON.stringify(currentAnalysis, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `construction-analysis-${currentAnalysis.sessionId}.json`;
                link.click();
              }}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Analysis
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}