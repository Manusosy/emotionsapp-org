import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/authContext';
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, KeyRound, Bell, Mail, ShieldAlert, Eye, EyeOff, AlertTriangle, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { authService } from '@/services';
import { ServiceResponse } from '@/services';

interface MoodMentorSettings {
  id: string;
  mentor_id: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  appointment_reminders: boolean;
  message_notifications: boolean;
  review_notifications: boolean;
  marketing_emails: boolean;
  profile_privacy: 'public' | 'private' | 'connections_only';
  two_factor_enabled: boolean;
  auto_accept_appointments: boolean;
  working_hours: {
    monday: { enabled: boolean, start: string, end: string },
    tuesday: { enabled: boolean, start: string, end: string },
    wednesday: { enabled: boolean, start: string, end: string },
    thursday: { enabled: boolean, start: string, end: string },
    friday: { enabled: boolean, start: string, end: string },
    saturday: { enabled: boolean, start: string, end: string },
    sunday: { enabled: boolean, start: string, end: string },
  };
}

export default function SettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  
  const [settings, setSettings] = useState<MoodMentorSettings | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return;
      
      try {
        // Try to get existing settings
        const { data, error } = await supabase
          .from('mood_mentor_settings')
          .select('*')
          .eq('mentor_id', user.id)
          .single();
          
        if (error) {
          if (error.code === 'PGRST116') {
            // No settings found, create default settings
            const defaultSettings: MoodMentorSettings = {
              id: crypto.randomUUID(),
              mentor_id: user.id,
              notifications_enabled: true,
              email_notifications: true,
              sms_notifications: false,
              appointment_reminders: true,
              message_notifications: true,
              review_notifications: true,
              marketing_emails: false,
              profile_privacy: 'public',
              two_factor_enabled: false,
              auto_accept_appointments: false,
              working_hours: {
                monday: { enabled: true, start: '09:00', end: '17:00' },
                tuesday: { enabled: true, start: '09:00', end: '17:00' },
                wednesday: { enabled: true, start: '09:00', end: '17:00' },
                thursday: { enabled: true, start: '09:00', end: '17:00' },
                friday: { enabled: true, start: '09:00', end: '17:00' },
                saturday: { enabled: false, start: '09:00', end: '17:00' },
                sunday: { enabled: false, start: '09:00', end: '17:00' }
              }
            };
            
            // Insert default settings
            const { error: insertError } = await supabase
              .from('mood_mentor_settings')
              .insert(defaultSettings);
              
            if (insertError) throw insertError;
            
            setSettings(defaultSettings);
          } else {
            throw error;
          }
        } else {
          setSettings(data);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, [user]);

  // Handle switch change
  const handleSwitchChange = (field: string, value: boolean) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [field]: value
    } as MoodMentorSettings);
  };
  
  // Handle nested switch change (for working hours)
  const handleWorkingHoursChange = (day: string, field: string, value: any) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      working_hours: {
        ...settings.working_hours,
        [day]: {
          ...settings.working_hours[day as keyof typeof settings.working_hours],
          [field]: value
        }
      }
    } as MoodMentorSettings);
  };
  
  // Handle radio change
  const handleRadioChange = (field: string, value: string) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [field]: value
    } as MoodMentorSettings);
  };
  
  // Handle password input change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    
    // Clear any previous error
    setPasswordError('');
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  // Handle password update
  const handlePasswordUpdate = async () => {
    try {
      setIsSaving(true);
      setPasswordError('');
      
      // Basic validation
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError('New passwords do not match');
        return;
      }
      
      if (passwordData.newPassword.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
        return;
      }
      
      // Call auth service to update password
      const response = await authService.updatePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      
      if (response.error) {
        setPasswordError(response.error);
        return;
      }
      
      toast.success('Password updated successfully');
      
      // Clear form
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      
    } catch (error: any) {
      console.error('Error updating password:', error);
      setPasswordError(error.message || 'Failed to update password');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Save settings
  const handleSaveSettings = async (newSettings: MoodMentorSettings) => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('mood_mentor_settings')
        .upsert(newSettings);
        
      if (error) throw error;
      
      setSettings(newSettings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    navigate('/delete-account');
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>
          <Button 
            onClick={() => handleSaveSettings(settings as MoodMentorSettings)} 
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : 'Save Changes'}
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading settings...</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="w-full bg-muted border-b rounded-none justify-start h-auto p-0">
              <TabsTrigger
                value="general"
                className="rounded-none px-4 py-2 h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                General
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="rounded-none px-4 py-2 h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="rounded-none px-4 py-2 h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Security & Privacy
              </TabsTrigger>
              <TabsTrigger
                value="working-hours"
                className="rounded-none px-4 py-2 h-10 data-[state=active]:border-b-2 data-[state=active]:border-primary"
              >
                Working Hours
              </TabsTrigger>
            </TabsList>
            
            {/* General Settings Tab */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>
                    Configure your account preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto_accept_appointments" className="text-base">
                          Auto-accept appointment requests
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically accept appointment requests from patients
                        </p>
                      </div>
                      <Switch 
                        id="auto_accept_appointments"
                        checked={settings?.auto_accept_appointments}
                        onCheckedChange={(checked) => handleSwitchChange('auto_accept_appointments', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>
                    Configure how and when you receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notifications_enabled" className="text-base">
                          Enable all notifications
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Master control for all notifications
                        </p>
                      </div>
                      <Switch 
                        id="notifications_enabled"
                        checked={settings?.notifications_enabled}
                        onCheckedChange={(checked) => handleSwitchChange('notifications_enabled', checked)}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">App Notifications</h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="appointment_reminders" className="text-sm">
                            Appointment reminders
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Receive notifications about upcoming appointments
                          </p>
                        </div>
                        <Switch 
                          id="appointment_reminders"
                          checked={settings?.appointment_reminders}
                          disabled={!settings?.notifications_enabled}
                          onCheckedChange={(checked) => handleSwitchChange('appointment_reminders', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="message_notifications" className="text-sm">
                            Message notifications
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Receive notifications when you get new messages
                          </p>
                        </div>
                        <Switch 
                          id="message_notifications"
                          checked={settings?.message_notifications}
                          disabled={!settings?.notifications_enabled}
                          onCheckedChange={(checked) => handleSwitchChange('message_notifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="review_notifications" className="text-sm">
                            Review notifications
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Receive notifications when patients leave reviews
                          </p>
                        </div>
                        <Switch 
                          id="review_notifications"
                          checked={settings?.review_notifications}
                          disabled={!settings?.notifications_enabled}
                          onCheckedChange={(checked) => handleSwitchChange('review_notifications', checked)}
                        />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Email Notifications</h3>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="email_notifications" className="text-sm">
                            Email notifications
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Receive notifications via email
                          </p>
                        </div>
                        <Switch 
                          id="email_notifications"
                          checked={settings?.email_notifications}
                          disabled={!settings?.notifications_enabled}
                          onCheckedChange={(checked) => handleSwitchChange('email_notifications', checked)}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="marketing_emails" className="text-sm">
                            Marketing emails
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Receive emails about new features and updates
                          </p>
                        </div>
                        <Switch 
                          id="marketing_emails"
                          checked={settings?.marketing_emails}
                          disabled={!settings?.notifications_enabled}
                          onCheckedChange={(checked) => handleSwitchChange('marketing_emails', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>
                    Change your password
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="currentPassword">Current password</Label>
                        <div className="relative">
                          <Input
                            id="currentPassword"
                            name="currentPassword"
                            type={showPassword ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={handlePasswordChange}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={togglePasswordVisibility}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="newPassword">New password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            name="newPassword"
                            type={showPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={handlePasswordChange}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirmPassword">Confirm new password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            name="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordChange}
                          />
                        </div>
                      </div>
                    </div>
                    {passwordError && (
                      <div className="text-sm text-red-500">{passwordError}</div>
                    )}
                    <Button 
                      onClick={handlePasswordUpdate}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : 'Update Password'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Danger Zone</CardTitle>
                  <CardDescription>
                    Irreversible account actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <div className="flex items-start space-x-4">
                        <div className="mt-0.5">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <h5 className="font-medium text-red-900">Delete Account</h5>
                          <p className="text-sm text-red-700">
                            Once you delete your account, all of your data will be permanently removed. This includes your profile, messages, appointments, reviews, and all other associated data.
                          </p>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="mt-2"
                            onClick={() => setShowDeleteDialog(true)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Account
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Working Hours Tab */}
            <TabsContent value="working-hours" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Working Hours</CardTitle>
                  <CardDescription>
                    Set your working hours for each day of the week
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {daysOfWeek.map((day, index) => (
                      <div key={day} className="border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium">{dayNames[index]}</h3>
                          <Switch 
                            checked={settings?.working_hours[day as keyof typeof settings.working_hours].enabled}
                            onCheckedChange={(checked) => handleWorkingHoursChange(day, 'enabled', checked)}
                          />
                        </div>
                        
                        {settings?.working_hours[day as keyof typeof settings.working_hours].enabled && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`${day}-start`} className="text-xs">Start Time</Label>
                              <Input
                                id={`${day}-start`}
                                type="time"
                                value={settings.working_hours[day as keyof typeof settings.working_hours].start}
                                onChange={(e) => handleWorkingHoursChange(day, 'start', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`${day}-end`} className="text-xs">End Time</Label>
                              <Input
                                id={`${day}-end`}
                                type="time"
                                value={settings.working_hours[day as keyof typeof settings.working_hours].end}
                                onChange={(e) => handleWorkingHoursChange(day, 'end', e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}


