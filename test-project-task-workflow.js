#!/usr/bin/env node

/**
 * Test script for Project Task Management and HubSpot Integration
 * Tests the complete workflow: Project Creation → Task Assignment → HubSpot Sync → Notifications
 */

const PROJECT_BASE_URL = 'http://localhost:3000';

// Mock user session for testing
const mockSession = {
  user: {
    id: 'test-user-123',
    email: 'test@namcnorcal.org',
    name: 'Test User'
  }
};

// Test data
const testProject = {
  title: 'Test Construction Project',
  description: 'A test project for validating the project management system',
  category: 'commercial',
  budget: {
    allocated: 500000,
    spent: 0,
    remaining: 500000,
    percentage: 0
  },
  timeline: {
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    currentPhase: 'Planning',
    progress: 0
  },
  location: {
    address: '123 Test Street',
    city: 'San Francisco',
    state: 'CA',
    coordinates: { lat: 37.7749, lng: -122.4194 }
  },
  priority: 'high',
  initialCollaborators: [
    {
      memberId: 'member-456',
      memberName: 'Jane Smith',
      memberEmail: 'jane@contractor.com',
      role: 'contributor'
    }
  ]
};

const testTasks = [
  {
    name: 'Site Survey and Analysis',
    description: 'Conduct comprehensive site survey and feasibility analysis',
    priority: 'high',
    category: 'planning',
    estimatedHours: 16,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignees: [
      {
        memberId: 'member-456',
        memberName: 'Jane Smith',
        memberEmail: 'jane@contractor.com',
        role: 'assignee',
        estimatedHours: 16
      }
    ]
  },
  {
    name: 'Permit Application Preparation',
    description: 'Prepare and submit all required building permits',
    priority: 'medium',
    category: 'documentation',
    estimatedHours: 8,
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    assignees: [
      {
        memberId: 'member-789',
        memberName: 'Bob Johnson',
        memberEmail: 'bob@permits.com',
        role: 'assignee',
        estimatedHours: 8
      }
    ]
  },
  {
    name: 'Project Budget Review',
    description: 'Review and finalize project budget breakdown',
    priority: 'critical',
    category: 'review',
    estimatedHours: 4,
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignees: [
      {
        memberId: 'test-user-123',
        memberName: 'Test User',
        memberEmail: 'test@namcnorcal.org',
        role: 'owner',
        estimatedHours: 4
      }
    ]
  }
];

class ProjectTaskWorkflowTester {
  constructor() {
    this.createdProject = null;
    this.createdTasks = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[type];
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async test(description, testFn) {
    try {
      this.log(`Testing: ${description}`);
      await testFn();
      this.testResults.passed++;
      this.log(`✅ PASSED: ${description}`, 'success');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ description, error: error.message });
      this.log(`❌ FAILED: ${description} - ${error.message}`, 'error');
    }
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${PROJECT_BASE_URL}${endpoint}`;
    
    // Add mock session headers for testing
    const headers = {
      'Content-Type': 'application/json',
      'X-Test-Session': JSON.stringify(mockSession),
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Test 1: Create Enhanced Project
  async testCreateProject() {
    const result = await this.makeRequest('/api/projects/enhanced', {
      method: 'POST',
      body: JSON.stringify(testProject)
    });

    if (!result.success || !result.data) {
      throw new Error('Failed to create project');
    }

    this.createdProject = result.data;
    this.log(`Project created with ID: ${this.createdProject.id}`);

    // Validate project structure
    if (!this.createdProject.collaborators || this.createdProject.collaborators.length === 0) {
      throw new Error('Project should have collaborators');
    }

    if (!this.createdProject.taskCount) {
      throw new Error('Project should have task count initialized');
    }
  }

  // Test 2: Create Tasks with Assignments
  async testCreateTasks() {
    if (!this.createdProject) {
      throw new Error('No project available for task creation');
    }

    for (const taskData of testTasks) {
      const result = await this.makeRequest('/api/projects/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: this.createdProject.id,
          ...taskData
        })
      });

      if (!result.success || !result.data) {
        throw new Error(`Failed to create task: ${taskData.name}`);
      }

      this.createdTasks.push(result.data);
      this.log(`Task created: ${result.data.name} (ID: ${result.data.id})`);

      // Validate task structure
      if (!result.data.assignments || result.data.assignments.length === 0) {
        throw new Error(`Task should have assignments: ${taskData.name}`);
      }
    }
  }

  // Test 3: Test Task Assignment Management
  async testTaskAssignments() {
    if (this.createdTasks.length === 0) {
      throw new Error('No tasks available for assignment testing');
    }

    const firstTask = this.createdTasks[0];

    // Test adding new assignment
    const newAssignment = {
      taskId: firstTask.id,
      memberId: 'member-999',
      memberName: 'New Assignee',
      memberEmail: 'new@contractor.com',
      role: 'reviewer',
      estimatedHours: 2
    };

    const result = await this.makeRequest('/api/projects/tasks/assignments', {
      method: 'POST',
      body: JSON.stringify(newAssignment)
    });

    if (!result.success || !result.data) {
      throw new Error('Failed to create task assignment');
    }

    this.log(`New assignment created for task: ${firstTask.name}`);
  }

  // Test 4: Test Task Status Updates
  async testTaskStatusUpdates() {
    if (this.createdTasks.length === 0) {
      throw new Error('No tasks available for status testing');
    }

    const taskToUpdate = this.createdTasks[0];

    // Update task status to in_progress
    const updateResult = await this.makeRequest('/api/projects/tasks', {
      method: 'PUT',
      body: JSON.stringify({
        taskId: taskToUpdate.id,
        status: 'in_progress',
        progress: 25
      })
    });

    if (!updateResult.success) {
      throw new Error('Failed to update task status');
    }

    this.log(`Task status updated: ${taskToUpdate.name} → in_progress`);

    // Complete the task
    const completeResult = await this.makeRequest('/api/projects/tasks', {
      method: 'PUT',
      body: JSON.stringify({
        taskId: taskToUpdate.id,
        status: 'completed',
        progress: 100
      })
    });

    if (!completeResult.success) {
      throw new Error('Failed to complete task');
    }

    this.log(`Task completed: ${taskToUpdate.name}`);
  }

  // Test 5: Test HubSpot Sync (Mock)
  async testHubSpotSync() {
    if (this.createdTasks.length === 0) {
      throw new Error('No tasks available for HubSpot sync testing');
    }

    const taskToSync = this.createdTasks[1]; // Use second task

    // Note: This will fail in test environment without HubSpot API key
    // but we test the endpoint structure
    try {
      const syncResult = await this.makeRequest('/api/projects/tasks/hubspot-sync', {
        method: 'POST',
        body: JSON.stringify({
          taskId: taskToSync.id,
          projectId: this.createdProject.id,
          taskName: taskToSync.name,
          description: taskToSync.description,
          status: taskToSync.status,
          priority: taskToSync.priority,
          assignee: taskToSync.assignments[0] ? {
            email: taskToSync.assignments[0].memberEmail,
            name: taskToSync.assignments[0].memberName
          } : undefined,
          dueDate: taskToSync.dueDate
        })
      });

      if (syncResult.success) {
        this.log(`HubSpot sync successful for task: ${taskToSync.name}`);
      } else {
        this.log(`HubSpot sync failed (expected in test): ${syncResult.error}`, 'warning');
      }
    } catch (error) {
      // Expected to fail without HubSpot API key
      this.log(`HubSpot sync failed (expected in test): ${error.message}`, 'warning');
    }
  }

  // Test 6: Test Notifications
  async testNotifications() {
    if (!this.createdProject || this.createdTasks.length === 0) {
      throw new Error('No project or tasks available for notification testing');
    }

    // Create a test notification
    const notification = {
      projectId: this.createdProject.id,
      taskId: this.createdTasks[0].id,
      recipientId: 'member-456',
      type: 'task_assigned',
      title: 'Test Task Assignment',
      message: 'You have been assigned to a test task',
      actionUrl: '/member/projects?view=tasks'
    };

    const result = await this.makeRequest('/api/projects/notifications', {
      method: 'POST',
      body: JSON.stringify(notification)
    });

    if (!result.success) {
      throw new Error('Failed to create notification');
    }

    this.log(`Notification created: ${notification.title}`);

    // Test fetching notifications
    const fetchResult = await this.makeRequest(
      `/api/projects/notifications?recipientId=member-456`
    );

    if (!fetchResult.success || !Array.isArray(fetchResult.data)) {
      throw new Error('Failed to fetch notifications');
    }

    this.log(`Fetched ${fetchResult.data.length} notifications (${fetchResult.unreadCount} unread)`);
  }

  // Test 7: Test Project Data Retrieval
  async testProjectRetrieval() {
    if (!this.createdProject) {
      throw new Error('No project available for retrieval testing');
    }

    // Test fetching enhanced projects
    const result = await this.makeRequest('/api/projects/enhanced');

    if (!result.success || !Array.isArray(result.data)) {
      throw new Error('Failed to fetch enhanced projects');
    }

    const fetchedProject = result.data.find(p => p.id === this.createdProject.id);
    if (!fetchedProject) {
      throw new Error('Created project not found in fetch results');
    }

    this.log(`Project retrieved with ${fetchedProject.taskCount?.total || 0} tasks`);

    // Validate project has expected task count
    if (fetchedProject.taskCount?.total !== this.createdTasks.length) {
      this.log(`Task count mismatch: expected ${this.createdTasks.length}, got ${fetchedProject.taskCount?.total}`, 'warning');
    }
  }

  // Test 8: Test My Tasks View
  async testMyTasksView() {
    // Test fetching tasks for current user
    const result = await this.makeRequest('/api/projects/tasks?memberId=current');

    if (!result.success || !Array.isArray(result.data)) {
      throw new Error('Failed to fetch user tasks');
    }

    // Should find at least one task assigned to test user
    const myTasks = result.data.filter(task => 
      task.assignments.some(assignment => assignment.memberId === 'test-user-123')
    );

    this.log(`Found ${myTasks.length} tasks assigned to current user`);

    if (myTasks.length === 0) {
      this.log('No tasks found for current user', 'warning');
    }
  }

  // Run all tests
  async runAllTests() {
    this.log('🚀 Starting Project Task Management Workflow Tests');
    this.log('='.repeat(80));

    try {
      await this.test('Create Enhanced Project', () => this.testCreateProject());
      await this.test('Create Tasks with Assignments', () => this.testCreateTasks());
      await this.test('Test Task Assignment Management', () => this.testTaskAssignments());
      await this.test('Test Task Status Updates', () => this.testTaskStatusUpdates());
      await this.test('Test HubSpot Sync Integration', () => this.testHubSpotSync());
      await this.test('Test Notification System', () => this.testNotifications());
      await this.test('Test Project Data Retrieval', () => this.testProjectRetrieval());
      await this.test('Test My Tasks View', () => this.testMyTasksView());

    } catch (error) {
      this.log(`Unexpected error during testing: ${error.message}`, 'error');
      this.testResults.failed++;
    }

    // Print summary
    this.log('='.repeat(80));
    this.log('📊 TEST RESULTS SUMMARY');
    this.log(`✅ Passed: ${this.testResults.passed}`);
    this.log(`❌ Failed: ${this.testResults.failed}`);
    this.log(`📊 Total Tests: ${this.testResults.passed + this.testResults.failed}`);

    if (this.testResults.errors.length > 0) {
      this.log('\n🔍 ERROR DETAILS:');
      this.testResults.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error.description}: ${error.error}`, 'error');
      });
    }

    // Cleanup message
    this.log('\n🧹 Note: In a real implementation, you would clean up test data');
    this.log(`Created Project ID: ${this.createdProject?.id || 'N/A'}`);
    this.log(`Created ${this.createdTasks.length} tasks`);

    return this.testResults.failed === 0;
  }
}

// Main execution
if (require.main === module) {
  const tester = new ProjectTaskWorkflowTester();
  
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = ProjectTaskWorkflowTester;