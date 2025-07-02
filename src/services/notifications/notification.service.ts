import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/auth';
import { 
  INotificationService, 
  Notification, 
  CreateNotificationParams, 
  NotificationPreferences,
  NotificationFilters,
  NotificationType
} from './notification.interface';

/**
 * Implementation of the notification service
 */
export class NotificationService implements INotificationService {
  /**
   * Creates a new notification
   */
  async createNotification(params: CreateNotificationParams): Promise<{ 
    success: boolean; 
    notificationId?: string; 
    error?: string 
  }> {
    try {
      // Format data for Supabase (mapping our interface to DB schema)
      const notificationData = {
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        sender_name: params.senderName || 'System',
        sender_avatar: params.senderAvatar || null,
        action_url: params.actionUrl || null,
        metadata: params.metadata || {},
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select('id')
        .single();

      if (error) throw error;

      return {
        success: true,
        notificationId: data.id
      };
    } catch (error: any) {
      console.error('Error creating notification:', error);
      return {
        success: false,
        error: error.message || 'Failed to create notification'
      };
    }
  }

  /**
   * Gets notifications for a user with optional filtering
   */
  async getNotifications(userId: string, filters?: NotificationFilters): Promise<{ 
    success: boolean; 
    data?: Notification[]; 
    error?: string 
  }> {
    try {
      // Start with the base query
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters if provided
      if (filters) {
        if (filters.type) {
          query = query.eq('type', filters.type);
        }

        if (filters.isRead !== undefined) {
          query = query.eq('is_read', filters.isRead);
        }

        if (filters.startDate) {
          query = query.gte('created_at', filters.startDate);
        }

        if (filters.endDate) {
          query = query.lte('created_at', filters.endDate);
        }

        if (filters.limit) {
          query = query.limit(filters.limit);
        }

        if (filters.offset) {
          query = query.range(
            filters.offset, 
            (filters.offset + (filters.limit || 20) - 1)
          );
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map database results to our interface
      const notifications: Notification[] = (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        title: item.title,
        message: item.message,
        type: item.type as NotificationType,
        isRead: item.is_read,
        senderName: item.sender_name,
        senderAvatar: item.sender_avatar,
        actionUrl: item.action_url,
        metadata: item.metadata,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));

      return {
        success: true,
        data: notifications
      };
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch notifications'
      };
    }
  }

  /**
   * Marks a notification as read
   */
  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark notification as read'
      };
    }
  }

  /**
   * Marks all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      return {
        success: false,
        error: error.message || 'Failed to mark all notifications as read'
      };
    }
  }

  /**
   * Deletes a notification
   */
  async deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete notification'
      };
    }
  }

  /**
   * Gets user notification preferences
   */
  async getNotificationPreferences(userId: string, userRole: UserRole): Promise<{ 
    success: boolean; 
    data?: NotificationPreferences; 
    error?: string 
  }> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('notification_settings')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        throw error;
      }

      // If no preferences found, return defaults based on user role
      if (!data || !data.notification_settings) {
        return {
          success: true,
          data: this.getDefaultPreferences(userRole)
        };
      }

      // Return found preferences
      return {
        success: true,
        data: data.notification_settings as NotificationPreferences
      };
    } catch (error: any) {
      console.error('Error fetching notification preferences:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch notification preferences'
      };
    }
  }

  /**
   * Updates user notification preferences
   */
  async updateNotificationPreferences(
    userId: string, 
    preferences: NotificationPreferences,
    userRole: UserRole
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Ensure we're saving valid preferences for this user role
      const validatedPreferences = this.validatePreferencesForRole(preferences, userRole);
      
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          notification_settings: validatedPreferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error updating notification preferences:', error);
      return {
        success: false,
        error: error.message || 'Failed to update notification preferences'
      };
    }
  }

  /**
   * Gets unread notification count for a user
   */
  async getUnreadCount(userId: string): Promise<{ 
    success: boolean; 
    count?: number; 
    error?: string 
  }> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) throw error;

      return {
        success: true,
        count: count || 0
      };
    } catch (error: any) {
      console.error('Error fetching unread notification count:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch unread notification count'
      };
    }
  }

  /**
   * Subscribes to real-time notification updates
   */
  subscribeToNotifications(
    userId: string, 
    callback: (notification: Notification) => void
  ): { unsubscribe: () => void } {
    // Create a Supabase real-time subscription
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        // Transform the payload to our Notification interface
        const newNotification: Notification = {
          id: payload.new.id,
          userId: payload.new.user_id,
          title: payload.new.title,
          message: payload.new.message,
          type: payload.new.type as NotificationType,
          isRead: payload.new.is_read,
          senderName: payload.new.sender_name,
          senderAvatar: payload.new.sender_avatar,
          actionUrl: payload.new.action_url,
          metadata: payload.new.metadata,
          createdAt: payload.new.created_at,
          updatedAt: payload.new.updated_at
        };
        
        // Call the callback with the new notification
        callback(newNotification);
      })
      .subscribe();

    // Return an unsubscribe function
    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      }
    };
  }

  /**
   * Helper method to get default preferences based on user role
   */
  private getDefaultPreferences(userRole: UserRole): NotificationPreferences {
    // Common preferences
    const common = {
      emailNotifications: true,
      appointmentReminders: true,
      messageNotifications: true,
      systemNotifications: true,
      marketingCommunications: false
    };

    // Add role-specific preferences
    if (userRole === 'patient') {
      return {
        ...common,
        moodTrackingReminders: true,
        journalReminders: true,
        resourceUpdates: true
      };
    } else { // mood_mentor
      return {
        ...common,
        patientUpdates: true,
        groupNotifications: true,
        sessionNotifications: true,
        reviewNotifications: true
      };
    }
  }

  /**
   * Helper method to validate preferences against user role
   */
  private validatePreferencesForRole(
    preferences: NotificationPreferences,
    userRole: UserRole
  ): NotificationPreferences {
    // Get default preferences for this role
    const defaultPrefs = this.getDefaultPreferences(userRole);
    
    // Ensure all required fields exist
    const validated: NotificationPreferences = {
      emailNotifications: preferences.emailNotifications ?? defaultPrefs.emailNotifications,
      appointmentReminders: preferences.appointmentReminders ?? defaultPrefs.appointmentReminders,
      messageNotifications: preferences.messageNotifications ?? defaultPrefs.messageNotifications,
      systemNotifications: preferences.systemNotifications ?? defaultPrefs.systemNotifications,
      marketingCommunications: preferences.marketingCommunications ?? defaultPrefs.marketingCommunications
    };
    
    // Add role-specific fields
    if (userRole === 'patient') {
      validated.moodTrackingReminders = preferences.moodTrackingReminders ?? defaultPrefs.moodTrackingReminders;
      validated.journalReminders = preferences.journalReminders ?? defaultPrefs.journalReminders;
      validated.resourceUpdates = preferences.resourceUpdates ?? defaultPrefs.resourceUpdates;
    } else { // mood_mentor
      validated.patientUpdates = preferences.patientUpdates ?? defaultPrefs.patientUpdates;
      validated.groupNotifications = preferences.groupNotifications ?? defaultPrefs.groupNotifications;
      validated.sessionNotifications = preferences.sessionNotifications ?? defaultPrefs.sessionNotifications;
      validated.reviewNotifications = preferences.reviewNotifications ?? defaultPrefs.reviewNotifications;
    }
    
    return validated;
  }
}

// Export a singleton instance
export const notificationService = new NotificationService(); 