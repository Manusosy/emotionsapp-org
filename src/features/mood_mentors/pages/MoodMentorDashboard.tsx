import { authService, userService, moodMentorService, appointmentService, supportGroupsService } from '../../../services'
import { useEffect, useState, useRef, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Users, 
  Search, 
  BarChart3, 
  MessageSquare, 
  Bell, 
  ChevronRight,
  User,
  Clock,
  Video,
  Check,
  AlertCircle,
  Settings,
  LayoutDashboard,
  ChevronLeft,
  BookOpen,
  MoreVertical,
  X,
  CalendarClock
} from "lucide-react";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { AuthContext } from "@/contexts/authContext";
import { format, parseISO, subDays, getDaysInMonth, startOfMonth, getDay, addMonths } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { MoodMentorProfile } from "@/types/user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import AppointmentDetailDialog from '../components/AppointmentDetailDialog';
import { ChatButton } from "@/components/messaging/ChatButton";
import AvailabilityDialog from '@/features/mentor/components/AvailabilityDialog';

// Add interface for dashboard Activities since we don't have a real activity service
interface Activity {
  id: string;
  activity_type: 'message' | 'appointment' | 'group' | 'profile' | 'other';
  title: string;
  created_at: string;
}

// Define the structure for statistics cards
interface StatCard {
  title: string;
  value: number | string;
  trend?: string;
  icon: React.ReactNode;
}

// Define appointment interface
interface Appointment {
  id: string;
  patient_id: string;
  patient_name: string;
  date: string;
  time: string;
  type: 'video' | 'audio' | 'in-person' | 'chat';
  status: 'upcoming' | 'canceled' | 'completed';
  patient_email?: string;
  patient_avatar_url?: string;
}

// Note: We now use the imported MoodMentorProfile interface from @/types/user

// Define interface for recent activities
interface RecentActivity {
  id: string;
  title: string;
  time: string;
  icon: React.ReactNode;
  iconBgClass: string;
  iconColorClass: string;
}

// Interface for activity data from database
interface DbActivity {
  id: string;
  user_id: string;
  activity_type: 'message' | 'appointment' | 'group' | 'profile' | 'other';
  title: string;
  description?: string;
  created_at: string;
  metadata?: any;
}

// Define a local profile interface to match the component's needs
// This is separate from the database MoodMentorProfile
interface DashboardProfile {
  id: string;
  fullName: string;
  email: string;
  bio: string;
  avatarUrl: string;
  specialties: string[];
  isProfileComplete: boolean;
  [key: string]: any;
}

export default function MoodMentorDashboard() {
  const { user } = useContext(AuthContext) || {};
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [profile, setProfile] = useState<DashboardProfile | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  
  // Initial stat cards with zero values - will be populated from database
  const [stats, setStats] = useState<StatCard[]>([
    {
      title: "Total Patients",
      value: 0,
      trend: "",
      icon: <Users className="h-5 w-5 text-blue-500" />
    },
    {
      title: "Upcoming Appointments",
      value: 0,
      icon: <Calendar className="h-5 w-5 text-purple-500" />
    },
    {
      title: "Support Groups",
      value: 0,
      icon: <Users className="h-5 w-5 text-amber-500" />
    },
    {
      title: "Patient Satisfaction",
      value: "0%",
      trend: "",
      icon: <BarChart3 className="h-5 w-5 text-green-500" />
    }
  ]);

  // Recent activities data - start with empty state
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointmentDates, setAppointmentDates] = useState<number[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  
  // Update the calendar state to track appointments per day
  const [appointmentsByDay, setAppointmentsByDay] = useState<{[key: number]: number}>({});
  
  // Get calendar data
  const currentMonthName = format(currentDate, "MMMM yyyy");
  const daysInMonth = getDaysInMonth(currentDate);
  const startDay = getDay(startOfMonth(currentDate));
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  // Ensure user is a mood mentor
  useEffect(() => {
    if (user) {
      const userRole = user?.user_metadata?.role;
      if (userRole !== 'mood_mentor') {
        console.error('User with role', userRole, 'attempted to access mood mentor dashboard');
        toast.error('You do not have permission to access this dashboard');
        navigate('/patient-dashboard');
      }
    } else {
      // No user, redirect to login
      navigate('/mentor-signin');
    }
  }, [user, navigate]);
  
  // Fetch calendar appointments using Supabase
  useEffect(() => {
    const fetchCalendarAppointments = async () => {
      if (!user) {
        console.log("No authenticated user found, redirecting to login");
        navigate('/mentor-signin');
        return;
      }

      setCalendarLoading(true);
      try {
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        
        // Format dates properly for the query
        const firstDayFormatted = format(firstDay, 'yyyy-MM-dd');
        const lastDayFormatted = format(lastDay, 'yyyy-MM-dd');
        
        try {
          // Use the mentor_appointments_view instead of appointments table directly
          const { data: appointments, error } = await supabase
            .from('mentor_appointments_view')
            .select('*')
            .eq('mentor_id', user.id)
            .gte('date', firstDayFormatted)
            .lte('date', lastDayFormatted)
            .neq('status', 'cancelled');
            
          if (error) {
            console.warn('Error fetching calendar appointments:', error);
            setAppointmentDates([]);
            setAppointmentsByDay({});
            return;
          }
          
          if (!appointments || appointments.length === 0) {
            setAppointmentDates([]);
            setAppointmentsByDay({});
          } else {
            // Count appointments per day
            const appointmentCounts: {[key: number]: number} = {};
            const daysWithAppointments = appointments.map(apt => {
              const date = new Date(apt.date);
              const day = date.getDate();
              
              // Count appointments for this day
              appointmentCounts[day] = (appointmentCounts[day] || 0) + 1;
              
              return date.getDate();
            });
            
            console.log("Days with appointments:", daysWithAppointments);
            setAppointmentDates(daysWithAppointments);
          }
        } catch (supabaseError) {
          console.warn('Supabase error (possibly 404):', supabaseError);
          // Gracefully handle missing tables
          setAppointmentDates([]);
          
          // Show a helpful message only once
          if (!localStorage.getItem('showed_db_missing_warning')) {
            toast.warning('Some database tables are not set up yet.');
            localStorage.setItem('showed_db_missing_warning', 'true');
          }
        }
      } catch (error) {
        console.error('Error in calendar fetch:', error);
        toast.error('Failed to load calendar appointments');
        setAppointmentDates([]);
      } finally {
        setCalendarLoading(false);
      }
    };
    
    fetchCalendarAppointments();
  }, [user, navigate, currentDate]);
  
  // Navigate to previous/next month
  const changeMonth = (increment: number) => {
    setCurrentDate(prevDate => addMonths(prevDate, increment));
  };
  
  // Helper function to determine if a day has appointments
  const hasDayAppointment = (day: number) => {
    return appointmentDates.includes(day);
  };
  
  // Fetch appointments using the appointment service
  useEffect(() => {
    const fetchAppointments = async () => {
      if (!user) {
        console.log("No authenticated user found, redirecting to login");
        navigate('/mentor-signin');
        return;
      }
      
      setIsLoading(true);
      try {
        // Get today's date in YYYY-MM-DD format
        const todayFormatted = format(new Date(), 'yyyy-MM-dd');
        console.log("Fetching appointments for date >= ", todayFormatted);
        
        // Use the mentor_appointments_view directly through Supabase
        const { data: appointmentsData, error } = await supabase
          .from('mentor_appointments_view')
          .select('*')
          .eq('mentor_id', user.id)
          .in('status', ['pending', 'scheduled'])
          .gte('date', todayFormatted)
          .order('date', { ascending: true });
          
        if (error) {
          console.error('Error fetching appointments:', error);
          toast.error("Failed to fetch appointments");
          setAppointments([]);
          return;
        }
        
        console.log("Raw appointments data:", appointmentsData);
        
        if (!appointmentsData || appointmentsData.length === 0) {
          // No appointments found, return empty array
          console.log("No appointments found");
          setAppointments([]);
        } else {
          // Format the real data to match our appointment interface
          const formattedAppointments = appointmentsData.map(apt => ({
            id: apt.id,
            patient_id: apt.patient_id,
            patient_name: apt.patient_name || 'Unknown Patient',
            date: apt.date,
            time: apt.start_time,
            type: apt.meeting_type as 'video' | 'audio' | 'in-person' | 'chat',
            status: apt.status === 'scheduled' ? 'upcoming' as const : 'completed' as const,
            patient_email: apt.patient_email,
            patient_avatar_url: apt.patient_avatar_url
          }));
          
          console.log("Formatted appointments for mentor dashboard:", formattedAppointments);
          setAppointments(formattedAppointments);
          
          // Also trigger a refresh of the dashboard stats to ensure they're in sync
          fetchDashboardStats();
        }
      } catch (error) {
        console.error('Error in appointment fetch:', error);
        setAppointments([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAppointments();
  }, [user, navigate]);
  
  // Check if user is new and show welcome dialog if needed
  useEffect(() => {
    checkUserStatus();
  }, [user]);
  
  // Function to check user's status and profile using the user service
  const checkUserStatus = async () => {
    if (!user) return;
    
    try {
      const response = await moodMentorService.getMoodMentorById(user.id);
      
      if (response.success && response.data) {
        // Data is already in camelCase thanks to our service updates
        const profileData = response.data;
        
        // Set profile data
        setProfile({
          id: profileData.id,
          fullName: profileData.fullName || '',
          email: profileData.email || '',
          bio: profileData.bio || '',
          avatarUrl: profileData.avatarUrl || '',
          specialties: profileData.specialties || [],
          isProfileComplete: profileData.isProfileComplete || false
        });
        
        // Check if profile is complete
        setIsProfileComplete(!!profileData.isProfileComplete);
        
        // If profile is not complete, show the welcome dialog
        if (!profileData.isProfileComplete) {
          setIsNewUser(true);
          setShowWelcomeDialog(true);
        }
      } else {
        // No profile found, create a basic one
        setProfile({
          id: user.id,
          fullName: user?.user_metadata?.name || '',
          email: user.email || '',
          bio: '',
          avatarUrl: user?.user_metadata?.avatar_url || '',
          specialties: [],
          isProfileComplete: false
        });
        
        setIsNewUser(true);
        setShowWelcomeDialog(true);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      toast.error('Error loading profile data');
    }
  };
  
  // Check if an appointment is starting soon (within 15 minutes)
  const isAppointmentStartingSoon = (appointmentTime: string, appointmentDate: string) => {
    // Always allow joining appointments regardless of time
    return true;
    
    // Previous time-based logic (commented out)
    /*
    if (!appointmentTime || !appointmentDate) return false;
    
    try {
      const now = new Date();
      const [hours, minutes] = appointmentTime.split(':').map(Number);
      const appointmentDateTime = new Date(appointmentDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);
      
      // Calculate difference in minutes
      const diffInMinutes = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60);
      
      // Return true if appointment is within 15 minutes (and not in the past)
      return diffInMinutes >= 0 && diffInMinutes <= 15;
    } catch (error) {
      console.error('Error checking appointment time:', error);
      return false;
    }
    */
  };
  
  // Helper function to get appointment type badge
  const getAppointmentBadge = (type: string) => {
    switch (type) {
      case 'video':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Video className="mr-1 h-3 w-3" /> Video
          </Badge>
        );
      case 'audio':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <MessageSquare className="mr-1 h-3 w-3" /> Audio
          </Badge>
        );
      case 'in-person':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <User className="mr-1 h-3 w-3" /> In-person
          </Badge>
        );
      case 'chat':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <MessageSquare className="mr-1 h-3 w-3" /> Chat
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="mr-1 h-3 w-3" /> Other
          </Badge>
        );
    }
  };
  
  // Fetch stats for the dashboard using the mood mentor service
  const fetchDashboardStats = async () => {
    if (!user) return;
    
    try {
      console.log("Fetching dashboard stats for user:", user.id);
      
      // Try to get stats from the new mentor_dashboard_stats view first
      const { data: dashboardStats, error: statsError } = await supabase
        .from('mentor_dashboard_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (statsError) {
        console.warn('Error fetching from mentor_dashboard_stats:', statsError);
        // Fall back to individual queries if view doesn't exist or has other errors
        
        // Get total active patients
        const { count: patientCount, error: patientsError } = await supabase
          .from('appointments')
          .select('patient_id', { count: 'exact', head: true })
          .eq('mentor_id', user.id)
          .gte('created_at', format(subDays(new Date(), 90), 'yyyy-MM-dd')) // Last 90 days
          .neq('status', 'cancelled');
        
        if (patientsError) throw patientsError;

        // Get upcoming appointments count - use the mentor_appointments_view
        const todayFormatted = format(new Date(), 'yyyy-MM-dd');
        console.log("Today's date for appointments query:", todayFormatted);
        
        // First try to directly query the appointments table
        const { data: appointmentsData, count: upcomingCount, error: aptsError } = await supabase
          .from('mentor_appointments_view')
          .select('*', { count: 'exact' })
          .eq('mentor_id', user.id)
          .in('status', ['pending', 'scheduled'])
          .gte('date', todayFormatted);
          
        if (aptsError) {
          console.error('Error fetching upcoming appointments count:', aptsError);
          throw aptsError;
        }
        
        console.log("Found appointments:", appointmentsData?.length, "with count:", upcomingCount);

            // Get active support groups count
    let groupsCount = 0;
    try {
      const groups = await supportGroupsService.getSupportGroups({
        mentor_id: user.id,
        status: 'active'
      });
      groupsCount = groups.length;
    } catch (error) {
      console.error('Error fetching groups count:', error);
    }

        // Get average rating
        const { data: ratings, error: ratingsError } = await supabase
          .from('mentor_reviews')
          .select('rating')
          .eq('mentor_id', user.id);
        
        if (ratingsError) throw ratingsError;

        const averageRating = ratings && ratings.length > 0
          ? (ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length).toFixed(1)
          : 0;

        console.log("Dashboard stats (individual queries):", { 
          patientCount, 
          upcomingCount, 
          actualAppointments: appointmentsData?.length || 0,
          groupsCount, 
          averageRating 
        });

        // Update stats - use appointmentsData.length as a fallback if count is not working
        const actualAppointmentCount = upcomingCount || appointmentsData?.length || 0;
        
        setStats([
          {
            title: "Total Patients",
            value: patientCount || 0,
            icon: <Users className="h-5 w-5 text-blue-500" />
          },
          {
            title: "Upcoming Appointments",
            value: actualAppointmentCount,
            icon: <Calendar className="h-5 w-5 text-purple-500" />
          },
          {
            title: "Support Groups",
            value: groupsCount || 0,
            icon: <Users className="h-5 w-5 text-amber-500" />
          },
          {
            title: "Patient Satisfaction",
            value: `${averageRating}/5`,
            icon: <BarChart3 className="h-5 w-5 text-green-500" />
          }
        ]);
      } else if (dashboardStats) {
        // Use the data from the stats view
        console.log("Dashboard stats (from view):", dashboardStats);
        
        setStats([
          {
            title: "Total Patients",
            value: dashboardStats.total_patients || 0,
            icon: <Users className="h-5 w-5 text-blue-500" />
          },
          {
            title: "Upcoming Appointments",
            value: dashboardStats.upcoming_appointments || 0,
            icon: <Calendar className="h-5 w-5 text-purple-500" />
          },
          {
            title: "Support Groups",
            value: dashboardStats.active_groups || 0,
            icon: <Users className="h-5 w-5 text-amber-500" />
          },
          {
            title: "Patient Satisfaction",
            value: `${dashboardStats.average_rating || 0}/5`,
            icon: <BarChart3 className="h-5 w-5 text-green-500" />
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    }
  };
  
  // Fetch recent activities by using the mentor_activities_view
  const fetchRecentActivities = async () => {
    if (!user) return;
    
    setActivitiesLoading(true);
    try {
      // Use the new mentor_activities_view and limit to 3 activities
      const { data: activities, error: activitiesError } = await supabase
        .from('mentor_activities_view')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (activitiesError) {
        console.warn('Error fetching from mentor_activities_view:', activitiesError);
        throw activitiesError;
      }

      if (!activities || activities.length === 0) {
        setRecentActivities([]);
      } else {
        // Map the activity data to our UI format
        const formattedActivities = activities.map(activity => {
          let icon, iconBgClass, iconColorClass;
          
          // Set the appropriate icon and styles based on activity type
          switch (activity.activity_type) {
            case 'appointment':
              icon = <Calendar className="h-4 w-4" />;
              iconBgClass = 'bg-blue-100';
              iconColorClass = 'text-blue-600';
              break;
            case 'review':
              icon = <BarChart3 className="h-4 w-4" />;
              iconBgClass = 'bg-green-100';
              iconColorClass = 'text-green-600';
              break;
            case 'group':
              icon = <Users className="h-4 w-4" />;
              iconBgClass = 'bg-amber-100';
              iconColorClass = 'text-amber-600';
              break;
            default:
              icon = <Bell className="h-4 w-4" />;
              iconBgClass = 'bg-gray-100';
              iconColorClass = 'text-gray-600';
          }
          
          // Fix activity title for appointments to show patient name instead of mentor name
          let title = activity.activity_title;
          if (activity.activity_type === 'appointment' && activity.metadata?.patient_name) {
            title = `Session with ${activity.metadata.patient_name}`;
          }
          
          return {
            id: activity.activity_id,
            title: title,
            time: formatActivityTime(activity.created_at),
            icon,
            iconBgClass,
            iconColorClass
          };
        });
        
        setRecentActivities(formattedActivities);
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      // Fallback to showing an empty state
      setRecentActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  };
  
  // Format the activity time in a user-friendly way
  const formatActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);
    
    if (diffMin < 60) {
      return `${diffMin} min ago`;
    } else if (diffMin < 1440) {
      const hours = Math.floor(diffMin / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };
  
  // Handle welcome dialog close
  const handleCloseWelcomeDialog = () => {
    setShowWelcomeDialog(false);
    
    // If profile is incomplete, redirect to profile page
    if (!isProfileComplete) {
      navigate('/mood-mentor-dashboard/profile');
    }
  };
  
  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    
    if (hour < 12) {
      return "Good morning";
    } else if (hour < 18) {
      return "Good afternoon";
    } else {
      return "Good evening";
    }
  };
  
  // Get random positive message for the dashboard based on time of day
  const getMotivationalMessage = () => {
    const hour = new Date().getHours();
    
    if (hour < 12) {
      const morningMessages = [
        "A fresh start to positively impact your patients today.",
        "Begin your day by making a difference in someone's emotional wellbeing.",
        "Morning energy to guide others toward emotional balance.",
        "Early bird catches the opportunity to help others heal."
      ];
      return morningMessages[Math.floor(Math.random() * morningMessages.length)];
    } else if (hour < 18) {
      const afternoonMessages = [
        "Your guidance continues to create positive change this afternoon.",
        "Keep up the great work supporting your patients' journey.",
        "Your afternoon sessions help build emotional resilience.",
        "Your expertise is making a meaningful difference today."
      ];
      return afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
    } else {
      const eveningMessages = [
        "Reflect on the positive impact you've made today.",
        "Your evening dedication helps patients find peace.",
        "Winding down after a day of meaningful connections.",
        "Your compassion has brightened someone's day."
      ];
      return eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
    }
  };

  // Replace calculateProfileCompletion with a simple profile status component
  const ProfileStatusCard = () => {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-100 to-blue-100 pb-2">
          <CardTitle className="text-lg">Profile Status</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {isProfileComplete ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-5 w-5" />
                <span className="font-medium">Your profile is complete</span>
              </div>
              <p className="text-sm text-gray-600">
                You can now be found by patients looking for mentors like you.
              </p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => navigate('/mood-mentor-dashboard/profile')}
              >
                Edit Profile
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Your profile is incomplete</span>
              </div>
              <p className="text-sm text-gray-600">
                Complete your profile to be visible to patients looking for mood mentors.
              </p>
              <Button 
                className="mt-2"
                onClick={() => navigate('/mood-mentor-dashboard/profile')}
              >
                Complete Profile
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Add this function after the getAppointmentBadge function
  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;
      
      toast.success(`Appointment ${newStatus} successfully`);
      
      // Refresh appointments
      const updatedAppointments = appointments.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: newStatus === 'scheduled' ? 'upcoming' : newStatus as 'upcoming' | 'canceled' | 'completed' }
          : apt
      );
      
      setAppointments(updatedAppointments);
    } catch (error: any) {
      console.error('Error updating appointment status:', error);
      toast.error(error.message || "Failed to update appointment status");
    }
  };

  // Add separate useEffect for dashboard stats with proper dependencies
  useEffect(() => {
    if (user) {
      console.log("Calling fetchDashboardStats from useEffect");
      fetchDashboardStats();
    }
  }, [user]);

  // Add separate useEffect for recent activities
  useEffect(() => {
    if (user) {
      fetchRecentActivities();
    }
  }, [user]);

  // Add handler to open appointment details
  const handleViewAppointmentDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailDialogOpen(true);
  };

  return (
    <DashboardLayout>
      {/* Welcome Dialog for new users */}
      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to Your Dashboard</DialogTitle>
            <DialogDescription>
              This is your professional workspace for managing patients, appointments, and resources.
            </DialogDescription>
          </DialogHeader>
          
          {isNewUser ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                To get started, please complete your profile information so patients can find you.
              </p>
              
              <div className="flex items-center p-3 bg-amber-50 text-amber-800 rounded-lg">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-sm">
                  Your profile is not yet visible to patients until you complete the required information.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-gray-600">
                Your profile is {isProfileComplete ? 'complete' : 'incomplete'}. Completing your profile will help patients find and connect with you.
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Profile completion</span>
                  <span>{isProfileComplete ? 'Complete' : 'Incomplete'}</span>
                </div>
                <Progress value={isProfileComplete ? 100 : 0} className="h-2" />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWelcomeDialog(false)}>
              Later
            </Button>
            <Button onClick={handleCloseWelcomeDialog}>
              Complete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dashboard Content - Added proper container spacing */}
      <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <section className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">
            {getTimeBasedGreeting()}, {profile?.fullName?.split(' ')[0] || 'Mentor'}
          </h1>
          <p className="text-gray-600">{getMotivationalMessage()}</p>
        </section>
        
        {/* Stats Section */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="shadow-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-500 truncate">{stat.title}</p>
                      <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
                      {stat.trend && (
                        <p className="text-xs text-green-600 mt-1">{stat.trend}</p>
                      )}
                    </div>
                    <div className="p-2 rounded-full bg-gray-100 flex-shrink-0">
                      {stat.icon}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Appointments Section */}
          <section className="lg:col-span-2">
            <Card className="h-full shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Upcoming Appointments</CardTitle>
                  <CardDescription>Your schedule for the next few days</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/mood-mentor-dashboard/appointments')}
                >
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center p-3 rounded-lg border border-gray-100 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-gray-200 mr-4 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                        </div>
                        <div className="h-6 bg-gray-100 rounded w-20 flex-shrink-0"></div>
                      </div>
                    ))}
                  </div>
                ) : appointments.length > 0 ? (
                  <div className="space-y-4">
                    {appointments.map((appointment) => (
                      <Card
                        key={appointment.id}
                        className="border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleViewAppointmentDetails(appointment)}
                      >
                        <CardContent className="p-4">
                          {/* Top section with avatar and info */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <Avatar className="h-12 w-12 flex-shrink-0">
                                {appointment.patient_avatar_url ? (
                                  <AvatarImage src={appointment.patient_avatar_url} alt={appointment.patient_name} />
                                ) : (
                                  <AvatarFallback className="bg-blue-100 text-blue-600">
                                    {appointment.patient_name
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .toUpperCase()}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate">
                                  {appointment.patient_name}
                                </div>
                                {appointment.patient_email && (
                                  <div className="text-sm text-gray-500 truncate">{appointment.patient_email}</div>
                                )}
                              </div>
                            </div>
                            {getAppointmentBadge(appointment.type)}
                          </div>
                          
                          {/* Date and time grid */}
                          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Date</div>
                              <div className="text-gray-900 font-medium">{format(new Date(appointment.date), 'MMM d, yyyy')}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Time</div>
                              <div className="text-gray-900 font-medium">{appointment.time}</div>
                            </div>
                          </div>
                          
                          {/* Action buttons */}
                          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                            <ChatButton
                              userId={user?.id || ''}
                              targetUserId={appointment.patient_id}
                              userRole="mood_mentor"
                              variant="outline"
                              size="sm"
                              className="flex-1 sm:flex-none"
                            />
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="outline"
                                  size="sm" 
                                  className="flex-1 sm:flex-none"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(appointment.id, "completed");
                                }}>
                                  <Check className="w-4 h-4 mr-2" /> Mark as Completed
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  handleStatusChange(appointment.id, "cancelled");
                                }}>
                                  <X className="w-4 h-4 mr-2" /> Cancel Appointment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            
                            <Button 
                              size="sm" 
                              className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/mood-mentor-dashboard/appointments/${appointment.id}/call`);
                              }}
                            >
                              <Video className="h-4 w-4 mr-2" />
                              Start Session
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming appointments</h3>
                    <p className="text-sm text-gray-500">
                      No appointments scheduled for now
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
          
          {/* Calendar Section */}
          <section>
            <Card className="h-full shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle>Calendar</CardTitle>
                <CardDescription>Your appointment schedule</CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-4">
                  {/* Month Navigation */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => changeMonth(-1)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="text-sm font-medium">{currentMonthName}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => changeMonth(1)}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {/* Day headers */}
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                      <div
                        key={day}
                        className="h-8 text-xs font-medium text-gray-500 flex items-center justify-center"
                      >
                        {day}
                      </div>
                    ))}
                    
                    {/* Empty cells for previous month */}
                    {Array.from({ length: startDay }).map((_, index) => (
                      <div key={`empty-start-${index}`} className="h-8" />
                    ))}
                    
                    {/* Calendar days */}
                    {calendarDays.map((day) => (
                      <div
                        key={`${currentMonthName}-${day}`}
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${
                          hasDayAppointment(day) 
                            ? 'bg-blue-500 text-white' 
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {day}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
        
        {/* Quick Actions Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-md transition-all cursor-pointer shadow-sm" onClick={() => setShowAvailabilityDialog(true)}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-[#20C0F3]/10 p-3 rounded-full flex-shrink-0">
                    <CalendarClock className="h-5 w-5 text-[#20C0F3]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">Set Availability</h3>
                    <p className="text-sm text-gray-500 truncate">Manage your schedule</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="hover:shadow-md transition-all cursor-pointer shadow-sm" 
              onClick={() => navigate('/mood-mentor-dashboard/profile')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-full flex-shrink-0">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">Update Profile</h3>
                    <p className="text-sm text-gray-500 truncate">Edit your details</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="hover:shadow-md transition-all cursor-pointer shadow-sm" 
              onClick={() => navigate('/mood-mentor-dashboard/resources')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-purple-100 p-3 rounded-full flex-shrink-0">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">Manage Resources</h3>
                    <p className="text-sm text-gray-500 truncate">View resource library</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="hover:shadow-md transition-all cursor-pointer shadow-sm" 
              onClick={() => navigate('/mood-mentor-dashboard/messages')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-100 p-3 rounded-full flex-shrink-0">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">Check Messages</h3>
                    <p className="text-sm text-gray-500 truncate">View your inbox</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Support Groups Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <Card 
              className="hover:shadow-md transition-all cursor-pointer shadow-sm" 
              onClick={() => navigate('/mood-mentor-dashboard/groups')}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-[#20C0F3]/10 p-3 rounded-full flex-shrink-0">
                    <Users className="h-5 w-5 text-[#20C0F3]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">Manage Groups</h3>
                    <p className="text-sm text-gray-500 truncate">Support group management</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
        
        {/* Profile status card */}
        <ProfileStatusCard />
      </div>

      {/* Add the appointment detail dialog */}
      {selectedAppointment && (
        <AppointmentDetailDialog
          appointment={selectedAppointment}
          open={detailDialogOpen}
          onOpenChange={(open) => {
            setDetailDialogOpen(open);
            if (!open) {
              // Refresh appointments when dialog is closed
              const fetchAppointmentsAgain = async () => {
                if (!user) return;
                
                setIsLoading(true);
                try {
                  const todayFormatted = format(new Date(), 'yyyy-MM-dd');
                  
                  const { data: appointmentsData, error } = await supabase
                    .from('mentor_appointments_view')
                    .select('*')
                    .eq('mentor_id', user.id)
                    .in('status', ['pending', 'scheduled'])
                    .gte('date', todayFormatted)
                    .order('date', { ascending: true });
                    
                  if (error) {
                    console.error('Error fetching appointments:', error);
                    setAppointments([]);
                    return;
                  }
                  
                  if (!appointmentsData || appointmentsData.length === 0) {
                    setAppointments([]);
                  } else {
                    const formattedAppointments = appointmentsData.map(apt => ({
                      id: apt.id,
                      patient_id: apt.patient_id,
                      patient_name: apt.patient_name || 'Unknown Patient',
                      date: apt.date,
                      time: apt.start_time,
                      type: apt.meeting_type as 'video' | 'audio' | 'in-person' | 'chat',
                      status: apt.status === 'scheduled' ? 'upcoming' as const : 'completed' as const,
                      patient_email: apt.patient_email,
                      patient_avatar_url: apt.patient_avatar_url
                    }));
                    
                    setAppointments(formattedAppointments);
                    fetchDashboardStats();
                  }
                } catch (error) {
                  console.error('Error refreshing appointments:', error);
                } finally {
                  setIsLoading(false);
                }
              };
              
              fetchAppointmentsAgain();
            }
          }}
        />
      )}

      {/* Availability Dialog */}
      <AvailabilityDialog 
        open={showAvailabilityDialog} 
        onOpenChange={setShowAvailabilityDialog} 
      />
    </DashboardLayout>
  );
}