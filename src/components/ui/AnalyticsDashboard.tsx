import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  CheckSquare,
  Clock,
  AlertTriangle,
  Target,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react';
import { motion } from 'framer-motion';
import Button from './Button';

interface AnalyticsData {
  projectMetrics: {
    totalProjects: number;
    activeProjects: number;
    completedProjects: number;
    onHoldProjects: number;
    averageCompletion: number;
    completionTrend: number;
  };
  taskMetrics: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    inProgressTasks: number;
    averageTaskTime: number;
    taskCompletionRate: number;
  };
  teamMetrics: {
    totalMembers: number;
    activeMembers: number;
    memberProductivity: Array<{
      memberId: string;
      name: string;
      tasksCompleted: number;
      averageTaskTime: number;
      performanceScore: number;
    }>;
  };
  timeMetrics: {
    totalTimeLogged: number;
    averageProjectDuration: number;
    peakProductivityHours: string[];
    weeklyDistribution: Array<{
      day: string;
      hours: number;
      tasks: number;
    }>;
  };
  progressData: Array<{
    date: string;
    projectsStarted: number;
    projectsCompleted: number;
    tasksCompleted: number;
    hoursLogged: number;
  }>;
}

interface AnalyticsDashboardProps {
  data: AnalyticsData;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onExport?: (format: 'pdf' | 'excel' | 'csv') => void;
  isLoading?: boolean;
  className?: string;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  data,
  dateRange,
  onDateRangeChange,
  onExport,
  isLoading = false,
  className = ''
}) => {
  const [selectedView, setSelectedView] = useState<'overview' | 'projects' | 'tasks' | 'team' | 'time'>('overview');
  const [showFilters, setShowFilters] = useState(false);

  // Calculate key insights
  const insights = useMemo(() => {
    const projectCompletionRate = (data.projectMetrics.completedProjects / data.projectMetrics.totalProjects) * 100;
    const taskCompletionRate = (data.taskMetrics.completedTasks / data.taskMetrics.totalTasks) * 100;
    const overduePercentage = (data.taskMetrics.overdueTasks / data.taskMetrics.totalTasks) * 100;
    const teamUtilization = (data.teamMetrics.activeMembers / data.teamMetrics.totalMembers) * 100;

    return {
      projectCompletionRate: Math.round(projectCompletionRate),
      taskCompletionRate: Math.round(taskCompletionRate),
      overduePercentage: Math.round(overduePercentage),
      teamUtilization: Math.round(teamUtilization),
      totalValue: data.progressData.reduce((sum, item) => sum + item.hoursLogged * 150, 0) // Assuming $150/hour
    };
  }, [data]);

  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'neutral';
    icon: React.ElementType;
    color: string;
    subtitle?: string;
  }> = ({ title, value, change, trend, icon: Icon, color, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      {change !== undefined && (
        <div className="flex items-center mt-4">
          {trend === 'up' ? (
            <ArrowUpRight className="w-4 h-4 text-green-500 mr-1" />
          ) : trend === 'down' ? (
            <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
          ) : null}
          <span className={`text-sm font-medium ${
            trend === 'up' ? 'text-green-600 dark:text-green-400' :
            trend === 'down' ? 'text-red-600 dark:text-red-400' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-500 ml-1">from last period</span>
        </div>
      )}
    </motion.div>
  );

  const ProgressChart: React.FC<{ data: any[] }> = ({ data }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Progress Trends</h3>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Projects</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Tasks</span>
          </div>
        </div>
      </div>
      
      {/* Simplified chart representation */}
      <div className="h-64 flex items-end space-x-2">
        {data.slice(-12).map((item, index) => {
          const maxValue = Math.max(...data.map(d => Math.max(d.projectsCompleted, d.tasksCompleted)));
          const projectHeight = (item.projectsCompleted / maxValue) * 100;
          const taskHeight = (item.tasksCompleted / maxValue) * 100;
          
          return (
            <div key={index} className="flex-1 flex flex-col items-center space-y-1">
              <div className="w-full flex space-x-1">
                <div
                  className="bg-blue-500 rounded-t flex-1"
                  style={{ height: `${projectHeight * 2}px` }}
                  title={`${item.projectsCompleted} projects completed`}
                />
                <div
                  className="bg-green-500 rounded-t flex-1"
                  style={{ height: `${taskHeight * 2}px` }}
                  title={`${item.tasksCompleted} tasks completed`}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-500 transform -rotate-45">
                {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const TeamPerformanceCard: React.FC = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Performance</h3>
        <Button variant="outline" size="sm">
          <Users className="w-4 h-4 mr-2" />
          View Details
        </Button>
      </div>
      
      <div className="space-y-4">
        {data.teamMetrics.memberProductivity.slice(0, 5).map((member, index) => (
          <div key={member.memberId} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {member.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {member.tasksCompleted} tasks completed
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full"
                  style={{ width: `${Math.min(member.performanceScore, 100)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {member.performanceScore}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Insights and metrics for your projects and team performance
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </Button>
          
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport('pdf')}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* View Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'projects', label: 'Projects', icon: Target },
            { key: 'tasks', label: 'Tasks', icon: CheckSquare },
            { key: 'team', label: 'Team', icon: Users },
            { key: 'time', label: 'Time', icon: Clock }
          ].map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedView(tab.key as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors ${
                  selectedView === tab.key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Project Completion Rate"
              value={`${insights.projectCompletionRate}%`}
              change={data.projectMetrics.completionTrend}
              trend={data.projectMetrics.completionTrend > 0 ? 'up' : 'down'}
              icon={Target}
              color="bg-blue-500"
            />
            <MetricCard
              title="Task Completion Rate"
              value={`${insights.taskCompletionRate}%`}
              change={5}
              trend="up"
              icon={CheckSquare}
              color="bg-green-500"
            />
            <MetricCard
              title="Team Utilization"
              value={`${insights.teamUtilization}%`}
              change={-2}
              trend="down"
              icon={Users}
              color="bg-purple-500"
            />
            <MetricCard
              title="Total Value"
              value={`$${(insights.totalValue / 1000).toFixed(0)}K`}
              change={12}
              trend="up"
              icon={TrendingUp}
              color="bg-indigo-500"
              subtitle="Based on logged hours"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProgressChart data={data.progressData} />
            <TeamPerformanceCard />
          </div>

          {/* Insights Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overdue Tasks</h3>
              </div>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                {data.taskMetrics.overdueTasks}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {insights.overduePercentage}% of total tasks need attention
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Projects</h3>
              </div>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {data.projectMetrics.activeProjects}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Currently in progress across all teams
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Avg. Task Time</h3>
              </div>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                {data.taskMetrics.averageTaskTime}h
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Average time to complete tasks
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Other view tabs would be implemented similarly */}
      {selectedView !== 'overview' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <BarChart3 className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {selectedView.charAt(0).toUpperCase() + selectedView.slice(1)} Analytics
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Detailed {selectedView} analytics view would be implemented here with specific metrics and visualizations.
          </p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;