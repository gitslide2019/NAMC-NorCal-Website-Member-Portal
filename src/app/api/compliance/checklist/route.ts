import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isCompleted: boolean;
  dueDate?: string;
  regulatoryReference?: string;
  requiredDocuments?: string[];
  completionNotes?: string;
  completedDate?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status'); // completed, pending, overdue

    // Generate compliance checklist based on member's projects and requirements
    const checklist = await generateComplianceChecklist(session.user.id, {
      category,
      projectId,
      status
    });

    return NextResponse.json({
      success: true,
      checklist,
      summary: {
        total: checklist.length,
        completed: checklist.filter(item => item.isCompleted).length,
        pending: checklist.filter(item => !item.isCompleted).length,
        overdue: checklist.filter(item => {
          if (item.isCompleted || !item.dueDate) return false;
          return new Date(item.dueDate) < new Date();
        }).length
      }
    });

  } catch (error) {
    console.error('Error generating compliance checklist:', error);
    return NextResponse.json(
      { error: 'Failed to generate compliance checklist' },
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
    const { itemId, isCompleted, completionNotes } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, this would update a checklist item in the database
    // For now, we'll return a success response
    const updatedItem = {
      id: itemId,
      isCompleted: isCompleted ?? false,
      completionNotes,
      completedDate: isCompleted ? new Date().toISOString() : null
    };

    return NextResponse.json({
      success: true,
      item: updatedItem
    });

  } catch (error) {
    console.error('Error updating checklist item:', error);
    return NextResponse.json(
      { error: 'Failed to update checklist item' },
      { status: 500 }
    );
  }
}

async function generateComplianceChecklist(
  memberId: string,
  filters: { category?: string | null; projectId?: string | null; status?: string | null }
): Promise<ChecklistItem[]> {
  const checklist: ChecklistItem[] = [];

  // Get member information
  const member = await prisma.user.findUnique({
    where: { id: memberId }
  });

  if (!member) return checklist;

  // Get member's compliance reviews and deadlines
  const reviews = await prisma.complianceReview.findMany({
    where: { memberId }
  });

  const deadlines = await prisma.complianceDeadline.findMany({
    where: { memberId }
  });

  // Generate basic compliance checklist items
  const baseItems: Omit<ChecklistItem, 'id' | 'isCompleted'>[] = [
    {
      title: 'Contractor License Verification',
      description: 'Ensure your contractor license is current and valid',
      category: 'LICENSING',
      priority: 'CRITICAL',
      dueDate: getNextRenewalDate('license'),
      regulatoryReference: 'California Contractors State License Board',
      requiredDocuments: ['Current contractor license', 'License bond certificate']
    },
    {
      title: 'General Liability Insurance',
      description: 'Maintain minimum $1M general liability insurance coverage',
      category: 'INSURANCE',
      priority: 'CRITICAL',
      dueDate: getNextRenewalDate('insurance'),
      regulatoryReference: 'California Business and Professions Code Section 7071.9',
      requiredDocuments: ['Insurance certificate', 'Policy declarations page']
    },
    {
      title: 'Workers\' Compensation Insurance',
      description: 'Maintain current workers\' compensation coverage',
      category: 'INSURANCE',
      priority: 'HIGH',
      dueDate: getNextRenewalDate('workers_comp'),
      regulatoryReference: 'California Labor Code Section 3700',
      requiredDocuments: ['Workers\' comp certificate', 'Coverage verification']
    },
    {
      title: 'Business License Renewal',
      description: 'Renew local business license and permits',
      category: 'LICENSING',
      priority: 'HIGH',
      dueDate: getNextRenewalDate('business_license'),
      regulatoryReference: 'Local municipal requirements',
      requiredDocuments: ['Business license application', 'Fee payment receipt']
    },
    {
      title: 'Safety Training Compliance',
      description: 'Complete required Cal/OSHA safety training for all workers',
      category: 'SAFETY',
      priority: 'HIGH',
      dueDate: getNextRenewalDate('safety_training'),
      regulatoryReference: 'Cal/OSHA Construction Safety Orders',
      requiredDocuments: ['Training certificates', 'Attendance records']
    },
    {
      title: 'Prevailing Wage Compliance',
      description: 'Ensure compliance with prevailing wage requirements for public projects',
      category: 'PAYROLL',
      priority: 'MEDIUM',
      regulatoryReference: 'California Labor Code Section 1770',
      requiredDocuments: ['Certified payroll records', 'Wage determination sheets']
    },
    {
      title: 'Environmental Compliance Review',
      description: 'Review and comply with environmental regulations (CEQA, etc.)',
      category: 'ENVIRONMENTAL',
      priority: 'MEDIUM',
      regulatoryReference: 'California Environmental Quality Act (CEQA)',
      requiredDocuments: ['Environmental impact assessments', 'Mitigation measures']
    },
    {
      title: 'Building Code Compliance',
      description: 'Ensure all work complies with current California Building Code',
      category: 'BUILDING_CODE',
      priority: 'HIGH',
      regulatoryReference: 'California Building Code (CBC)',
      requiredDocuments: ['Building permits', 'Inspection reports']
    },
    {
      title: 'Tax Compliance Verification',
      description: 'Verify all business taxes are current and properly filed',
      category: 'TAX',
      priority: 'MEDIUM',
      dueDate: getNextRenewalDate('tax_filing'),
      regulatoryReference: 'California Revenue and Taxation Code',
      requiredDocuments: ['Tax returns', 'Payment confirmations']
    },
    {
      title: 'Contract Documentation Review',
      description: 'Review all contracts for compliance with state and local requirements',
      category: 'CONTRACT',
      priority: 'MEDIUM',
      regulatoryReference: 'California Civil Code',
      requiredDocuments: ['Signed contracts', 'Change orders', 'Lien waivers']
    }
  ];

  // Convert base items to checklist items with completion status
  baseItems.forEach((item, index) => {
    const checklistItem: ChecklistItem = {
      id: `checklist_${index + 1}`,
      ...item,
      isCompleted: false // In real implementation, check against database
    };

    // Apply filters
    if (filters.category && item.category !== filters.category) {
      return;
    }

    // Check completion status based on existing reviews and deadlines
    const relatedReview = reviews.find(r => 
      r.documentType.toLowerCase().includes(item.category.toLowerCase()) ||
      r.documentName.toLowerCase().includes(item.title.toLowerCase())
    );

    const relatedDeadline = deadlines.find(d =>
      d.deadlineType.toLowerCase().includes(item.category.toLowerCase()) ||
      d.title.toLowerCase().includes(item.title.toLowerCase())
    );

    if (relatedReview && relatedReview.complianceStatus === 'COMPLIANT') {
      checklistItem.isCompleted = true;
      checklistItem.completedDate = relatedReview.reviewDate.toISOString();
    }

    if (relatedDeadline && relatedDeadline.status === 'COMPLETED') {
      checklistItem.isCompleted = true;
      checklistItem.completedDate = relatedDeadline.completedDate?.toISOString();
      checklistItem.completionNotes = 'Completed via compliance deadline tracking';
    }

    // Apply status filter
    if (filters.status) {
      const now = new Date();
      const isOverdue = checklistItem.dueDate && new Date(checklistItem.dueDate) < now && !checklistItem.isCompleted;
      
      if (filters.status === 'completed' && !checklistItem.isCompleted) return;
      if (filters.status === 'pending' && checklistItem.isCompleted) return;
      if (filters.status === 'overdue' && !isOverdue) return;
    }

    checklist.push(checklistItem);
  });

  return checklist;
}

function getNextRenewalDate(type: string): string {
  const now = new Date();
  const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  switch (type) {
    case 'license':
      // Contractor licenses typically expire every 2 years
      return new Date(now.getFullYear() + 2, 11, 31).toISOString(); // Dec 31, 2 years from now
    case 'insurance':
    case 'workers_comp':
      // Insurance typically renews annually
      return nextYear.toISOString();
    case 'business_license':
      // Business licenses typically expire at year end
      return new Date(now.getFullYear() + 1, 11, 31).toISOString();
    case 'safety_training':
      // Safety training typically required annually
      return nextYear.toISOString();
    case 'tax_filing':
      // Tax filing deadline (April 15)
      const taxYear = now.getMonth() >= 3 ? now.getFullYear() + 1 : now.getFullYear();
      return new Date(taxYear, 3, 15).toISOString(); // April 15
    default:
      return nextYear.toISOString();
  }
}