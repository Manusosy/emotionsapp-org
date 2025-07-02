import { UserRole } from '@/types/auth';

/**
 * Notification type enum for consistent typing
 */
export type NotificationType = 
  | 'appointment' 
  | 'message' 
  | 'patient' 
  | 'group' 
  | 'document' 
  | 'system' 
  | 'alert' 
  | 'journal'
  | 'mood_tracking'
  | 'resource'
  | 'session'
  | 'review'
  | 'reminder'
  | 'welcome';

/**
 * Notification interface used across the application
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Parameters for creating a notification
 */
export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  senderName?: string;
  senderAvatar?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, any>;
}

/**
 * Notification preference settings
 */
export interface NotificationPreferences {
  emailNotifications: boolean;
  appointmentReminders: boolean;
  
  // Only relevant for patients
  moodTrackingReminders?: boolean;
  journalReminders?: boolean;
  resourceUpdates?: boolean;
  
  // Only relevant for mood mentors
  patientUpdates?: boolean;
  groupNotifications?: boolean;
  sessionNotifications?: boolean;
  reviewNotifications?: boolean;
  
  // Shared preferences
  messageNotifications: boolean;
  systemNotifications: boolean;
  marketingCommunications: boolean;
}

/**
 * Notification filters for querying
 */
export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Notification service interface
 */
export interface INotificationService {
  /**
   * Creates a new notification
   */
  createNotification(params: CreateNotificationParams): Promise<{ success: boolean; notificationId?: string; error?: string }>;
  
  /**
   * Gets notifications for a user with optional filtering
   */
  getNotifications(userId: string, filters?: NotificationFilters): Promise<{ 
    success: boolean; 
    data?: Notification[]; 
    error?: string 
  }>;
  
  /**
   * Marks a notification as read
   */
  markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Marks all notifications as read for a user
   */
  markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Deletes a notification
   */
  deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Gets user notification preferences
   */
  getNotificationPreferences(userId: string, userRole: UserRole): Promise<{ 
    success: boolean; 
    data?: NotificationPreferences; 
    error?: string 
  }>;
  
  /**
   * Updates user notification preferences
   */
  updateNotificationPreferences(
    userId: string, 
    preferences: NotificationPreferences,
    userRole: UserRole
  ): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Gets unread notification count for a user
   */
  getUnreadCount(userId: string): Promise<{ 
    success: boolean; 
    count?: number; 
    error?: string 
  }>;
  
  /**
   * Subscribes to real-time notification updates
   */
  subscribeToNotifications(
    userId: string, 
    callback: (notification: Notification) => void
  ): { unsubscribe: () => void };
} 