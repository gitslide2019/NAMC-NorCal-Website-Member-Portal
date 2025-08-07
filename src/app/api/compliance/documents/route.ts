import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    const where: any = {
      memberId: session.user.id
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.documentStatus = status;
    }

    if (category) {
      where.template = {
        category
      };
    }

    const documents = await prisma.generatedDocument.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            templateType: true
          }
        },
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            approvalStep: 'asc'
          }
        },
        versions: {
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            versionNumber: 'desc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Parse JSON fields
    const formattedDocuments = documents.map(document => ({
      ...document,
      documentData: document.documentData ? JSON.parse(document.documentData) : {}
    }));

    return NextResponse.json({
      success: true,
      documents: formattedDocuments
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}