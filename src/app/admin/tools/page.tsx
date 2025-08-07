'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Download, Upload, Wrench, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { ToolCatalog } from '@/components/ui/ToolCatalog';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

interface Tool {
  id: string;
  name: string;
  category: string;
  description?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  dailyRate: number;
  condition: string;
  location?: string;
  isAvailable: boolean;
  requiresTraining: boolean;
  imageUrl?: string;
  activeReservations: number;
  upcomingMaintenance: number;
  nextAvailableDate?: string;
  maintenanceScheduled?: string;
  createdAt: string;
  updatedAt: string;
}

interface MaintenanceRecord {
  id: string;
  toolId: string;
  maintenanceType: string;
  description: string;
  cost?: number;
  performedBy?: string;
  scheduledDate?: string;
  completedDate?: string;
  status: string;
  notes?: string;
  tool: {
    name: string;
    category: string;
  };
}

export default function AdminToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tools' | 'maintenance' | 'analytics'>('tools');
  const [showAddTool, setShowAddTool] = useState(false);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [toolsResponse, maintenanceResponse] = await Promise.all([
        fetch('/api/tools?limit=100'),
        fetch('/api/tools/maintenance?limit=50')
      ]);

      if (!toolsResponse.ok || !maintenanceResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const toolsData = await toolsResponse.json();
      const maintenanceData = await maintenanceResponse.json();

      setTools(toolsData.tools);
      setMaintenanceRecords(maintenanceData.maintenance || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getToolStats = () => {
    const total = tools.length;
    const available = tools.filter(t => t.isAvailable).length;
    const checkedOut = tools.filter(t => t.activeReservations > 0).length;
    const needsMaintenance = tools.filter(t => t.upcomingMaintenance > 0 || t.condition === 'NEEDS_REPAIR').length;
    
    return { total, available, checkedOut, needsMaintenance };
  };

  const getMaintenanceStats = () => {
    const total = maintenanceRecords.length;
    const scheduled = maintenanceRecords.filter(m => m.status === 'SCHEDULED').length;
    const inProgress = maintenanceRecords.filter(m => m.status === 'IN_PROGRESS').length;
    const overdue = maintenanceRecords.filter(m => 
      m.status === 'SCHEDULED' && 
      m.scheduledDate && 
      new Date(m.scheduledDate) < new Date()
    ).length;
    
    return { total, scheduled, inProgress, overdue };
  };

  const stats = getToolStats();
  const maintenanceStats = getMaintenanceStats();

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <LoadingSkeleton key={i} className="h-24" />
          ))}
        </div>
        <LoadingSkeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tool Management</h1>
          <p className="text-gray-600">Manage tool inventory, maintenance, and analytics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button onClick={() => setShowAddTool(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tool
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Wrench className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tools</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Wrench className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Available</p>
              <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Wrench className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Checked Out</p>
              <p className="text-2xl font-bold text-gray-900">{stats.checkedOut}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Needs Maintenance</p>
              <p className="text-2xl font-bold text-gray-900">{stats.needsMaintenance}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('tools')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tools'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tool Inventory
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'maintenance'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Maintenance ({maintenanceStats.scheduled + maintenanceStats.inProgress})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-yellow-500 text-yellow-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'tools' && (
        <ToolCatalog
          onToolSelect={setSelectedTool}
          showFilters={true}
          compact={false}
        />
      )}

      {activeTab === 'maintenance' && (
        <MaintenanceManagement 
          maintenanceRecords={maintenanceRecords}
          onRefresh={fetchData}
        />
      )}

      {activeTab === 'analytics' && (
        <ToolAnalytics 
          tools={tools}
          maintenanceRecords={maintenanceRecords}
        />
      )}

      {/* Add Tool Modal */}
      {showAddTool && (
        <AddToolModal
          onClose={() => setShowAddTool(false)}
          onSuccess={() => {
            setShowAddTool(false);
            fetchData();
          }}
        />
      )}

      {/* Tool Detail Modal */}
      {selectedTool && (
        <ToolDetailModal
          tool={selectedTool}
          onClose={() => setSelectedTool(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}

// Maintenance Management Component
function MaintenanceManagement({ 
  maintenanceRecords, 
  onRefresh 
}: { 
  maintenanceRecords: MaintenanceRecord[];
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<string>('');

  const filteredRecords = maintenanceRecords.filter(record => {
    if (!filter) return true;
    return record.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Maintenance Filters */}
      <div className="flex items-center space-x-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        >
          <option value="">All Status</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        
        <Button onClick={onRefresh} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Maintenance Records */}
      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Maintenance Records</h3>
            <p className="text-gray-600">No maintenance records found for the selected filter.</p>
          </Card>
        ) : (
          filteredRecords.map((record) => (
            <MaintenanceCard key={record.id} record={record} onUpdate={onRefresh} />
          ))
        )}
      </div>
    </div>
  );
}

// Maintenance Card Component
function MaintenanceCard({ 
  record, 
  onUpdate 
}: { 
  record: MaintenanceRecord;
  onUpdate: () => void;
}) {
  const isOverdue = record.status === 'SCHEDULED' && 
                   record.scheduledDate && 
                   new Date(record.scheduledDate) < new Date();

  const statusColors = {
    SCHEDULED: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800'
  };

  return (
    <Card className={`p-4 ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-900">{record.tool.name}</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[record.status as keyof typeof statusColors]}`}>
              {record.status}
              {isOverdue && <span className="ml-1">(OVERDUE)</span>}
            </span>
          </div>
          
          <p className="text-sm text-gray-600 mb-2">{record.maintenanceType}</p>
          <p className="text-sm text-gray-700 mb-2">{record.description}</p>
          
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            {record.scheduledDate && (
              <div>
                <span className="font-medium">Scheduled:</span> {new Date(record.scheduledDate).toLocaleDateString()}
              </div>
            )}
            {record.completedDate && (
              <div>
                <span className="font-medium">Completed:</span> {new Date(record.completedDate).toLocaleDateString()}
              </div>
            )}
            {record.cost && (
              <div>
                <span className="font-medium">Cost:</span> ${record.cost}
              </div>
            )}
            {record.performedBy && (
              <div>
                <span className="font-medium">Performed by:</span> {record.performedBy}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {record.status === 'SCHEDULED' && (
            <Button size="sm" variant="outline">
              Start
            </Button>
          )}
          {record.status === 'IN_PROGRESS' && (
            <Button size="sm">
              Complete
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

// Tool Analytics Component
function ToolAnalytics({ 
  tools, 
  maintenanceRecords 
}: { 
  tools: Tool[];
  maintenanceRecords: MaintenanceRecord[];
}) {
  const utilizationData = tools.map(tool => ({
    name: tool.name,
    category: tool.category,
    reservations: tool.activeReservations,
    revenue: tool.activeReservations * tool.dailyRate * 7, // Estimate weekly revenue
    utilization: tool.activeReservations > 0 ? 85 : 0 // Mock utilization percentage
  }));

  const topTools = utilizationData
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performing Tools */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Tools</h3>
          <div className="space-y-3">
            {topTools.map((tool, index) => (
              <div key={tool.name} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">#{index + 1} {tool.name}</div>
                  <div className="text-sm text-gray-600">{tool.category}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">${tool.revenue}</div>
                  <div className="text-sm text-gray-600">{tool.utilization}% utilized</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Maintenance Summary */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Maintenance Records</span>
              <span className="font-medium">{maintenanceRecords.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Scheduled</span>
              <span className="font-medium text-yellow-600">
                {maintenanceRecords.filter(m => m.status === 'SCHEDULED').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">In Progress</span>
              <span className="font-medium text-blue-600">
                {maintenanceRecords.filter(m => m.status === 'IN_PROGRESS').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Completed This Month</span>
              <span className="font-medium text-green-600">
                {maintenanceRecords.filter(m => 
                  m.status === 'COMPLETED' && 
                  m.completedDate &&
                  new Date(m.completedDate).getMonth() === new Date().getMonth()
                ).length}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Placeholder components for modals
function AddToolModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Add New Tool</h3>
        <p className="text-gray-600 mb-4">Tool creation form would go here.</p>
        <div className="flex space-x-3">
          <Button onClick={onClose} variant="outline">Cancel</Button>
          <Button onClick={onSuccess}>Add Tool</Button>
        </div>
      </Card>
    </div>
  );
}

function ToolDetailModal({ tool, onClose, onUpdate }: { tool: Tool; onClose: () => void; onUpdate: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">{tool.name}</h3>
        <p className="text-gray-600 mb-4">Tool details and edit form would go here.</p>
        <div className="flex space-x-3">
          <Button onClick={onClose} variant="outline">Close</Button>
          <Button onClick={onUpdate}>Save Changes</Button>
        </div>
      </Card>
    </div>
  );
}