import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const collaborationId = searchParams.get('collaborationId');
    const fieldReference = searchParams.get('fieldReference');

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

    const where: any = {};
    if (collaborationId) {
      where.collaborationId = collaborationId;
    } else {
      // Get all comments for this form across all collaborations
      where.collaboration = {
        formInstanceId: params.id
      };
    }

    if (fieldReference) {
      where.fieldReference = fieldReference;
    }

    const comments = await prisma.formComment.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        collaboration: {
          select: {
            id: true,
            role: true,
            collaborator: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      comments
    });

  } catch (error) {
    console.error('Error fetching form comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form comments' },
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

    const body = await request.json();
    const {
      collaborationId,
      content,
      fieldReference,
      commentType
    } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Verify the collaboration exists and user has access
    let collaboration;
    if (collaborationId) {
      collaboration = await prisma.formCollaboration.findFirst({
        where: {
          id: collaborationId,
          formInstanceId: params.id,
          collaboratorId: session.user.id
        }
      });
    } else {
      // If no specific collaboration, check if user is form owner
      const form = await prisma.smartFormInstance.findFirst({
        where: {
          id: params.id,
          memberId: session.user.id
        }
      });

      if (form) {
        // Create a default collaboration for the form owner
        collaboration = await prisma.formCollaboration.create({
          data: {
            formInstanceId: params.id,
            collaboratorId: session.user.id,
            role: 'EDITOR',
            status: 'ACTIVE'
          }
        });
      }
    }

    if (!collaboration) {
      return NextResponse.json(
        { error: 'Collaboration not found or access denied' },
        { status: 404 }
      );
    }

    const comment = await prisma.formComment.create({
      data: {
        collaborationId: collaboration.id,
        authorId: session.user.id,
        content,
        fieldReference,
        commentType: commentType || 'GENERAL'
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        collaboration: {
          select: {
            id: true,
            role: true,
            collaborator: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      comment
    });

  } catch (error) {
    console.error('Error creating form comment:', error);
    return NextResponse.json(
      { error: 'Failed to create form comment' },
      { status: 500 }
    );
  }
}