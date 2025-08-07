import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const hubspotService = new HubSpotBackboneService();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '20');
    const committeeId = searchParams.get('committeeId');

    const whereClause: any = {};

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    if (type) {
      whereClause.type = type.toUpperCase();
    }

    if (committeeId) {
      whereClause.committeeId = committeeId;
    }

    // Mock events data
    const mockEvents = [
      {
        id: '1',
        title: 'Monthly Networking Mixer',
        description: 'Join fellow contractors for networking and collaboration opportunities.',
        type: 'networking',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'NAMC NorCal Office',
        isVirtual: false,
        meetingUrl: null,
        status: 'upcoming',
        attendees: 15,
        maxAttendees: 50,
        committee: null,
        organizer: 'Sarah Johnson',
        registrationRequired: true,
        registrationDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['networking', 'business']
      },
      {
        id: '2',
        title: 'Safety Committee Meeting',
        description: 'Monthly safety committee meeting to discuss new regulations and best practices.',
        type: 'committee_meeting',
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Virtual',
        isVirtual: true,
        meetingUrl: 'https://zoom.us/j/123456789',
        status: 'upcoming',
        attendees: 8,
        maxAttendees: 20,
        committee: 'Safety Committee',
        organizer: 'Michael Chen',
        registrationRequired: false,
        registrationDeadline: null,
        tags: ['safety', 'committee']
      },
      {
        id: '3',
        title: 'Construction Technology Workshop',
        description: 'Learn about the latest construction technology and digital tools.',
        type: 'workshop',
        date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
        location: 'Tech Center',
        isVirtual: false,
        meetingUrl: null,
        status: 'upcoming',
        attendees: 25,
        maxAttendees: 40,
        committee: null,
        organizer: 'David Rodriguez',
        registrationRequired: true,
        registrationDeadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['technology', 'education']
      }
    ];

    let filteredEvents = mockEvents;

    if (status) {
      filteredEvents = filteredEvents.filter(event => event.status === status);
    }

    if (type) {
      filteredEvents = filteredEvents.filter(event => event.type === type);
    }

    const formattedEvents = filteredEvents.slice(0, limit);

    return NextResponse.json(formattedEvents);

  } catch (error) {
    console.error('Error fetching community events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch community events' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      title,
      description,
      type,
      scheduledAt,
      location,
      isVirtual,
      meetingUrl,
      maxAttendees,
      committeeId,
      registrationRequired,
      registrationDeadline,
      tags
    } = body;

    // Validate required fields
    if (!title || !description || !type || !scheduledAt) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user can create events (admin or moderator)
    const canCreateEvent = ['ADMIN', 'MODERATOR'].includes(user.memberType);

    if (!canCreateEvent) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create events' },
        { status: 403 }
      );
    }

    // Mock event creation
    const event = {
      id: `event_${Date.now()}`,
      title,
      description,
      type: type.toUpperCase(),
      scheduledAt: new Date(scheduledAt),
      location,
      isVirtual: isVirtual || false,
      meetingUrl,
      maxAttendees,
      organizerId: user.id,
      committeeId,
      registrationRequired: registrationRequired || false,
      registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
      tags: tags || [],
      status: 'UPCOMING',
      organizer: {
        firstName: user.name?.split(' ')[0] || 'Unknown',
        lastName: user.name?.split(' ')[1] || 'User'
      },
      committee: committeeId ? { name: 'Sample Committee' } : null
    };

    // Create HubSpot event for tracking
    try {
      await hubspotService.createCommunityEvent({
        eventId: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        scheduledAt: event.scheduledAt.toISOString(),
        organizer: `${event.organizer.firstName} ${event.organizer.lastName}`,
        organizerId: member.id,
        committee: event.committee?.name,
        maxAttendees: event.maxAttendees
      });
    } catch (hubspotError) {
      console.error('Error creating HubSpot event:', hubspotError);
      // Continue without failing the request
    }

    // Mock notification sending
    console.log(`Event created: ${title} by ${user.name}`);

    return NextResponse.json({
      id: event.id,
      message: 'Event created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating community event:', error);
    return NextResponse.json(
      { error: 'Failed to create community event' },
      { status: 500 }
    );
  }
}