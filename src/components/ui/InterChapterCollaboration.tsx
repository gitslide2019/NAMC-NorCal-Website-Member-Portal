'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useChapterConnections } from '@/hooks/useChapterConnections';
import { useSession } from 'next-auth/react';
import { 
  Users, 
  Building2, 
  ArrowRightLeft, 
  Handshake, 
  MapPin, 
  Calendar,
  DollarSign,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Eye,
  MessageSquare
} from 'lucide-react';

const CHAPTERS = [
  { value: 'northern_california', label: 'Northern California' },
  { value: 'southern_california', label: 'Southern California' },
  { value: 'oregon', label: 'Oregon' }
];

const CONNECTION_TYPES = [
  { value: 'FULL_COLLABORATION', label: 'Full Collaboration' },
  { value: 'PROJECT_SHARING', label: 'Project Sharing Only' },
  { value: 'RESOURCE_SHARING', label: 'Resource Sharing Only' },
  { value: 'MEMBER_EXCHANGE', label: 'Member Exchange Only' }
];

const EXCHANGE_TYPES = [
  { value: 'TEMPORARY_COLLABORATION', label: 'Temporary Collaboration' },
  { value: 'PROJECT_SPECIFIC', label: 'Project Specific' },
  { value: 'SKILL_SHARING', label: 'Skill Sharing' },
  { value: 'MENTORSHIP', label: 'Mentorship' }
];

const PROJECT_TYPES = [
  { value: 'JOINT_VENTURE', label: 'Joint Venture' },
  { value: 'RESOURCE_SHARING', label: 'Resource Sharing' },
  { value: 'SKILL_EXCHANGE', label: 'Skill Exchange' },
  { value: 'COLLABORATIVE_BID', label: 'Collaborative Bid' }
];

const SHARING_TYPES = [
  { value: 'PROJECT_OPPORTUNITY', label: 'Project Opportunity' },
  { value: 'RESOURCE_SHARING', label: 'Resource Sharing' },
  { value: 'SKILL_EXCHANGE', label: 'Skill Exchange' },
  { value: 'JOINT_VENTURE', label: 'Joint Venture' }
];

export default function InterChapterCollaboration() {
  const { data: session } = useSession();
  const {
    connections,
    directory,
    exchanges,
    projects,
    opportunities,
    loading,
    error,
    createConnection,
    activateConnection,
    createExchange,
    approveExchange,
    createProject,
    shareOpportunity,
    expressInterest
  } = useChapterConnections();

  const [activeTab, setActiveTab] = useState('overview');
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showExchangeDialog, setShowExchangeDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showOpportunityDialog, setShowOpportunityDialog] = useState(false);

  // Form states
  const [connectionForm, setConnectionForm] = useState({
    fromChapter: 'northern_california',
    toChapter: '',
    connectionType: 'FULL_COLLABORATION',
    allowMemberExchange: true,
    allowResourceSharing: true,
    allowProjectSharing: true
  });

  const [exchangeForm, setExchangeForm] = useState({
    originChapter: 'northern_california',
    targetChapter: '',
    exchangeType: 'TEMPORARY_COLLABORATION',
    purpose: '',
    duration: 30
  });

  const [projectForm, setProjectForm] = useState({
    title: '',
    description: '',
    projectType: 'JOINT_VENTURE',
    leadChapter: 'northern_california',
    participatingChapters: [] as string[],
    estimatedValue: '',
    projectLocation: ''
  });

  const [opportunityForm, setOpportunityForm] = useState({
    originChapter: 'northern_california',
    targetChapters: [] as string[],
    sharingType: 'PROJECT_OPPORTUNITY',
    title: '',
    description: '',
    estimatedValue: '',
    expirationDate: ''
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      REQUESTED: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      APPROVED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      COMPLETED: { color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
      PLANNING: { color: 'bg-purple-100 text-purple-800', icon: Clock },
      SHARED: { color: 'bg-blue-100 text-blue-800', icon: ArrowRightLeft }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const handleCreateConnection = async () => {
    try {
      await createConnection(connectionForm);
      setShowConnectionDialog(false);
      setConnectionForm({
        fromChapter: 'northern_california',
        toChapter: '',
        connectionType: 'FULL_COLLABORATION',
        allowMemberExchange: true,
        allowResourceSharing: true,
        allowProjectSharing: true
      });
    } catch (error) {
      console.error('Error creating connection:', error);
    }
  };

  const handleCreateExchange = async () => {
    try {
      await createExchange(exchangeForm);
      setShowExchangeDialog(false);
      setExchangeForm({
        originChapter: 'northern_california',
        targetChapter: '',
        exchangeType: 'TEMPORARY_COLLABORATION',
        purpose: '',
        duration: 30
      });
    } catch (error) {
      console.error('Error creating exchange:', error);
    }
  };

  const handleCreateProject = async () => {
    try {
      await createProject({
        ...projectForm,
        estimatedValue: projectForm.estimatedValue ? parseFloat(projectForm.estimatedValue) : undefined
      });
      setShowProjectDialog(false);
      setProjectForm({
        title: '',
        description: '',
        projectType: 'JOINT_VENTURE',
        leadChapter: 'northern_california',
        participatingChapters: [],
        estimatedValue: '',
        projectLocation: ''
      });
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleShareOpportunity = async () => {
    try {
      await shareOpportunity({
        ...opportunityForm,
        estimatedValue: opportunityForm.estimatedValue ? parseFloat(opportunityForm.estimatedValue) : undefined
      });
      setShowOpportunityDialog(false);
      setOpportunityForm({
        originChapter: 'northern_california',
        targetChapters: [],
        sharingType: 'PROJECT_OPPORTUNITY',
        title: '',
        description: '',
        estimatedValue: '',
        expirationDate: ''
      });
    } catch (error) {
      console.error('Error sharing opportunity:', error);
    }
  };

  if (loading && !connections.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inter-Chapter Collaboration</h1>
          <p className="text-gray-600 mt-2">
            Connect and collaborate with Southern California and Oregon NAMC chapters
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800">{error}</span>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="exchanges">Member Exchange</TabsTrigger>
          <TabsTrigger value="projects">Joint Projects</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Connections</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {connections.filter(c => c.status === 'ACTIVE').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Chapter partnerships
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Member Exchanges</CardTitle>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{exchanges.length}</div>
                <p className="text-xs text-muted-foreground">
                  Cross-chapter collaborations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Joint Projects</CardTitle>
                <Handshake className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.length}</div>
                <p className="text-xs text-muted-foreground">
                  Collaborative initiatives
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Shared Opportunities</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{opportunities.length}</div>
                <p className="text-xs text-muted-foreground">
                  Cross-chapter opportunities
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Chapter Directory</CardTitle>
                <CardDescription>
                  NAMC chapters available for collaboration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {directory.map((chapter) => (
                    <div key={chapter.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-semibold">{chapter.displayName}</h3>
                        <p className="text-sm text-gray-600">{chapter.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {chapter.memberCount} members
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {chapter.activeProjects} projects
                          </span>
                        </div>
                      </div>
                      <Badge variant={chapter.isActive ? "default" : "secondary"}>
                        {chapter.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest inter-chapter collaboration activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {exchanges.slice(0, 3).map((exchange) => (
                    <div key={exchange.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <ArrowRightLeft className="w-5 h-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium">{exchange.member.name}</p>
                        <p className="text-sm text-gray-600">
                          {exchange.originChapter} → {exchange.targetChapter}
                        </p>
                      </div>
                      {getStatusBadge(exchange.status)}
                    </div>
                  ))}
                  
                  {projects.slice(0, 2).map((project) => (
                    <div key={project.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Handshake className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-gray-600">
                          Led by {project.leadChapter}
                        </p>
                      </div>
                      {getStatusBadge(project.status)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="connections" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Chapter Connections</h2>
            <Dialog open={showConnectionDialog} onOpenChange={setShowConnectionDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Connection
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Chapter Connection</DialogTitle>
                  <DialogDescription>
                    Establish a new collaboration relationship with another chapter
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fromChapter">From Chapter</Label>
                      <Select
                        value={connectionForm.fromChapter}
                        onValueChange={(value) => setConnectionForm(prev => ({ ...prev, fromChapter: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHAPTERS.map((chapter) => (
                            <SelectItem key={chapter.value} value={chapter.value}>
                              {chapter.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="toChapter">To Chapter</Label>
                      <Select
                        value={connectionForm.toChapter}
                        onValueChange={(value) => setConnectionForm(prev => ({ ...prev, toChapter: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select chapter" />
                        </SelectTrigger>
                        <SelectContent>
                          {CHAPTERS.filter(c => c.value !== connectionForm.fromChapter).map((chapter) => (
                            <SelectItem key={chapter.value} value={chapter.value}>
                              {chapter.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="connectionType">Connection Type</Label>
                    <Select
                      value={connectionForm.connectionType}
                      onValueChange={(value) => setConnectionForm(prev => ({ ...prev, connectionType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONNECTION_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Collaboration Options</Label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={connectionForm.allowMemberExchange}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, allowMemberExchange: e.target.checked }))}
                        />
                        <span>Allow Member Exchange</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={connectionForm.allowResourceSharing}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, allowResourceSharing: e.target.checked }))}
                        />
                        <span>Allow Resource Sharing</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={connectionForm.allowProjectSharing}
                          onChange={(e) => setConnectionForm(prev => ({ ...prev, allowProjectSharing: e.target.checked }))}
                        />
                        <span>Allow Project Sharing</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowConnectionDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateConnection} disabled={!connectionForm.toChapter}>
                      Create Connection
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {connections.map((connection) => (
              <Card key={connection.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        <span className="font-medium">
                          {CHAPTERS.find(c => c.value === connection.fromChapter)?.label}
                        </span>
                        <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">
                          {CHAPTERS.find(c => c.value === connection.toChapter)?.label}
                        </span>
                      </div>
                      {getStatusBadge(connection.status)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {connection.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => activateConnection(connection.id)}
                        >
                          Activate
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <p className="font-medium">{connection.connectionType.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Collaborations:</span>
                      <p className="font-medium">{connection.collaborationCount}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Projects:</span>
                      <p className="font-medium">{connection.sharedProjects}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Exchanges:</span>
                      <p className="font-medium">{connection.memberExchanges}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {connection.allowMemberExchange && (
                      <Badge variant="secondary">Member Exchange</Badge>
                    )}
                    {connection.allowResourceSharing && (
                      <Badge variant="secondary">Resource Sharing</Badge>
                    )}
                    {connection.allowProjectSharing && (
                      <Badge variant="secondary">Project Sharing</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="exchanges" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Member Exchange Program</h2>
            <Dialog open={showExchangeDialog} onOpenChange={setShowExchangeDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Request Exchange
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Member Exchange</DialogTitle>
                  <DialogDescription>
                    Request to collaborate with another chapter temporarily
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="originChapter">Origin Chapter</Label>
                      <Select
                        value={exchangeForm.originChapter}
                        onValueChange={(value) => setExchangeForm(prev => ({ ...prev, originChapter: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHAPTERS.map((chapter) => (
                            <SelectItem key={chapter.value} value={chapter.value}>
                              {chapter.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="targetChapter">Target Chapter</Label>
                      <Select
                        value={exchangeForm.targetChapter}
                        onValueChange={(value) => setExchangeForm(prev => ({ ...prev, targetChapter: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select chapter" />
                        </SelectTrigger>
                        <SelectContent>
                          {CHAPTERS.filter(c => c.value !== exchangeForm.originChapter).map((chapter) => (
                            <SelectItem key={chapter.value} value={chapter.value}>
                              {chapter.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="exchangeType">Exchange Type</Label>
                    <Select
                      value={exchangeForm.exchangeType}
                      onValueChange={(value) => setExchangeForm(prev => ({ ...prev, exchangeType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {EXCHANGE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="purpose">Purpose</Label>
                    <Textarea
                      value={exchangeForm.purpose}
                      onChange={(e) => setExchangeForm(prev => ({ ...prev, purpose: e.target.value }))}
                      placeholder="Describe the purpose and goals of this exchange..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="duration">Duration (days)</Label>
                    <Input
                      type="number"
                      value={exchangeForm.duration}
                      onChange={(e) => setExchangeForm(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowExchangeDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateExchange} disabled={!exchangeForm.targetChapter || !exchangeForm.purpose}>
                      Request Exchange
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {exchanges.map((exchange) => (
              <Card key={exchange.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-600" />
                        <span className="font-medium">{exchange.member.name}</span>
                        <ArrowRightLeft className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {exchange.originChapter} → {exchange.targetChapter}
                        </span>
                      </div>
                      {getStatusBadge(exchange.status)}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {exchange.status === 'REQUESTED' && (
                        <Button
                          size="sm"
                          onClick={() => approveExchange(exchange.id)}
                        >
                          Approve
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-sm text-gray-600">{exchange.purpose}</p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <p className="font-medium">{exchange.exchangeType.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <p className="font-medium">{exchange.duration} days</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Projects:</span>
                      <p className="font-medium">{exchange.projectsCompleted}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Business:</span>
                      <p className="font-medium">${exchange.businessGenerated.toLocaleString()}</p>
                    </div>
                  </div>

                  {exchange.successRating && (
                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-sm text-gray-500">Success Rating:</span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < exchange.successRating! ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm font-medium ml-1">{exchange.successRating}/5</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Inter-Chapter Projects</h2>
            <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Inter-Chapter Project</DialogTitle>
                  <DialogDescription>
                    Start a collaborative project with other chapters
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Project Title</Label>
                    <Input
                      value={projectForm.title}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter project title..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      value={projectForm.description}
                      onChange={(e) => setProjectForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the project goals and scope..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="projectType">Project Type</Label>
                      <Select
                        value={projectForm.projectType}
                        onValueChange={(value) => setProjectForm(prev => ({ ...prev, projectType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="leadChapter">Lead Chapter</Label>
                      <Select
                        value={projectForm.leadChapter}
                        onValueChange={(value) => setProjectForm(prev => ({ ...prev, leadChapter: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHAPTERS.map((chapter) => (
                            <SelectItem key={chapter.value} value={chapter.value}>
                              {chapter.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                      <Input
                        type="number"
                        value={projectForm.estimatedValue}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, estimatedValue: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="projectLocation">Location</Label>
                      <Input
                        value={projectForm.projectLocation}
                        onChange={(e) => setProjectForm(prev => ({ ...prev, projectLocation: e.target.value }))}
                        placeholder="Project location..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowProjectDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateProject} disabled={!projectForm.title || !projectForm.description}>
                      Create Project
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {projects.map((project) => (
              <Card key={project.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{project.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <p className="font-medium">{project.projectType.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Lead Chapter:</span>
                      <p className="font-medium">
                        {CHAPTERS.find(c => c.value === project.leadChapter)?.label}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Estimated Value:</span>
                      <p className="font-medium">
                        {project.estimatedValue ? `$${project.estimatedValue.toLocaleString()}` : 'TBD'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Progress:</span>
                      <p className="font-medium">{project.completionPercentage}%</p>
                    </div>
                  </div>

                  {project.projectLocation && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      {project.projectLocation}
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    {project.participatingChapters.map((chapter) => (
                      <Badge key={chapter} variant="secondary">
                        {CHAPTERS.find(c => c.value === chapter)?.label}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Cross-Chapter Opportunities</h2>
            <Dialog open={showOpportunityDialog} onOpenChange={setShowOpportunityDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Share Opportunity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Share Opportunity Across Chapters</DialogTitle>
                  <DialogDescription>
                    Share a business opportunity with other chapters
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Opportunity Title</Label>
                    <Input
                      value={opportunityForm.title}
                      onChange={(e) => setOpportunityForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter opportunity title..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      value={opportunityForm.description}
                      onChange={(e) => setOpportunityForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the opportunity..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="sharingType">Sharing Type</Label>
                      <Select
                        value={opportunityForm.sharingType}
                        onValueChange={(value) => setOpportunityForm(prev => ({ ...prev, sharingType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SHARING_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="originChapter">Origin Chapter</Label>
                      <Select
                        value={opportunityForm.originChapter}
                        onValueChange={(value) => setOpportunityForm(prev => ({ ...prev, originChapter: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CHAPTERS.map((chapter) => (
                            <SelectItem key={chapter.value} value={chapter.value}>
                              {chapter.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                      <Input
                        type="number"
                        value={opportunityForm.estimatedValue}
                        onChange={(e) => setOpportunityForm(prev => ({ ...prev, estimatedValue: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expirationDate">Expiration Date</Label>
                      <Input
                        type="date"
                        value={opportunityForm.expirationDate}
                        onChange={(e) => setOpportunityForm(prev => ({ ...prev, expirationDate: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowOpportunityDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleShareOpportunity} disabled={!opportunityForm.title || !opportunityForm.description}>
                      Share Opportunity
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {opportunities.map((opportunity) => (
              <Card key={opportunity.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{opportunity.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{opportunity.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(opportunity.status)}
                      <Button
                        size="sm"
                        onClick={() => expressInterest(opportunity.id, 'northern_california')}
                      >
                        Express Interest
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <p className="font-medium">{opportunity.sharingType.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Origin:</span>
                      <p className="font-medium">
                        {CHAPTERS.find(c => c.value === opportunity.originChapter)?.label}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Estimated Value:</span>
                      <p className="font-medium">
                        {opportunity.estimatedValue ? `$${opportunity.estimatedValue.toLocaleString()}` : 'TBD'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Responses:</span>
                      <p className="font-medium">{opportunity.collaborationResponses}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {opportunity.targetChapters.map((chapter) => (
                      <Badge key={chapter} variant="outline">
                        {CHAPTERS.find(c => c.value === chapter)?.label}
                      </Badge>
                    ))}
                  </div>

                  {opportunity.interestedChapters && opportunity.interestedChapters.length > 0 && (
                    <div className="mt-4">
                      <span className="text-sm text-gray-500">Interested Chapters:</span>
                      <div className="flex gap-2 mt-1">
                        {opportunity.interestedChapters.map((chapter) => (
                          <Badge key={chapter} variant="secondary">
                            {CHAPTERS.find(c => c.value === chapter)?.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {opportunity.expirationDate && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      Expires: {new Date(opportunity.expirationDate).toLocaleDateString()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}