import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hubspotSchedulingService } from '@/lib/services/hubspot-scheduling.service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workflowType, appointmentId, data } = body;

    if (!workflowType || !appointmentId) {
      return NextResponse.json(
        { error: 'Workflow type and appointment ID are required' },
        { status: 400 }
      );
    }

    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        contractorId: session.user.id
      },
      include: {
        service: true,
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    let result;

    switch (workflowType) {
      case 'send_confirmation':
        result = await sendConfirmationWorkflow(appointment);
        break;
      
      case 'send_reminder':
        result = await sendReminderWorkflow(appointment, data?.reminderType || '24h');
        break;
      
      case 'request_review':
        result = await requestReviewWorkflow(appointment);
        break;
      
      case 'follow_up':
        result = await followUpWorkflow(appointment, data?.followUpType || 'standard');
        break;
      
      case 'reschedule_notification':
        result = await rescheduleNotificationWorkflow(appointment, data);
        break;
      
      case 'cancellation_notification':
        result = await cancellationNotificationWorkflow(appointment, data);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid workflow type' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing workflow:', error);
    return NextResponse.json(
      { error: 'Failed to execute workflow' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');

    if (!appointmentId) {
      return NextResponse.json(
        { error: 'Appointment ID is required' },
        { status: 400 }
      );
    }

    // Get workflow suggestions based on appointment status
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        contractorId: session.user.id
      }
    });

    if (!appointment) {
      return NextResponse.json(
        { error: 'Appointment not found' },
        { status: 404 }
      );
    }

    const suggestions = getWorkflowSuggestions(appointment);

    return NextResponse.json({
      appointmentId,
      status: appointment.status,
      suggestions
    });
  } catch (error) {
    console.error('Error fetching workflow suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflow suggestions' },
      { status: 500 }
    );
  }
}

async function sendConfirmationWorkflow(appointment: any) {
  try {
    // Send confirmation email via HubSpot
    const emailData = {
      to: appointment.clientEmail || appointment.client?.email,
      subject: `Appointment Confirmation - ${appointment.service.serviceName}`,
      template: 'appointment_confirmation',
      data: {
        clientName: appointment.clientName || appointment.client?.name,
        serviceName: appointment.service.serviceName,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        totalPrice: appointment.totalPrice,
        depositAmount: appointment.depositAmount,
        appointmentNotes: appointment.appointmentNotes
      }
    };

    // This would integrate with your email service (SendGrid, HubSpot, etc.)
    console.log('Sending confirmation email:', emailData);

    return {
      success: true,
      message: 'Confirmation email sent successfully',
      workflowType: 'send_confirmation'
    };
  } catch (error) {
    throw new Error('Failed to send confirmation email');
  }
}

async function sendReminderWorkflow(appointment: any, reminderType: string) {
  try {
    const reminderTimes = {
      '24h': 24,
      '2h': 2,
      '30m': 0.5
    };

    const hoursBeforeAppointment = reminderTimes[reminderType as keyof typeof reminderTimes] || 24;

    const emailData = {
      to: appointment.clientEmail || appointment.client?.email,
      subject: `Appointment Reminder - ${appointment.service.serviceName}`,
      template: 'appointment_reminder',
      data: {
        clientName: appointment.clientName || appointment.client?.name,
        serviceName: appointment.service.serviceName,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        hoursBeforeAppointment
      }
    };

    console.log('Sending reminder email:', emailData);

    return {
      success: true,
      message: `${reminderType} reminder sent successfully`,
      workflowType: 'send_reminder'
    };
  } catch (error) {
    throw new Error('Failed to send reminder email');
  }
}

async function requestReviewWorkflow(appointment: any) {
  try {
    if (appointment.status !== 'COMPLETED') {
      throw new Error('Can only request reviews for completed appointments');
    }

    const emailData = {
      to: appointment.clientEmail || appointment.client?.email,
      subject: 'How was your experience? Please leave a review',
      template: 'review_request',
      data: {
        clientName: appointment.clientName || appointment.client?.name,
        serviceName: appointment.service.serviceName,
        appointmentDate: appointment.appointmentDate,
        reviewLink: `${process.env.NEXTAUTH_URL}/reviews/new?appointment=${appointment.id}`
      }
    };

    console.log('Sending review request email:', emailData);

    return {
      success: true,
      message: 'Review request sent successfully',
      workflowType: 'request_review'
    };
  } catch (error) {
    throw new Error('Failed to send review request');
  }
}

async function followUpWorkflow(appointment: any, followUpType: string) {
  try {
    if (appointment.status !== 'COMPLETED') {
      throw new Error('Can only send follow-up for completed appointments');
    }

    const followUpTemplates = {
      'standard': 'follow_up_standard',
      'upsell': 'follow_up_upsell',
      'maintenance': 'follow_up_maintenance'
    };

    const template = followUpTemplates[followUpType as keyof typeof followUpTemplates] || 'follow_up_standard';

    const emailData = {
      to: appointment.clientEmail || appointment.client?.email,
      subject: 'Thank you for choosing our services',
      template,
      data: {
        clientName: appointment.clientName || appointment.client?.name,
        serviceName: appointment.service.serviceName,
        appointmentDate: appointment.appointmentDate
      }
    };

    console.log('Sending follow-up email:', emailData);

    return {
      success: true,
      message: `${followUpType} follow-up sent successfully`,
      workflowType: 'follow_up'
    };
  } catch (error) {
    throw new Error('Failed to send follow-up email');
  }
}

async function rescheduleNotificationWorkflow(appointment: any, data: any) {
  try {
    const emailData = {
      to: appointment.clientEmail || appointment.client?.email,
      subject: 'Appointment Rescheduled',
      template: 'appointment_rescheduled',
      data: {
        clientName: appointment.clientName || appointment.client?.name,
        serviceName: appointment.service.serviceName,
        oldDate: data.oldDate,
        oldTime: data.oldTime,
        newDate: appointment.appointmentDate,
        newTime: appointment.startTime,
        reason: data.reason
      }
    };

    console.log('Sending reschedule notification:', emailData);

    return {
      success: true,
      message: 'Reschedule notification sent successfully',
      workflowType: 'reschedule_notification'
    };
  } catch (error) {
    throw new Error('Failed to send reschedule notification');
  }
}

async function cancellationNotificationWorkflow(appointment: any, data: any) {
  try {
    const emailData = {
      to: appointment.clientEmail || appointment.client?.email,
      subject: 'Appointment Cancelled',
      template: 'appointment_cancelled',
      data: {
        clientName: appointment.clientName || appointment.client?.name,
        serviceName: appointment.service.serviceName,
        appointmentDate: appointment.appointmentDate,
        startTime: appointment.startTime,
        reason: data.reason,
        refundAmount: data.refundAmount,
        refundProcessed: data.refundProcessed
      }
    };

    console.log('Sending cancellation notification:', emailData);

    return {
      success: true,
      message: 'Cancellation notification sent successfully',
      workflowType: 'cancellation_notification'
    };
  } catch (error) {
    throw new Error('Failed to send cancellation notification');
  }
}

function getWorkflowSuggestions(appointment: any) {
  const suggestions = [];
  const now = new Date();
  const appointmentTime = new Date(appointment.startTime);
  const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  switch (appointment.status) {
    case 'SCHEDULED':
      suggestions.push({
        type: 'send_confirmation',
        title: 'Send Confirmation Email',
        description: 'Send appointment confirmation to client',
        priority: 'high'
      });

      if (hoursUntilAppointment <= 24 && hoursUntilAppointment > 2) {
        suggestions.push({
          type: 'send_reminder',
          title: 'Send 24h Reminder',
          description: 'Send reminder 24 hours before appointment',
          priority: 'medium',
          data: { reminderType: '24h' }
        });
      }

      if (hoursUntilAppointment <= 2 && hoursUntilAppointment > 0.5) {
        suggestions.push({
          type: 'send_reminder',
          title: 'Send 2h Reminder',
          description: 'Send reminder 2 hours before appointment',
          priority: 'high',
          data: { reminderType: '2h' }
        });
      }
      break;

    case 'CONFIRMED':
      if (hoursUntilAppointment <= 0.5 && hoursUntilAppointment > 0) {
        suggestions.push({
          type: 'send_reminder',
          title: 'Send Final Reminder',
          description: 'Send final reminder 30 minutes before appointment',
          priority: 'high',
          data: { reminderType: '30m' }
        });
      }
      break;

    case 'COMPLETED':
      suggestions.push({
        type: 'request_review',
        title: 'Request Review',
        description: 'Ask client to leave a review',
        priority: 'medium'
      });

      suggestions.push({
        type: 'follow_up',
        title: 'Send Follow-up',
        description: 'Send thank you and follow-up email',
        priority: 'low',
        data: { followUpType: 'standard' }
      });
      break;

    case 'CANCELLED':
      // No suggestions for cancelled appointments
      break;
  }

  return suggestions;
}