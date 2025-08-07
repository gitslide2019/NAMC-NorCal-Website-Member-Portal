import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      collaboratorId,
      role,
      permissions,
      assignedSections
    } = body;

    if (!collaboratorId || !role) {
      return NextResponse.json(
        { error: 'Collaborator ID and role are required' },
        { status: 400 }
      );
    }

    // Verify the form exists and user has permission to add collaborators
    const form = await prisma.smartFormInstance.findFirst({
      where: {
        id: params.id,
        memberId: session.user.id
      }
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Smart form not found or access denied' },
        { status: 404 }
      );
    }

    // Verify collaborator exists
    const collaborator = await prisma.user.findUnique({
      where: { id: collaboratorId }
    });

    if (!collaborator) {
      return NextResponse.json(
        { error: 'Collaborator not found' },
        { status: 404 }
      );
    }

    // Check if collaboration already exists
    const existingCollaboration = await prisma.formCollaboration.findFirst({
      where: {
        formInstanceId: params.id,
        collaboratorId
      }
    });

    if (existingCollaboration) {
      return NextResponse.json(
        { error: 'User is already a collaborator on this form' },
        { status: 400 }
      );
    }

    const collaboration = await prisma.formCollaboration.create({
      data: {
        formInstanceId: params.id,
        collaboratorId,
        role,
        permissions: permissions ? JSON.stringify(permissions) : null,
        assignedSections: assignedSections ? JSON.stringify(assignedSections) : null,
        status: 'PENDING'
      },
      include: {
        collaborator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Parse JSON fields for response
    const formattedCollaboration = {
      ...collaboration,
      permissions: collaboration.permissions ? JSON.parse(collaboration.permissions) : {},
      assignedSections: collaboration.assignedSections ? JSON.parse(collaboration.assignedSections) : []
    };

    return NextResponse.json({
      success: true,
      collaboration: formattedCollaboration
    });

  } catch (error) {
    console.error('Error adding form collaborator:', error);
    return NextResponse.json(
      { error: 'Failed to add form collaborator' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to this form
    const form = await prisma.smartFormInstance.findFirst({
      where: {
        id: params.id,
        OR: [
          { memberId: session.user.id },
          {
            collaborations: {
              some: {
                collaboratorId: session.user.id
              }
            }
          }
        ]
      }
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Smart form not found or access denied' },
        { status: 404 }
      );
    }

    const collaborations = await prisma.formCollaboration.findMany({
      where: {
        formInstanceId: params.id
      },
      include: {
        collaborator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Parse JSON fields
    const formattedCollaborations = collaborations.map(collaboration => ({
      ...collaboration,
      permissions: collaboration.permissions ? JSON.parse(collaboration.permissions) : {},
      assignedSections: collaboration.assignedSections ? JSON.parse(collaboration.assignedSections) : []
    }));

    return NextResponse.json({
      success: true,
      collaborations: formattedCollaborations
    });

  } catch (error) {
    console.error('Error fetching form collaborations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form collaborations' },
      { status: 500 }
    );
  }
}