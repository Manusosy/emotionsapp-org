import { useEffect, useState, useContext, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  Phone, 
  MessageSquare, 
  Filter, 
  MapPin,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone as PhoneIcon,
  CalendarClock,
  Star,
  Calendar,
  Info,
  FilterIcon,
  X,
  CalendarPlus,
  RefreshCw,
  CheckCircle2,
  GraduationCap,
  UserRound,
  CalendarRange,
  ChevronDown,
  FileText,
  Download
} from "lucide-react";
import { AuthContext } from "@/contexts/authContext";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, addDays, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database } from '../../../types/database.types';
import { supabase } from "@/lib/supabase";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import FallbackAvatar from "@/components/ui/fallback-avatar";
import { appointmentService } from "@/services";
import { ChatButton } from "@/components/messaging/ChatButton";
import { useAuth } from "@/contexts/authContext";
import BookingButton from "@/features/booking/components/BookingButton";

// Define the Appointment type
interface Appointment {
  id: string;
  date: string;
  time: string;
  type: 'video' | 'audio' | 'chat';
  status: 'pending' | 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  concerns?: string;
  notes?: string;
  duration?: string;
}

// Define the MoodMentorProfile type
interface MoodMentorProfile {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  rating?: number;
  reviews?: number;
  available?: boolean;
  nextAvailable?: string;
  email?: string;
  phone?: string;
  bio?: string;
  education?: string;
}

// Define the AppointmentWithMentor type
interface AppointmentWithMentor extends Appointment {
  mentor?: {
    id: string;
    name: string;
    specialty: string;
    avatar: string;
    email: string;
    phone: string;
  }
}

// Define the DateFilter type
interface DateFilter {
  label: string;
  startDate: Date;
  endDate: Date;
}

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithMentor[]>([]);
  const [moodMentors, setMoodMentors] = useState<MoodMentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("upcoming");
  
  // Debug mode counter
  const [titleClicks, setTitleClicks] = useState(0);
  const handleTitleClick = () => {
    const newCount = titleClicks + 1;
    setTitleClicks(newCount);
    
    // Enable debug mode after 5 clicks
    if (newCount === 5) {
      localStorage.setItem('debug_mode', 'true');
      toast.success('Debug mode enabled');
    }
  };
  
  // Update page title
  useEffect(() => {
    document.title = "My Appointments | Emotions Health";
  }, []);

  // Current date
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(addDays(today, 6));
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  // Appointment counts
  const [counts, setCounts] = useState({
    upcoming: 0,
    cancelled: 0,
    completed: 0
  });

  // Date filter options
  const dateFilters: DateFilter[] = [
    {
      label: "Today",
      startDate: today,
      endDate: today
    },
    {
      label: "Yesterday",
      startDate: subDays(today, 1),
      endDate: subDays(today, 1)
    },
    {
      label: "Last 7 Days",
      startDate: subDays(today, 7),
      endDate: today
    },
    {
      label: "Last 30 Days",
      startDate: subDays(today, 30),
      endDate: today
    },
    {
      label: "This Month",
      startDate: startOfMonth(today),
      endDate: endOfMonth(today)
    },
    {
      label: "Last Month",
      startDate: startOfMonth(subMonths(today, 1)),
      endDate: endOfMonth(subMonths(today, 1))
    }
  ];

  const [cancelAppointmentId, setCancelAppointmentId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>('');

  const [loadingMoodMentors, setLoadingMoodMentors] = useState(false);

  useEffect(() => {
    fetchAppointments();
    fetchMoodMentors();
  }, [user?.id, activeTab, startDate, endDate]);

  const fetchAppointments = async () => {
    try {
      // Get the current user from auth context
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.id) {
        console.log("No authenticated user found");
        toast.error("User authentication required");
        setLoading(false);
        return;
      }
      
      setLoading(true);
      console.log(`Fetching appointments for user ${currentUser.id}, tab: ${activeTab}`);
      
      // Get current date in YYYY-MM-DD format
      const today = new Date();
      const todayFormatted = format(today, 'yyyy-MM-dd');
      
      // Determine status filter based on active tab
      let statusFilter: string | undefined;
      if (activeTab === 'upcoming') {
        statusFilter = 'pending,scheduled';
      } else if (activeTab === 'cancelled') {
        statusFilter = 'cancelled';
      } else if (activeTab === 'completed') {
        statusFilter = 'completed';
      }
      
      // Fetch appointments from the database
      const { data: appointmentsData, error } = await supabase
        .from('patient_appointments_view')
        .select('*')
        .eq('patient_id', currentUser.id)
        .in('status', statusFilter ? statusFilter.split(',') : []);
      
      if (error) {
        console.error("Error fetching appointments:", error);
        toast.error("Failed to load appointments: " + error.message);
        setLoading(false);
        return;
      }
      
      // If no data but no error, it means there are no appointments yet
      if (!appointmentsData || appointmentsData.length === 0) {
        console.log("No appointments found for this patient");
        setAppointments([]);
        setCounts({
          upcoming: 0,
          cancelled: 0,
          completed: 0
        });
        setLoading(false);
        return;
      }
      
      console.log("Appointments data:", appointmentsData);
      
      // Map the appointments to the expected format
      const formattedAppointments = appointmentsData.map(appt => ({
        id: appt.id,
        date: appt.date,
        time: appt.start_time,
        type: appt.meeting_type as 'video' | 'audio' | 'chat',
        status: appt.status as 'pending' | 'confirmed' | 'cancelled' | 'completed',
        concerns: appt.description,
        notes: appt.notes,
        duration: '1 hour',
        mentor: {
          id: appt.mentor_id, // This is the auth.users ID
          name: appt.mentor_name || 'Unknown Mentor',
          specialty: appt.mentor_specialty || 'Specialist',
          avatar: appt.mentor_avatar_url || '',
          email: '',
          phone: ''
        }
      }));
      
      // Sort appointments by date and time
      formattedAppointments.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log("Formatted appointments:", formattedAppointments);
      
      // Update appointments state
      setAppointments(formattedAppointments);
      
      // Update counts
      const upcomingCount = appointmentsData.filter(a => a.status === 'pending' || a.status === 'scheduled').length;
      const cancelledCount = appointmentsData.filter(a => a.status === 'cancelled').length;
      const completedCount = appointmentsData.filter(a => a.status === 'completed').length;
      
      setCounts({
        upcoming: upcomingCount,
        cancelled: cancelledCount,
        completed: completedCount
      });
      
      setLoading(false);
    } catch (error: any) {
      console.error("Error in fetchAppointments:", error);
      toast.error("An error occurred while loading appointments: " + (error.message || "Unknown error"));
      setLoading(false);
    }
  };

  const fetchMoodMentors = async () => {
    try {
      setLoadingMoodMentors(true);
      
      // Use mood mentor service to get available mentors
      const { data: mentorsData, error } = await supabase
        .from('mood_mentor_profiles')
        .select('*')
        .eq('availability_status', 'available')
        .limit(5);
      
      if (error) {
        console.error("Error fetching mood mentors:", error);
        setMoodMentors([]);
        return;
      }
      
      if (mentorsData && mentorsData.length > 0) {
        const mappedMentors: MoodMentorProfile[] = mentorsData.map(mentor => ({
          id: mentor.id,
          name: mentor.full_name || 'Mood Mentor',
          specialty: mentor.specialty || 'Mental Health Support',
          avatar: mentor.avatar_url || '/default-avatar.png',
          rating: mentor.rating || 4.5,
          reviews: mentor.review_count || 0,
          available: mentor.availability_status === 'available',
          email: mentor.email || '',
          phone: mentor.phone_number || '',
          bio: mentor.bio || '',
          education: typeof mentor.education === 'string' ? mentor.education : 
            (mentor.education && mentor.education[0]?.degree) ? 
            `${mentor.education[0].degree} from ${mentor.education[0].institution}` : 
            'Mental Health Professional'
        }));
        
        setMoodMentors(mappedMentors);
      } else {
        // No mock data fallback - just set empty array
        console.log("No mood mentors found");
        setMoodMentors([]);
      }
    } catch (error) {
      console.error("Error fetching mood mentors:", error);
      setMoodMentors([]);
    } finally {
      setLoadingMoodMentors(false);
    }
  };

  const getAppointmentIdCode = (id: string) => {
    // Format the appointment ID to be more user-friendly
    return `#Apt${id.slice(-5)}`;
  };

  const handleApplyDateFilter = (filter: DateFilter) => {
    setStartDate(filter.startDate);
    setEndDate(filter.endDate);
    setDateFilterOpen(false);
  };

  const handleCustomDateRange = () => {
    // This would open a date range picker
    toast.info("Custom date range picker will be implemented soon");
    setDateFilterOpen(false);
  };

  const handleBookWithMentor = (mentorId: string) => {
    navigate(`/booking?mentor=${mentorId}`);
  };

  const handleViewMentorProfile = (mentorId: string) => {
    const mentor = moodMentors.find(a => a.id === mentorId);
    if (mentor) {
      const nameSlug = mentor.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      navigate(`/mood-mentor/${nameSlug}?id=${mentorId}`);
    } else {
      navigate(`/mood-mentor?id=${mentorId}`);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      if (!user) {
        toast.error("You must be logged in to cancel appointments");
        return;
      }
      
      toast.loading("Cancelling appointment...");
      
      // Use the appointment service to cancel the appointment
      const result = await appointmentService.cancelAppointment(appointmentId, cancellationReason);
      
      if (result.error) {
        console.error("Error cancelling appointment:", result.error);
        toast.dismiss();
        toast.error("Failed to cancel appointment: " + result.error);
        return;
      }

      toast.dismiss();
      toast.success("Appointment cancelled successfully");
      fetchAppointments(); // Refresh appointments after cancellation
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      toast.dismiss();
      toast.error("An error occurred while cancelling the appointment");
    } finally {
      setCancelAppointmentId(null);
      setCancellationReason(''); // Reset the reason
    }
  };

  const handleStartChat = async (appointmentId: string) => {
    try {
      const { data: conversationId, error } = await appointmentService.startAppointmentChat(appointmentId);
      
      if (error) {
        // Special handling for database table not existing yet
        if (error.includes('relation') && error.includes('does not exist')) {
          toast.info('Chat system is being set up. Please try again in a moment.');
        } else {
          toast.error('Failed to start chat session: ' + error);
        }
        return;
      }
      
      if (conversationId) {
        navigate(`/chat/${conversationId}`);
      } else {
        toast.error('Could not create a chat session');
      }
    } catch (err) {
      console.error('Error starting chat:', err);
      toast.error('An error occurred while starting the chat');
    }
  };

  // Function to check if a patient can join a session
  const canJoinSession = (appointment: any) => {
    // Patient can join if the appointment is scheduled (mentor has started it)
    // or if it is in progress
    return appointment.status.toLowerCase() === 'scheduled' || 
           appointment.status.toLowerCase() === 'in progress';
  };

  // Function to handle joining a video session
  const handleJoinSession = async (appointment: any) => {
    if (!user) {
      toast.error("You must be logged in to join sessions");
      return;
    }

    if (!canJoinSession(appointment)) {
      toast.info("Please wait for your mentor to start the session.");
      return;
    }

    try {
      // Navigate to the dedicated call page
      navigate(`/patient-dashboard/appointment/${appointment.id}/call`);
      toast.success("Joining video call...");
    } catch (error) {
      console.error("Error joining session:", error);
      toast.error("Failed to join session. Please try again.");
    }
  };

  // Replace the renderAppointmentList function with a more modern table design
  const renderAppointmentList = () => {
    if (loading) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6 py-16">
          <div className="flex flex-col items-center justify-center">
            <Spinner size="lg" className="text-blue-600" />
            <p className="text-gray-500 mt-4">Loading your appointments...</p>
          </div>
        </div>
      );
    }

    if (appointments.length === 0) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="p-16 flex flex-col items-center justify-center text-center">
            <div className="bg-blue-50 rounded-full p-5 mb-6">
              <CalendarClock className="h-12 w-12 text-blue-500" />
            </div>
            <h3 className="text-xl font-medium mb-3">No {activeTab} appointments</h3>
            <p className="text-gray-500 mb-8 max-w-md">
              {activeTab === "upcoming" 
                ? "You don't have any upcoming appointments scheduled. Book an appointment with one of our mentors to get started with your mental health journey."
                : activeTab === "cancelled" 
                ? "You don't have any cancelled appointments. All your cancelled appointments will appear here for reference."
                : "You don't have any completed appointments yet. After completing sessions, they will appear here for your records."}
            </p>
            <Button 
              onClick={() => {
                // Scroll to the mood mentors section on the same page
                const mentorsSection = document.getElementById('mood-mentors-section');
                if (mentorsSection) {
                  mentorsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-full font-medium"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              Book Appointment
            </Button>
          </div>
        </div>
      );
    }

    // Format the appointment ID to be more user-friendly
    const formatAppointmentId = (id: string) => {
      return `#Apt${id.slice(-5)}`;
    };

    // Determine status badge styling
    const getBadgeClasses = (status: string) => {
      if (!status) return "bg-slate-100 text-slate-700 hover:bg-slate-200";
      
      switch(status.toLowerCase()) {
        case 'pending':
          return "bg-blue-100 text-blue-700 hover:bg-blue-200";
        case 'scheduled':
          return "bg-green-100 text-green-700 hover:bg-green-200";
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
          return "bg-blue-500";
        case 'scheduled':
          return "bg-green-500";
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
      
      switch (status.toLowerCase()) {
        case 'pending':
          return "Upcoming";
        case 'scheduled':
          return "In Progress";
        case 'completed':
          return "Completed";
        case 'cancelled':
          return "Cancelled";
        default:
          return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
      }
    };

    return (
      <>
        <Card className="shadow-sm overflow-hidden mt-6">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#1E88E5' }} className="rounded-t-lg">
                    <th className="text-left text-sm font-semibold text-white p-4 first:rounded-tl-lg">ID</th>
                    <th className="text-left text-sm font-semibold text-white p-4">Mood Mentor</th>
                    <th className="text-left text-sm font-semibold text-white p-4">Date & Time</th>
                    <th className="text-left text-sm font-semibold text-white p-4">Type</th>
                    <th className="text-left text-sm font-semibold text-white p-4">Status</th>
                    <th className="text-right text-sm font-semibold text-white p-4 last:rounded-tr-lg">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {appointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4">
                        <span className="text-blue-600 font-medium">{formatAppointmentId(appointment.id)}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <FallbackAvatar
                            src={appointment.mentor?.avatar}
                            name={appointment.mentor?.name || "Mentor"}
                            className="h-10 w-10"
                          />
                          <div>
                            <div className="font-medium text-gray-800">{appointment.mentor?.name}</div>
                            <div className="text-xs text-slate-500">{appointment.mentor?.specialty}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-700">
                          <div className="flex items-center">
                            <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                            {format(new Date(appointment.date), "dd MMM yyyy")}
                          </div>
                          <div className="flex items-center mt-1">
                            <Clock className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                            {appointment.time}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center text-sm text-gray-700">
                          {appointment.type === "video" && <Video className="h-3.5 w-3.5 mr-1.5 text-blue-500" />}
                          {appointment.type === "audio" && <Phone className="h-3.5 w-3.5 mr-1.5 text-blue-500" />}
                          {appointment.type === "chat" && <MessageSquare className="h-3.5 w-3.5 mr-1.5 text-blue-500" />}
                          {appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge className={`${getBadgeClasses(appointment.status)} font-medium px-3 py-1 rounded-full`}>
                          <span className="flex items-center">
                            <span className={`h-1.5 w-1.5 rounded-full ${getDotColor(appointment.status)} mr-1.5`}></span>
                            {getDisplayStatus(appointment.status)}
                          </span>
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {activeTab === "upcoming" && (
                            <>
                              {/* Cancel button - always show for upcoming appointments */}
                              <Button 
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 rounded-full text-red-500 border-red-200 hover:bg-red-50"
                                onClick={() => setCancelAppointmentId(appointment.id)}
                              >
                                <X className="h-3.5 w-3.5 mr-1.5" />
                                Cancel
                              </Button>
                              
                              {/* For chat appointments, only show Message button */}
                              {appointment.type === 'chat' && (
                                <Button 
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 rounded-full"
                                  onClick={() => navigate(`/patient-dashboard/messages/${appointment.mentor?.id}`)}
                                >
                                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                                  Message
                                </Button>
                              )}
                              
                              {/* For video/audio appointments */}
                              {appointment.type.toLowerCase() === 'video' && (
                                <Button
                                  variant={canJoinSession(appointment) ? "default" : "outline"}
                                  size="sm"
                                  className={`h-8 px-3 rounded-full ${
                                    canJoinSession(appointment)
                                      ? "bg-green-600 hover:bg-green-700 text-white"
                                      : "text-gray-500"
                                  }`}
                                  onClick={() => handleJoinSession(appointment)}
                                  disabled={!canJoinSession(appointment)}
                                >
                                  <Video className="h-3.5 w-3.5 mr-1.5" />
                                  {canJoinSession(appointment) ? "Join Call" : "Waiting..."}
                                </Button>
                              )}
                              
                              {/* Add support for audio appointments */}
                              {appointment.type.toLowerCase() === 'audio' && (
                                <Button
                                  variant={canJoinSession(appointment) ? "default" : "outline"}
                                  size="sm"
                                  className={`h-8 px-3 rounded-full ${
                                    canJoinSession(appointment)
                                      ? "bg-green-600 hover:bg-green-700 text-white"
                                      : "text-gray-500"
                                  }`}
                                  onClick={() => handleJoinSession(appointment)}
                                  disabled={!canJoinSession(appointment)}
                                >
                                  <Phone className="h-3.5 w-3.5 mr-1.5" />
                                  {canJoinSession(appointment) ? "Join Call" : "Waiting..."}
                                </Button>
                              )}
                            </>
                          )}
                          {activeTab === "cancelled" && (
                            <Button 
                              size="sm"
                              className="h-8 px-3 bg-blue-600 hover:bg-blue-700 rounded-full"
                              onClick={() => navigate(`/booking?mentor=${appointment.mentor?.id}`)}
                            >
                              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                              Reschedule
                            </Button>
                          )}
                          {activeTab === "completed" && (
                            <>
                              <Button 
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 rounded-full"
                                onClick={() => navigate(`/feedback/${appointment.id}`)}
                              >
                                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                                Feedback
                              </Button>
                              <Button 
                                size="sm"
                                className="h-8 px-3 bg-blue-600 hover:bg-blue-700 rounded-full"
                                onClick={() => navigate(`/booking?mentor=${appointment.mentor?.id}`)}
                              >
                                <CalendarPlus className="h-3.5 w-3.5 mr-1.5" />
                                Book Again
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  // Helper to render badge based on count
  const renderCountBadge = (count: number) => {
    if (count === 0) return null;
    return <Badge className="ml-1 bg-blue-600 hover:bg-blue-600 text-white">{count}</Badge>;
  };

  const renderMoodMentorProfiles = () => {
    if (loadingMoodMentors) {
      return (
        <div className="flex justify-center p-8">
          <div className="w-8 h-8 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        </div>
      );
    }

    if (moodMentors.length === 0) {
      return (
        <div className="text-center p-8">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No mood mentors</h3>
          <p className="mt-1 text-sm text-gray-500">
            No mood mentors are available at the moment.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {moodMentors.map((mentor) => (
          <Card 
            key={mentor.id}
            className={`overflow-hidden hover:shadow-md transition-shadow ${
              !mentor.available ? 'opacity-70' : ''
            }`}
          >
            <CardContent className="p-0">
              <div className="flex items-start p-4">
                <FallbackAvatar
                  src={mentor.avatar}
                  name={mentor.name}
                  className="h-12 w-12 border"
                />
                
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-medium">{mentor.name}</h3>
                      <p className="text-sm text-gray-500">{mentor.specialty}</p>
                    </div>
                    
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium ml-1">{mentor.rating}</span>
                      <span className="text-xs text-gray-500 ml-1">({mentor.reviews})</span>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <div className="text-sm flex items-center space-x-1">
                      <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-600 truncate">{mentor.education}</span>
                    </div>
                    
                    <div className="mt-1 text-sm flex items-center space-x-1">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-gray-600 truncate">{mentor.email}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => handleViewMentorProfile(mentor.id)}
                >
                  <UserRound className="mr-2 h-4 w-4" />
                  View Profile
                </Button>
                
                <BookingButton 
                  moodMentorId={mentor.id}
                  moodMentorName={mentor.name}
                  className="w-full py-2 px-3"
                  buttonText="Book Appointment"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <AlertDialog open={!!cancelAppointmentId} onOpenChange={(open) => {
        if (!open) {
          setCancelAppointmentId(null);
          setCancellationReason('');
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this appointment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <label htmlFor="cancellation-reason" className="block text-sm font-medium text-gray-700 mb-1">
              Reason for cancellation (optional)
            </label>
            <Textarea
              id="cancellation-reason"
              placeholder="Please provide a reason for cancelling this appointment"
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep appointment</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => cancelAppointmentId && handleCancelAppointment(cancelAppointmentId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, cancel appointment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Header section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 
              className="text-2xl font-bold text-gray-900 cursor-default" 
              onClick={handleTitleClick}
            >
              My Appointments
            </h1>
            <p className="text-slate-500 mt-1">
              Manage your appointments with mental health mentors
            </p>
          </div>
          <BookingButton
            moodMentorId={moodMentors.length > 0 ? moodMentors[0].id : ""}
            moodMentorName=""
            className="bg-blue-600 hover:bg-blue-700 rounded-lg text-white"
            scrollToMentors={true}
            isTopButton={true}
            buttonText={
              <>
                <CalendarPlus className="w-4 h-4 mr-2" />
                Book Appointment
              </>
            }
          />
        </div>

        {/* Status tabs and Filter section */}
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-gray-200 pb-4">
          {/* Left side: Status tabs */}
          <div className="flex items-center space-x-4 overflow-x-auto pb-1">
            <button 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-full font-medium text-sm transition-colors",
                activeTab === "upcoming" 
                  ? "bg-blue-50 text-blue-600" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
              onClick={() => setActiveTab("upcoming")}
            >
              <CalendarClock className="h-4 w-4" />
              <span>Upcoming</span>
              {counts.upcoming > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-blue-600 h-5 min-w-5 px-1.5 text-xs font-medium text-white">
                  {counts.upcoming}
                </span>
              )}
            </button>
            <button 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-full font-medium text-sm transition-colors",
                activeTab === "completed" 
                  ? "bg-green-50 text-green-600" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
              onClick={() => setActiveTab("completed")}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Completed</span>
              {counts.completed > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-green-600 h-5 min-w-5 px-1.5 text-xs font-medium text-white">
                  {counts.completed}
                </span>
              )}
            </button>
            <button 
              className={cn(
                "flex items-center gap-2 py-2 px-3 rounded-full font-medium text-sm transition-colors",
                activeTab === "cancelled" 
                  ? "bg-orange-50 text-orange-600" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
              onClick={() => setActiveTab("cancelled")}
            >
              <X className="h-4 w-4" />
              <span>Cancelled</span>
              {counts.cancelled > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-orange-600 h-5 min-w-5 px-1.5 text-xs font-medium text-white">
                  {counts.cancelled}
                </span>
              )}
            </button>
          </div>

          {/* Right side: Date picker styled like calendar */}
          <div className="mt-4 sm:mt-0">
            <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="border rounded-lg bg-white shadow-sm"
                >
                  <CalendarIcon className="h-4 w-4 mr-2 text-blue-600" />
                  <span className="whitespace-nowrap">
                    {format(startDate, "MMM d, yyyy")} - {format(endDate, "MMM d, yyyy")}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto min-w-[240px]" align="end">
                <div className="bg-white rounded-md shadow-md overflow-hidden">
                  {dateFilters.map((filter, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                      onClick={() => handleApplyDateFilter(filter)}
                    >
                      {filter.label}
                    </button>
                  ))}
                  <hr className="border-gray-100" />
                  <button
                    className="w-full text-left px-4 py-2.5 text-sm text-blue-600 font-medium hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                    onClick={handleCustomDateRange}
                  >
                    Custom Range
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Main content - full width without mentor sidebar */}
        <div className="w-full">
          {/* Appointments section */}
          <div className="mb-10">
            {renderAppointmentList()}
          </div>
          
          {/* Mentor profiles section */}
          <div id="mood-mentors-section">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-medium">Available Mood Mentors</h2>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-blue-600"
                onClick={() => navigate('/mood-mentors')}
              >
                View All Mentors
              </Button>
            </div>
            {renderMoodMentorProfiles()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}



