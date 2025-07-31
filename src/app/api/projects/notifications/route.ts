import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';

// Mock database - replace with actual database implementation
let projectNotifications: any[] = [];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get('recipientId') || session.user.id || session.user.email;
    const read = searchParams.get('read');
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');

    let filteredNotifications = projectNotifications.filter(
      notification => notification.recipientId === recipientId
    );

    if (read !== null) {
      filteredNotifications = filteredNotifications.filter(
        notification => notification.read === (read === 'true')
      );
    }

    if (projectId) {
      filteredNotifications = filteredNotifications.filter(
        notification => notification.projectId === projectId
      );
    }

    if (type) {
      filteredNotifications = filteredNotifications.filter(
        notification => notification.type === type
      );
    }

    // Sort by most recent first
    filteredNotifications.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    return NextResponse.json({
      success: true,
      data: filteredNotifications,
      unreadCount: filteredNotifications.filter(n => !n.read).length,
      message: 'Notifications retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      taskId,
      recipientId,
      type,
      title,
      message,
      actionUrl
    } = body;

    if (!projectId || !recipientId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Project ID, recipient ID, type, title, and message are required' },
        { status: 400 }
      );
    }

    const notification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      taskId,
      recipientId,
      type,
      title,
      message,
      read: false,
      sentAt: new Date(),
      actionUrl,
      createdBy: session.user.id || session.user.email
    };

    projectNotifications.push(notification);

    // TODO: Send email notification if enabled
    await sendNotificationEmail(notification);

    return NextResponse.json({
      success: true,
      data: notification,
      message: 'Notification created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, read } = body;

    if (!notificationId || read === undefined) {
      return NextResponse.json(
        { error: 'Notification ID and read status are required' },
        { status: 400 }
      );
    }

    const notificationIndex = projectNotifications.findIndex(
      notification => notification.id === notificationId
    );

    if (notificationIndex === -1) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // Check if user can modify this notification
    const notification = projectNotifications[notificationIndex];
    if (notification.recipientId !== (session.user.id || session.user.email)) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this notification' },
        { status: 403 }
      );
    }

    projectNotifications[notificationIndex] = {
      ...notification,
      read,
      readAt: read ? new Date() : null
    };

    return NextResponse.json({
      success: true,
      data: projectNotifications[notificationIndex],
      message: 'Notification updated successfully'
    });

  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}

// Batch mark as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, notificationIds } = body;

    if (action === 'mark_all_read') {
      const recipientId = session.user.id || session.user.email;
      
      projectNotifications = projectNotifications.map(notification => {
        if (notification.recipientId === recipientId && !notification.read) {
          return {
            ...notification,
            read: true,
            readAt: new Date()
          };
        }
        return notification;
      });

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      });
    }

    if (action === 'mark_selected_read' && notificationIds) {
      const recipientId = session.user.id || session.user.email;
      
      projectNotifications = projectNotifications.map(notification => {
        if (
          notification.recipientId === recipientId &&
          notificationIds.includes(notification.id) &&
          !notification.read
        ) {
          return {
            ...notification,
            read: true,
            readAt: new Date()
          };
        }
        return notification;
      });

      return NextResponse.json({
        success: true,
        message: 'Selected notifications marked as read'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action or missing parameters' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error batch updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to batch update notifications' },
      { status: 500 }
    );
  }
}

// Helper function to send email notifications
async function sendNotificationEmail(notification: any) {
  try {
    // TODO: Implement email sending logic using SendGrid or similar
    console.log('Email notification would be sent:', {
      to: notification.recipientId,
      subject: notification.title,
      message: notification.message
    });
  } catch (error) {
    console.error('Error sending email notification:', error);
  }
}

// Helper function to create task assignment notification
export async function createTaskAssignmentNotification(
  projectId: string,
  taskId: string,
  taskName: string,
  assigneeId: string,
  assigneeName: string,
  assignedBy: string
) {
  const notification = {
    id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    taskId,
    recipientId: assigneeId,
    type: 'task_assigned',
    title: 'New Task Assignment',
    message: `You have been assigned to task "${taskName}"`,
    read: false,
    sentAt: new Date(),
    actionUrl: `/member/projects?view=tasks&taskId=${taskId}`,
    createdBy: assignedBy
  };

  projectNotifications.push(notification);
  await sendNotificationEmail(notification);
  return notification;
}

// Helper function to create task completion notification
export async function createTaskCompletionNotification(
  projectId: string,
  taskId: string,
  taskName: string,
  projectOwnerId: string,
  completedBy: string
) {
  const notification = {
    id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    taskId,
    recipientId: projectOwnerId,
    type: 'task_completed',
    title: 'Task Completed',
    message: `Task "${taskName}" has been completed`,
    read: false,
    sentAt: new Date(),
    actionUrl: `/member/projects?projectId=${projectId}`,
    createdBy: completedBy
  };

  projectNotifications.push(notification);
  await sendNotificationEmail(notification);
  return notification;
}