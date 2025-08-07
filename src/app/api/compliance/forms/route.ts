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
    const templateId = searchParams.get('templateId');

    const where: any = {
      memberId: session.user.id
    };

    if (projectId) {
      where.projectId = projectId;
    }

    if (status) {
      where.formStatus = status;
    }

    if (templateId) {
      where.templateId = templateId;
    }

    const forms = await prisma.smartFormInstance.findMany({
      where,
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
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Parse JSON fields
    const formattedForms = forms.map(form => ({
      ...form,
      formData: form.formData ? JSON.parse(form.formData) : {},
      autoFilledFields: form.autoFilledFields ? JSON.parse(form.autoFilledFields) : []
    }));

    return NextResponse.json({
      success: true,
      forms: formattedForms
    });

  } catch (error) {
    console.error('Error fetching smart forms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch smart forms' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      templateId,
      formName,
      projectId,
      formData,
      autoFillData
    } = body;

    if (!templateId || !formName) {
      return NextResponse.json(
        { error: 'Template ID and form name are required' },
        { status: 400 }
      );
    }

    // Get template to validate and get auto-fill rules
    const template = await prisma.smartFormTemplate.findUnique({
      where: {
        id: templateId,
        isActive: true
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Form template not found' },
        { status: 404 }
      );
    }

    // Parse template data to get total steps
    const templateData = template.templateData ? JSON.parse(template.templateData) : {};
    const totalSteps = templateData.steps ? templateData.steps.length : 1;

    // Apply auto-fill rules if provided
    let processedFormData = formData || {};
    let autoFilledFields: string[] = [];

    if (autoFillData && template.autoFillRules) {
      const autoFillRules = JSON.parse(template.autoFillRules);
      const { filledData, filledFields } = await applyAutoFillRules(
        autoFillRules,
        autoFillData,
        processedFormData
      );
      processedFormData = filledData;
      autoFilledFields = filledFields;
    }

    // Calculate completion percentage
    const completionPercentage = calculateCompletionPercentage(
      processedFormData,
      templateData
    );

    const form = await prisma.smartFormInstance.create({
      data: {
        templateId,
        memberId: session.user.id,
        projectId,
        formName,
        formData: JSON.stringify(processedFormData),
        autoFilledFields: JSON.stringify(autoFilledFields),
        completionPercentage,
        totalSteps,
        formStatus: 'DRAFT'
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
        }
      }
    });

    // Parse JSON fields for response
    const formattedForm = {
      ...form,
      formData: JSON.parse(form.formData),
      autoFilledFields: JSON.parse(form.autoFilledFields)
    };

    return NextResponse.json({
      success: true,
      form: formattedForm
    });

  } catch (error) {
    console.error('Error creating smart form:', error);
    return NextResponse.json(
      { error: 'Failed to create smart form' },
      { status: 500 }
    );
  }
}

// Helper function to apply auto-fill rules
async function applyAutoFillRules(
  autoFillRules: any,
  autoFillData: any,
  formData: any
): Promise<{ filledData: any; filledFields: string[] }> {
  const filledData = { ...formData };
  const filledFields: string[] = [];

  for (const rule of autoFillRules.rules || []) {
    const { sourceField, targetField, transform } = rule;
    
    if (autoFillData[sourceField] !== undefined) {
      let value = autoFillData[sourceField];
      
      // Apply transformation if specified
      if (transform) {
        switch (transform.type) {
          case 'uppercase':
            value = value.toString().toUpperCase();
            break;
          case 'lowercase':
            value = value.toString().toLowerCase();
            break;
          case 'format_phone':
            value = formatPhoneNumber(value);
            break;
          case 'format_date':
            value = formatDate(value, transform.format);
            break;
        }
      }
      
      filledData[targetField] = value;
      filledFields.push(targetField);
    }
  }

  return { filledData, filledFields };
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

// Helper functions for transformations
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function formatDate(date: string, format: string): string {
  try {
    const d = new Date(date);
    if (format === 'MM/DD/YYYY') {
      return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
    }
    return date;
  } catch {
    return date;
  }
}