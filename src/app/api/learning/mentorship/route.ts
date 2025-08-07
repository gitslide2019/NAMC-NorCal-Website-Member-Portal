import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId') || session.user.id;
    const type = searchParams.get('type'); // 'mentor', 'mentee', or 'all'

    // Check if user can access the requested member's mentorship connections
    if (memberId !== session.user.id && session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    let connections = [];

    if (!type || type === 'mentor' || type === 'all') {
      // Get connections where user is the mentor
      const mentorConnections = await prisma.mentorshipConnection.findMany({
        where: { mentorId: memberId },
        include: {
          mentee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      connections.push(...mentorConnections.map(conn => ({ ...conn, role: 'mentor' })));
    }

    if (!type || type === 'mentee' || type === 'all') {
      // Get connections where user is the mentee
      const menteeConnections = await prisma.mentorshipConnection.findMany({
        where: { menteeId: memberId },
        include: {
          mentor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      connections.push(...menteeConnections.map(conn => ({ ...conn, role: 'mentee' })));
    }

    // Parse JSON fields
    const parsedConnections = connections.map(conn => ({
      ...conn,
      menteeProgress: conn.menteeProgress ? JSON.parse(conn.menteeProgress) : null,
      mentorFeedback: conn.mentorFeedback ? JSON.parse(conn.mentorFeedback) : null,
      menteeFeedback: conn.menteeFeedback ? JSON.parse(conn.menteeFeedback) : null,
    }));

    return NextResponse.json({
      success: true,
      data: parsedConnections,
    });
  } catch (error) {
    console.error('Error fetching mentorship connections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mentorship connections' },
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

    const data = await request.json();

    // Validate required fields
    if (!data.mentorId || !data.menteeId || !data.connectionType) {
      return NextResponse.json(
        { error: 'Missing required fields: mentorId, menteeId, connectionType' },
        { status: 400 }
      );
    }

    // Validate connection type
    const validConnectionTypes = ['BADGE_BASED', 'SKILL_BASED', 'PROJECT_BASED', 'GENERAL'];
    if (!validConnectionTypes.includes(data.connectionType)) {
      return NextResponse.json(
        { error: 'Invalid connection type. Must be one of: ' + validConnectionTypes.join(', ') },
        { status: 400 }
      );
    }

    // Check if user is involved in this mentorship connection
    if (data.mentorId !== session.user.id && 
        data.menteeId !== session.user.id && 
        session.user.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if connection already exists
    const existingConnection = await prisma.mentorshipConnection.findFirst({
      where: {
        mentorId: data.mentorId,
        menteeId: data.menteeId,
        status: {
          in: ['PENDING', 'ACTIVE'],
        },
      },
    });

    if (existingConnection) {
      return NextResponse.json(
        { error: 'Mentorship connection already exists' },
        { status: 409 }
      );
    }

    const connection = await prisma.mentorshipConnection.create({
      data: {
        mentorId: data.mentorId,
        menteeId: data.menteeId,
        connectionType: data.connectionType,
        skillArea: data.skillArea,
        badgeId: data.badgeId,
        meetingFrequency: data.meetingFrequency,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
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
      data: connection,
    });
  } catch (error) {
    console.error('Error creating mentorship connection:', error);
    return NextResponse.json(
      { error: 'Failed to create mentorship connection' },
      { status: 500 }
    );
  }
}