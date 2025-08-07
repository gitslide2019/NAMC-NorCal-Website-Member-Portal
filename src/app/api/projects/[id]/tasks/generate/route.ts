import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { HubSpotBackboneService } from '@/lib/services/hubspot-backbone.service';

const hubspotService = new HubSpotBackboneService({
  accessToken: process.env.HUBSPOT_ACCESS_TOKEN!,
  portalId: process.env.HUBSPOT_PORTAL_ID
});

interface TaskTemplate {
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  type: string;
  daysFromStart: number;
  dependencies?: string[];
  assigneeRole?: string;
}

const PROJECT_TASK_TEMPLATES: Record<string, TaskTemplate[]> = {
  residential: [
    {
      subject: 'Obtain Building Permits',
      description: 'Submit permit applications and obtain all required building permits',
      priority: 'HIGH',
      type: 'APPROVAL',
      daysFromStart: 0,
      assigneeRole: 'Project Manager'
    },
    {
      subject: 'Site Preparation and Survey',
      description: 'Prepare construction site and conduct land survey',
      priority: 'HIGH',
      type: 'TODO',
      daysFromStart: 7,
      dependencies: ['Obtain Building Permits'],
      assigneeRole: 'Site Supervisor'
    },
    {
      subject: 'Foundation Work',
      description: 'Complete foundation excavation and construction',
      priority: 'HIGH',
      type: 'TODO',
      daysFromStart: 14,
      dependencies: ['Site Preparation and Survey'],
      assigneeRole: 'Site Supervisor'
    },
    {
      subject: 'Framing Construction',
      description: 'Complete structural framing of the building',
      priority: 'HIGH',
      type: 'TODO',
      daysFromStart: 28,
      dependencies: ['Foundation Work'],
      assigneeRole: 'Site Supervisor'
    },
    {
      subject: 'MEP Rough-In',
      description: 'Install mechanical, electrical, and plumbing systems',
      priority: 'MEDIUM',
      type: 'TODO',
      daysFromStart: 45,
      dependencies: ['Framing Construction'],
      assigneeRole: 'Site Supervisor'
    },
    {
      subject: 'Insulation and Drywall',
      description: 'Install insulation and complete drywall work',
      priority: 'MEDIUM',
      type: 'TODO',
      daysFromStart: 70,
      dependencies: ['MEP Rough-In'],
      assigneeRole: 'Site Supervisor'
    },
    {
      subject: 'Interior Finishes',
      description: 'Complete flooring, painting, and interior finishes',
      priority: 'MEDIUM',
      type: 'TODO',
      daysFromStart: 85,
      dependencies: ['Insulation and Drywall'],
      assigneeRole: 'Site Supervisor'
    },
    {
      subject: 'Final Inspection',
      description: 'Conduct final building inspection and obtain certificate of occupancy',
      priority: 'HIGH',
      type: 'REVIEW',
      daysFromStart: 110,
      dependencies: ['Interior Finishes'],
      assigneeRole: 'Quality Inspector'
    }
  ],
  commercial: [
    {
      subject: 'Site Assessment and Planning',
      description: 'Conduct thorough site assessment and develop project plan',
      priority: 'HIGH',
      type: 'REVIEW',
      daysFromStart: 0,
      assigneeRole: 'Project Manager'
    },
    {
      subject: 'Permit Applications',
      description: 'Submit commercial permits and obtain approvals',
      priority: 'HIGH',
      type: 'APPROVAL',
      daysFromStart: 3,
      dependencies: ['Site Assessment and Planning'],
      assigneeRole: 'Project Manager'
    },
    {
      subject: 'Safety Plan Development',
      description: 'Develop comprehensive safety plan for commercial work',
      priority: 'HIGH',
      type: 'TODO',
      daysFromStart: 7,
      assigneeRole: 'Safety Coordinator'
    },
    {
      subject: 'Site Preparation',
      description: 'Prepare commercial site for construction',
      priority: 'HIGH',
      type: 'TODO',
      daysFromStart: 14,
      dependencies: ['Permit Applications', 'Safety Plan Development'],
      assigneeRole: 'Site Supervisor'
    },
    {
      subject: 'Structural Work',
      description: 'Complete structural construction or modifications',
      priority: 'HIGH',
      type: 'TODO',
      daysFromStart: 28,
      dependencies: ['Site Preparation'],
      assigneeRole: 'Site Supervisor'
    },
    {
      subject: 'MEP Systems Installation',
      description: 'Install commercial-grade MEP systems',
      priority: 'HIGH',
      type: 'TODO',
      daysFromStart: 42,
      dependencies: ['Structural Work'],
      assigneeRole: 'Site Supervisor'
    },
    {
      subject: 'Interior Build-Out',
      description: 'Complete commercial interior construction',
      priority: 'MEDIUM',
      type: 'TODO',
      daysFromStart: 60,
      dependencies: ['MEP Systems Installation'],
      assigneeRole: 'Site Supervisor'
    },
    {
      subject: 'Final Systems Testing',
      description: 'Test all building systems and ensure proper operation',
      priority: 'HIGH',
      type: 'REVIEW',
      daysFromStart: 80,
      dependencies: ['Interior Build-Out'],
      assigneeRole: 'Safety Coordinator'
    }
  ],
  industrial: [
    {
      subject: 'Safety Assessment',
      description: 'Conduct comprehensive safety assessment for industrial work',
      priority: 'HIGH',
      type: 'REVIEW',
      daysFromStart: 0,
      assigneeRole: 'Safety Coordinator'
    },
    {
      subject: 'Equipment Shutdown Planning',
      description: 'Plan equipment shutdown procedures and schedules',
      priority: 'HIGH',
      type: 'TODO',
      daysFromStart: 2,
      dependencies: ['Safety Assessment'],
      assigneeRole: 'Maintenance Supervisor'
    },
    {
      subject: 'Specialized Permits',
      description: 'Obtain specialized industrial permits and certifications',
      priority: 'HIGH',
      type: 'APPROVAL',
      daysFromStart: 5,
      assigneeRole: 'Project Manager'
    },
    {
      subject: 'Equipment Installation/Maintenance',
      description: 'Complete industrial equipment work',
      priority: 'HIGH',
      type: 'TODO',
      daysFromStart: 14,
      dependencies: ['Equipment Shutdown Planning', 'Specialized Permits'],
      assigneeRole: 'Maintenance Supervisor'
    },
    {
      subject: 'System Testing and Calibration',
      description: 'Test and calibrate industrial systems',
      priority: 'HIGH',
      type: 'REVIEW',
      daysFromStart: 21,
      dependencies: ['Equipment Installation/Maintenance'],
      assigneeRole: 'Quality Inspector'
    },
    {
      subject: 'Equipment Startup',
      description: 'Follow startup procedures and verify operation',
      priority: 'HIGH',
      type: 'TODO',
      daysFromStart: 25,
      dependencies: ['System Testing and Calibration'],
      assigneeRole: 'Maintenance Supervisor'
    }
  ]
};

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const body = await request.json();
    const { 
      templateType, 
      projectStartDate, 
      assigneeMapping = {},
      customTasks = []
    } = body;

    // Get project details from HubSpot
    const project = await hubspotService.getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Determine task template to use
    let taskTemplates: TaskTemplate[] = [];
    
    if (templateType && PROJECT_TASK_TEMPLATES[templateType]) {
      taskTemplates = PROJECT_TASK_TEMPLATES[templateType];
    } else if (customTasks.length > 0) {
      taskTemplates = customTasks;
    } else {
      // Default to general project management tasks
      taskTemplates = [
        {
          subject: 'Project Kickoff',
          description: 'Conduct project kickoff meeting and establish team communication',
          priority: 'HIGH',
          type: 'MEETING',
          daysFromStart: 0,
          assigneeRole: 'Project Manager'
        },
        {
          subject: 'Resource Planning',
          description: 'Plan and allocate project resources',
          priority: 'HIGH',
          type: 'TODO',
          daysFromStart: 2,
          dependencies: ['Project Kickoff'],
          assigneeRole: 'Project Manager'
        },
        {
          subject: 'Progress Review',
          description: 'Conduct weekly progress review',
          priority: 'MEDIUM',
          type: 'MEETING',
          daysFromStart: 7,
          dependencies: ['Resource Planning'],
          assigneeRole: 'Project Manager'
        }
      ];
    }

    // Calculate task due dates based on project start date
    const startDate = new Date(projectStartDate || new Date());
    const createdTasks = [];

    // Create tasks in HubSpot
    for (const template of taskTemplates) {
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + template.daysFromStart);

      // Determine assignee based on role mapping or default to project owner
      const assigneeId = assigneeMapping[template.assigneeRole || 'default'] || 
                        project.properties.hubspot_owner_id || 
                        session.user.id;

      const taskData = {
        subject: template.subject,
        description: template.description,
        priority: template.priority,
        type: template.type,
        dueDate,
        assigneeId,
        memberId: session.user.id,
        projectId
      };

      try {
        const task = await hubspotService.createTask(taskData);
        createdTasks.push({
          id: task.id,
          subject: template.subject,
          dueDate: dueDate.toISOString(),
          assigneeId,
          dependencies: template.dependencies || []
        });
      } catch (error) {
        console.error(`Error creating task "${template.subject}":`, error);
      }
    }

    // Update project with task generation metadata
    await hubspotService.updateProject(projectId, {
      tasks_generated: 'true',
      tasks_generated_date: new Date().toISOString(),
      tasks_generated_count: createdTasks.length.toString(),
      template_type: templateType || 'custom'
    });

    return NextResponse.json({
      success: true,
      message: `Generated ${createdTasks.length} tasks for project`,
      tasks: createdTasks,
      projectId
    });

  } catch (error: any) {
    console.error('Error generating project tasks:', error);
    return NextResponse.json(
      { error: 'Failed to generate project tasks', details: error.message },
      { status: 500 }
    );
  }
}