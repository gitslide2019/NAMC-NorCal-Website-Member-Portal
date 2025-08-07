'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Building, 
  Home, 
  Factory, 
  Wrench,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  Plus
} from 'lucide-react';

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: 'residential' | 'commercial' | 'industrial' | 'general';
  tasks: Array<{
    subject: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    type: string;
    daysFromStart: number;
    dependencies?: string[];
    assigneeRole?: string;
  }>;
  estimatedDuration: number; // in days
  requiredRoles: string[];
}

interface TaskTemplatesProps {
  onSelectTemplate: (template: TaskTemplate) => void;
  onCreateCustomTemplate?: () => void;
  projectType?: string;
}

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'residential_construction',
    name: 'Residential Construction Project',
    description: 'Complete workflow for residential construction projects from planning to completion',
    category: 'residential',
    estimatedDuration: 120,
    requiredRoles: ['Project Manager', 'Site Supervisor', 'Quality Inspector'],
    tasks: [
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
        subject: 'Foundation Excavation',
        description: 'Excavate foundation according to architectural plans',
        priority: 'HIGH',
        type: 'TODO',
        daysFromStart: 14,
        dependencies: ['Site Preparation and Survey'],
        assigneeRole: 'Site Supervisor'
      },
      {
        subject: 'Foundation Inspection',
        description: 'Schedule and conduct foundation inspection',
        priority: 'HIGH',
        type: 'REVIEW',
        daysFromStart: 21,
        dependencies: ['Foundation Excavation'],
        assigneeRole: 'Quality Inspector'
      },
      {
        subject: 'Framing Construction',
        description: 'Complete structural framing of the building',
        priority: 'HIGH',
        type: 'TODO',
        daysFromStart: 28,
        dependencies: ['Foundation Inspection'],
        assigneeRole: 'Site Supervisor'
      },
      {
        subject: 'Electrical Rough-In',
        description: 'Install electrical wiring and systems',
        priority: 'MEDIUM',
        type: 'TODO',
        daysFromStart: 45,
        dependencies: ['Framing Construction'],
        assigneeRole: 'Site Supervisor'
      },
      {
        subject: 'Plumbing Rough-In',
        description: 'Install plumbing systems and fixtures',
        priority: 'MEDIUM',
        type: 'TODO',
        daysFromStart: 50,
        dependencies: ['Framing Construction'],
        assigneeRole: 'Site Supervisor'
      },
      {
        subject: 'HVAC Installation',
        description: 'Install heating, ventilation, and air conditioning systems',
        priority: 'MEDIUM',
        type: 'TODO',
        daysFromStart: 55,
        dependencies: ['Electrical Rough-In', 'Plumbing Rough-In'],
        assigneeRole: 'Site Supervisor'
      },
      {
        subject: 'Insulation and Drywall',
        description: 'Install insulation and complete drywall work',
        priority: 'MEDIUM',
        type: 'TODO',
        daysFromStart: 70,
        dependencies: ['HVAC Installation'],
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
      },
      {
        subject: 'Project Closeout',
        description: 'Complete project documentation and handover to client',
        priority: 'MEDIUM',
        type: 'TODO',
        daysFromStart: 115,
        dependencies: ['Final Inspection'],
        assigneeRole: 'Project Manager'
      }
    ]
  },
  {
    id: 'commercial_renovation',
    name: 'Commercial Renovation Project',
    description: 'Workflow for commercial building renovation and improvement projects',
    category: 'commercial',
    estimatedDuration: 90,
    requiredRoles: ['Project Manager', 'Site Supervisor', 'Safety Coordinator'],
    tasks: [
      {
        subject: 'Site Assessment and Planning',
        description: 'Conduct thorough site assessment and develop renovation plan',
        priority: 'HIGH',
        type: 'REVIEW',
        daysFromStart: 0,
        assigneeRole: 'Project Manager'
      },
      {
        subject: 'Permit Applications',
        description: 'Submit renovation permits and obtain approvals',
        priority: 'HIGH',
        type: 'APPROVAL',
        daysFromStart: 3,
        dependencies: ['Site Assessment and Planning'],
        assigneeRole: 'Project Manager'
      },
      {
        subject: 'Safety Plan Development',
        description: 'Develop comprehensive safety plan for renovation work',
        priority: 'HIGH',
        type: 'TODO',
        daysFromStart: 7,
        assigneeRole: 'Safety Coordinator'
      },
      {
        subject: 'Demolition Work',
        description: 'Complete selective demolition according to plan',
        priority: 'HIGH',
        type: 'TODO',
        daysFromStart: 14,
        dependencies: ['Permit Applications', 'Safety Plan Development'],
        assigneeRole: 'Site Supervisor'
      },
      {
        subject: 'Structural Modifications',
        description: 'Complete any required structural modifications',
        priority: 'HIGH',
        type: 'TODO',
        daysFromStart: 28,
        dependencies: ['Demolition Work'],
        assigneeRole: 'Site Supervisor'
      },
      {
        subject: 'MEP Systems Upgrade',
        description: 'Upgrade mechanical, electrical, and plumbing systems',
        priority: 'HIGH',
        type: 'TODO',
        daysFromStart: 42,
        dependencies: ['Structural Modifications'],
        assigneeRole: 'Site Supervisor'
      },
      {
        subject: 'Interior Build-Out',
        description: 'Complete interior construction and finishes',
        priority: 'MEDIUM',
        type: 'TODO',
        daysFromStart: 60,
        dependencies: ['MEP Systems Upgrade'],
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
      },
      {
        subject: 'Final Inspection and Handover',
        description: 'Complete final inspection and project handover',
        priority: 'HIGH',
        type: 'REVIEW',
        daysFromStart: 85,
        dependencies: ['Final Systems Testing'],
        assigneeRole: 'Project Manager'
      }
    ]
  },
  {
    id: 'industrial_maintenance',
    name: 'Industrial Facility Maintenance',
    description: 'Scheduled maintenance workflow for industrial facilities',
    category: 'industrial',
    estimatedDuration: 30,
    requiredRoles: ['Maintenance Supervisor', 'Safety Coordinator', 'Quality Inspector'],
    tasks: [
      {
        subject: 'Pre-Maintenance Safety Review',
        description: 'Conduct safety review and prepare work area',
        priority: 'HIGH',
        type: 'REVIEW',
        daysFromStart: 0,
        assigneeRole: 'Safety Coordinator'
      },
      {
        subject: 'Equipment Shutdown Procedures',
        description: 'Follow proper shutdown procedures for all equipment',
        priority: 'HIGH',
        type: 'TODO',
        daysFromStart: 1,
        dependencies: ['Pre-Maintenance Safety Review'],
        assigneeRole: 'Maintenance Supervisor'
      },
      {
        subject: 'Preventive Maintenance Tasks',
        description: 'Complete all scheduled preventive maintenance tasks',
        priority: 'HIGH',
        type: 'TODO',
        daysFromStart: 2,
        dependencies: ['Equipment Shutdown Procedures'],
        assigneeRole: 'Maintenance Supervisor'
      },
      {
        subject: 'Component Replacement',
        description: 'Replace worn or damaged components as needed',
        priority: 'MEDIUM',
        type: 'TODO',
        daysFromStart: 7,
        dependencies: ['Preventive Maintenance Tasks'],
        assigneeRole: 'Maintenance Supervisor'
      },
      {
        subject: 'System Testing and Calibration',
        description: 'Test and calibrate all systems after maintenance',
        priority: 'HIGH',
        type: 'REVIEW',
        daysFromStart: 14,
        dependencies: ['Component Replacement'],
        assigneeRole: 'Quality Inspector'
      },
      {
        subject: 'Equipment Startup Procedures',
        description: 'Follow proper startup procedures and verify operation',
        priority: 'HIGH',
        type: 'TODO',
        daysFromStart: 21,
        dependencies: ['System Testing and Calibration'],
        assigneeRole: 'Maintenance Supervisor'
      },
      {
        subject: 'Maintenance Documentation',
        description: 'Complete all maintenance documentation and reports',
        priority: 'MEDIUM',
        type: 'TODO',
        daysFromStart: 25,
        dependencies: ['Equipment Startup Procedures'],
        assigneeRole: 'Maintenance Supervisor'
      }
    ]
  },
  {
    id: 'general_project_management',
    name: 'General Project Management',
    description: 'Basic project management workflow suitable for various project types',
    category: 'general',
    estimatedDuration: 60,
    requiredRoles: ['Project Manager', 'Team Lead'],
    tasks: [
      {
        subject: 'Project Initiation',
        description: 'Define project scope, objectives, and deliverables',
        priority: 'HIGH',
        type: 'TODO',
        daysFromStart: 0,
        assigneeRole: 'Project Manager'
      },
      {
        subject: 'Stakeholder Identification',
        description: 'Identify and engage key project stakeholders',
        priority: 'HIGH',
        type: 'TODO',
        daysFromStart: 2,
        dependencies: ['Project Initiation'],
        assigneeRole: 'Project Manager'
      },
      {
        subject: 'Resource Planning',
        description: 'Plan and allocate project resources',
        priority: 'HIGH',
        type: 'TODO',
        daysFromStart: 5,
        dependencies: ['Stakeholder Identification'],
        assigneeRole: 'Project Manager'
      },
      {
        subject: 'Project Kickoff Meeting',
        description: 'Conduct project kickoff meeting with team',
        priority: 'MEDIUM',
        type: 'MEETING',
        daysFromStart: 7,
        dependencies: ['Resource Planning'],
        assigneeRole: 'Project Manager'
      },
      {
        subject: 'Weekly Progress Reviews',
        description: 'Conduct weekly progress review meetings',
        priority: 'MEDIUM',
        type: 'MEETING',
        daysFromStart: 14,
        dependencies: ['Project Kickoff Meeting'],
        assigneeRole: 'Team Lead'
      },
      {
        subject: 'Mid-Project Review',
        description: 'Conduct comprehensive mid-project review',
        priority: 'HIGH',
        type: 'REVIEW',
        daysFromStart: 30,
        dependencies: ['Weekly Progress Reviews'],
        assigneeRole: 'Project Manager'
      },
      {
        subject: 'Quality Assurance Review',
        description: 'Conduct quality assurance review of deliverables',
        priority: 'HIGH',
        type: 'REVIEW',
        daysFromStart: 50,
        dependencies: ['Mid-Project Review'],
        assigneeRole: 'Team Lead'
      },
      {
        subject: 'Project Closure',
        description: 'Complete project closure activities and documentation',
        priority: 'MEDIUM',
        type: 'TODO',
        daysFromStart: 55,
        dependencies: ['Quality Assurance Review'],
        assigneeRole: 'Project Manager'
      }
    ]
  }
];

export function TaskTemplates({ onSelectTemplate, onCreateCustomTemplate, projectType }: TaskTemplatesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'residential':
        return <Home className="h-5 w-5" />;
      case 'commercial':
        return <Building className="h-5 w-5" />;
      case 'industrial':
        return <Factory className="h-5 w-5" />;
      case 'general':
        return <FileText className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'residential':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'commercial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'industrial':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'general':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredTemplates = TASK_TEMPLATES.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Templates</h2>
          <p className="text-gray-600 mt-1">
            Choose from pre-built task templates or create your own custom workflow
          </p>
        </div>
        {onCreateCustomTemplate && (
          <Button onClick={onCreateCustomTemplate} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Template
          </Button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All Templates
        </Button>
        <Button
          variant={selectedCategory === 'residential' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('residential')}
        >
          <Home className="h-4 w-4 mr-2" />
          Residential
        </Button>
        <Button
          variant={selectedCategory === 'commercial' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('commercial')}
        >
          <Building className="h-4 w-4 mr-2" />
          Commercial
        </Button>
        <Button
          variant={selectedCategory === 'industrial' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('industrial')}
        >
          <Factory className="h-4 w-4 mr-2" />
          Industrial
        </Button>
        <Button
          variant={selectedCategory === 'general' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('general')}
        >
          <FileText className="h-4 w-4 mr-2" />
          General
        </Button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="p-6">
            {/* Template Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  {getCategoryIcon(template.category)}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {template.name}
                  </h3>
                  <Badge className={getCategoryColor(template.category)}>
                    {template.category}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Template Description */}
            <p className="text-gray-600 mb-4">{template.description}</p>

            {/* Template Stats */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <CheckCircle2 className="h-4 w-4 text-gray-600" />
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {template.tasks.length}
                </div>
                <div className="text-xs text-gray-600">Tasks</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Clock className="h-4 w-4 text-gray-600" />
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {template.estimatedDuration}
                </div>
                <div className="text-xs text-gray-600">Days</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <Users className="h-4 w-4 text-gray-600" />
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {template.requiredRoles.length}
                </div>
                <div className="text-xs text-gray-600">Roles</div>
              </div>
            </div>

            {/* Required Roles */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Required Roles:</h4>
              <div className="flex flex-wrap gap-1">
                {template.requiredRoles.map((role, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Task Preview */}
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedTemplate(
                  expandedTemplate === template.id ? null : template.id
                )}
                className="w-full justify-between"
              >
                <span>Preview Tasks</span>
                <span>{expandedTemplate === template.id ? '−' : '+'}</span>
              </Button>
              
              {expandedTemplate === template.id && (
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                  {template.tasks.slice(0, 5).map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{task.subject}</div>
                        <div className="text-gray-600 text-xs">
                          Day {task.daysFromStart} • {task.assigneeRole}
                        </div>
                      </div>
                      <Badge className={getPriorityColor(task.priority)} size="sm">
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                  {template.tasks.length > 5 && (
                    <div className="text-center text-sm text-gray-500">
                      +{template.tasks.length - 5} more tasks
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Button 
                onClick={() => onSelectTemplate(template)}
                className="flex-1"
              >
                Use Template
              </Button>
              <Button 
                variant="outline"
                onClick={() => setExpandedTemplate(
                  expandedTemplate === template.id ? null : template.id
                )}
              >
                Preview
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Wrench className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            No templates match the selected category.
          </p>
        </div>
      )}
    </div>
  );
}