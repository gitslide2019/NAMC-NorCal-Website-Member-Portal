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

    const document = await prisma.generatedDocument.findFirst({
      where: {
        id: params.id,
        memberId: session.user.id
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            templateType: true,
            complianceRules: true
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
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const formattedDocument = {
      ...document,
      documentData: document.documentData ? JSON.parse(document.documentData) : {},
      template: {
        ...document.template,
        complianceRules: document.template.complianceRules ? JSON.parse(document.template.complianceRules) : {}
      }
    };

    return NextResponse.json({
      success: true,
      document: formattedDocument
    });

  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document' },
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      documentContent,
      documentData,
      documentStatus,
      approvalStatus,
      complianceStatus,
      signatureStatus,
      signedDate,
      signatureUrl
    } = body;

    const document = await prisma.generatedDocument.findFirst({
      where: {
        id: params.id,
        memberId: session.user.id
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Create new version if content is updated
    let newVersion = document.version;
    if (documentContent && documentContent !== document.documentContent) {
      newVersion = document.version + 1;
      
      // Create version record
      await prisma.documentVersion.create({
        data: {
          documentId: params.id,
          versionNumber: newVersion,
          documentContent: documentContent,
          changeDescription: 'Document content updated',
          createdBy: session.user.id
        }
      });
    }

    const updatedDocument = await prisma.generatedDocument.update({
      where: { id: params.id },
      data: {
        documentContent: documentContent || document.documentContent,
        documentData: documentData ? JSON.stringify(documentData) : document.documentData,
        documentStatus: documentStatus || document.documentStatus,
        approvalStatus: approvalStatus || document.approvalStatus,
        complianceStatus: complianceStatus || document.complianceStatus,
        signatureStatus: signatureStatus || document.signatureStatus,
        signedDate: signedDate ? new Date(signedDate) : document.signedDate,
        signatureUrl: signatureUrl !== undefined ? signatureUrl : document.signatureUrl,
        version: newVersion,
        updatedAt: new Date()
      },
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
        }
      }
    });

    // Parse JSON fields for response
    const formattedDocument = {
      ...updatedDocument,
      documentData: JSON.parse(updatedDocument.documentData)
    };

    return NextResponse.json({
      success: true,
      document: formattedDocument
    });

  } catch (error) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const document = await prisma.generatedDocument.findFirst({
      where: {
        id: params.id,
        memberId: session.user.id
      }
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    await prisma.generatedDocument.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    );
  }
}