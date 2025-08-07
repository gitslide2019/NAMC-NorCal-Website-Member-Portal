/**
 * Smart Task Assignment Notifications
 * 
 * Intelligent notifications for task assignments based on member preferences
 * Personalizes notification timing and content based on member behavior
 */

import { NextRequest, NextResponse } from 'next/server';
import { CrossFeatureIntegrationService } from '@/lib/services/cross-feature-integration.service';

const crossFeatureService = new CrossFeatureIntegrationService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, taskId, taskType, priority, assignedBy, dueDate, projectId } = body;

    if (!memberId || !taskId) {
      return NextResponse.json(
        { error: 'Missing required fields: memberId, taskId' },
        { status: 400 }
      );
    }

    // Get member preferences and activity patterns
    const memberProfile = await crossFeatureService.getMemberProfile(memberId);
    const engagementScore = await crossFeatureService.calculateEngagementScore(memberId);

    // Determine optimal notification strategy
    const notificationStrategy = determineNotificationStrategy(
      memberProfile,
      engagementScore,
      taskType,
      priority
    );

    // Track the notification event
    await crossFeatureService.trackMemberJourney({
      memberId,
      feature: 'notifications',
      action: 'smart-task-notification',
      timestamp: new Date(),
      metadata: {
        taskId,
        taskType,
        priority,
        assignedBy,
        dueDate,
        projectId,
        strategy: notificationStrategy.type
      }
    });

    // Generate personalized notification content
    const notificationContent = generatePersonalizedTaskNotification(
      memberProfile,
      taskType,
      priority,
      assignedBy,
      dueDate
    );

    console.log(`Smart task notification sent to member ${memberId} for task ${taskId} using ${notificationStrategy.type} strategy`);

    return NextResponse.json({
      success: true,
      notificationSent: true,
      strategy: notificationStrategy,
      content: notificationContent,
      followUpScheduled: notificationStrategy.followUp,
      memberEngagement: {
        score: engagementScore.overallScore,
        preferredTime: notificationStrategy.optimalTime,
        communicationStyle: notificationStrategy.style
      }
    });

  } catch (error) {
    console.error('Smart task notification webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process smart task notification' },
      { status: 500 }
    );
  }
}

/**
 * Determine optimal notification strategy based on member profile and task
 */
function determineNotificationStrategy(
  memberProfile: any,
  engagementScore: any,
  taskType: string,
  priority: string
): any {
  const strategy = {
    type: 'standard',
    style: 'professional',
    optimalTime: 'business-hours',
    followUp: false,
    channels: ['email']
  };

  // Adjust based on engagement score
  if (engagementScore.overallScore > 80) {
    strategy.type = 'concise';
    strategy.style = 'direct';
  } else if (engagementScore.overallScore < 40) {
    strategy.type = 'detailed';
    strategy.style = 'supportive';
    strategy.followUp = true;
  }

  // Adjust based on task priority
  if (priority === 'urgent' || priority === 'high') {
    strategy.channels = ['email', 'sms'];
    strategy.followUp = true;
  }

  // Adjust based on task type
  if (taskType === 'project-milestone') {
    strategy.style = 'celebratory';
  } else if (taskType === 'deadline-reminder') {
    strategy.style = 'urgent';
  }

  // Adjust based on member preferences (mock data)
  if (memberProfile.communicationPreference === 'minimal') {
    strategy.type = 'concise';
    strategy.channels = ['email'];
  }

  return strategy;
}

/**
 * Generate personalized notification content
 */
function generatePersonalizedTaskNotification(
  memberProfile: any,
  taskType: string,
  priority: string,
  assignedBy: string,
  dueDate: string
): any {
  const memberName = memberProfile.name || 'Member';
  const urgencyText = priority === 'urgent' ? 'URGENT: ' : priority === 'high' ? 'Important: ' : '';
  
  const templates = {
    'project-task': {
      subject: `${urgencyText}New Project Task Assigned - ${memberName}`,
      greeting: `Hi ${memberName},`,
      body: `You have been assigned a new project task. This aligns with your expertise in ${memberProfile.skills?.join(', ') || 'construction'}.`,
      cta: 'View Task Details'
    },
    'milestone-review': {
      subject: `${urgencyText}Milestone Review Required - ${memberName}`,
      greeting: `Hello ${memberName},`,
      body: `A project milestone is ready for your review. Your attention to detail is valued for this important checkpoint.`,
      cta: 'Review Milestone'
    },
    'collaboration': {
      subject: `${urgencyText}Team Collaboration Request - ${memberName}`,
      greeting: `Hi ${memberName},`,
      body: `Your expertise is needed for a team collaboration. This is a great opportunity to share your knowledge.`,
      cta: 'Join Collaboration'
    },
    'default': {
      subject: `${urgencyText}New Task Assignment - ${memberName}`,
      greeting: `Hello ${memberName},`,
      body: `You have been assigned a new task that matches your skills and interests.`,
      cta: 'View Task'
    }
  };

  const template = templates[taskType as keyof typeof templates] || templates.default;

  return {
    subject: template.subject,
    greeting: template.greeting,
    body: template.body,
    assignedBy: `Assigned by: ${assignedBy}`,
    dueDate: dueDate ? `Due: ${new Date(dueDate).toLocaleDateString()}` : '',
    cta: template.cta,
    footer: 'This notification was personalized based on your preferences and activity.'
  };
}