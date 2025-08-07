'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Filter, 
  MapPin, 
  Calendar, 
  DollarSign, 
  Users, 
  Briefcase,
  Plus,
  MessageSquare,
  Star,
  TrendingUp,
  Handshake,
  Tool
} from 'lucide-react';

interface BusinessOpportunity {
  id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  skills_required: string[];
  location: string;
  budget_range?: string;
  timeline?: string;
  collaboration_type: string;
  posted_by: string;
  poster_name?: string;
  poster_company?: string;
  created_at: string;
  applications_count?: number;
}

interface OpportunityFilters {
  category?: string;
  type?: string;
  location?: string;
  skills?: string;
  collaboration_type?: string;
}

export default function BusinessOpportunityPlatform() {
  const [opportunities, setOpportunities] = useState<BusinessOpportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<BusinessOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OpportunityFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('browse');
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchOpportunities();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [opportunities, filters, searchTerm]);

  const fetchOpportunities = async () => {
    try {
      const response = await fetch('/api/community/opportunities');
      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.opportunities || []);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = opportunities;

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(opp => 
        opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.skills_required.some(skill => 
          skill.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(opp => opp.category === filters.category);
    }
    if (filters.type) {
      filtered = filtered.filter(opp => opp.type === filters.type);
    }
    if (filters.location) {
      filtered = filtered.filter(opp => 
        opp.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    if (filters.collaboration_type) {
      filtered = filtered.filter(opp => opp.collaboration_type === filters.collaboration_type);
    }

    setFilteredOpportunities(filtered);
  };

  const getOpportunityTypeIcon = (type: string) => {
    switch (type) {
      case 'project': return <Briefcase className="h-4 w-4" />;
      case 'partnership': return <Handshake className="h-4 w-4" />;
      case 'joint_venture': return <Users className="h-4 w-4" />;
      case 'tool_sharing': return <Tool className="h-4 w-4" />;
      default: return <Briefcase className="h-4 w-4" />;
    }
  };

  const getCollaborationTypeColor = (type: string) => {
    switch (type) {
      case 'lead_contractor': return 'bg-blue-100 text-blue-800';
      case 'equal_partner': return 'bg-green-100 text-green-800';
      case 'subcontractor': return 'bg-yellow-100 text-yellow-800';
      case 'resource_sharing': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const OpportunityCard = ({ opportunity }: { opportunity: BusinessOpportunity }) => (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getOpportunityTypeIcon(opportunity.type)}
            <CardTitle className="text-lg">{opportunity.title}</CardTitle>
          </div>
          <Badge className={getCollaborationTypeColor(opportunity.collaboration_type)}>
            {opportunity.collaboration_type.replace('_', ' ')}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {opportunity.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Skills Required */}
          <div className="flex flex-wrap gap-1">
            {opportunity.skills_required.slice(0, 3).map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {opportunity.skills_required.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{opportunity.skills_required.length - 3} more
              </Badge>
            )}
          </div>

          {/* Location and Timeline */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <MapPin className="h-4 w-4" />
              <span>{opportunity.location}</span>
            </div>
            {opportunity.timeline && (
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{opportunity.timeline}</span>
              </div>
            )}
          </div>

          {/* Budget Range */}
          {opportunity.budget_range && (
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <DollarSign className="h-4 w-4" />
              <span>{opportunity.budget_range}</span>
            </div>
          )}

          {/* Posted By */}
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-500">Posted by:</span>
              <span className="ml-1 font-medium">
                {opportunity.poster_name || 'Member'}
                {opportunity.poster_company && ` • ${opportunity.poster_company}`}
              </span>
            </div>
            <span className="text-gray-400">
              {new Date(opportunity.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-1 text-sm text-gray-500">
              <MessageSquare className="h-4 w-4" />
              <span>{opportunity.applications_count || 0} applications</span>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                View Details
              </Button>
              <Button size="sm">
                Apply
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const FilterSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Filters</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            className="w-full p-2 border rounded-md"
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
          >
            <option value="">All Categories</option>
            <option value="construction">Construction</option>
            <option value="consulting">Consulting</option>
            <option value="design">Design</option>
            <option value="engineering">Engineering</option>
            <option value="management">Management</option>
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Opportunity Type</label>
          <select
            className="w-full p-2 border rounded-md"
            value={filters.type || ''}
            onChange={(e) => setFilters({ ...filters, type: e.target.value || undefined })}
          >
            <option value="">All Types</option>
            <option value="project">Project</option>
            <option value="partnership">Partnership</option>
            <option value="joint_venture">Joint Venture</option>
            <option value="tool_sharing">Tool Sharing</option>
          </select>
        </div>

        {/* Collaboration Type Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Collaboration Type</label>
          <select
            className="w-full p-2 border rounded-md"
            value={filters.collaboration_type || ''}
            onChange={(e) => setFilters({ ...filters, collaboration_type: e.target.value || undefined })}
          >
            <option value="">All Types</option>
            <option value="lead_contractor">Lead Contractor</option>
            <option value="equal_partner">Equal Partner</option>
            <option value="subcontractor">Subcontractor</option>
            <option value="resource_sharing">Resource Sharing</option>
          </select>
        </div>

        {/* Location Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Location</label>
          <Input
            placeholder="Enter location..."
            value={filters.location || ''}
            onChange={(e) => setFilters({ ...filters, location: e.target.value || undefined })}
          />
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => setFilters({})}
        >
          Clear Filters
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Business Opportunities</h1>
        <p className="text-gray-600">
          Connect with fellow contractors for projects, partnerships, and resource sharing
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="browse">Browse Opportunities</TabsTrigger>
          <TabsTrigger value="matching">Smart Matching</TabsTrigger>
          <TabsTrigger value="tool-sharing">Tool Sharing</TabsTrigger>
          <TabsTrigger value="analytics">My Network</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search opportunities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Post Opportunity
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <FilterSection />
            </div>
            
            <div className="lg:col-span-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading opportunities...</p>
                </div>
              ) : filteredOpportunities.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No opportunities found</h3>
                    <p className="text-gray-600 mb-4">
                      Try adjusting your filters or search terms, or be the first to post an opportunity.
                    </p>
                    <Button onClick={() => setShowCreateForm(true)}>
                      Post First Opportunity
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredOpportunities.map((opportunity) => (
                    <OpportunityCard key={opportunity.id} opportunity={opportunity} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="matching" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Star className="h-5 w-5" />
                <span>Smart Matching</span>
              </CardTitle>
              <CardDescription>
                AI-powered recommendations based on your skills, location, and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Smart Matching Coming Soon</h3>
                <p className="text-gray-600">
                  We're building AI-powered matching to connect you with the most relevant opportunities.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tool-sharing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Tool className="h-5 w-5" />
                <span>Tool Sharing Community</span>
              </CardTitle>
              <CardDescription>
                Share tools and equipment with fellow NAMC members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Tool className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Tool Sharing Platform</h3>
                <p className="text-gray-600 mb-4">
                  Connect with members to share tools, equipment, and resources for your projects.
                </p>
                <Button>
                  Browse Tool Sharing
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>My Network Analytics</span>
              </CardTitle>
              <CardDescription>
                Track your networking success and business impact
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Network Analytics</h3>
                <p className="text-gray-600 mb-4">
                  View your networking activities, connections, and business impact metrics.
                </p>
                <Button>
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}