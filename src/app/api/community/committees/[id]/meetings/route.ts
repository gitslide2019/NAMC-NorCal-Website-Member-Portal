import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const prisma = new PrismaClient();
const hubspotService = new HubSpotBackboneService();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const committeeId = params.id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const upcoming = searchParams.get('upcoming') === 'true';

    // Check if user has access to this committee
    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
    });

    if (!committee) {
      return NextResponse.json(
        { error: 'Committee not found' },
        { status: 404 }
      );
    }

    const userMembership = await prisma.committeeMembership.findUnique({
      where: {
        committeeId_memberId: {
          committeeId,
          memberId: session.user.id,
        },
      },
    });

    if (!committee.isPublic && !userMembership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Build where clause
    const where: any = { committeeId };

    if (status) {
      where.status = status;
    }

    if (upcoming) {
      where.scheduledDate = { gte: new Date() };
    }

    // Get meetings
    const meetings = await prisma.committeeMeeting.findMany({
      where,
      include: {
        attendees: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                email: true,
                company: true,
              },
            },
          },
        },
        _count: {
          select: {
            attendees: {
              where: { status: 'ATTENDED' }
            }
          }
        }
      },
      orderBy: {
        scheduledDate: upcoming ? 'asc' : 'desc',
      },
    });

    // Check user's attendance status for each meeting
    const meetingsWithAttendance = meetings.map(meeting => {
      const userAttendance = meeting.attendees.find(
        attendance => attendance.memberId === session.user.id
      );

      return {
        ...meeting,
        actualAttendeeCount: meeting._count.attendees,
        userAttendance,
        _count: undefined,
      };
    });

    return NextResponse.json({ meetings: meetingsWithAttendance });
  } catch (error) {
    console.error('Error fetching committee meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch committee meetings' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const committeeId = params.id;
    const body = await request.json();
    const {
      title,
      description,
      scheduledDate,
      duration = 60,
      location,
      meetingType = 'REGULAR',
      agenda = [],
    } = body;

    // Check if user can schedule meetings
    const committee = await prisma.committee.findUnique({
      where: { id: committeeId },
    });

    if (!committee) {
      return NextResponse.json(
        { error: 'Committee not found' },
        { status: 404 }
      );
    }

    const userMembership = await prisma.committeeMembership.findUnique({
      where: {
        committeeId_memberId: {
          committeeId,
          memberId: session.user.id,
        },
      },
    });

    if (committee.chairId !== session.user.id && !userMembership?.canModerate) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!title || !scheduledDate) {
      return NextResponse.json(
        { error: 'Title and scheduled date are required' },
        { status: 400 }
      );
    }

    // Create meeting
    const meeting = await prisma.committeeMeeting.create({
      data: {
        committeeId,
        title,
        description,
        scheduledDate: new Date(scheduledDate),
        duration,
        location,
        meetingType,
        agenda: JSON.stringify(agenda),
        hubspotSyncStatus: 'PENDING',
      },
    });

    // Create attendance records for all active committee members
    const activeMembers = await prisma.committeeMembership.findMany({
      where: {
        committeeId,
        status: 'ACTIVE',
      },
      select: { memberId: true },
    });

    if (activeMembers.length > 0) {
      await prisma.meetingAttendance.createMany({
        data: activeMembers.map(member => ({
          meetingId: meeting.id,
          memberId: member.memberId,
          status: 'INVITED',
        })),
      });

      // Update meeting attendee count
      await prisma.committeeMeeting.update({
        where: { id: meeting.id },
        data: { attendeeCount: activeMembers.length },
      });
    }

    // Update committee next meeting date if this is the earliest upcoming meeting
    const upcomingMeetings = await prisma.committeeMeeting.findMany({
      where: {
        committeeId,
        scheduledDate: { gte: new Date() },
        status: 'SCHEDULED',
      },
      orderBy: { scheduledDate: 'asc' },
      take: 1,
    });

    if (upcomingMeetings.length > 0) {
      await prisma.committee.update({
        where: { id: committeeId },
        data: { nextMeeting: upcomingMeetings[0].scheduledDate },
      });
    }

    // Sync to HubSpot in background
    try {
      await hubspotService.createCommitteeMeeting({
        meetingId: meeting.id,
        committeeId,
        title,
        description,
        scheduledDate,
        duration,
        location,
        meetingType,
        agenda,
        createdBy: session.user.id,
      });
    } catch (hubspotError) {
      console.error('HubSpot sync error:', hubspotError);
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error('Error creating committee meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create committee meeting' },
      { status: 500 }
    );
  }
}