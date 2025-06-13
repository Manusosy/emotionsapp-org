import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '@/services'
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { AuthContext } from "@/contexts/authContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  read: boolean;
  type: 'welcome' | 'update' | 'reminder' | 'other';
  action_url?: string;
  user_id: string;
}

export default function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, user?.id]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        // Handle table not found errors gracefully
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          console.warn('Notifications table does not exist yet. This is normal if the app is newly deployed.');
          setNotifications([]);
          setUnreadCount(0);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Map database notifications to our interface and check localStorage for read status
      const mappedNotifications: Notification[] = (data || []).map(item => {
        // Check both database and localStorage for read status
        const isReadInLocalStorage = localStorage.getItem(`notification_${item.id}_read`) === 'true';
        
        return {
          id: item.id,
          title: item.title,
          content: item.message || '',
          created_at: item.created_at,
          read: isReadInLocalStorage || item.read,
          type: ((item as any).type as 'welcome' | 'update' | 'reminder' | 'other') || 'other',
          action_url: (item as any).action_url,
          user_id: item.user_id
        };
      });

      setNotifications(mappedNotifications);
      setUnreadCount(mappedNotifications.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
      // Set empty notifications to avoid undefined errors
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      // Update local state immediately for responsive UI
      const updatedNotifications = notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      setNotifications(updatedNotifications);
      
      // Update localStorage immediately
      localStorage.setItem(`notification_${id}_read`, 'true');
      
      // Calculate new unread count
      const newUnreadCount = updatedNotifications.filter((n) => !n.read).length;
      setUnreadCount(newUnreadCount);

      // Update in database
      await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Keep the UI state as updated even if the database update fails
    }
  };

  const markAllAsRead = async () => {
    try {
      // Get IDs of unread notifications
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length === 0) return;
      
      // Update localStorage immediately for all notifications
      unreadIds.forEach(id => {
        localStorage.setItem(`notification_${id}_read`, 'true');
      });
      
      // Update local state immediately
      const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updatedNotifications);
      setUnreadCount(0);

      // Update all notifications in database
      if (user?.id) {
        await supabase
          .from('notifications')
          .update({ 
            read: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .in('id', unreadIds);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      // Keep the UI state as updated even if the database update fails
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // If there's an action URL, redirect to it
    if (notification.action_url) {
      setOpen(false);
      navigate(notification.action_url);
    }
  };

  const formatNotificationDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return 'Unknown date';
    }
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
              onClick={markAllAsRead}
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
                  className={`p-3 cursor-pointer hover:bg-slate-50 ${!notification.read ? 'bg-blue-50/50' : ''}`}
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
                    <h4 className={`text-sm font-medium ${!notification.read ? 'text-blue-600' : ''}`}>
                      {notification.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 ml-2 whitespace-nowrap flex-shrink-0">
                      {formatNotificationDate(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {notification.content}
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
              navigate('/dashboard/notifications');
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
} 


