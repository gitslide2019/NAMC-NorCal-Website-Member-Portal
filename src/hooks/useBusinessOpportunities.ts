import { useState, useEffect, useCallback } from 'react';

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

interface OpportunityApplication {
  id: string;
  opportunity_id: string;
  applicant_id: string;
  message: string;
  relevant_experience?: any;
  proposed_approach?: string;
  availability?: string;
  collaboration_preferences?: any;
  portfolio_items?: any;
  status: string;
  response_message?: string;
  responded_at?: string;
  created_at: string;
}

interface PartnershipProposal {
  id: string;
  proposer_id: string;
  partner_id: string;
  project_type: string;
  collaboration_type: string;
  message: string;
  status: string;
  response_message?: string;
  responded_at?: string;
  created_at: string;
}

interface ToolSharingOpportunity {
  id: string;
  member_id: string;
  type: string;
  tool_name: string;
  tool_category: string;
  description: string;
  availability_dates: any;
  location: string;
  rental_rate?: number;
  deposit_required?: boolean;
  delivery_available?: boolean;
  pickup_instructions?: string;
  condition_notes?: string;
  status: string;
  created_at: string;
}

interface NetworkingAnalytics {
  total_interactions: number;
  opportunities_posted: number;
  applications_sent: number;
  partnerships_formed: number;
  tools_shared: number;
  business_impact_value: number;
  local_metrics?: any;
}

interface OpportunityFilters {
  category?: string;
  skills?: string[];
  location?: string;
  type?: string;
}

export function useBusinessOpportunities() {
  const [opportunities, setOpportunities] = useState<BusinessOpportunity[]>([]);
  const [myApplications, setMyApplications] = useState<OpportunityApplication[]>([]);
  const [myProposals, setMyProposals] = useState<PartnershipProposal[]>([]);
  const [toolSharing, setToolSharing] = useState<ToolSharingOpportunity[]>([]);
  const [analytics, setAnalytics] = useState<NetworkingAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch business opportunities
  const fetchOpportunities = useCallback(async (filters?: OpportunityFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.location) params.append('location', filters.location);
      if (filters?.skills) params.append('skills', filters.skills.join(','));

      const response = await fetch(`/api/community/opportunities?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch opportunities');
      }

      const data = await response.json();
      setOpportunities(data.opportunities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create business opportunity
  const createOpportunity = useCallback(async (opportunityData: {
    title: string;
    description: string;
    category: string;
    type: string;
    skills_required: string[];
    location: string;
    budget_range?: string;
    timeline?: string;
    collaboration_type: string;
    requirements?: any;
    contact_preferences?: any;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/community/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(opportunityData),
      });

      if (!response.ok) {
        throw new Error('Failed to create opportunity');
      }

      const data = await response.json();
      
      // Refresh opportunities list
      await fetchOpportunities();
      
      return data.opportunity;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchOpportunities]);

  // Apply to opportunity
  const applyToOpportunity = useCallback(async (
    opportunityId: string,
    applicationData: {
      message: string;
      relevant_experience?: any;
      proposed_approach?: string;
      availability?: string;
      collaboration_preferences?: any;
      portfolio_items?: any;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/community/opportunities/${opportunityId}/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        throw new Error('Failed to apply to opportunity');
      }

      const data = await response.json();
      return data.application;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get matching opportunities
  const getMatchingOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/community/opportunities/matching?type=opportunities');
      if (!response.ok) {
        throw new Error('Failed to fetch matching opportunities');
      }

      const data = await response.json();
      return data.opportunities || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Find potential partners
  const findPotentialPartners = useCallback(async (criteria: {
    project_types?: string[];
    location_radius?: number;
    collaboration_type?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('type', 'partners');
      if (criteria.project_types) params.append('project_types', criteria.project_types.join(','));
      if (criteria.location_radius) params.append('location_radius', criteria.location_radius.toString());
      if (criteria.collaboration_type) params.append('collaboration_type', criteria.collaboration_type);

      const response = await fetch(`/api/community/opportunities/matching?${params}`);
      if (!response.ok) {
        throw new Error('Failed to find potential partners');
      }

      const data = await response.json();
      return data.partners || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create partnership proposal
  const createPartnershipProposal = useCallback(async (proposalData: {
    partner_id: string;
    project_type: string;
    collaboration_type: string;
    message: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/community/opportunities/matching', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proposalData),
      });

      if (!response.ok) {
        throw new Error('Failed to create partnership proposal');
      }

      const data = await response.json();
      return data.proposal;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get tool sharing opportunities
  const getToolSharingOpportunities = useCallback(async (filters?: {
    category?: string;
    location?: string;
    date_needed?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append('category', filters.category);
      if (filters?.location) params.append('location', filters.location);
      if (filters?.date_needed) params.append('date_needed', filters.date_needed);

      const response = await fetch(`/api/community/opportunities/tool-sharing?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tool sharing opportunities');
      }

      const data = await response.json();
      setToolSharing(data.opportunities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create tool sharing opportunity
  const createToolSharingOpportunity = useCallback(async (toolData: {
    type: string;
    tool_name: string;
    tool_category: string;
    description: string;
    availability_dates: any;
    location: string;
    rental_rate?: number;
    deposit_required?: boolean;
    delivery_available?: boolean;
    pickup_instructions?: string;
    condition_notes?: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/community/opportunities/tool-sharing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(toolData),
      });

      if (!response.ok) {
        throw new Error('Failed to create tool sharing opportunity');
      }

      const data = await response.json();
      
      // Refresh tool sharing list
      await getToolSharingOpportunities();
      
      return data.opportunity;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getToolSharingOpportunities]);

  // Get networking analytics
  const getNetworkingAnalytics = useCallback(async (timeframe: number = 30) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/community/opportunities/analytics?type=personal&timeframe=${timeframe}`);
      if (!response.ok) {
        throw new Error('Failed to fetch networking analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Track networking interaction
  const trackNetworkingInteraction = useCallback(async (interactionData: {
    connection_id: string;
    interaction_type: string;
    business_impact?: string;
    impact_value?: number;
  }) => {
    try {
      const response = await fetch('/api/community/opportunities/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(interactionData),
      });

      if (!response.ok) {
        throw new Error('Failed to track networking interaction');
      }

      const data = await response.json();
      return data.interaction;
    } catch (err) {
      console.error('Error tracking networking interaction:', err);
      throw err;
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  return {
    // Data
    opportunities,
    myApplications,
    myProposals,
    toolSharing,
    analytics,
    loading,
    error,

    // Actions
    fetchOpportunities,
    createOpportunity,
    applyToOpportunity,
    getMatchingOpportunities,
    findPotentialPartners,
    createPartnershipProposal,
    getToolSharingOpportunities,
    createToolSharingOpportunity,
    getNetworkingAnalytics,
    trackNetworkingInteraction,
  };
}