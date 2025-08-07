import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await prisma.mentorshipConnection.findUnique({
      where: { id: params.id },
      include: {
        mentor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        mentee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!connection) {
      return NextResponse.json({ error: 'Mentorship connection not found' }, { status: 404 });
    }

    // Check if user can access this connection
    if (connection.mentorId !== session.user.id && 
        connection.menteeId !== session.user.id && 
        session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...connection,
        menteeProgress: connection.menteeProgress ? JSON.parse(connection.menteeProgress) : null,
        mentorFeedback: connection.mentorFeedback ? JSON.parse(connection.mentorFeedback) : null,
        menteeFeedback: connection.menteeFeedback ? JSON.parse(connection.menteeFeedback) : null,
      },
    });
  } catch (error) {
    console.error('Error fetching mentorship connection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mentorship connection' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Get existing connection to check permissions
    const existingConnection = await prisma.mentorshipConnection.findUnique({
      where: { id: params.id },
    });

    if (!existingConnection) {
      return NextResponse.json({ error: 'Mentorship connection not found' }, { status: 404 });
    }

    // Check if user can update this connection
    if (existingConnection.mentorId !== session.user.id && 
        existingConnection.menteeId !== session.user.id && 
        session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Validate status if provided
    if (data.status) {
      const validStatuses = ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(data.status)) {
        return NextResponse.json(
          { error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    
    if (data.status) updateData.status = data.status;
    if (data.meetingFrequency) updateData.meetingFrequency = data.meetingFrequency;
    if (data.totalMeetings !== undefined) updateData.totalMeetings = data.totalMeetings;
    if (data.completedMeetings !== undefined) updateData.completedMeetings = data.completedMeetings;
    if (data.successRating !== undefined) updateData.successRating = data.successRating;
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    
    if (data.menteeProgress) {
      updateData.menteeProgress = JSON.stringify(data.menteeProgress);
    }
    
    if (data.mentorFeedback) {
      updateData.mentorFeedback = JSON.stringify(data.mentorFeedback);
    }
    
    if (data.menteeFeedback) {
      updateData.menteeFeedback = JSON.stringify(data.menteeFeedback);
    }

    const connection = await prisma.mentorshipConnection.update({
      where: { id: params.id },
      data: updateData,
      include: {
        mentor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        mentee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...connection,
        menteeProgress: connection.menteeProgress ? JSON.parse(connection.menteeProgress) : null,
        mentorFeedback: connection.mentorFeedback ? JSON.parse(connection.mentorFeedback) : null,
        menteeFeedback: connection.menteeFeedback ? JSON.parse(connection.menteeFeedback) : null,
      },
    });
  } catch (error) {
    console.error('Error updating mentorship connection:', error);
    return NextResponse.json(
      { error: 'Failed to update mentorship connection' },
      { status: 500 }
    );
  }
}