import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from '@/lib/supabase';
import { Loader2 } from "lucide-react";
import { EventBus } from "@/App";
import { 
  Calendar, 
  MessageSquare, 
  Phone, 
  Book, 
  Settings, 
  LogOut,
  User,
  Clock,
  Video,
  UserPlus,
  Users,
  Mail,
  Phone as PhoneIcon,
  MapPin,
  BadgeHelp,
  LineChart,
  Heart,
  ExternalLink,
  BookOpen,
  FileText,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Activity,
  BarChart,
  HeartPulse,
  Download,
  HeartHandshake,
  Star
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FallbackAvatar from "@/components/ui/fallback-avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuthContext } from "@/contexts/authContext";
import MoodAnalytics from "../components/MoodAnalytics";
import MoodSummaryCard from "../components/MoodSummaryCard";
import EmotionalHealthWheel from "../components/EmotionalHealthWheel";
import { Appointment as DatabaseAppointment, Message, UserProfile as DatabaseUserProfile } from "../../../types/database.types";
import { format, parseISO } from "date-fns";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { WelcomeDialog } from "@/components/WelcomeDialog";
import NotificationManager from '../components/NotificationManager';
import StressAssessmentModal from "../components/StressAssessmentModal";
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { dataService } from '@/services';
import BookingButton from "@/features/booking/components/BookingButton";
import ActiveGroupSessions from "../components/ActiveGroupSessions";
import { UserProfile } from '@/types/user';

// Add this interface before the MoodMentor interface
interface MoodMentor {
  id: string;
  user_metadata: {
    full_name?: string;
    specialty?: string;
    avatar_url?: string;
    [key: string]: any;
  };
}

interface AppointmentData {
  id: string;
  patient_id: string;
  mentor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  meeting_type: 'video' | 'audio' | 'chat';
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  description?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface AppointmentWithMentor extends AppointmentData {
  mood_mentor?: MoodMentor;
}

export default function PatientDashboard() {
  const navigate = useNavigate();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const signOut = authContext?.signOut;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [appointments, setAppointments] = useState<AppointmentWithMentor[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentWithMentor[]>([]);
  const [supportGroups, setSupportGroups] = useState<any[]>([]);
  const [recentJournalEntries, setRecentJournalEntries] = useState<any[]>([]);
  const [appointmentFilter, setAppointmentFilter] = useState<string>("all");
  const [lastCheckIn, setLastCheckIn] = useState<string>("");
  const [lastCheckInDate, setLastCheckInDate] = useState<string>("Not available");
  const [lastAssessmentDate, setLastAssessmentDate] = useState<string>("Not taken");
  const [lastStressCheckIn, setLastStressCheckIn] = useState<string>("Not available");
  const [userMetrics, setUserMetrics] = useState({
    moodScore: 0,
    stressLevel: 0,
    consistency: 0,
    lastCheckInStatus: "No check-ins yet",
    streak: 0,
    firstCheckInDate: ""
  });
  const [hasAssessments, setHasAssessments] = useState(false);
  const [hasStressAssessments, setHasStressAssessments] = useState(false);
  const [appointmentReports, setAppointmentReports] = useState<AppointmentWithMentor[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [checkInDates, setCheckInDates] = useState<Date[]>([]);
  const [isStressModalOpen, setIsStressModalOpen] = useState(false);

  // Extract user's first name for display
  const firstName = user?.user_metadata?.first_name || 
                   user?.user_metadata?.name?.split(' ')[0] || 
                   user?.email?.split('@')[0] || 
                   'User';

  // Ensure user is a patient
  useEffect(() => {
    if (user) {
      const userRole = user.user_metadata?.role;
      if (userRole !== 'patient') {
        console.error('User with role', userRole, 'attempted to access patient dashboard');
        toast.error('You do not have permission to access this dashboard');
        navigate('/mood-mentor-dashboard');
      }
    } else {
      // No user, redirect to login
      navigate('/patient-signin');
    }
  }, [user, navigate]);

  // Add code to skip any loading states
  const skipLoadingStates = () => {
    setReportsLoading(false);
  };

  useEffect(() => {
    skipLoadingStates();
    let isMounted = true;
    
    // Initialize with empty values - we'll only set real values if we have data
    setLastCheckIn("");
    setLastCheckInDate("Not available");
    setLastAssessmentDate("Not taken");
    setHasAssessments(false);

    const fetchDashboardData = async () => {
      try {
        console.log('PatientDashboard: Fetching dashboard data...');
        
        if (!user) {
          console.log("No authenticated user found, redirecting to login");
          navigate('/patient-signin');
          return;
        }
        
        console.log("Fetching dashboard data for user:", user.id);

        // Create profile from user metadata
        const userProfileData: UserProfile = {
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || '',
          last_name: user.user_metadata?.last_name || '',
          phone_number: user.user_metadata?.phone_number || '',
          country: user.user_metadata?.country || '',
          address: user.user_metadata?.address || '',
          city: user.user_metadata?.city || '',
          state: user.user_metadata?.state || '',
          pincode: user.user_metadata?.pincode || '',
          avatar_url: user.user_metadata?.avatar_url || '',
          date_of_birth: user.user_metadata?.date_of_birth || '',
          gender: user.user_metadata?.gender || '',
          created_at: new Date().toISOString()
        };

        if (isMounted) {
          setProfile(userProfileData);
        }

        // Fetch most critical data in parallel - mood entries and appointments
        const criticalDataPromises = [
          // Fetch mood entries (critical)
          supabase
            .from('mood_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10), // Limit to 10 most recent entries for faster load
            
          // Fetch appointments (critical)
          fetchAppointments(user.id)
        ];
        
        // Execute critical data fetch in parallel
        const [moodEntriesResult, appointmentsResult] = await Promise.all(criticalDataPromises);
        
        // Process mood entries
        const { data: moodEntriesData, error: moodError } = moodEntriesResult;
        if (moodError) {
          console.error("Error fetching mood entries:", moodError);
        } else if (moodEntriesData && moodEntriesData.length > 0) {
          // User has mood entries - set hasAssessments for mood tracking ONLY
          setHasAssessments(true);
          
          // Calculate average mood score
          const moodValues = moodEntriesData.map(entry => Number(entry.mood));
          const avgMood = moodValues.reduce((sum, mood) => sum + mood, 0) / moodValues.length;
          
          // Update user metrics - only mood-related metrics
          setUserMetrics(prev => ({
            ...prev,
            moodScore: parseFloat(avgMood.toFixed(1)),
            lastCheckInStatus: "Completed",
            firstCheckInDate: format(parseISO(moodEntriesData[moodEntriesData.length - 1].created_at), 'MMM d, yyyy')
          }));
          
          // Set last mood check-in date - NOT affecting stress assessment date
          if (moodEntriesData[0]) {
            // Only update mood-related timestamps, not stress assessment
            setLastCheckIn(format(parseISO(moodEntriesData[0].created_at), 'h:mm a'));
            setLastCheckInDate(format(parseISO(moodEntriesData[0].created_at), 'MMM d, yyyy'));
          }
          
          // Get streak from SQL function via dataService
          try {
            const { data: streak, error: streakError } = await dataService.getMoodStreak(user.id);
            
            if (streakError) {
              console.error("Error getting mood streak:", streakError);
            } else {
              // Update user metrics with streak from database
              setUserMetrics(prev => ({
                ...prev,
                streak: streak || 0
              }));
            }
          } catch (error) {
            console.error("Error calculating streak:", error);
          }
          
          // Store check-in dates for reference
          const dates = moodEntriesData.map(entry => new Date(entry.created_at));
          setCheckInDates(dates);
        }
        
        // Process appointments
        if (appointmentsResult?.error) {
          console.error("Error fetching appointments:", appointmentsResult.error);
          setAppointments([]);
          setUpcomingAppointments([]);
        } else {
          if (isMounted) {
            setAppointments(appointmentsResult?.data || []);
            
            // Filter for upcoming appointments
            const upcoming = appointmentsResult?.data?.filter(
              (apt: any) => apt.status.toLowerCase() === 'upcoming' || apt.status.toLowerCase() === 'scheduled'
            ) || [];
            setUpcomingAppointments(upcoming);
          }
        }
        
        // Load non-critical data in parallel after critical data is processed
        // This allows the UI to be responsive while less important data loads
        Promise.all([
          // Fetch messages (non-critical)
          fetchMessages(user.id),
          
          // Fetch journal entries (non-critical)
          supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(6),
            
          // Fetch stress assessments (non-critical)
          supabase
            .from('stress_assessments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
        ]).then(([messagesResult, journalResult, stressResult]) => {
          // Process messages
          if (messagesResult?.error) {
            console.error("Error fetching messages:", messagesResult.error);
          } else {
            setMessages(messagesResult?.data || []);
          }
          
          // Process journal entries
          if (journalResult.error) {
            console.error("Error fetching journal entries:", journalResult.error);
          } else {
            setRecentJournalEntries(journalResult.data || []);
          }
          
          // Process stress assessments
          if (stressResult.error) {
            console.error("Error fetching stress assessments:", stressResult.error);
          } else if (stressResult.data && stressResult.data.length > 0) {
            // User has stress assessments
            setHasStressAssessments(true);
            
            // Get the most recent assessment
            const latestAssessment = stressResult.data[0];
            
            // Format the date properly for stress assessments
            const assessmentDate = format(new Date(latestAssessment.created_at), "MMM d, yyyy");
            const checkInTime = format(new Date(latestAssessment.created_at), "h:mm a");
            setLastAssessmentDate(assessmentDate);
            setLastStressCheckIn(`${checkInTime}, ${assessmentDate}`);
            
            // Update user metrics with normalized stress level
            setUserMetrics(prev => ({
              ...prev,
              stressLevel: latestAssessment.raw_score
            }));
          }
        }).catch(error => {
          console.error("Error fetching secondary dashboard data:", error);
        }).finally(() => {
          console.timeEnd('dashboard-total-load');
        });
        
        // Lazy load appointment reports - this data is less critical
        const loadAppointmentReports = () => {
          setReportsLoading(true);
          fetchAppointmentReports(user.id)
            .then((result) => {
              const reportsData = (result as any)?.data || (Array.isArray(result) ? result : []);
              const reportsError = (result as any)?.error;

              if (reportsData && !(result as any)?.error) {
                setAppointmentReports(reportsData);
              } else if (reportsError) {
                console.error("Error fetching appointment reports:", reportsError);
                setAppointmentReports([]);
              } else {
                setAppointmentReports([]);
              }
            })
            .catch(error => {
              console.error("Exception in appointment reports fetch:", error);
              setAppointmentReports([]);
            })
            .finally(() => {
              setReportsLoading(false);
            });
        };
        
        // Delay loading reports to prioritize critical UI elements
        setTimeout(loadAppointmentReports, 1000);
        
      } catch (error: any) {
        console.error("Error fetching dashboard data:", error);
        if (isMounted) {
          toast.error(error.message || "Failed to load dashboard data");
        }
        if (isMounted) {
          setShowWelcomeDialog(false);
        }
      }
    };

    fetchDashboardData();

    const handleMoodAssessmentCompleted = () => {
      console.log('PatientDashboard: Mood assessment completed event received');
      // Use toast to notify user their assessment was received by the dashboard
      toast.success("Mood assessment recorded! Dashboard updating...");
      // Fetch fresh data
      fetchDashboardData();
    };
    
    const handleDashboardReloadNeeded = (data: { 
      source?: string, 
      timestamp?: number, 
      assessmentId?: string,
      _forceRefresh?: boolean,
      _timestamp?: number
    } = {}) => {
      console.log('PatientDashboard: Dashboard reload event received', data);
      
      // Check if this is a force refresh request
      if (data._forceRefresh === true) {
        console.log('Force refresh requested, performing complete data reload');
        
        // Reset all data states to force a complete refresh
        setHasAssessments(false);
        setHasStressAssessments(false);
        setLastAssessmentDate("Refreshing...");
        setLastStressCheckIn("Refreshing...");
        setUserMetrics(prev => ({
          ...prev,
          stressLevel: 0,
          consistency: 0
        }));
        
        // Add a small delay to allow the database to update
        setTimeout(() => {
          fetchDashboardData();
          if (data.source === 'stress-assessment') {
            toast.success("Dashboard updated with your latest stress assessment");
          } else {
            toast.success("Dashboard refreshed with latest data");
          }
        }, 500);
      }
      // Special handling for stress assessments
      else if (data.source === 'stress-assessment') {
        console.log('Stress assessment saved, performing targeted data refresh');
        
        // Force a refresh of stress-related data
        setHasStressAssessments(false);
        setLastAssessmentDate("Refreshing...");
        
        // Fetch fresh data
        fetchDashboardData();
      } 
      // Standard refresh for other events
      else {
        fetchDashboardData();
      }
    };
    
    // Check sessionStorage for recently saved mood assessments (backup mechanism)
    const checkForRecentAssessments = () => {
      try {
        const lastAssessmentStr = sessionStorage.getItem('last_mood_assessment');
        if (lastAssessmentStr) {
          const lastAssessment = JSON.parse(lastAssessmentStr);
          const saveTime = new Date(lastAssessment.saveTime || lastAssessment.timestamp);
          const now = new Date();
          const timeDiff = now.getTime() - saveTime.getTime();
          
          // If assessment was saved in the last 30 seconds and dashboard hasn't updated
          if (timeDiff < 30000) {
            console.log('PatientDashboard: Recent mood assessment found in storage, reloading data');
            // Show a message so the user knows the dashboard is updating
            toast.info("Updating dashboard with your latest mood assessment...");
            fetchDashboardData();
            // Clear it so we don't reload again
            sessionStorage.removeItem('last_mood_assessment');
          }
        }
      } catch (error) {
        console.error('Error checking for recent assessments:', error);
      }
    };
    
    // Use EventBus instead of window events
    const unsubscribeMoodAssessment = EventBus.on('mood-assessment-completed', handleMoodAssessmentCompleted);
    const unsubscribeDashboardReload = EventBus.on('dashboard-reload-needed', handleDashboardReloadNeeded);
    
    // Check for recent assessments once
    checkForRecentAssessments();
    
    // Also check again in 3 seconds in case there are delays
    const checkTimeout = setTimeout(checkForRecentAssessments, 3000);
    
    return () => {
      isMounted = false;
      // Clean up EventBus subscriptions
      unsubscribeMoodAssessment();
      unsubscribeDashboardReload();
      clearTimeout(checkTimeout);
    };
  }, [user, navigate]);

  useEffect(() => {
    if (user?.id) {
      setReportsLoading(true);
      fetchAppointmentReports(user.id)
        .then((result) => {
          console.log("Appointment reports result:", result);
          const reportsData = result?.data || [];
          console.log("Parsed appointment reports:", reportsData);
          setAppointmentReports(reportsData);
        })
        .catch(error => {
          console.error("Error fetching filtered appointment reports:", error);
          toast.error("Failed to load appointments");
        })
        .finally(() => {
          setReportsLoading(false);
        });
    }
  }, [appointmentFilter, user?.id]);

  const handleUpdateProfile = async (updatedData: Partial<UserProfile>) => {
    try {
      if (!profile?.id) return;

      const result = await supabase
        .from('user_profiles')
        .update(updatedData)
        .eq('id', profile.id)
        .select('*')
        .single();

      if (result.error) throw result.error;

      if (result.data) {
        setProfile(result.data);
        toast.success("Profile updated successfully");
      }
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Failed to update profile");
    }
  };

  const handleJournalClick = () => {
    navigate('/dashboard/journal');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };

  const handleSignout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      toast.error("Failed to sign out");
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 150);
      doc.text('Appointment Reports', 14, 20);

      // Add patient info
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Patient: ${profile?.first_name || ''} ${profile?.last_name || ''}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

      // Create data for table
      const tableRows = appointmentReports.map(report => {
        // Format status for display
        const displayStatus = report.status === 'pending' || report.status === 'scheduled' 
          ? 'Upcoming' 
          : report.status.charAt(0).toUpperCase() + report.status.slice(1);
          
        return [
          formatAppointmentId(report.id), 
          report.mood_mentor?.user_metadata?.full_name || 'Unknown',
          `${report.date}, ${report.start_time}`,
          report.meeting_type,
          displayStatus
        ];
      });

      // Add table with appointment data
      (doc as any).autoTable({
        head: [['ID', 'Mood Mentor', 'Date', 'Type', 'Status']],
        body: tableRows,
        startY: 45,
        styles: { 
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: { 
          fillColor: [32, 192, 243],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 247, 255]
        }
      });

      // Save the PDF
      const fileName = `appointment_report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("Appointment report has been downloaded");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to export appointments");
    }
  };

  const handleExportAppointment = (appointmentId: string) => {
    try {
      // Find the appointment in the reports
      const appointment = appointmentReports.find(report => report.id === appointmentId);
      
      if (!appointment) {
        toast.error("Appointment not found");
        return;
      }
      
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 150);
      doc.text('Appointment Details', 14, 20);

      // Add appointment info
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      
      // Get mentor details
      const mentorName = appointment.mood_mentor?.user_metadata?.full_name || "Unknown Mentor";
      const mentorSpecialty = appointment.mood_mentor?.user_metadata?.specialty || "Specialist";
      
      // Format status for display
      const displayStatus = appointment.status === 'pending' || appointment.status === 'scheduled' 
        ? 'Upcoming' 
        : appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1);
      
      // Appointment details
      doc.text(`ID: ${formatAppointmentId(appointment.id)}`, 14, 35);
      doc.text(`Mood Mentor: ${mentorName}`, 14, 45);
      doc.text(`Specialization: ${mentorSpecialty}`, 14, 55);
      doc.text(`Date: ${appointment.date}`, 14, 65);
      doc.text(`Time: ${appointment.start_time}`, 14, 75);
      doc.text(`Type: ${appointment.meeting_type}`, 14, 85);
      doc.text(`Status: ${displayStatus}`, 14, 95);
      
      // Add notes if available
      if (appointment.notes) {
        doc.text('Notes:', 14, 110);
        doc.setFontSize(10);
        
        // Split notes into multiple lines if needed
        const splitNotes = doc.splitTextToSize(appointment.notes, 180);
        doc.text(splitNotes, 14, 120);
      }

      // Save the PDF
      const fileName = `appointment_${appointmentId.replace('#', '')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("Appointment details have been downloaded");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to export appointment details");
    }
  };

  const handleShowWelcomeDialog = () => {
    setShowWelcomeDialog(true);
  };

  const getHealthStatus = (stressLevel: number): 'excellent' | 'good' | 'fair' | 'concerning' | 'worrying' => {
    // Convert raw stress score (1-5) to health percentage (0-100)
    const healthPercentage = Math.max(0, Math.min(100, ((5 - stressLevel) / 4) * 100));
    
    if (healthPercentage >= 80) return 'excellent';
    if (healthPercentage >= 60) return 'good';
    if (healthPercentage >= 40) return 'fair';
    if (healthPercentage >= 20) return 'concerning';
    return 'worrying';
  };

  // Replace appointmentService.getPatientAppointments with direct Supabase call
  const fetchAppointments = async (userId: string) => {
    return await supabase
      .from('patient_appointments_view')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at', { ascending: false });
  };

  // Replace messageService.getMessages with direct Supabase call
  const fetchMessages = async (userId: string) => {
    return await supabase
      .from('messages')
      .select('*')
      .or([
        { sender_id: userId },
        { recipient_id: userId }
      ])
      .order('created_at', { ascending: false });
  };

  // Replace patientService.getAppointmentReports with direct Supabase call
  const fetchAppointmentReports = async (userId: string) => {
    try {
      // Use the patient_appointments_view which should have all the joined data
      let query = supabase
        .from('patient_appointments_view')
        .select('*')
        .eq('patient_id', userId);
        
      // Apply filters based on appointmentFilter
      if (appointmentFilter === 'upcoming') {
        query = query.in('status', ['pending', 'scheduled']);
      } else if (appointmentFilter === 'completed') {
        query = query.eq('status', 'completed');
      } else if (appointmentFilter === 'cancelled') {
        query = query.eq('status', 'cancelled');
      }
        
      // Order by date and time for better usability
      const { data, error } = await query
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(10); // Limit to 10 appointments for the dashboard overview
      
      if (error) {
        console.error("Error fetching appointment reports:", error);
        return { data: [], error };
      }
      
      // Transform the data to match the expected structure
      const formattedData = data?.map(apt => ({
        id: apt.id,
        patient_id: apt.patient_id,
        mentor_id: apt.mentor_id,
        date: apt.date,
        start_time: apt.start_time,
        end_time: apt.end_time,
        meeting_type: apt.meeting_type,
        status: apt.status,
        description: apt.description,
        notes: apt.notes,
        created_at: apt.created_at,
        updated_at: apt.updated_at,
        mood_mentor: {
          id: apt.mentor_id,
          user_metadata: {
            full_name: apt.mentor_name,
            specialty: apt.mentor_specialty,
            avatar_url: apt.mentor_avatar_url
          }
        }
      })) || [];
      
      console.log("Formatted appointment data:", formattedData);
      return { data: formattedData, error: null };
    } catch (err) {
      console.error("Exception in fetchAppointmentReports:", err);
      return { data: [], error: err };
    }
  };

  // Format the appointment ID to be more user-friendly
  const formatAppointmentId = (id: string) => {
    // Use a shorter format like #Apt followed by the last 4-5 characters
    return `#Apt${id.slice(-5)}`;
  };

  return (
    <DashboardLayout>
      {/* Weekly notification manager */}
      <NotificationManager 
        checkInDates={checkInDates}
        userId={user?.id || 'test-user'}
        userEmail={user?.email || 'test@example.com'}
      />
      
      {showWelcomeDialog && (
        <WelcomeDialog 
          isOpen={showWelcomeDialog} 
          onClose={() => setShowWelcomeDialog(false)}
        />
      )}

      <StressAssessmentModal open={isStressModalOpen} onOpenChange={setIsStressModalOpen} />

      <div className="p-6 space-y-6">
        {/* Title and User Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-slate-500">
              Welcome back, {firstName}
            </p>
          </div>
          {/* Testing Controls */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShowWelcomeDialog}
            className="sm:self-start"
          >
            Show Welcome Dialog
          </Button>
        </div>

        {/* Welcome Dialog for testing */}
        {showWelcomeDialog && (
          <WelcomeDialog 
            isOpen={showWelcomeDialog} 
            onClose={() => setShowWelcomeDialog(false)}
          />
        )}

        {/* Health Records Overview */}
        <div>
          <h2 className="text-xl font-medium mb-4">Emotional Health Records</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Mood Score */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-red-50 to-pink-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <HeartPulse className="w-5 h-5 text-red-500 mr-2" />
                    <span className="text-sm font-medium">Mood Score</span>
                  </div>
                  {hasAssessments && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">Active</span>
                  )}
                </div>
                <div className="text-xl font-bold">{userMetrics.moodScore.toFixed(1)}</div>
                <p className="text-xs text-slate-500 mt-2">
                  {hasAssessments ? "Average from recent check-ins" : "Start your first check-in"}
                </p>
              </CardContent>
            </Card>

            {/* Stress Level */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Activity className="w-5 h-5 text-blue-500 mr-2" />
                    <span className="text-sm font-medium">Stress Management</span>
                  </div>
                  {hasStressAssessments && userMetrics.stressLevel > 0 && (
                    <span className="text-xs font-medium px-2.5 py-0.5 whitespace-nowrap rounded-full" style={{ 
                      backgroundColor: (() => {
                        const healthPercentage = Math.max(0, Math.min(100, ((5 - userMetrics.stressLevel) / 4) * 100));
                        if (healthPercentage >= 75) return "rgba(34, 197, 94, 0.15)"; // Green bg lighter
                        if (healthPercentage >= 50) return "rgba(132, 204, 22, 0.15)"; // Lime bg lighter
                        if (healthPercentage >= 25) return "rgba(250, 204, 21, 0.15)"; // Yellow bg lighter
                        return "rgba(239, 68, 68, 0.15)"; // Red bg lighter
                      })(),
                      color: (() => {
                        const healthPercentage = Math.max(0, Math.min(100, ((5 - userMetrics.stressLevel) / 4) * 100));
                        if (healthPercentage >= 75) return "#15803d"; // Green text darker
                        if (healthPercentage >= 50) return "#4d7c0f"; // Lime text darker
                        if (healthPercentage >= 25) return "#a16207"; // Yellow text darker
                        return "#b91c1c"; // Red text darker
                      })()
                    }}>
                      {(() => {
                        const healthPercentage = Math.max(0, Math.min(100, ((5 - userMetrics.stressLevel) / 4) * 100));
                        if (healthPercentage >= 75) return "Low Stress";
                        if (healthPercentage >= 50) return "Moderate";
                        if (healthPercentage >= 25) return "High";
                        return "Very High";
                      })()}
                    </span>
                  )}
                </div>
                
                {userMetrics.stressLevel > 0 ? (
                  <>
                    {/* Calculate health and stress percentages */}
                    {(() => {
                      // Use the same calculation as EmotionalHealthWheel
                      const healthPercentage = Math.max(0, Math.min(100, ((5 - userMetrics.stressLevel) / 4) * 100));
                      const stressPercentage = 100 - healthPercentage;
                      
                      // Get color using the same logic as EmotionalHealthWheel
                      const getStressColor = () => {
                        if (healthPercentage >= 75) return "#22c55e"; // Green (Excellent)
                        if (healthPercentage >= 50) return "#84cc16"; // Lime (Good)
                        if (healthPercentage >= 25) return "#facc15"; // Yellow (Fair)
                        return "#ef4444"; // Red (Concerning/Worrying)
                      };
                      
                      const color = getStressColor();
                      
                      return (
                        <>
                          <div className="text-xl font-bold mb-1">
                            {Math.round(stressPercentage)}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-500 ease-in-out"
                              style={{ 
                                width: `${Math.round(stressPercentage)}%`,
                                backgroundColor: color
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-slate-500">
                            <span>Lower stress is better</span>
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-slate-500">No assessment data</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Last Check-in */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 text-indigo-500 mr-2" />
                    <span className="text-sm font-medium">Last Check-in</span>
                  </div>
                </div>
                <div className="text-xl font-bold">{hasStressAssessments ? "Taken" : "None"}</div>
                <p className="text-xs text-slate-500 mt-2">
                  {hasStressAssessments ? lastStressCheckIn : "Complete your first assessment"}
                </p>
              </CardContent>
            </Card>

            {/* Consistency */}
            <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <BarChart className="w-5 h-5 text-emerald-500 mr-2" />
                    <span className="text-sm font-medium">Consistency</span>
                  </div>
                  {hasAssessments && (
                    <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                      {userMetrics.streak > 0 ? `${userMetrics.streak} day${userMetrics.streak !== 1 ? 's' : ''} streak` : 'Active Streak'}
                    </span>
                  )}
                </div>
                <div className="text-xl font-bold">
                  {hasAssessments 
                    ? userMetrics.consistency > 0 
                      ? `${Math.round(userMetrics.consistency * 10)}%` 
                      : userMetrics.streak > 0 
                        ? `${userMetrics.streak} day${userMetrics.streak !== 1 ? 's' : ''}` 
                      : <span className="opacity-70 animate-pulse">—</span> 
                    : <span className="opacity-70">—</span>}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {hasAssessments 
                    ? userMetrics.consistency > 0 
                      ? userMetrics.streak > 1 
                        ? `Keep your ${userMetrics.streak}-day streak going!` 
                        : "Keep showing up daily"
                      : <span className="flex items-center"><span className="text-xs inline-block text-emerald-600">Keep showing up daily</span></span>
                    : "Start tracking your mood"}
                  {userMetrics.firstCheckInDate && (
                    <span className="block mt-1 text-slate-400">Since {userMetrics.firstCheckInDate}</span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mood Check-in and Recent Assessments - 2 columns layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Emotional Health Wheel - replaces Daily Check-in */}
          <EmotionalHealthWheel 
            stressLevel={userMetrics.stressLevel} 
            lastCheckIn={lastAssessmentDate}
            onViewDetails={() => navigate('/patient-dashboard/reports')}
            hasAssessments={hasStressAssessments}
            statusText={hasStressAssessments ? getHealthStatus(userMetrics.stressLevel) : undefined}
            onTakeAssessment={() => {
              console.log("EmotionalHealthWheel onTakeAssessment clicked on PatientDashboard - opening modal.");
              setIsStressModalOpen(true);
            }}
          />

          {/* Mood Summary Card */}
          <Card className="h-full bg-gradient-to-br from-white to-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium">Recent Trend</CardTitle>
              <CardDescription>Based on recent assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <MoodSummaryCard />
            </CardContent>
          </Card>
        </div>

        {/* Appointment Section */}
        <div>
          {/* Reports Section */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
              <h2 className="text-xl font-medium">Appointment Reports</h2>
              <div className="flex items-center mt-2 sm:mt-0 gap-2">
                <div className="relative">
                  <select 
                    className="appearance-none bg-white border border-slate-200 rounded-md pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    value={appointmentFilter}
                    onChange={(e) => {
                      setAppointmentFilter(e.target.value);
                      // Loading indicator will be shown by the useEffect that watches appointmentFilter
                    }}
                  >
                    <option value="all">All Appointments</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                    <ChevronRight className="h-4 w-4 rotate-90" />
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-blue-600"
                  onClick={() => navigate('/patient-dashboard/appointments')}
                >
                  View All
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={reportsLoading || appointmentReports.length === 0}>
                  <Download className="h-4 w-4 mr-1" />
                  Export All
                </Button>
              </div>
            </div>
          </div>

          {/* Appointments Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#20C0F3' }} className="rounded-t-lg">
                      <th className="text-left text-sm font-medium text-white p-4 first:rounded-tl-lg">ID</th>
                      <th className="text-left text-sm font-medium text-white p-4">Mood Mentor</th>
                      <th className="text-left text-sm font-medium text-white p-4">Date</th>
                      <th className="text-left text-sm font-medium text-white p-4">Type</th>
                      <th className="text-left text-sm font-medium text-white p-4 last:rounded-tr-lg">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportsLoading ? (
                      // Loading skeleton
                      Array(4).fill(null).map((_, i) => (
                        <tr key={`skeleton-${i}`} className="animate-pulse">
                          <td className="p-4">
                            <div className="h-4 bg-slate-200 rounded w-20"></div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                              <div className="space-y-2">
                                <div className="h-4 bg-slate-200 rounded w-32"></div>
                                <div className="h-3 bg-slate-200 rounded w-24"></div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="h-4 bg-slate-200 rounded w-28"></div>
                          </td>
                          <td className="p-4">
                            <div className="h-4 bg-slate-200 rounded w-16"></div>
                          </td>
                          <td className="p-4">
                            <div className="h-6 bg-slate-200 rounded w-24"></div>
                          </td>
                        </tr>
                      ))
                    ) : appointmentReports.length === 0 ? (
                      // No appointments found
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No appointments found matching your filter criteria
                        </td>
                      </tr>
                    ) : (
                      // Render actual appointment data
                      appointmentReports.map((report) => {
                        // Determine status badge styling
                        const getBadgeClasses = (status: string) => {
                          if (!status) return "bg-slate-100 text-slate-700 hover:bg-slate-200";
                          
                          switch(status.toLowerCase()) {
                            case 'pending':
                            case 'scheduled':
                              return "bg-indigo-100 text-indigo-700 hover:bg-indigo-200";
                            case 'completed':
                              return "bg-purple-100 text-purple-700 hover:bg-purple-200";
                            case 'cancelled':
                              return "bg-red-100 text-red-700 hover:bg-red-200";
                            default:
                              return "bg-slate-100 text-slate-700 hover:bg-slate-200";
                          }
                        };

                        // Determine badge dot color
                        const getDotColor = (status: string) => {
                          if (!status) return "bg-slate-500";
                          
                          switch(status.toLowerCase()) {
                            case 'pending':
                            case 'scheduled':
                              return "bg-indigo-500";
                            case 'completed':
                              return "bg-purple-500";
                            case 'cancelled':
                              return "bg-red-500";
                            default:
                              return "bg-slate-500";
                          }
                        };

                        // Format the status for display
                        const getDisplayStatus = (status: string) => {
                          if (!status) return "Unknown";
                          
                          if (status.toLowerCase() === 'pending' || status.toLowerCase() === 'scheduled') {
                            return "Upcoming";
                          }
                          
                          return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
                        };

                        // Get mentor name from the mood_mentor relationship
                        const mentorName = report.mood_mentor?.user_metadata?.full_name || "Unknown Mentor";
                        const mentorSpecialty = report.mood_mentor?.user_metadata?.specialty || "Specialist";
                        const mentorAvatar = report.mood_mentor?.user_metadata?.avatar_url || "";

                        return (
                          <tr key={report.id} className="hover:bg-blue-50/30 transition-colors">
                            <td className="p-4">
                              <span className="text-blue-600 font-medium">{formatAppointmentId(report.id)}</span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                {mentorAvatar ? (
                                  <FallbackAvatar
                                    src={mentorAvatar}
                                    name={mentorName}
                                    className="h-10 w-10"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                                    {mentorName.split(' ').map(n => n[0]).join('')}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-gray-800">{mentorName}</div>
                                  <div className="text-xs text-slate-500">{mentorSpecialty}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-sm text-gray-700">{`${report.date}, ${report.start_time}`}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center text-sm text-gray-700">
                                {report.meeting_type === 'video' && <Video className="h-3.5 w-3.5 mr-1.5 text-blue-500" />}
                                {report.meeting_type === 'audio' && <Phone className="h-3.5 w-3.5 mr-1.5 text-blue-500" />}
                                {report.meeting_type === 'chat' && <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-blue-500" />}
                                {report.meeting_type.charAt(0).toUpperCase() + report.meeting_type.slice(1)}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <Badge className={`${getBadgeClasses(report.status)} font-medium px-3 py-1 rounded-full`}>
                                  <span className="flex items-center">
                                    <span className={`h-1.5 w-1.5 rounded-full ${getDotColor(report.status)} mr-1.5`}></span>
                                    {getDisplayStatus(report.status)}
                                  </span>
                                </Badge>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 w-7 p-0" 
                                  onClick={() => handleExportAppointment(report.id)}
                                >
                                  <FileText className="h-3.5 w-3.5 text-slate-600" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium">Journal Entries</h2>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-blue-600"
              onClick={() => navigate('/dashboard/journal')}
            >
              View All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentJournalEntries.length === 0 ? (
              // No entries message
              <Card className="col-span-full p-5 text-center">
                <CardContent>
                  <p className="text-slate-500 mb-3">No journal entries yet</p>
                  <Button 
                    size="sm" 
                    onClick={() => navigate('/journal')}
                  >
                    Create Your First Entry
                  </Button>
                </CardContent>
              </Card>
            ) : (
              // Display actual journal entries
              recentJournalEntries.map((entry) => (
                <Card 
                  key={entry.id} 
                  className="hover:border-blue-200 cursor-pointer transition-colors"
                  onClick={() => navigate(`/dashboard/journal/${entry.id}`)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline" className={
                        !entry.mood ? "bg-slate-50 border-slate-200 text-slate-700" :
                        entry.mood === 'Happy' || entry.mood === 'Grateful' ? "bg-green-50 border-green-200 text-green-700" :
                        entry.mood === 'Calm' ? "bg-blue-50 border-blue-200 text-blue-700" :
                        entry.mood === 'Anxious' || entry.mood === 'Worried' ? "bg-yellow-50 border-yellow-200 text-yellow-700" :
                        entry.mood === 'Sad' || entry.mood === 'Overwhelmed' ? "bg-red-50 border-red-200 text-red-700" :
                        "bg-slate-50 border-slate-200 text-slate-700"
                      }>
                        {entry.mood || 'Neutral'}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {new Date(entry.created_at).toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    <h3 className="font-medium mb-2 line-clamp-1">{entry.title || 'Untitled Entry'}</h3>
                    <p className="text-sm text-slate-600 line-clamp-3">
                      {entry.content ? entry.content.replace(/<[^>]*>/g, '') : 'No content'}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

                  {/* Active Group Sessions Card */}
          <ActiveGroupSessions />

                    {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Stats will be here */}
          </div>
        </div>
    </DashboardLayout>
  );
}




