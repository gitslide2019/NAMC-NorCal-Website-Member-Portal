import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      templateId,
      documentName,
      documentData,
      projectId,
      requiresSignature
    } = body;

    if (!templateId || !documentName || !documentData) {
      return NextResponse.json(
        { error: 'Template ID, document name, and data are required' },
        { status: 400 }
      );
    }

    // Get template
    const template = await prisma.documentTemplate.findUnique({
      where: {
        id: templateId,
        isActive: true
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Document template not found' },
        { status: 404 }
      );
    }

    // Apply auto-fill mappings
    const autoFillMappings = template.autoFillMappings ? JSON.parse(template.autoFillMappings) : {};
    const processedData = await applyAutoFillMappings(documentData, autoFillMappings, session.user.id);

    // Generate document content
    const documentContent = await generateDocumentContent(
      template.templateContent,
      processedData
    );

    // Check compliance rules
    const complianceRules = template.complianceRules ? JSON.parse(template.complianceRules) : {};
    const complianceStatus = await checkComplianceRules(processedData, complianceRules);

    // Create document record
    const document = await prisma.generatedDocument.create({
      data: {
        templateId,
        memberId: session.user.id,
        projectId,
        documentName,
        documentContent,
        documentData: JSON.stringify(processedData),
        documentStatus: 'GENERATED',
        complianceStatus,
        requiresSignature: requiresSignature || template.digitalSignatureRequired,
        version: 1
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
        }
      }
    });

    // Create approval workflow if defined
    const approvalWorkflow = template.approvalWorkflow ? JSON.parse(template.approvalWorkflow) : null;
    if (approvalWorkflow && approvalWorkflow.steps) {
      await createApprovalWorkflow(document.id, approvalWorkflow.steps);
    }

    // Parse JSON fields for response
    const formattedDocument = {
      ...document,
      documentData: JSON.parse(document.documentData)
    };

    return NextResponse.json({
      success: true,
      document: formattedDocument
    });

  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}

// Helper function to apply auto-fill mappings
async function applyAutoFillMappings(
  documentData: any,
  autoFillMappings: any,
  memberId: string
): Promise<any> {
  const processedData = { ...documentData };

  // Get member data for auto-fill
  const member = await prisma.user.findUnique({
    where: { id: memberId }
  });

  if (!member) return processedData;

  // Apply member data mappings
  if (autoFillMappings.memberFields) {
    for (const mapping of autoFillMappings.memberFields) {
      const { sourceField, targetField, transform } = mapping;
      let value = (member as any)[sourceField];

      if (value !== undefined) {
        // Apply transformation if specified
        if (transform) {
          value = applyTransformation(value, transform);
        }
        processedData[targetField] = value;
      }
    }
  }

  // Apply current date/time mappings
  if (autoFillMappings.dateFields) {
    const now = new Date();
    for (const mapping of autoFillMappings.dateFields) {
      const { targetField, format } = mapping;
      processedData[targetField] = formatDate(now, format);
    }
  }

  return processedData;
}

// Helper function to generate document content
async function generateDocumentContent(
  templateContent: string,
  documentData: any
): Promise<string> {
  let content = templateContent;

  // Replace placeholders with actual data
  for (const [key, value] of Object.entries(documentData)) {
    const placeholder = `{{${key}}}`;
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    content = content.replace(regex, String(value || ''));
  }

  // Handle conditional sections
  content = processConditionalSections(content, documentData);

  // Handle loops/repeating sections
  content = processRepeatingsections(content, documentData);

  return content;
}

// Helper function to check compliance rules
async function checkComplianceRules(
  documentData: any,
  complianceRules: any
): Promise<string> {
  if (!complianceRules.rules || complianceRules.rules.length === 0) {
    return 'COMPLIANT';
  }

  for (const rule of complianceRules.rules) {
    const { field, required, minLength, maxLength, pattern } = rule;
    const value = documentData[field];

    if (required && (!value || value.toString().trim() === '')) {
      return 'NON_COMPLIANT';
    }

    if (value && minLength && value.toString().length < minLength) {
      return 'NON_COMPLIANT';
    }

    if (value && maxLength && value.toString().length > maxLength) {
      return 'NON_COMPLIANT';
    }

    if (value && pattern && !new RegExp(pattern).test(value.toString())) {
      return 'NON_COMPLIANT';
    }
  }

  return 'COMPLIANT';
}

// Helper function to create approval workflow
async function createApprovalWorkflow(
  documentId: string,
  workflowSteps: any[]
): Promise<void> {
  for (let i = 0; i < workflowSteps.length; i++) {
    const step = workflowSteps[i];
    await prisma.documentApproval.create({
      data: {
        documentId,
        approverId: step.approverId,
        approvalStep: i + 1,
        approvalStatus: 'PENDING'
      }
    });
  }
}

// Helper functions for transformations and formatting
function applyTransformation(value: any, transform: any): any {
  switch (transform.type) {
    case 'uppercase':
      return value.toString().toUpperCase();
    case 'lowercase':
      return value.toString().toLowerCase();
    case 'capitalize':
      return value.toString().charAt(0).toUpperCase() + value.toString().slice(1).toLowerCase();
    default:
      return value;
  }
}

function formatDate(date: Date, format: string): string {
  switch (format) {
    case 'MM/DD/YYYY':
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
    case 'YYYY-MM-DD':
      return date.toISOString().split('T')[0];
    case 'long':
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    default:
      return date.toISOString();
  }
}

function processConditionalSections(content: string, data: any): string {
  // Process {{#if field}} ... {{/if}} sections
  const ifRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  return content.replace(ifRegex, (match, field, section) => {
    return data[field] ? section : '';
  });
}

function processRepeatingSection(content: string, data: any): string {
  // Process {{#each array}} ... {{/each}} sections
  const eachRegex = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  return content.replace(eachRegex, (match, arrayField, section) => {
    const array = data[arrayField];
    if (!Array.isArray(array)) return '';
    
    return array.map(item => {
      let itemSection = section;
      for (const [key, value] of Object.entries(item)) {
        const placeholder = `{{${key}}}`;
        const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        itemSection = itemSection.replace(regex, String(value || ''));
      }
      return itemSection;
    }).join('');
  });
}

