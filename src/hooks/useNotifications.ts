import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/authContext';
import { notificationService } from '@/services/notifications/notification.service';
import { 
  Notification, 
  NotificationType, 
  NotificationFilters 
} from '@/services/notifications/notification.interface';

interface UseNotificationsOptions {
  autoRefresh?: boolean;
  defaultFilters?: NotificationFilters;
  realtime?: boolean;
}

/**
 * Hook for managing notifications
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<NotificationFilters>(
    options.defaultFilters || {}
  );

  // Fetch notifications with current filters
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await notificationService.getNotifications(user.id, activeFilters);
      
      if (result.success && result.data) {
        setNotifications(result.data);
      } else {
        setError(result.error || 'Failed to fetch notifications');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching notifications');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, activeFilters]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const result = await notificationService.getUnreadCount(user.id);
      
      if (result.success) {
        setUnreadCount(result.count || 0);
      }
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [user?.id]);

  // Mark a notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const result = await notificationService.markAsRead(notificationId);
      
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        
        // Decrement unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      return result.success;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return false;
    
    try {
      const result = await notificationService.markAllAsRead(user.id);
      
      if (result.success) {
        // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
      
      return result.success;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return false;
    }
  }, [user?.id]);

  // Delete a notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const result = await notificationService.deleteNotification(notificationId);
      
      if (result.success) {
        // Update local state
        const deletedNotification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        // Update unread count if the deleted notification was unread
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
      
      return result.success;
    } catch (err) {
      console.error('Error deleting notification:', err);
      return false;
    }
  }, [notifications]);

  // Update filters and refetch
  const applyFilters = useCallback((filters: NotificationFilters) => {
    setActiveFilters(filters);
  }, []);

  // Handle receiving a new notification
  const handleNewNotification = useCallback((notification: Notification) => {
    // Check if the notification matches current filters
    let shouldAdd = true;
    
    if (activeFilters.type && notification.type !== activeFilters.type) {
      shouldAdd = false;
    }
    
    if (activeFilters.isRead !== undefined && notification.isRead !== activeFilters.isRead) {
      shouldAdd = false;
    }
    
    // Add to notifications if it matches filters
    if (shouldAdd) {
      setNotifications(prev => [notification, ...prev]);
    }
    
    // Update unread count
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  }, [activeFilters]);

  // Initial data fetch
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [user?.id, fetchNotifications, fetchUnreadCount]);

  // Set up real-time subscription if enabled
  useEffect(() => {
    if (!options.realtime || !user?.id) return;
    
    const { unsubscribe } = notificationService.subscribeToNotifications(
      user.id,
      handleNewNotification
    );
    
    return unsubscribe;
  }, [user?.id, options.realtime, handleNewNotification]);

  // Auto-refresh setup
  useEffect(() => {
    if (!options.autoRefresh || !user?.id) return;
    
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // Refresh unread count every 30 seconds
    
    return () => clearInterval(interval);
  }, [user?.id, options.autoRefresh, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    activeFilters,
    applyFilters,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchNotifications
  };
} 