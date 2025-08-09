import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/authContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Check, 
  Clock, 
  MessageCircle, 
  Settings, 
  Users, 
  FileText,
  AlertCircle,
  Calendar,
  Heart,
  BookOpen,
  Star
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import NotificationItem from './NotificationItem';
import { 
  NotificationType, 
  NotificationPreferences 
} from '@/services/notifications/notification.interface';
import { notificationService } from '@/services/notifications/notification.service';
import { UserRole } from '@/types/auth';

interface NotificationsPageProps {
  userRole: UserRole;
  dashboardLayout: React.ComponentType<{ children: React.ReactNode }>;
}

/**
 * Unified Notifications Page component that can be used by both patient and mood mentor dashboards
 */
export default function NotificationsPage({ userRole, dashboardLayout: DashboardLayout }: NotificationsPageProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<NotificationType | 'all' | 'unread'>('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    appointmentReminders: true,
    messageNotifications: true,
    systemNotifications: true,
    marketingCommunications: false,
  });
  
  // Use the notifications hook with real-time updates
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    refresh,
    applyFilters
  } = useNotifications({ 
    realtime: true,
    autoRefresh: true
  });

  // Load notification preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      
      try {
        const result = await notificationService.getNotificationPreferences(user.id, userRole);
        if (result.success && result.data) {
          setPreferences(result.data);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    };
    
    loadPreferences();
  }, [user?.id, userRole]);

  // Update filters when tab changes
  useEffect(() => {
    if (activeTab === 'all') {
      applyFilters({});
    } else if (activeTab === 'unread') {
      applyFilters({ isRead: false });
    } else {
      applyFilters({ type: activeTab });
    }
  }, [activeTab, applyFilters]);

  // Save notification preferences
  const saveNotificationPreferences = async () => {
    if (!user?.id) return;

    try {
      const result = await notificationService.updateNotificationPreferences(
        user.id, 
        preferences,
        userRole
      );

      if (result.success) {
        toast.success('Notification preferences saved');
        setIsSettingsOpen(false);
      } else {
        toast.error(result.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast.error('Failed to save preferences');
    }
  };

  // Get icon for notification type
  const getIconByType = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Clock className="h-8 w-8 text-blue-500" />;
      case 'message':
        return <MessageCircle className="h-8 w-8 text-green-500" />;
      case 'patient':
        return <Users className="h-8 w-8 text-amber-500" />;
      case 'group':
        return <Users className="h-8 w-8 text-purple-500" />;
      case 'session':
        return <Calendar className="h-8 w-8 text-indigo-500" />;
      case 'journal':
        return <FileText className="h-8 w-8 text-indigo-500" />;
      case 'mood_tracking':
        return <Heart className="h-8 w-8 text-pink-500" />;
      case 'resource':
        return <BookOpen className="h-8 w-8 text-orange-500" />;
      case 'review':
        return <Star className="h-8 w-8 text-yellow-500" />;
      case 'reminder':
        return <Clock className="h-8 w-8 text-blue-400" />;
      case 'welcome':
        return <Heart className="h-8 w-8 text-emerald-500" />;
      case 'document':
        return <FileText className="h-8 w-8 text-gray-500" />;
      case 'alert':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      case 'system':
      default:
        return <Bell className="h-8 w-8 text-gray-500" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">
              Manage your notifications and alerts
            </p>
          </div>
          <div className="flex flex-col sm:flex-row w-full sm:w-auto space-y-2 sm:space-y-0 sm:space-x-2">
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Notification Preferences</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Common preferences for both roles */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, emailNotifications: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="font-medium">Appointment Reminders</h4>
                      <p className="text-sm text-muted-foreground">
                        Get notified about upcoming appointments
                      </p>
                    </div>
                    <Switch
                      checked={preferences.appointmentReminders}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, appointmentReminders: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="font-medium">Message Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Alerts for new messages
                      </p>
                    </div>
                    <Switch
                      checked={preferences.messageNotifications}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, messageNotifications: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="font-medium">System Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Important system updates and alerts
                      </p>
                    </div>
                    <Switch
                      checked={preferences.systemNotifications}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, systemNotifications: checked }))
                      }
                    />
                  </div>
                  
                  {/* Patient-specific preferences */}
                  {userRole === 'patient' && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-medium">Mood Tracking Reminders</h4>
                          <p className="text-sm text-muted-foreground">
                            Receive reminders to track your mood
                          </p>
                        </div>
                        <Switch
                          checked={preferences.moodTrackingReminders || false}
                          onCheckedChange={(checked) => 
                            setPreferences(prev => ({ ...prev, moodTrackingReminders: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-medium">Journal Reminders</h4>
                          <p className="text-sm text-muted-foreground">
                            Gentle reminders to update your journal
                          </p>
                        </div>
                        <Switch
                          checked={preferences.journalReminders || false}
                          onCheckedChange={(checked) => 
                            setPreferences(prev => ({ ...prev, journalReminders: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-medium">Resource Updates</h4>
                          <p className="text-sm text-muted-foreground">
                            Notifications about new resources and materials
                          </p>
                        </div>
                        <Switch
                          checked={preferences.resourceUpdates || false}
                          onCheckedChange={(checked) => 
                            setPreferences(prev => ({ ...prev, resourceUpdates: checked }))
                          }
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Mood mentor-specific preferences */}
                  {userRole === 'mood_mentor' && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-medium">Patient Updates</h4>
                          <p className="text-sm text-muted-foreground">
                            Alerts about patient status changes
                          </p>
                        </div>
                        <Switch
                          checked={preferences.patientUpdates || false}
                          onCheckedChange={(checked) => 
                            setPreferences(prev => ({ ...prev, patientUpdates: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-medium">Group Notifications</h4>
                          <p className="text-sm text-muted-foreground">
                            Updates about your support groups
                          </p>
                        </div>
                        <Switch
                          checked={preferences.groupNotifications || false}
                          onCheckedChange={(checked) => 
                            setPreferences(prev => ({ ...prev, groupNotifications: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-medium">Session Notifications</h4>
                          <p className="text-sm text-muted-foreground">
                            Alerts about group sessions and activities
                          </p>
                        </div>
                        <Switch
                          checked={preferences.sessionNotifications || false}
                          onCheckedChange={(checked) => 
                            setPreferences(prev => ({ ...prev, sessionNotifications: checked }))
                          }
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h4 className="font-medium">Review Notifications</h4>
                          <p className="text-sm text-muted-foreground">
                            Notifications about patient reviews and feedback
                          </p>
                        </div>
                        <Switch
                          checked={preferences.reviewNotifications || false}
                          onCheckedChange={(checked) => 
                            setPreferences(prev => ({ ...prev, reviewNotifications: checked }))
                          }
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Common marketing preferences */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="font-medium">Marketing Communications</h4>
                      <p className="text-sm text-muted-foreground">
                        Promotional emails and product updates
                      </p>
                    </div>
                    <Switch
                      checked={preferences.marketingCommunications}
                      onCheckedChange={(checked) => 
                        setPreferences(prev => ({ ...prev, marketingCommunications: checked }))
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-between">
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={saveNotificationPreferences}>Save Preferences</Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="default" 
              size="sm" 
              onClick={markAllAsRead} 
              disabled={unreadCount === 0}
              className="w-full sm:w-auto"
            >
              <Check className="w-4 h-4 mr-2" />
              Mark All as Read
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="space-y-4">
          <div className="flex justify-center sm:justify-between items-center">
            <TabsList className="grid w-full max-w-full grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:flex lg:w-auto overflow-x-auto">
              <TabsTrigger value="all" className="relative text-xs sm:text-sm">
                All
                {unreadCount > 0 && (
                  <Badge className="ml-1 sm:ml-2 px-1 py-0 h-4 sm:h-5 min-w-4 sm:min-w-5 bg-primary text-xs">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="unread" className="text-xs sm:text-sm">Unread</TabsTrigger>
              <TabsTrigger value="appointment" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Appointments</span>
                <span className="sm:hidden">Appt</span>
              </TabsTrigger>
              
              {/* Role-specific tabs */}
              {userRole === 'mood_mentor' && (
                <>
                  <TabsTrigger value="patient" className="text-xs sm:text-sm">Patients</TabsTrigger>
                  <TabsTrigger value="group" className="text-xs sm:text-sm">Groups</TabsTrigger>
                </>
              )}
              
              {userRole === 'patient' && (
                <TabsTrigger value="journal" className="text-xs sm:text-sm">Journal</TabsTrigger>
              )}
              
              <TabsTrigger value="message" className="text-xs sm:text-sm">
                <span className="hidden sm:inline">Messages</span>
                <span className="sm:hidden">Msg</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              <Card>
                <CardContent className="py-6">
                  <div className="flex justify-center items-center h-40">
                    <div className="animate-spin h-10 w-10 rounded-full border-t-2 border-blue-600 border-r-2 border-transparent"></div>
                  </div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card>
                <CardContent className="py-6">
                  <div className="text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Error loading notifications</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        {error}
                      </p>
                      <Button onClick={refresh} className="mt-2">Try Again</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : notifications.length === 0 ? (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center space-y-4">
                    <Bell className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">No notifications</h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        {activeTab === 'all' 
                          ? "You don't have any notifications at the moment." 
                          : activeTab === 'unread'
                            ? "You don't have any unread notifications."
                            : `You don't have any ${activeTab} notifications.`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onDelete={deleteNotification}
                    onMarkAsRead={markAsRead}
                    getIconByType={getIconByType}
                  />
                ))}
              </>
            )}
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 