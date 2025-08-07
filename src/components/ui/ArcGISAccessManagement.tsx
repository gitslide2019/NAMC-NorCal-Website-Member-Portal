'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  Users, 
  Clock, 
  Activity, 
  CheckCircle, 
  AlertTriangle,
  Settings,
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  ExternalLink,
  BarChart3,
  Calendar,
  Award,
  Zap
} from 'lucide-react';

interface MemberArcGISAccess {
  memberId: string;
  accessToken: string;
  expirationDate: Date;
  usageCount: number;
  maxUsage: number;
  accessLevel: 'basic' | 'standard' | 'advanced';
  features: string[];
  isActive: boolean;
  daysRemaining: number;
  usagePercentage: number;
}

interface ArcGISAccessManagementProps {
  memberId: string;
  onAccessRequest?: (level: string, duration: number) => void;
  onAccessRevoke?: () => void;
  className?: string;
}

export const ArcGISAccessManagement: React.FC<ArcGISAccessManagementProps> = ({
  memberId,
  onAccessRequest,
  onAccessRevoke,
  className = ''
}) => {
  const [access, setAccess] = useState<MemberArcGISAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<'basic' | 'standard' | 'advanced'>('basic');
  const [selectedDuration, setSelectedDuration] = useState(30);
  const [activeTab, setActiveTab] = useState('overview');
  const [usageHistory, setUsageHistory] = useState<any[]>([]);

  // Load member access status
  useEffect(() => {
    loadAccessStatus();
    loadUsageHistory();
  }, [memberId]);

  const loadAccessStatus = async () => {
    try {
      const response = await fetch('/api/arcgis/member-access');
      const data = await response.json();
      
      if (data.success && data.data.hasAccess) {
        setAccess({
          memberId,
          accessToken: 'hidden',
          expirationDate: new Date(data.data.expirationDate),
          usageCount: data.data.usageCount,
          maxUsage: data.data.maxUsage,
          accessLevel: data.data.accessLevel,
          features: data.data.features,
          isActive: !data.data.isExpired,
          daysRemaining: data.data.daysRemaining,
          usagePercentage: data.data.usagePercentage
        });
      }
    } catch (error) {
      console.error('Error loading access status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsageHistory = async () => {
    // Mock usage history - replace with actual API call
    setUsageHistory([
      {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        operation: 'spatial_analysis',
        location: 'San Francisco, CA',
        duration: 45
      },
      {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        operation: 'demographics',
        location: 'Oakland, CA',
        duration: 23
      },
      {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        operation: 'market_analysis',
        location: 'San Jose, CA',
        duration: 67
      }
    ]);
  };

  const handleAccessRequest = async () => {
    setIsRequesting(true);
    try {
      const response = await fetch('/api/arcgis/member-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessLevel: selectedLevel,
          durationDays: selectedDuration
        })
      });

      const data = await response.json();
      
      if (data.success) {
        await loadAccessStatus();
        if (onAccessRequest) {
          onAccessRequest(selectedLevel, selectedDuration);
        }
      } else {
        throw new Error(data.error || 'Failed to request access');
      }
    } catch (error) {
      console.error('Error requesting access:', error);
      alert('Failed to request ArcGIS access. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleAccessRevoke = async () => {
    if (!confirm('Are you sure you want to revoke your ArcGIS access?')) {
      return;
    }

    try {
      const response = await fetch('/api/arcgis/member-access', {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setAccess(null);
        if (onAccessRevoke) {
          onAccessRevoke();
        }
      }
    } catch (error) {
      console.error('Error revoking access:', error);
      alert('Failed to revoke access. Please try again.');
    }
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'basic': return 'bg-blue-100 text-blue-800';
      case 'standard': return 'bg-green-100 text-green-800';
      case 'advanced': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessLevelFeatures = (level: string) => {
    switch (level) {
      case 'basic':
        return ['Geocoding', 'Demographics', 'Basic Routing', 'Map Services'];
      case 'standard':
        return ['All Basic Features', 'Spatial Analysis', 'Network Analysis', 'Geoprocessing'];
      case 'advanced':
        return ['All Standard Features', 'Custom Analysis', 'Advanced Geoprocessing', 'Premium Data'];
      default:
        return [];
    }
  };

  const getUsageLimits = (level: string) => {
    switch (level) {
      case 'basic': return 100;
      case 'standard': return 500;
      case 'advanced': return 1000;
      default: return 0;
    }
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-2">
              <Activity className="h-5 w-5 animate-pulse" />
              <span>Loading ArcGIS access status...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <MapPin className="h-6 w-6 mr-2" />
            ArcGIS Access Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage your ArcGIS Online access and spatial analysis capabilities
          </p>
        </div>
        
        {access && access.isActive && (
          <Button variant="outline" onClick={handleAccessRevoke}>
            <Pause className="h-4 w-4 mr-2" />
            Revoke Access
          </Button>
        )}
      </div>

      {/* Access Status Overview */}
      {access && access.isActive ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Access Level</p>
                  <Badge className={getAccessLevelColor(access.accessLevel)}>
                    {access.accessLevel.charAt(0).toUpperCase() + access.accessLevel.slice(1)}
                  </Badge>
                </div>
                <div className="p-3 rounded-full bg-blue-50 text-blue-600">
                  <Settings className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Usage</p>
                  <p className="text-lg font-bold">{access.usageCount}/{access.maxUsage}</p>
                  <p className="text-xs text-gray-500">{access.usagePercentage.toFixed(1)}% used</p>
                </div>
                <div className="p-3 rounded-full bg-green-50 text-green-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Days Remaining</p>
                  <p className="text-lg font-bold">{access.daysRemaining}</p>
                  <p className="text-xs text-gray-500">
                    Expires {access.expirationDate.toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-orange-50 text-orange-600">
                  <Calendar className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="flex items-center space-x-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Active</span>
                  </div>
                </div>
                <div className="p-3 rounded-full bg-green-50 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have active ArcGIS access. Request access below to use spatial analysis features.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {access && access.isActive ? 'Access Details' : 'Request ArcGIS Access'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {access && access.isActive ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="usage">Usage</TabsTrigger>
                <TabsTrigger value="training">Training</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Access Information</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Access Level:</span>
                        <Badge className={getAccessLevelColor(access.accessLevel)}>
                          {access.accessLevel.charAt(0).toUpperCase() + access.accessLevel.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Expiration Date:</span>
                        <span className="font-medium">{access.expirationDate.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Days Remaining:</span>
                        <span className={`font-medium ${access.daysRemaining < 7 ? 'text-red-600' : 'text-green-600'}`}>
                          {access.daysRemaining}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Usage Statistics</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-gray-600">API Calls Used</span>
                          <span className="text-sm font-medium">{access.usageCount}/{access.maxUsage}</span>
                        </div>
                        <Progress value={access.usagePercentage} className="h-2" />
                      </div>
                      <div className="text-sm text-gray-500">
                        {access.maxUsage - access.usageCount} calls remaining
                      </div>
                    </div>
                  </div>
                </div>

                {access.daysRemaining < 7 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Your ArcGIS access will expire in {access.daysRemaining} days. 
                      Consider requesting an extension to continue using spatial analysis features.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              <TabsContent value="features" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Available Features</h3>
                  <div className="grid gap-3">
                    {access.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Quick Access Links</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button variant="outline" className="justify-start">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        ArcGIS Online Portal
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Documentation
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Play className="h-4 w-4 mr-2" />
                        Tutorials
                      </Button>
                      <Button variant="outline" className="justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        Community Forum
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="usage" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Recent Usage History</h3>
                  <div className="space-y-3">
                    {usageHistory.map((usage, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                            <MapPin className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium capitalize">{usage.operation.replace('_', ' ')}</div>
                            <div className="text-sm text-gray-600">{usage.location}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">{usage.duration}s</div>
                          <div className="text-xs text-gray-500">
                            {usage.date.toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {usageHistory.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No usage history available</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="training" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Training Resources</h3>
                  <div className="grid gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Getting Started with ArcGIS</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Learn the basics of spatial analysis and mapping for construction projects.
                          </p>
                          <Button size="sm" variant="outline" className="mt-2">
                            Start Tutorial
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-full bg-green-50 text-green-600">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Demographic Analysis for Construction</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Use demographic data to identify optimal project locations and market opportunities.
                          </p>
                          <Button size="sm" variant="outline" className="mt-2">
                            View Guide
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="p-2 rounded-full bg-purple-50 text-purple-600">
                          <Zap className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Advanced Spatial Analysis</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Master advanced GIS techniques for complex construction project analysis.
                          </p>
                          <Button size="sm" variant="outline" className="mt-2" disabled={access.accessLevel === 'basic'}>
                            {access.accessLevel === 'basic' ? 'Requires Standard+' : 'Start Course'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-6">
              {/* Access Level Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold">Choose Access Level</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['basic', 'standard', 'advanced'] as const).map((level) => (
                    <div
                      key={level}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedLevel === level
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedLevel(level)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium capitalize">{level}</h4>
                        <Badge className={getAccessLevelColor(level)}>
                          {getUsageLimits(level)} calls
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {getAccessLevelFeatures(level).map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold">Access Duration</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[7, 14, 30, 90].map((days) => (
                    <Button
                      key={days}
                      variant={selectedDuration === days ? "default" : "outline"}
                      onClick={() => setSelectedDuration(days)}
                    >
                      {days} days
                    </Button>
                  ))}
                </div>
              </div>

              {/* Request Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleAccessRequest}
                  disabled={isRequesting}
                  size="lg"
                >
                  {isRequesting ? (
                    <>
                      <Activity className="h-4 w-4 mr-2 animate-spin" />
                      Requesting Access...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Request {selectedLevel.charAt(0).toUpperCase() + selectedLevel.slice(1)} Access
                    </>
                  )}
                </Button>
              </div>

              {/* Information */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  ArcGIS access is provided for legitimate business and project analysis purposes. 
                  Usage is monitored and subject to fair use policies.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ArcGISAccessManagement;