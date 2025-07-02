export * from './notification.interface';
export * from './notification.service';

import { notificationService } from './notification.service';
import { CreateNotificationParams } from './notification.interface';

/**
 * Notification Helpers - Centralized functions for creating notifications across the app
 */
export class NotificationHelpers {
  
  // Messaging notifications
  static async createMessageNotification(params: {
    recipientId: string;
    senderName: string;
    senderAvatar?: string;
    content: string;
    conversationId: string;
    messageId: string;
  }) {
    return notificationService.createNotification({
      userId: params.recipientId,
      title: 'New Message',
      message: `${params.senderName} sent you a message: ${params.content.substring(0, 50)}${params.content.length > 50 ? '...' : ''}`,
      type: 'message',
      senderName: params.senderName,
      senderAvatar: params.senderAvatar || null,
      actionUrl: `/messages/${params.conversationId}`,
      metadata: {
        conversationId: params.conversationId,
        senderId: params.senderName,
        messageId: params.messageId
      }
    });
  }

  // Support group notifications
  static async createGroupJoinNotification(params: {
    userId: string;
    groupId: string;
    groupName: string;
  }) {
    return notificationService.createNotification({
      userId: params.userId,
      title: 'Welcome to Support Group',
      message: `You've successfully joined "${params.groupName}". Your support journey begins now!`,
      type: 'group',
      actionUrl: `/patient-dashboard/groups`,
      metadata: {
        groupId: params.groupId,
        groupName: params.groupName,
        action: 'joined_group'
      }
    });
  }

  static async createNewMemberNotification(params: {
    mentorId: string;
    groupId: string;
    groupName: string;
    newMemberId: string;
  }) {
    return notificationService.createNotification({
      userId: params.mentorId,
      title: 'New Group Member',
      message: `A new member has joined your "${params.groupName}" support group.`,
      type: 'group',
      actionUrl: `/mood-mentor-dashboard/groups`,
      metadata: {
        groupId: params.groupId,
        groupName: params.groupName,
        newMemberId: params.newMemberId,
        action: 'new_member'
      }
    });
  }

  static async createSessionStartNotification(params: {
    userId: string;
    groupName: string;
    sessionId: string;
    groupId: string;
  }) {
    return notificationService.createNotification({
      userId: params.userId,
      title: `${params.groupName} Session Started`,
      message: `Your ${params.groupName} session has started. Click to join the meeting.`,
      type: 'session',
      actionUrl: `/patient-dashboard/group-session/${params.sessionId}`,
      metadata: {
        groupId: params.groupId,
        sessionId: params.sessionId,
        groupName: params.groupName,
        action: 'session_started'
      }
    });
  }

  static async createSessionReminderNotification(params: {
    userId: string;
    groupName: string;
    sessionId: string;
    groupId: string;
    startTime: string;
  }) {
    return notificationService.createNotification({
      userId: params.userId,
      title: 'Upcoming Session Reminder',
      message: `Your "${params.groupName}" session starts in 1 hour at ${params.startTime}.`,
      type: 'reminder',
      actionUrl: `/patient-dashboard/groups`,
      metadata: {
        groupId: params.groupId,
        sessionId: params.sessionId,
        groupName: params.groupName,
        action: 'session_reminder'
      }
    });
  }

  // Resource notifications
  static async createNewResourceNotification(params: {
    userId: string;
    resourceId: string;
    resourceTitle: string;
    resourceCategory: string;
    creatorName: string;
  }) {
    return notificationService.createNotification({
      userId: params.userId,
      title: 'New Resource Available',
      message: `${params.creatorName} has shared a new ${params.resourceCategory} resource: "${params.resourceTitle}"`,
      type: 'resource',
      actionUrl: `/patient-dashboard/resources`,
      metadata: {
        resourceId: params.resourceId,
        resourceTitle: params.resourceTitle,
        resourceCategory: params.resourceCategory,
        creatorName: params.creatorName,
        action: 'new_resource'
      }
    });
  }

  // Mood tracking notifications
  static async createMoodAlertNotification(params: {
    mentorId: string;
    patientId: string;
    patientName: string;
    moodScore: number;
    moodType: string;
    assessmentId: string;
  }) {
    return notificationService.createNotification({
      userId: params.mentorId,
      title: 'Patient Mood Alert',
      message: `${params.patientName} has logged a ${params.moodType} mood with score ${params.moodScore}/10. Consider checking in with them.`,
      type: 'alert',
      actionUrl: `/mood-mentor-dashboard/patients`,
      metadata: {
        patientId: params.patientId,
        patientName: params.patientName,
        moodScore: params.moodScore,
        moodType: params.moodType,
        assessmentId: params.assessmentId,
        action: 'mood_alert'
      }
    });
  }

  static async createPositiveStreakNotification(params: {
    userId: string;
    averageScore: number;
    streakLength: number;
  }) {
    return notificationService.createNotification({
      userId: params.userId,
      title: 'Great Progress!',
      message: `You've maintained positive moods this week! Your average mood score is ${params.averageScore.toFixed(1)}/10. Keep up the excellent work!`,
      type: 'mood_tracking',
      actionUrl: `/patient-dashboard/mood-tracker`,
      metadata: {
        averageScore: params.averageScore,
        streakLength: params.streakLength,
        action: 'positive_streak'
      }
    });
  }

  // Appointment notifications
  static async createAppointmentCancelledNotification(params: {
    recipientId: string;
    appointmentDate: string;
    appointmentTime: string;
    reason?: string;
    isCancelledByMentor: boolean;
  }) {
    return notificationService.createNotification({
      userId: params.recipientId,
      title: 'Appointment Cancelled',
      message: params.isCancelledByMentor
        ? `Your appointment on ${params.appointmentDate} at ${params.appointmentTime} has been cancelled by your mood mentor.${params.reason ? ` Reason: ${params.reason}` : ''}`
        : `Your patient has cancelled their appointment scheduled for ${params.appointmentDate} at ${params.appointmentTime}.${params.reason ? ` Reason: ${params.reason}` : ''}`,
      type: 'appointment',
      actionUrl: `/appointments`,
      metadata: {
        appointmentDate: params.appointmentDate,
        appointmentTime: params.appointmentTime,
        reason: params.reason,
        action: 'appointment_cancelled'
      }
    });
  }

  // Journal notifications
  static async createJournalReminderNotification(params: {
    userId: string;
  }) {
    return notificationService.createNotification({
      userId: params.userId,
      title: 'Journal Check-in',
      message: 'Take a moment to reflect on your day and update your journal.',
      type: 'reminder',
      actionUrl: `/patient-dashboard/journal`,
      metadata: {
        action: 'journal_reminder'
      }
    });
  }

  // System notifications
  static async createWelcomeNotification(params: {
    userId: string;
    userName: string;
    userRole: 'patient' | 'mood_mentor';
  }) {
    const dashboardUrl = params.userRole === 'patient' 
      ? '/patient-dashboard' 
      : '/mood-mentor-dashboard';
    
    return notificationService.createNotification({
      userId: params.userId,
      title: 'Welcome to Emotions App!',
      message: `Welcome ${params.userName}! We're excited to have you join our community. Start exploring your dashboard to get the most out of your experience.`,
      type: 'welcome',
      actionUrl: dashboardUrl,
      metadata: {
        userRole: params.userRole,
        action: 'welcome'
      }
    });
  }
}

// Export helpers for easy access
export const notificationHelpers = NotificationHelpers; 