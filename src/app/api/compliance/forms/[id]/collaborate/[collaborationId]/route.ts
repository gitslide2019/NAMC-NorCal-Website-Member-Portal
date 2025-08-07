import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; collaborationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      role,
      permissions,
      assignedSections,
      status
    } = body;

    // Verify the collaboration exists and user has permission to update it
    const collaboration = await prisma.formCollaboration.findFirst({
      where: {
        id: params.collaborationId,
        formInstanceId: params.id,
        OR: [
          {
            formInstance: {
              memberId: session.user.id
            }
          },
          {
            collaboratorId: session.user.id
          }
        ]
      },
      include: {
        formInstance: {
          select: {
            memberId: true
          }
        }
      }
    });

    if (!collaboration) {
      return NextResponse.json(
        { error: 'Collaboration not found or access denied' },
        { status: 404 }
      );
    }

    // Only form owner can update role and permissions
    const isFormOwner = collaboration.formInstance.memberId === session.user.id;
    const isCollaborator = collaboration.collaboratorId === session.user.id;

    if (!isFormOwner && !isCollaborator) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Collaborators can only update their own status
    const updateData: any = {};

    if (isFormOwner) {
      if (role) updateData.role = role;
      if (permissions) updateData.permissions = JSON.stringify(permissions);
      if (assignedSections) updateData.assignedSections = JSON.stringify(assignedSections);
    }

    if (status && (isFormOwner || isCollaborator)) {
      updateData.status = status;
      updateData.lastActivity = new Date();
    }

    const updatedCollaboration = await prisma.formCollaboration.update({
      where: { id: params.collaborationId },
      data: {
        ...updateData,
        updatedAt: new Date()
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
      ...updatedCollaboration,
      permissions: updatedCollaboration.permissions ? JSON.parse(updatedCollaboration.permissions) : {},
      assignedSections: updatedCollaboration.assignedSections ? JSON.parse(updatedCollaboration.assignedSections) : []
    };

    return NextResponse.json({
      success: true,
      collaboration: formattedCollaboration
    });

  } catch (error) {
    console.error('Error updating form collaboration:', error);
    return NextResponse.json(
      { error: 'Failed to update form collaboration' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; collaborationId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the collaboration exists and user has permission to delete it
    const collaboration = await prisma.formCollaboration.findFirst({
      where: {
        id: params.collaborationId,
        formInstanceId: params.id,
        OR: [
          {
            formInstance: {
              memberId: session.user.id
            }
          },
          {
            collaboratorId: session.user.id
          }
        ]
      },
      include: {
        formInstance: {
          select: {
            memberId: true
          }
        }
      }
    });

    if (!collaboration) {
      return NextResponse.json(
        { error: 'Collaboration not found or access denied' },
        { status: 404 }
      );
    }

    await prisma.formCollaboration.delete({
      where: { id: params.collaborationId }
    });

    return NextResponse.json({
      success: true,
      message: 'Collaboration removed successfully'
    });

  } catch (error) {
    console.error('Error removing form collaboration:', error);
    return NextResponse.json(
      { error: 'Failed to remove form collaboration' },
      { status: 500 }
    );
  }
}