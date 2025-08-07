import { useState, useEffect } from 'react';

export interface SponsorPartnership {
  id: string;
  name: string;
  partnershipType: string;
  partnershipStatus: string;
  courseCategories: string[];
  specializations: string[];
  revenueSharePercentage: number;
  coursesSponsored: number;
  membersTrained: number;
  totalPartnershipValue: number;
  badgesAwarded: number;
  partnershipStartDate: string;
  partnershipEndDate?: string;
  contactEmail?: string;
  logoUrl?: string;
  websiteUrl?: string;
}

export interface SponsoredCourse {
  id: string;
  title: string;
  description?: string;
  category: string;
  subcategory?: string;
  sponsorId: string;
  sponsor: SponsorPartnership;
  partnershipType: string;
  contentUrl?: string;
  duration?: number;
  difficultyLevel: string;
  badgeId?: string;
  badgeRequired: boolean;
  enrollmentCount: number;
  completionCount: number;
  completionRate: number;
  averageRating: number;
  totalRevenue: number;
  isActive: boolean;
  prerequisites: string[];
  learningObjectives: string[];
  assessmentCriteria?: any;
}

export interface CourseEnrollment {
  id: string;
  memberId: string;
  courseId: string;
  course: SponsoredCourse;
  enrollmentDate: string;
  status: string;
  completionDate?: string;
  certificateIssued: boolean;
  certificateUrl?: string;
  finalScore?: number;
  timeSpent: number;
  progress?: CourseProgress[];
}

export interface CourseProgress {
  id: string;
  memberId: string;
  courseId: string;
  enrollmentId: string;
  currentModule?: string;
  completionPercentage: number;
  modulesCompleted: string[];
  assessmentScores?: Record<string, number>;
  timeSpent: number;
  lastAccessDate: string;
  strugglingAreas: string[];
  strengths: string[];
}

export interface ProficiencyBadge {
  id: string;
  memberId: string;
  courseId?: string;
  badgeId: string;
  badgeName: string;
  category: string;
  skillArea: string;
  level: string;
  earnedDate: string;
  verificationStatus: string;
  expirationDate?: string;
  requiresContinuingEd: boolean;
  nextRenewalDate?: string;
  projectOpportunitiesUnlocked: string[];
  digitalCertificateUrl?: string;
  verifications?: any[];
  shopCampaigns?: any[];
}

export interface BadgeShopCampaign {
  id: string;
  memberId: string;
  badgeId: string;
  badge: {
    id: string;
    badgeName: string;
    category: string;
    skillArea: string;
  };
  campaignType: string;
  title: string;
  description?: string;
  productIds: string[];
  productCategories: string[];
  discountPercentage: number;
  campaignDuration: number;
  startDate: string;
  endDate: string;
  status: string;
  viewCount: number;
  clickCount: number;
  purchaseCount: number;
  totalRevenue: number;
  memberProjectFundGenerated: number;
  namcSupportGenerated: number;
  sponsorPartnershipGenerated: number;
}

export interface MemberProjectFund {
  id: string;
  memberId: string;
  currentBalance: number;
  totalEarned: number;
  totalSpent: number;
  totalWithdrawn: number;
  lastTransactionDate?: string;
  transactions?: ProjectFundTransaction[];
}

export interface ProjectFundTransaction {
  id: string;
  fundId: string;
  transactionType: string;
  amount: number;
  source: string;
  sourceId?: string;
  description?: string;
  transactionDate: string;
  status: string;
}

export function useSponsoredLearning() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sponsor Partnerships
  const getSponsorPartnerships = async (status?: string): Promise<SponsorPartnership[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      
      const response = await fetch(`/api/learning/sponsors?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch sponsor partnerships');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createSponsorPartnership = async (partnershipData: any): Promise<SponsorPartnership> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/learning/sponsors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partnershipData),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create sponsor partnership');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Courses
  const getCourses = async (category?: string, subcategory?: string): Promise<SponsoredCourse[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (subcategory) params.append('subcategory', subcategory);
      
      const response = await fetch(`/api/learning/courses?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch courses');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getCourseById = async (courseId: string): Promise<SponsoredCourse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/courses/${courseId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch course');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createCourse = async (courseData: any): Promise<SponsoredCourse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/learning/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create course');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Enrollments
  const getEnrollments = async (memberId?: string, status?: string): Promise<CourseEnrollment[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (memberId) params.append('memberId', memberId);
      if (status) params.append('status', status);
      
      const response = await fetch(`/api/learning/enrollments?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch enrollments');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const enrollInCourse = async (courseId: string, memberId?: string): Promise<CourseEnrollment> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/learning/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId, memberId }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to enroll in course');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Progress
  const updateProgress = async (progressData: any): Promise<CourseProgress> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/learning/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progressData),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update progress');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Badges
  const getBadges = async (memberId?: string, status?: string, category?: string): Promise<ProficiencyBadge[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (memberId) params.append('memberId', memberId);
      if (status) params.append('status', status);
      if (category) params.append('category', category);
      
      const response = await fetch(`/api/learning/badges?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch badges');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const awardBadge = async (badgeData: any): Promise<ProficiencyBadge> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/learning/badges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(badgeData),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to award badge');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Campaigns
  const getCampaigns = async (memberId?: string, status?: string, active?: boolean): Promise<BadgeShopCampaign[]> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (memberId) params.append('memberId', memberId);
      if (status) params.append('status', status);
      if (active !== undefined) params.append('active', active.toString());
      
      const response = await fetch(`/api/learning/campaigns?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch campaigns');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (campaignData: any): Promise<BadgeShopCampaign> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/learning/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create campaign');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Project Fund
  const getProjectFund = async (memberId?: string): Promise<MemberProjectFund> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (memberId) params.append('memberId', memberId);
      
      const response = await fetch(`/api/learning/project-funds?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch project fund');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Analytics
  const getAnalyticsOverview = async (timeframe: string = 'month'): Promise<any> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/analytics/overview?timeframe=${timeframe}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch analytics overview');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getMemberProgress = async (memberId?: string): Promise<any> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (memberId) params.append('memberId', memberId);
      
      const response = await fetch(`/api/learning/analytics/member-progress?${params}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch member progress');
      }
      
      return data.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    // Sponsor Partnerships
    getSponsorPartnerships,
    createSponsorPartnership,
    // Courses
    getCourses,
    getCourseById,
    createCourse,
    // Enrollments
    getEnrollments,
    enrollInCourse,
    // Progress
    updateProgress,
    // Badges
    getBadges,
    awardBadge,
    // Campaigns
    getCampaigns,
    createCampaign,
    // Project Fund
    getProjectFund,
    // Analytics
    getAnalyticsOverview,
    getMemberProgress,
  };
}