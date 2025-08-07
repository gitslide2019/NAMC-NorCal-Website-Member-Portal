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
    const category = searchParams.get('category');
    const industryType = searchParams.get('industryType');

    const where: any = {
      isActive: true
    };

    if (category) {
      where.category = category;
    }

    if (industryType) {
      where.industryType = industryType;
    }

    const templates = await prisma.smartFormTemplate.findMany({
      where,
      orderBy: {
        name: 'asc'
      }
    });

    // Parse JSON fields
    const formattedTemplates = templates.map(template => ({
      ...template,
      templateData: template.templateData ? JSON.parse(template.templateData) : {},
      autoFillRules: template.autoFillRules ? JSON.parse(template.autoFillRules) : {},
      validationRules: template.validationRules ? JSON.parse(template.validationRules) : {},
      complianceChecks: template.complianceChecks ? JSON.parse(template.complianceChecks) : {}
    }));

    return NextResponse.json({
      success: true,
      templates: formattedTemplates
    });

  } catch (error) {
    console.error('Error fetching form templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form templates' },
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
      version
    } = body;

    if (!name || !category || !templateData) {
      return NextResponse.json(
        { error: 'Name, category, and template data are required' },
        { status: 400 }
      );
    }

    const template = await prisma.smartFormTemplate.create({
      data: {
        name,
        description,
        category,
        industryType,
        templateData: JSON.stringify(templateData),
        autoFillRules: autoFillRules ? JSON.stringify(autoFillRules) : null,
        validationRules: validationRules ? JSON.stringify(validationRules) : null,
        complianceChecks: complianceChecks ? JSON.stringify(complianceChecks) : null,
        version: version || '1.0',
        createdBy: session.user.id
      }
    });

    // Parse JSON fields for response
    const formattedTemplate = {
      ...template,
      templateData: JSON.parse(template.templateData),
      autoFillRules: template.autoFillRules ? JSON.parse(template.autoFillRules) : {},
      validationRules: template.validationRules ? JSON.parse(template.validationRules) : {},
      complianceChecks: template.complianceChecks ? JSON.parse(template.complianceChecks) : {}
    };

    return NextResponse.json({
      success: true,
      template: formattedTemplate
    });

  } catch (error) {
    console.error('Error creating form template:', error);
    return NextResponse.json(
      { error: 'Failed to create form template' },
      { status: 500 }
    );
  }
}