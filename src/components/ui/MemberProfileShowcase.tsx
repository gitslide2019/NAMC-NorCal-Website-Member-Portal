'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Building, 
  MapPin, 
  Globe, 
  Calendar, 
  Award, 
  Briefcase,
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageSquare,
  UserPlus,
  Star
} from 'lucide-react';

interface MemberProfile {
  id: string;
  memberId: string;
  member: {
    id: string;
    name: string;
    email: string;
    company?: string;
    memberType: string;
    location?: string;
    website?: string;
    joinDate: string;
  };
  bio?: string;
  specialties: string[];
  certifications: string[];
  yearsExperience?: number;
  projectTypes: string[];
  serviceAreas: string[];
  businessSize?: string;
  portfolioImages: string[];
  testimonials: any[];
  socialLinks: Record<string, string>;
  profileViews: number;
  connectionCount: number;
  endorsementCount: number;
  isPublic: boolean;
  showContact: boolean;
  showProjects: boolean;
  showCertifications: boolean;
}

interface MemberProfileShowcaseProps {
  onViewProfile?: (memberId: string) => void;
  onSendMessage?: (memberId: string) => void;
  onConnect?: (memberId: string) => void;
}

const BUSINESS_SIZES = [
  { value: '', label: 'All Sizes' },
  { value: 'SOLE_PROPRIETOR', label: 'Sole Proprietor' },
  { value: 'SMALL', label: 'Small (1-10 employees)' },
  { value: 'MEDIUM', label: 'Medium (11-50 employees)' },
  { value: 'LARGE', label: 'Large (50+ employees)' },
];

const MEMBER_TYPES = [
  { value: '', label: 'All Members' },
  { value: 'REGULAR', label: 'Regular' },
  { value: 'PREMIUM', label: 'Premium' },
  { value: 'EXECUTIVE', label: 'Executive' },
];

export function MemberProfileShowcase({ 
  onViewProfile, 
  onSendMessage,
  onConnect 
}: MemberProfileShowcaseProps) {
  const { data: session } = useSession();
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedBusinessSize, setSelectedBusinessSize] = useState('');
  const [selectedMemberType, setSelectedMemberType] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([]);

  useEffect(() => {
    fetchProfiles();
  }, [selectedSpecialty, selectedLocation, selectedBusinessSize, selectedMemberType, page]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        ...(searchTerm && { search: searchTerm }),
        ...(selectedSpecialty && { specialty: selectedSpecialty }),
        ...(selectedLocation && { location: selectedLocation }),
        ...(selectedBusinessSize && { businessSize: selectedBusinessSize }),
      });

      const response = await fetch(`/api/community/profiles?${params}`);
      if (!response.ok) throw new Error('Failed to fetch profiles');

      const data = await response.json();
      setProfiles(data.profiles);
      setTotalPages(data.pagination.totalPages);

      // Extract unique specialties for filter
      const specialties = new Set<string>();
      data.profiles.forEach((profile: MemberProfile) => {
        profile.specialties.forEach((specialty: string) => specialties.add(specialty));
      });
      setAvailableSpecialties(Array.from(specialties).sort());
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProfiles();
  };

  const formatYearsExperience = (years?: number) => {
    if (!years) return 'Experience not specified';
    if (years === 1) return '1 year experience';
    return `${years} years experience`;
  };

  const getMemberTypeColor = (memberType: string) => {
    const colors = {
      REGULAR: 'bg-gray-100 text-gray-800',
      PREMIUM: 'bg-blue-100 text-blue-800',
      EXECUTIVE: 'bg-purple-100 text-purple-800',
      ADMIN: 'bg-red-100 text-red-800',
    };
    return colors[memberType as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getBusinessSizeLabel = (size?: string) => {
    const labels = {
      SOLE_PROPRIETOR: 'Sole Proprietor',
      SMALL: 'Small Business',
      MEDIUM: 'Medium Business',
      LARGE: 'Large Business',
    };
    return labels[size as keyof typeof labels] || 'Size not specified';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
              <div className="h-20 bg-gray-200 rounded mb-4"></div>
              <div className="flex justify-center space-x-2">
                <div className="h-8 bg-gray-200 rounded w-20"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Member Directory</h2>
        <p className="text-gray-600">Connect with fellow NAMC members and grow your professional network</p>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search members by name, company, or skills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </form>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Specialties</option>
                {availableSpecialties.map(specialty => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <Input
                type="text"
                placeholder="Enter location..."
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Size</label>
              <select
                value={selectedBusinessSize}
                onChange={(e) => setSelectedBusinessSize(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {BUSINESS_SIZES.map(size => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Member Type</label>
              <select
                value={selectedMemberType}
                onChange={(e) => setSelectedMemberType(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                {MEMBER_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* Profiles Grid */}
      {profiles.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No members found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms or filters.' : 'No member profiles are currently available.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((profile) => (
            <Card key={profile.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="text-center mb-4">
                {/* Profile Avatar */}
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                  {profile.member.name.charAt(0).toUpperCase()}
                </div>
                
                {/* Name and Company */}
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {profile.member.name}
                </h3>
                {profile.member.company && (
                  <div className="flex items-center justify-center gap-1 text-gray-600 mb-2">
                    <Building className="h-4 w-4" />
                    <span className="text-sm">{profile.member.company}</span>
                  </div>
                )}
                
                {/* Member Type Badge */}
                <Badge className={getMemberTypeColor(profile.member.memberType)}>
                  {profile.member.memberType}
                </Badge>
              </div>

              {/* Profile Info */}
              <div className="space-y-3 mb-4">
                {profile.member.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.member.location}</span>
                  </div>
                )}
                
                {profile.yearsExperience && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Briefcase className="h-4 w-4" />
                    <span>{formatYearsExperience(profile.yearsExperience)}</span>
                  </div>
                )}
                
                {profile.businessSize && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{getBusinessSizeLabel(profile.businessSize)}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Joined {new Date(profile.member.joinDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {profile.bio}
                </p>
              )}

              {/* Specialties */}
              {profile.specialties.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Specialties</h4>
                  <div className="flex flex-wrap gap-1">
                    {profile.specialties.slice(0, 3).map((specialty, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                    {profile.specialties.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{profile.specialties.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {profile.certifications.length > 0 && profile.showCertifications && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Certifications</h4>
                  <div className="flex flex-wrap gap-1">
                    {profile.certifications.slice(0, 2).map((cert, index) => (
                      <Badge key={index} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                        <Award className="h-3 w-3 mr-1" />
                        {cert}
                      </Badge>
                    ))}
                    {profile.certifications.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{profile.certifications.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex justify-between text-xs text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  <span>{profile.profileViews} views</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{profile.connectionCount} connections</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  <span>{profile.endorsementCount} endorsements</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewProfile?.(profile.memberId)}
                  className="flex-1"
                >
                  View Profile
                </Button>
                {profile.showContact && profile.memberId !== session?.user?.id && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSendMessage?.(profile.memberId)}
                      className="flex items-center gap-1"
                    >
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onConnect?.(profile.memberId)}
                      className="flex items-center gap-1"
                    >
                      <UserPlus className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>

              {/* Website Link */}
              {profile.member.website && (
                <div className="mt-3 pt-3 border-t">
                  <a
                    href={profile.member.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Globe className="h-4 w-4" />
                    Visit Website
                  </a>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 py-2 text-sm text-gray-700">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}