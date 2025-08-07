import { useState, useCallback, useRef } from 'react';

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

interface CameraSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'cancelled';
  frameCount: number;
}

export function useCameraEstimator() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentSession, setCurrentSession] = useState<CameraSession | null>(null);
  const [recentAnalyses, setRecentAnalyses] = useState<CameraAnalysisResult[]>([]);
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize camera stream
  const startCamera = useCallback(async (projectId?: string) => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'environment'
        },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }

      // Get location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => setLocation(position.coords),
          (error) => console.warn('Location access denied:', error)
        );
      }

      // Create session
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
        setCurrentSession({
          sessionId: data.session.sessionId,
          startTime: new Date(data.session.startTime),
          status: 'active',
          frameCount: 0
        });
      }
    } catch (error: any) {
      setError(`Failed to start camera: ${error.message}`);
      console.error('Camera start error:', error);
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        endTime: new Date(),
        status: 'completed'
      });
    }
  }, [currentSession]);

  // Capture and analyze frame
  const captureAndAnalyze = useCallback(async (projectContext?: string): Promise<CameraAnalysisResult | null> => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) {
      return null;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas context not available');
      }

      // Capture frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      // Analyze frame
      const response = await fetch('/api/construction-assistant/camera', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_frame',
          imageData,
          location: location ? {
            latitude: location.latitude,
            longitude: location.longitude
          } : undefined,
          projectContext
        })
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      const analysis: CameraAnalysisResult = {
        ...data.analysis,
        timestamp: new Date(data.analysis.timestamp)
      };

      // Update recent analyses
      setRecentAnalyses(prev => [analysis, ...prev.slice(0, 9)]); // Keep last 10

      // Update session frame count
      if (currentSession) {
        setCurrentSession({
          ...currentSession,
          frameCount: currentSession.frameCount + 1
        });
      }

      return analysis;
    } catch (error: any) {
      setError(`Analysis failed: ${error.message}`);
      console.error('Analysis error:', error);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, location, currentSession]);

  // Create project tasks from workflow actions
  const createProjectTasks = useCallback(async (workflowActions: WorkflowAction[], projectId?: string) => {
    try {
      setError(null);
      
      const response = await fetch('/api/projects/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          tasks: workflowActions.map(action => ({
            title: action.action,
            description: `Generated from camera analysis - ${action.category}`,
            priority: action.priority,
            estimatedHours: action.estimatedTime,
            estimatedCost: action.estimatedCost,
            dueDate: action.dueDate,
            category: action.category,
            dependencies: action.dependencies
          }))
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create tasks');
      }

      const data = await response.json();
      return data.tasks;
    } catch (error: any) {
      setError(`Failed to create tasks: ${error.message}`);
      console.error('Task creation error:', error);
      return null;
    }
  }, []);

  // Export analysis data
  const exportAnalysis = useCallback((analysis: CameraAnalysisResult, format: 'json' | 'pdf' = 'json') => {
    try {
      if (format === 'json') {
        const dataStr = JSON.stringify(analysis, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `construction-analysis-${analysis.sessionId}.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
      // PDF export would require additional implementation
    } catch (error: any) {
      setError(`Export failed: ${error.message}`);
      console.error('Export error:', error);
    }
  }, []);

  // Get session history
  const getSessionHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/construction-assistant/camera');
      if (response.ok) {
        const data = await response.json();
        return data.sessions || [];
      }
      return [];
    } catch (error: any) {
      console.error('Failed to fetch session history:', error);
      return [];
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isStreaming,
    isAnalyzing,
    currentSession,
    recentAnalyses,
    location,
    error,
    
    // Refs
    videoRef,
    canvasRef,
    
    // Actions
    startCamera,
    stopCamera,
    captureAndAnalyze,
    createProjectTasks,
    exportAnalysis,
    getSessionHistory,
    clearError,
    
    // Utilities
    hasLocationAccess: !!location,
    canCapture: isStreaming && !isAnalyzing,
    sessionActive: currentSession?.status === 'active'
  };
}