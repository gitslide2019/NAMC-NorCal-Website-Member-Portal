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

    const template = await prisma.smartFormTemplate.findUnique({
      where: {
        id: params.id,
        isActive: true
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Form template not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const formattedTemplate = {
      ...template,
      templateData: template.templateData ? JSON.parse(template.templateData) : {},
      autoFillRules: template.autoFillRules ? JSON.parse(template.autoFillRules) : {},
      validationRules: template.validationRules ? JSON.parse(template.validationRules) : {},
      complianceChecks: template.complianceChecks ? JSON.parse(template.complianceChecks) : {}
    };

    return NextResponse.json({
      success: true,
      template: formattedTemplate
    });

  } catch (error) {
    console.error('Error fetching form template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form template' },
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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (user?.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      industryType,
      templateData,
      autoFillRules,
      validationRules,
      complianceChecks,
      version,
      isActive
    } = body;

    const template = await prisma.smartFormTemplate.findUnique({
      where: { id: params.id }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Form template not found' },
        { status: 404 }
      );
    }

    const updatedTemplate = await prisma.smartFormTemplate.update({
      where: { id: params.id },
      data: {
        name: name || template.name,
        description: description !== undefined ? description : template.description,
        category: category || template.category,
        industryType: industryType !== undefined ? industryType : template.industryType,
        templateData: templateData ? JSON.stringify(templateData) : template.templateData,
        autoFillRules: autoFillRules ? JSON.stringify(autoFillRules) : template.autoFillRules,
        validationRules: validationRules ? JSON.stringify(validationRules) : template.validationRules,
        complianceChecks: complianceChecks ? JSON.stringify(complianceChecks) : template.complianceChecks,
        version: version || template.version,
        isActive: isActive !== undefined ? isActive : template.isActive,
        updatedAt: new Date()
      }
    });

    // Parse JSON fields for response
    const formattedTemplate = {
      ...updatedTemplate,
      templateData: JSON.parse(updatedTemplate.templateData),
      autoFillRules: updatedTemplate.autoFillRules ? JSON.parse(updatedTemplate.autoFillRules) : {},
      validationRules: updatedTemplate.validationRules ? JSON.parse(updatedTemplate.validationRules) : {},
      complianceChecks: updatedTemplate.complianceChecks ? JSON.parse(updatedTemplate.complianceChecks) : {}
    };

    return NextResponse.json({
      success: true,
      template: formattedTemplate
    });

  } catch (error) {
    console.error('Error updating form template:', error);
    return NextResponse.json(
      { error: 'Failed to update form template' },
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

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (user?.memberType !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const template = await prisma.smartFormTemplate.findUnique({
      where: { id: params.id }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Form template not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.smartFormTemplate.update({
      where: { id: params.id },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Form template deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting form template:', error);
    return NextResponse.json(
      { error: 'Failed to delete form template' },
      { status: 500 }
    );
  }
}