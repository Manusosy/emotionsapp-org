import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  read: boolean;
  type: 'welcome' | 'update' | 'reminder' | 'appointment' | 'message' | 'review' | 'other';
  user_id?: string;
}

interface NotificationBellProps {
  userId: string;
  unreadCount: number;
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onFetchNotifications: () => void;
  formatTime: (date: string) => string;
  getNotificationIcon: (type: Notification['type']) => any;
}

export default function NotificationBell({
  userId,
  unreadCount,
  notifications,
  onNotificationClick,
  onMarkAllAsRead,
  onDeleteNotification,
  onFetchNotifications,
  formatTime,
  getNotificationIcon
}: NotificationBellProps) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Effect for handling outside clicks is managed in the parent component

  const handleOpenChange = (open: boolean) => {
    setNotificationOpen(open);
    if (open) {
      onFetchNotifications();
    }
  };

  return (
    <div className="relative" ref={notificationRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleOpenChange(!notificationOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>
      
      {notificationOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-md border z-50">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-medium">Notifications</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={onMarkAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </Button>
          </div>
          <div className="max-h-[400px] overflow-y-auto p-2">
            {notifications.length > 0 ? (
              notifications.map((notification) => {
                const NotificationIcon = getNotificationIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`p-2 hover:bg-gray-100 rounded-md cursor-pointer ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onNotificationClick(notification)}
                  >
                    <div className="flex items-start">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-2 ${
                        !notification.read ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <NotificationIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {notification.content}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 