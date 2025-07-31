import React, { useState } from 'react';
import { 
  Plus, 
  Copy, 
  FileText, 
  Users, 
  Calendar, 
  CheckSquare,
  Building,
  Briefcase,
  Target,
  Search,
  X,
  Edit3,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Input from './Input';

interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  category: 'construction' | 'business' | 'project' | 'general';
  tasks: Array<{
    name: string;
    description?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    estimatedHours?: number;
    assigneeRole?: string;
    dependencies?: string[];
  }>;
  isCustom?: boolean;
  tags: string[];
  createdAt?: string;
  usageCount?: number;
}

interface TaskTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TaskTemplate) => void;
  onCreateCustomTemplate?: (template: Omit<TaskTemplate, 'id'>) => void;
  customTemplates?: TaskTemplate[];
  className?: string;
}

// Predefined templates for NAMC workflows
const DEFAULT_TEMPLATES: TaskTemplate[] = [
  {
    id: 'construction-project-setup',
    name: 'Construction Project Setup',
    description: 'Complete checklist for setting up a new construction project',
    category: 'construction',
    tags: ['construction', 'setup', 'permits', 'safety'],
    usageCount: 42,
    tasks: [
      {
        name: 'Obtain Building Permits',
        description: 'Apply for and secure all required building permits',
        priority: 'critical',
        estimatedHours: 8,
        assigneeRole: 'Project Manager'
      },
      {
        name: 'Site Survey and Assessment',
        description: 'Conduct thorough site survey and safety assessment',
        priority: 'high',
        estimatedHours: 4,
        assigneeRole: 'Site Engineer'
      },
      {
        name: 'Material Procurement Plan',
        description: 'Create detailed material procurement and delivery schedule',
        priority: 'high',
        estimatedHours: 6,
        assigneeRole: 'Procurement Manager'
      },
      {
        name: 'Safety Protocol Setup',
        description: 'Establish site safety protocols and emergency procedures',
        priority: 'critical',
        estimatedHours: 3,
        assigneeRole: 'Safety Officer'
      },
      {
        name: 'Team Onboarding',
        description: 'Onboard construction team and assign responsibilities',
        priority: 'medium',
        estimatedHours: 4,
        assigneeRole: 'HR Manager'
      }
    ]
  },
  {
    id: 'member-onboarding',
    name: 'NAMC Member Onboarding',
    description: 'Complete onboarding process for new NAMC members',
    category: 'business',
    tags: ['onboarding', 'membership', 'welcome'],
    usageCount: 28,
    tasks: [
      {
        name: 'Welcome Package Delivery',
        description: 'Send welcome package with NAMC materials and resources',
        priority: 'high',
        estimatedHours: 1,
        assigneeRole: 'Membership Coordinator'
      },
      {
        name: 'Orientation Session Schedule',
        description: 'Schedule and conduct member orientation session',
        priority: 'high',
        estimatedHours: 2,
        assigneeRole: 'Member Relations'
      },
      {
        name: 'Directory Profile Setup',
        description: 'Help member create and optimize their member directory profile',
        priority: 'medium',
        estimatedHours: 1,
        assigneeRole: 'Member Relations'
      },
      {
        name: 'Networking Introduction',
        description: 'Introduce member to relevant networking groups and events',
        priority: 'medium',
        estimatedHours: 1,
        assigneeRole: 'Network Coordinator'
      },
      {
        name: 'Resource Access Setup',
        description: 'Provide access to member resources and training materials',
        priority: 'medium',
        estimatedHours: 1,
        assigneeRole: 'IT Support'
      }
    ]
  },
  {
    id: 'event-planning',
    name: 'Event Planning Workflow',
    description: 'Comprehensive workflow for planning NAMC events',
    category: 'project',
    tags: ['events', 'planning', 'coordination'],
    usageCount: 15,
    tasks: [
      {
        name: 'Event Concept Development',
        description: 'Define event goals, theme, and target audience',
        priority: 'high',
        estimatedHours: 4,
        assigneeRole: 'Event Manager'
      },
      {
        name: 'Venue Research and Booking',
        description: 'Research, evaluate, and book appropriate venue',
        priority: 'high',
        estimatedHours: 6,
        assigneeRole: 'Event Coordinator'
      },
      {
        name: 'Speaker and Entertainment',
        description: 'Identify, contact, and confirm speakers or entertainment',
        priority: 'medium',
        estimatedHours: 8,
        assigneeRole: 'Program Manager'
      },
      {
        name: 'Marketing and Promotion',
        description: 'Create marketing materials and promotion strategy',
        priority: 'medium',
        estimatedHours: 10,
        assigneeRole: 'Marketing Manager'
      },
      {
        name: 'Registration System Setup',
        description: 'Set up online registration and payment processing',
        priority: 'medium',
        estimatedHours: 3,
        assigneeRole: 'IT Support'
      },
      {
        name: 'Catering Arrangements',
        description: 'Plan menu, dietary requirements, and catering logistics',
        priority: 'low',
        estimatedHours: 4,
        assigneeRole: 'Event Coordinator'
      }
    ]
  },
  {
    id: 'contract-review',
    name: 'Contract Review Process',
    description: 'Standardized process for reviewing and approving contracts',
    category: 'business',
    tags: ['legal', 'contracts', 'review'],
    usageCount: 33,
    tasks: [
      {
        name: 'Initial Contract Review',
        description: 'Conduct initial review of contract terms and conditions',
        priority: 'high',
        estimatedHours: 3,
        assigneeRole: 'Legal Advisor'
      },
      {
        name: 'Risk Assessment',
        description: 'Assess potential risks and liability issues',
        priority: 'high',
        estimatedHours: 2,
        assigneeRole: 'Risk Manager'
      },
      {
        name: 'Financial Impact Analysis',
        description: 'Analyze financial implications and budget impact',
        priority: 'high',
        estimatedHours: 2,
        assigneeRole: 'Finance Manager'
      },
      {
        name: 'Stakeholder Review',
        description: 'Circulate contract for stakeholder feedback',
        priority: 'medium',
        estimatedHours: 1,
        assigneeRole: 'Project Manager'
      },
      {
        name: 'Negotiation and Revisions',
        description: 'Negotiate terms and incorporate necessary revisions',
        priority: 'medium',
        estimatedHours: 4,
        assigneeRole: 'Legal Advisor'
      },
      {
        name: 'Final Approval and Signing',
        description: 'Obtain final approvals and execute contract',
        priority: 'critical',
        estimatedHours: 1,
        assigneeRole: 'Executive Team'
      }
    ]
  }
];

const CATEGORY_ICONS = {
  construction: Building,
  business: Briefcase,
  project: Target,
  general: FileText
};

const CATEGORY_COLORS = {
  construction: 'bg-orange-100 text-orange-800 border-orange-200',
  business: 'bg-blue-100 text-blue-800 border-blue-200',
  project: 'bg-green-100 text-green-800 border-green-200',
  general: 'bg-gray-100 text-gray-800 border-gray-200'
};

const TaskTemplates: React.FC<TaskTemplatesProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  onCreateCustomTemplate,
  customTemplates = [],
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState<Partial<TaskTemplate>>({
    name: '',
    description: '',
    category: 'general',
    tasks: [],
    tags: []
  });

  const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { key: 'all', label: 'All Templates', count: allTemplates.length },
    { key: 'construction', label: 'Construction', count: allTemplates.filter(t => t.category === 'construction').length },
    { key: 'business', label: 'Business', count: allTemplates.filter(t => t.category === 'business').length },
    { key: 'project', label: 'Project', count: allTemplates.filter(t => t.category === 'project').length },
    { key: 'general', label: 'General', count: allTemplates.filter(t => t.category === 'general').length }
  ];

  const handleSelectTemplate = (template: TaskTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const handleCreateTemplate = () => {
    if (newTemplate.name && newTemplate.tasks && onCreateCustomTemplate) {
      onCreateCustomTemplate({
        ...newTemplate,
        isCustom: true,
        createdAt: new Date().toISOString(),
        usageCount: 0
      } as Omit<TaskTemplate, 'id'>);
      
      setNewTemplate({
        name: '',
        description: '',
        category: 'general',
        tasks: [],
        tags: []
      });
      setShowCreateTemplate(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${className}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <FileText className="w-6 h-6 mr-2 text-blue-600" />
                Task Templates
              </h2>
              <p className="mt-1 text-gray-600">
                Choose from pre-built templates or create your own workflow
              </p>
            </div>
            <div className="flex items-center space-x-2">
              {onCreateCustomTemplate && (
                <Button
                  variant="outline"
                  onClick={() => setShowCreateTemplate(true)}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Template</span>
                </Button>
              )}
              <Button
                variant="outline"
                onClick={onClose}
                className="p-2"
                aria-label="Close templates"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(90vh-140px)]">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 bg-gray-50">
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>

              {/* Categories */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Categories
                </h3>
                {categories.map((category) => (
                  <button
                    key={category.key}
                    onClick={() => setSelectedCategory(category.key)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedCategory === category.key
                        ? 'bg-blue-100 text-blue-900 font-medium'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{category.label}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        selectedCategory === category.key
                          ? 'bg-blue-200 text-blue-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {category.count}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery ? 'Try adjusting your search terms' : 'No templates match the selected category'}
                </p>
                {onCreateCustomTemplate && (
                  <Button
                    onClick={() => setShowCreateTemplate(true)}
                    className="flex items-center space-x-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Custom Template</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {filteredTemplates.map((template) => {
                  const IconComponent = CATEGORY_ICONS[template.category];
                  return (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                      onClick={() => handleSelectTemplate(template)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${CATEGORY_COLORS[template.category]}`}>
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                              {template.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {template.description}
                            </p>
                          </div>
                        </div>
                        {template.isCustom && (
                          <div className="flex items-center space-x-1">
                            <Edit3 className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-500">Custom</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <CheckSquare className="w-4 h-4" />
                            <span>{template.tasks.length} tasks</span>
                          </div>
                          {template.usageCount !== undefined && (
                            <div className="flex items-center space-x-1">
                              <Copy className="w-4 h-4" />
                              <span>Used {template.usageCount} times</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          {template.tags.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{template.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Task Preview */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Tasks Preview
                        </h4>
                        <div className="space-y-1">
                          {template.tasks.slice(0, 3).map((task, index) => (
                            <div key={index} className="flex items-center space-x-2 text-sm">
                              <div className={`w-2 h-2 rounded-full ${
                                task.priority === 'critical' ? 'bg-red-400' :
                                task.priority === 'high' ? 'bg-orange-400' :
                                task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                              }`} />
                              <span className="text-gray-700 truncate">{task.name}</span>
                            </div>
                          ))}
                          {template.tasks.length > 3 && (
                            <div className="text-xs text-gray-500 pl-4">
                              +{template.tasks.length - 3} more tasks
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <Button
                          size="sm"
                          className="w-full group-hover:bg-blue-600 transition-colors"
                        >
                          Use This Template
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Create Template Modal */}
      {showCreateTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">Create Custom Template</h3>
              <p className="text-gray-600 mt-1">Create a reusable task template for your workflows</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <Input
                    type="text"
                    value={newTemplate.name || ''}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="Enter template name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={newTemplate.category || 'general'}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="general">General</option>
                    <option value="construction">Construction</option>
                    <option value="business">Business</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newTemplate.description || ''}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Describe what this template is for"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <Input
                  type="text"
                  value={newTemplate.tags?.join(', ') || ''}
                  onChange={(e) => setNewTemplate({ 
                    ...newTemplate, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  })}
                  placeholder="e.g. planning, construction, review"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateTemplate(false);
                  setNewTemplate({
                    name: '',
                    description: '',
                    category: 'general',
                    tasks: [],
                    tags: []
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTemplate}
                disabled={!newTemplate.name?.trim()}
              >
                Create Template
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default TaskTemplates;