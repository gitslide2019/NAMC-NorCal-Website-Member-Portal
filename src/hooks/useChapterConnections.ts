import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface ChapterConnection {
  id: string;
  fromChapter: string;
  toChapter: string;
  connectionType: string;
  status: string;
  establishedDate?: string;
  lastActivity?: string;
  collaborationCount: number;
  sharedProjects: number;
  memberExchanges: number;
  resourceShares: number;
  allowMemberExchange: boolean;
  allowResourceSharing: boolean;
  allowProjectSharing: boolean;
  contactPerson?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ChapterDirectory {
  id: string;
  chapterName: string;
  displayName: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  memberCount: number;
  activeProjects: number;
  availableResources?: any;
  specializations?: any;
  isActive: boolean;
}

export interface MemberExchange {
  id: string;
  memberId: string;
  originChapter: string;
  targetChapter: string;
  exchangeType: string;
  purpose: string;
  duration?: number;
  status: string;
  requestDate: string;
  approvalDate?: string;
  startDate?: string;
  endDate?: string;
  projectsCompleted: number;
  resourcesShared: number;
  connectionsFormed: number;
  businessGenerated: number;
  successRating?: number;
  member: {
    id: string;
    name: string;
    email: string;
  };
}

export interface InterChapterProject {
  id: string;
  title: string;
  description: string;
  projectType: string;
  leadChapter: string;
  participatingChapters: string[];
  leadMemberId?: string;
  memberIds: string[];
  estimatedValue?: number;
  actualValue?: number;
  projectLocation?: string;
  memberAllocation?: any;
  resourceSharing?: any;
  revenueSharing?: any;
  status: string;
  startDate?: string;
  endDate?: string;
  completionPercentage: number;
  memberSatisfaction?: number;
  leadMember?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CrossChapterOpportunity {
  id: string;
  originalOpportunityId?: string;
  originChapter: string;
  targetChapters: string[];
  sharingType: string;
  title: string;
  description: string;
  estimatedValue?: number;
  status: string;
  sharedDate: string;
  expirationDate?: string;
  interestedChapters?: string[];
  collaborationResponses: number;
  selectedChapters?: string[];
  collaborationFormed: boolean;
  projectValue?: number;
}

export function useChapterConnections() {
  const { data: session } = useSession();
  const [connections, setConnections] = useState<ChapterConnection[]>([]);
  const [directory, setDirectory] = useState<ChapterDirectory[]>([]);
  const [exchanges, setExchanges] = useState<MemberExchange[]>([]);
  const [projects, setProjects] = useState<InterChapterProject[]>([]);
  const [opportunities, setOpportunities] = useState<CrossChapterOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch chapter connections
  const fetchConnections = async (chapter?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (chapter) params.append('chapter', chapter);

      const response = await fetch(`/api/chapters/connections?${params}`);
      const data = await response.json();

      if (data.success) {
        setConnections(data.data);
      } else {
        setError(data.error || 'Failed to fetch connections');
      }
    } catch (err) {
      setError('Failed to fetch connections');
      console.error('Error fetching connections:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch chapter directory
  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/chapters/directory');
      const data = await response.json();

      if (data.success) {
        setDirectory(data.data);
      } else {
        setError(data.error || 'Failed to fetch directory');
      }
    } catch (err) {
      setError('Failed to fetch directory');
      console.error('Error fetching directory:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch member exchanges
  const fetchExchanges = async (memberId?: string, chapter?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (memberId) params.append('memberId', memberId);
      if (chapter) params.append('chapter', chapter);

      const response = await fetch(`/api/chapters/exchanges?${params}`);
      const data = await response.json();

      if (data.success) {
        setExchanges(data.data);
      } else {
        setError(data.error || 'Failed to fetch exchanges');
      }
    } catch (err) {
      setError('Failed to fetch exchanges');
      console.error('Error fetching exchanges:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch inter-chapter projects
  const fetchProjects = async (chapter?: string, memberId?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (chapter) params.append('chapter', chapter);
      if (memberId) params.append('memberId', memberId);

      const response = await fetch(`/api/chapters/projects?${params}`);
      const data = await response.json();

      if (data.success) {
        setProjects(data.data);
      } else {
        setError(data.error || 'Failed to fetch projects');
      }
    } catch (err) {
      setError('Failed to fetch projects');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch cross-chapter opportunities
  const fetchOpportunities = async (chapter?: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (chapter) params.append('chapter', chapter);

      const response = await fetch(`/api/chapters/opportunities?${params}`);
      const data = await response.json();

      if (data.success) {
        setOpportunities(data.data);
      } else {
        setError(data.error || 'Failed to fetch opportunities');
      }
    } catch (err) {
      setError('Failed to fetch opportunities');
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create chapter connection
  const createConnection = async (connectionData: {
    fromChapter: string;
    toChapter: string;
    connectionType: string;
    allowMemberExchange?: boolean;
    allowResourceSharing?: boolean;
    allowProjectSharing?: boolean;
    terms?: any;
  }) => {
    try {
      setLoading(true);
      const response = await fetch('/api/chapters/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionData)
      });

      const data = await response.json();

      if (data.success) {
        await fetchConnections();
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to create connection');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Activate chapter connection
  const activateConnection = async (connectionId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chapters/connections/${connectionId}/activate`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        await fetchConnections();
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to activate connection');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate connection');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create member exchange
  const createExchange = async (exchangeData: {
    memberId?: string;
    originChapter: string;
    targetChapter: string;
    exchangeType: string;
    purpose: string;
    duration?: number;
  }) => {
    try {
      setLoading(true);
      const response = await fetch('/api/chapters/exchanges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exchangeData)
      });

      const data = await response.json();

      if (data.success) {
        await fetchExchanges();
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to create exchange');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exchange');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Approve member exchange
  const approveExchange = async (exchangeId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chapters/exchanges/${exchangeId}/approve`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        await fetchExchanges();
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to approve exchange');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve exchange');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create inter-chapter project
  const createProject = async (projectData: {
    title: string;
    description: string;
    projectType: string;
    leadChapter: string;
    participatingChapters: string[];
    leadMemberId?: string;
    memberIds?: string[];
    estimatedValue?: number;
    projectLocation?: string;
    memberAllocation?: any;
    resourceSharing?: any;
    revenueSharing?: any;
  }) => {
    try {
      setLoading(true);
      const response = await fetch('/api/chapters/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      const data = await response.json();

      if (data.success) {
        await fetchProjects();
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to create project');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Share opportunity across chapters
  const shareOpportunity = async (opportunityData: {
    originalOpportunityId?: string;
    originChapter: string;
    targetChapters: string[];
    sharingType: string;
    title: string;
    description: string;
    estimatedValue?: number;
    expirationDate?: string;
  }) => {
    try {
      setLoading(true);
      const response = await fetch('/api/chapters/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opportunityData)
      });

      const data = await response.json();

      if (data.success) {
        await fetchOpportunities();
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to share opportunity');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share opportunity');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Express interest in opportunity
  const expressInterest = async (opportunityId: string, chapter: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chapters/opportunities/${opportunityId}/interest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter })
      });

      const data = await response.json();

      if (data.success) {
        await fetchOpportunities();
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to express interest');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to express interest');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Load initial data
  useEffect(() => {
    if (session?.user) {
      fetchDirectory();
      fetchConnections();
      fetchExchanges();
      fetchProjects();
      fetchOpportunities();
    }
  }, [session]);

  return {
    connections,
    directory,
    exchanges,
    projects,
    opportunities,
    loading,
    error,
    fetchConnections,
    fetchDirectory,
    fetchExchanges,
    fetchProjects,
    fetchOpportunities,
    createConnection,
    activateConnection,
    createExchange,
    approveExchange,
    createProject,
    shareOpportunity,
    expressInterest,
    clearError: () => setError(null)
  };
}