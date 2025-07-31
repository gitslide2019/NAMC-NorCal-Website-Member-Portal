import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Mock member data based on the Excel data we imported
const mockMembers = [
  {
    id: '1',
    name: 'John Martinez',
    company: 'Martinez Construction LLC',
    email: 'john@martinezconstruction.com',
    phone: '(415) 555-0123',
    specialties: ['Residential Construction', 'Commercial Construction'],
    licenseNumber: 'C-123456',
    yearsExperience: 15,
    serviceAreas: 'San Francisco, Oakland, Berkeley',
    website: 'www.martinezconstruction.com',
    image: '/placeholder-member.jpg',
    joinDate: '2020-01-15',
    status: 'active'
  },
  {
    id: '2',
    name: 'Sarah Chen',
    company: 'Chen Electrical Services',
    email: 'sarah@chenelectrical.com',
    phone: '(510) 555-0234',
    specialties: ['Electrical Work', 'Solar Installation'],
    licenseNumber: 'C-10-789012',
    yearsExperience: 12,
    serviceAreas: 'East Bay, Contra Costa County',
    website: 'www.chenelectrical.com',
    image: '/placeholder-member.jpg',
    joinDate: '2019-03-22',
    status: 'active'
  },
  {
    id: '3',
    name: 'Robert Johnson',
    company: 'Johnson Plumbing Co.',
    email: 'robert@johnsonplumbing.com',
    phone: '(925) 555-0345',
    specialties: ['Plumbing', 'HVAC Installation'],
    licenseNumber: 'C-36-345678',
    yearsExperience: 20,
    serviceAreas: 'Walnut Creek, Concord, Pleasant Hill',
    website: 'www.johnsonplumbing.com',
    image: '/placeholder-member.jpg',
    joinDate: '2018-07-10',
    status: 'active'
  },
  {
    id: '4',
    name: 'Maria Rodriguez',
    company: 'Rodriguez Landscaping',
    email: 'maria@rodriguezlandscaping.com',
    phone: '(408) 555-0456',
    specialties: ['Landscaping', 'Irrigation Systems'],
    licenseNumber: 'C-27-456789',
    yearsExperience: 8,
    serviceAreas: 'South Bay, Santa Clara County',
    website: 'www.rodriguezlandscaping.com',
    image: '/placeholder-member.jpg',
    joinDate: '2021-02-28',
    status: 'active'
  },
  {
    id: '5',
    name: 'David Kim',
    company: 'Kim Roofing Solutions',
    email: 'david@kimroofing.com',
    phone: '(650) 555-0567',
    specialties: ['Roofing', 'Solar Panel Installation'],
    licenseNumber: 'C-39-567890',
    yearsExperience: 14,
    serviceAreas: 'Peninsula, San Mateo County',
    website: 'www.kimroofing.com',
    image: '/placeholder-member.jpg',
    joinDate: '2019-11-05',
    status: 'active'
  },
  {
    id: '6',
    name: 'Jennifer Williams',
    company: 'Williams Interior Design',
    email: 'jennifer@williamsinterior.com',
    phone: '(415) 555-0678',
    specialties: ['Interior Design', 'Space Planning'],
    licenseNumber: 'B-987654',
    yearsExperience: 10,
    serviceAreas: 'San Francisco, Marin County',
    website: 'www.williamsinterior.com',
    image: '/placeholder-member.jpg',
    joinDate: '2020-09-14',
    status: 'active'
  },
  {
    id: '7',
    name: 'Michael Brown',
    company: 'Brown Concrete Works',
    email: 'michael@brownconcrete.com',
    phone: '(707) 555-0789',
    specialties: ['Concrete Work', 'Foundation Repair'],
    licenseNumber: 'C-8-678901',
    yearsExperience: 18,
    serviceAreas: 'Napa Valley, Sonoma County',
    website: 'www.brownconcrete.com',
    image: '/placeholder-member.jpg',
    joinDate: '2017-05-20',
    status: 'active'
  },
  {
    id: '8',
    name: 'Lisa Davis',
    company: 'Davis General Contracting',
    email: 'lisa@daviscontracting.com',
    phone: '(831) 555-0890',
    specialties: ['General Contracting', 'Kitchen Remodeling'],
    licenseNumber: 'B-234567',
    yearsExperience: 16,
    serviceAreas: 'Monterey Bay Area',
    website: 'www.daviscontracting.com',
    image: '/placeholder-member.jpg',
    joinDate: '2018-12-03',
    status: 'active'
  },
  {
    id: '9',
    name: 'Anthony Garcia',
    company: 'Garcia Painting Services',
    email: 'anthony@garciapainting.com',
    phone: '(209) 555-0901',
    specialties: ['Painting', 'Drywall Repair'],
    licenseNumber: 'C-33-345678',
    yearsExperience: 11,
    serviceAreas: 'Central Valley, Stockton',
    website: 'www.garciapainting.com',
    image: '/placeholder-member.jpg',
    joinDate: '2020-04-18',
    status: 'active'
  },
  {
    id: '10',
    name: 'Patricia Wilson',
    company: 'Wilson HVAC Systems',
    email: 'patricia@wilsonhvac.com',
    phone: '(559) 555-1012',
    specialties: ['HVAC Installation', 'Energy Efficiency'],
    licenseNumber: 'C-20-456789',
    yearsExperience: 13,
    serviceAreas: 'Fresno, Central Valley',
    website: 'www.wilsonhvac.com',
    image: '/placeholder-member.jpg',
    joinDate: '2019-08-25',
    status: 'active'
  }
]

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get search parameters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const specialty = searchParams.get('specialty')
    const location = searchParams.get('location')

    let filteredMembers = mockMembers

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filteredMembers = filteredMembers.filter(member =>
        member.name.toLowerCase().includes(searchLower) ||
        member.company.toLowerCase().includes(searchLower) ||
        member.specialties.some(s => s.toLowerCase().includes(searchLower))
      )
    }

    // Apply specialty filter
    if (specialty) {
      filteredMembers = filteredMembers.filter(member =>
        member.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase()))
      )
    }

    // Apply location filter
    if (location) {
      filteredMembers = filteredMembers.filter(member =>
        member.serviceAreas.toLowerCase().includes(location.toLowerCase())
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        members: filteredMembers,
        total: filteredMembers.length,
        filters: {
          specialties: [...new Set(mockMembers.flatMap(m => m.specialties))].sort(),
          locations: [...new Set(mockMembers.map(m => m.serviceAreas).flatMap(area => 
            area.split(',').map(a => a.trim())
          ))].sort()
        }
      }
    })

  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}