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
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            industryType: true,
            templateData: true,
            validationRules: true,
            complianceChecks: true
          }
        },
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        collaborations: {
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
          }
        }
      }
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Smart form not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const formattedForm = {
      ...form,
      formData: form.formData ? JSON.parse(form.formData) : {},
      autoFilledFields: form.autoFilledFields ? JSON.parse(form.autoFilledFields) : [],
      template: {
        ...form.template,
        templateData: form.template.templateData ? JSON.parse(form.template.templateData) : {},
        validationRules: form.template.validationRules ? JSON.parse(form.template.validationRules) : {},
        complianceChecks: form.template.complianceChecks ? JSON.parse(form.template.complianceChecks) : {}
      }
    };

    return NextResponse.json({
      success: true,
      form: formattedForm
    });

  } catch (error) {
    console.error('Error fetching smart form:', error);
    return NextResponse.json(
      { error: 'Failed to fetch smart form' },
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
      formData,
      currentStep,
      formStatus,
      submittedDate,
      approvedDate,
      assignedTo,
      reviewNotes
    } = body;

    // Check if user has access to this form
    const form = await prisma.smartFormInstance.findFirst({
      where: {
        id: params.id,
        OR: [
          { memberId: session.user.id },
          {
            collaborations: {
              some: {
                collaboratorId: session.user.id,
                role: { in: ['EDITOR', 'REVIEWER', 'APPROVER'] }
              }
            }
          }
        ]
      },
      include: {
        template: true
      }
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Smart form not found or access denied' },
        { status: 404 }
      );
    }

    // Calculate completion percentage if form data is updated
    let completionPercentage = form.completionPercentage;
    if (formData) {
      const templateData = form.template.templateData ? JSON.parse(form.template.templateData) : {};
      completionPercentage = calculateCompletionPercentage(formData, templateData);
    }

    const updatedForm = await prisma.smartFormInstance.update({
      where: { id: params.id },
      data: {
        formData: formData ? JSON.stringify(formData) : form.formData,
        currentStep: currentStep !== undefined ? currentStep : form.currentStep,
        completionPercentage,
        formStatus: formStatus || form.formStatus,
        submittedDate: submittedDate ? new Date(submittedDate) : form.submittedDate,
        approvedDate: approvedDate ? new Date(approvedDate) : form.approvedDate,
        assignedTo: assignedTo !== undefined ? assignedTo : form.assignedTo,
        reviewNotes: reviewNotes !== undefined ? reviewNotes : form.reviewNotes,
        updatedAt: new Date()
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true,
            industryType: true
          }
        },
        member: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        collaborations: {
          include: {
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

    // Parse JSON fields for response
    const formattedForm = {
      ...updatedForm,
      formData: JSON.parse(updatedForm.formData),
      autoFilledFields: JSON.parse(updatedForm.autoFilledFields)
    };

    return NextResponse.json({
      success: true,
      form: formattedForm
    });

  } catch (error) {
    console.error('Error updating smart form:', error);
    return NextResponse.json(
      { error: 'Failed to update smart form' },
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

    const form = await prisma.smartFormInstance.findFirst({
      where: {
        id: params.id,
        memberId: session.user.id
      }
    });

    if (!form) {
      return NextResponse.json(
        { error: 'Smart form not found' },
        { status: 404 }
      );
    }

    await prisma.smartFormInstance.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Smart form deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting smart form:', error);
    return NextResponse.json(
      { error: 'Failed to delete smart form' },
      { status: 500 }
    );
  }
}

// Helper function to calculate completion percentage
function calculateCompletionPercentage(formData: any, templateData: any): number {
  if (!templateData.fields || templateData.fields.length === 0) {
    return 0;
  }

  const requiredFields = templateData.fields.filter((field: any) => field.required);
  if (requiredFields.length === 0) {
    return 100;
  }

  const completedFields = requiredFields.filter((field: any) => {
    const value = formData[field.name];
    return value !== undefined && value !== null && value !== '';
  });

  return Math.round((completedFields.length / requiredFields.length) * 100);
}