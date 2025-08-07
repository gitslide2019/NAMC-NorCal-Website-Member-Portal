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
    const templateType = searchParams.get('templateType');

    const where: any = {
      isActive: true
    };

    if (category) {
      where.category = category;
    }

    if (templateType) {
      where.templateType = templateType;
    }

    const templates = await prisma.documentTemplate.findMany({
      where,
      orderBy: {
        name: 'asc'
      }
    });

    // Parse JSON fields
    const formattedTemplates = templates.map(template => ({
      ...template,
      complianceRules: template.complianceRules ? JSON.parse(template.complianceRules) : {},
      autoFillMappings: template.autoFillMappings ? JSON.parse(template.autoFillMappings) : {},
      approvalWorkflow: template.approvalWorkflow ? JSON.parse(template.approvalWorkflow) : {}
    }));

    return NextResponse.json({
      success: true,
      templates: formattedTemplates
    });

  } catch (error) {
    console.error('Error fetching document templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document templates' },
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
      templateType,
      templateContent,
      complianceRules,
      autoFillMappings,
      approvalWorkflow,
      digitalSignatureRequired,
      version
    } = body;

    if (!name || !category || !templateType || !templateContent) {
      return NextResponse.json(
        { error: 'Name, category, template type, and content are required' },
        { status: 400 }
      );
    }

    const template = await prisma.documentTemplate.create({
      data: {
        name,
        description,
        category,
        templateType,
        templateContent,
        complianceRules: complianceRules ? JSON.stringify(complianceRules) : null,
        autoFillMappings: autoFillMappings ? JSON.stringify(autoFillMappings) : null,
        approvalWorkflow: approvalWorkflow ? JSON.stringify(approvalWorkflow) : null,
        digitalSignatureRequired: digitalSignatureRequired || false,
        version: version || '1.0',
        createdBy: session.user.id
      }
    });

    // Parse JSON fields for response
    const formattedTemplate = {
      ...template,
      complianceRules: template.complianceRules ? JSON.parse(template.complianceRules) : {},
      autoFillMappings: template.autoFillMappings ? JSON.parse(template.autoFillMappings) : {},
      approvalWorkflow: template.approvalWorkflow ? JSON.parse(template.approvalWorkflow) : {}
    };

    return NextResponse.json({
      success: true,
      template: formattedTemplate
    });

  } catch (error) {
    console.error('Error creating document template:', error);
    return NextResponse.json(
      { error: 'Failed to create document template' },
      { status: 500 }
    );
  }
}