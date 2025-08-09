import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Notification } from '@/services/notifications/notification.interface';
import { notificationService } from '@/services/notifications/notification.service';

interface NotificationItemProps {
  notification: Notification;
  onDelete?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
  getIconByType: (type: string) => JSX.Element;
}

export default function NotificationItem({ 
  notification, 
  onDelete, 
  onMarkAsRead,
  getIconByType
}: NotificationItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const navigate = useNavigate();

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (notification.isRead || isMarkingAsRead) return;
    
    setIsMarkingAsRead(true);
    try {
      await notificationService.markAsRead(notification.id);
      if (onMarkAsRead) {
        onMarkAsRead(notification.id);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      await notificationService.deleteNotification(notification.id);
      if (onDelete) {
        onDelete(notification.id);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClick = () => {
    // Mark as read when clicked
    if (!notification.isRead) {
      notificationService.markAsRead(notification.id).then(() => {
        if (onMarkAsRead) {
          onMarkAsRead(notification.id);
        }
      });
    }
    
    // Navigate to the action URL if available
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

  return (
    <Card 
      className={`transition-colors ${!notification.isRead ? 'bg-muted/30' : ''} cursor-pointer`}
      onClick={handleClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex space-x-3 sm:space-x-4">
          <div className="relative mt-1 flex-shrink-0">
            <div className="scale-75 sm:scale-100">
              {getIconByType(notification.type)}
            </div>
            {!notification.isRead && (
              <span className="absolute right-0 top-0 h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-red-500" />
            )}
          </div>
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate pr-2">{notification.title || notification.senderName}</h4>
                <p className="text-xs text-muted-foreground">
                  {formatNotificationDate(notification.createdAt)}
                </p>
              </div>
              <div className="flex space-x-1 flex-shrink-0">
                {!notification.isRead && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 sm:h-7 sm:w-7"
                    onClick={handleMarkAsRead}
                    disabled={isMarkingAsRead}
                  >
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm pr-2 break-words">{notification.message}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 