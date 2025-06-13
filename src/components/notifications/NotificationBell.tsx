import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/authContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { notificationService } from '@/services/notifications/notification.service';
import { Notification } from '@/services/notifications/notification.interface';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch notifications when popover opens
  useEffect(() => {
    if (open && user?.id) {
      fetchNotifications();
    }
  }, [open, user?.id]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const { unsubscribe } = notificationService.subscribeToNotifications(
      user.id,
      (notification) => {
        // Update unread count
        setUnreadCount(prev => prev + 1);
        
        // Add to local notifications if popover is open
        if (open) {
          setNotifications(prev => [notification, ...prev]);
        }
      }
    );

    return unsubscribe;
  }, [user?.id, open]);

  // Periodically update unread count
  useEffect(() => {
    if (!user?.id) return;
    
    fetchUnreadCount();
    
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [user?.id]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const result = await notificationService.getNotifications(user.id, { limit: 5 });
      
      if (result.success && result.data) {
        setNotifications(result.data);
      } else {
        setError(result.error || 'Failed to load notifications');
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      setError(error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const result = await notificationService.getUnreadCount(user.id);
      
      if (result.success) {
        setUnreadCount(result.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await notificationService.markAllAsRead(user.id);
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }
    
    // Close the popover
    setOpen(false);
    
    // Navigate if there's an action URL
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const formatNotificationDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Determine where to redirect based on user role
  const getNotificationsPageUrl = () => {
    const userRole = user?.user_metadata?.role;
    return userRole === 'mood_mentor' 
      ? '/mood-mentor-dashboard/notifications' 
      : '/patient-dashboard/notifications';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full" 
              aria-hidden="true"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        
        <div className="max-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[140px]" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-sm text-red-500">{error}</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-2"
                onClick={fetchNotifications}
              >
                Try again
              </Button>
            </div>
          ) : notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 cursor-pointer hover:bg-slate-50 ${!notification.isRead ? 'bg-blue-50/50' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleNotificationClick(notification);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-blue-600' : ''}`}>
                      {notification.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 ml-2 whitespace-nowrap flex-shrink-0">
                      {formatNotificationDate(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-slate-500">No notifications yet</p>
            </div>
          )}
        </div>
        
        <div className="p-2 border-t text-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs w-full"
            onClick={() => {
              setOpen(false);
              navigate(getNotificationsPageUrl());
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
} 