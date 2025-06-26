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
  Download,
  FileOutput,
  Printer,
  FileDown,
  FileText as FilePdf,
  CheckCircle
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
import { ReviewModal } from "@/features/reviews/components/ReviewModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
} from "lucide-react";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import { autoTable } from 'jspdf-autotable';

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
  isReviewed?: boolean;
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
interface AppointmentWithMentor {
  id: string;
  patient_id: string;
  mentor_id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  status: string;
  notes?: string;
  meeting_link?: string;
  meeting_type: 'video' | 'audio' | 'chat';
  mentor?: {
    id: string;
    name: string;
    specialty: string;
    avatar?: string;
    email?: string;
    phone?: string;
  };
  created_at: string;
  updated_at: string;
  isReviewed?: boolean;
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
  const [cancelingAppointment, setCancelingAppointment] = useState<boolean>(false);

  const [loadingMoodMentors, setLoadingMoodMentors] = useState(false);

  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedAppointmentForReview, setSelectedAppointmentForReview] = useState<{
    id: string;
    mentorId: string;
    mentorName: string;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAppointments();
    fetchMoodMentors();

    // Subscribe to appointment changes
    const appointmentSubscription = supabase
      .channel('appointment_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        (payload) => {
          console.log('Appointment change received:', payload);
          // Refresh appointments when there's a change
          fetchAppointments();
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      appointmentSubscription.unsubscribe();
    };
  }, [user]);

  // Add subscription for real-time updates
  useEffect(() => {
    if (!user) return;

    const appointmentSubscription = supabase
      .channel('appointment_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `patient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Appointment update received:', payload);
          // Refresh appointments when there's a change
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      appointmentSubscription.unsubscribe();
    };
  }, [user]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser || !currentUser.id) {
        toast.error("User authentication required", {
          dismissible: true
        });
        return;
      }
      
      // Fetch appointments from the database
      const { data, error } = await supabase
        .from('patient_appointments_view')
        .select('*')
        .eq('patient_id', currentUser.id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching appointments:', error);
        toast.error("Failed to fetch appointments: " + error.message, {
          dismissible: true
        });
        return;
      }
      
      // Transform and set the appointments data
      const transformedData = transformAppointments(data);
      
      setAppointments(transformedData);
    } catch (error: any) {
      console.error('Error in fetchAppointments:', error);
      toast.error("Failed to fetch appointments: " + (error.message || "Unknown error"), {
        dismissible: true
      });
    } finally {
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
          id: mentor.user_id,
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
        // If no data from database, use mock data for development
        const mockMentors: MoodMentorProfile[] = [
          {
            id: 'mock-1',
            name: 'Dr. Sarah Johnson',
            specialty: 'Anxiety & Depression',
            avatar: 'https://randomuser.me/api/portraits/women/32.jpg',
            rating: 4.9,
            reviews: 124,
            available: true,
            nextAvailable: 'Today',
            bio: 'Specialized in cognitive behavioral therapy with 10+ years of experience helping patients overcome anxiety and depression.'
          },
          {
            id: 'mock-2',
            name: 'Dr. Michael Chen',
            specialty: 'Stress Management',
            avatar: 'https://randomuser.me/api/portraits/men/45.jpg',
            rating: 4.7,
            reviews: 98,
            available: true,
            nextAvailable: 'Tomorrow',
            bio: 'Expert in mindfulness techniques and stress reduction strategies for professionals and students.'
          },
          {
            id: 'mock-3',
            name: 'Emma Rodriguez',
            specialty: 'Trauma Recovery',
            avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
            rating: 4.8,
            reviews: 87,
            available: true,
            nextAvailable: 'Thursday',
            bio: 'Specialized in trauma-informed care and EMDR therapy to help patients process difficult experiences.'
          }
        ];
        
        console.log("Using mock mood mentors data");
        setMoodMentors(mockMentors);
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
    // Navigate to booking page with the mentor ID in location state
    // This matches how the public mood mentors page handles booking
    navigate('/booking', {
      state: {
        mentorId: mentorId
      }
    });
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
    const toastId = toast.loading("Cancelling appointment...", {
      dismissible: true
    });
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancellation_reason: 'Cancelled by patient',
          cancelled_by: 'patient'
        })
        .eq('id', appointmentId);

      if (error) throw error;
      
      toast.dismiss(toastId);
      toast.success("Appointment cancelled successfully", {
        dismissible: true
      });
      fetchAppointments();
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      toast.dismiss(toastId);
      toast.error("Failed to cancel appointment: " + (error.message || "Unknown error"), {
        dismissible: true
      });
    }
  };

  const handleStartChat = async (appointmentId: string) => {
    const toastId = toast.loading("Starting chat session...", {
      dismissible: true
    });
    
    try {
      // Find the appointment
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) {
        toast.dismiss(toastId);
        toast.error("Appointment not found", {
          dismissible: true
        });
        return;
      }

      // Create or get chat session
      const { data: chatSession, error: chatError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('appointment_id', appointmentId)
        .single();

      if (chatError && chatError.code !== 'PGRST116') {
        throw chatError;
      }

      let chatSessionId = chatSession?.id;

      if (!chatSessionId) {
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert([
            {
              appointment_id: appointmentId,
              patient_id: appointment.patient_id,
              mentor_id: appointment.mentor?.id
            }
          ])
          .select()
          .single();

        if (createError) throw createError;
        chatSessionId = newSession.id;
      }

      toast.dismiss(toastId);
      toast.success("Chat session ready", {
        dismissible: true
      });
      
      // Navigate to chat
      navigate(`/dashboard/chat/${chatSessionId}`);
    } catch (error: any) {
      console.error('Error starting chat:', error);
      toast.dismiss(toastId);
      toast.error("Failed to start chat: " + (error.message || "Unknown error"), {
        dismissible: true
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <Clock className="mr-1 h-3 w-3" /> Waiting
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <Video className="mr-1 h-3 w-3" /> Ready to Join
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <CheckCircle className="mr-1 h-3 w-3" /> Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <X className="mr-1 h-3 w-3" /> Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="mr-1 h-3 w-3" /> {status}
          </Badge>
        );
    }
  };

  // Function to check if a patient can join a session
  const canJoinSession = (appointment: any) => {
    // Patient can join only if the appointment is scheduled (mentor has started it)
    return appointment.status.toLowerCase() === 'scheduled';
  };

  // Function to handle joining a video session
  const handleJoinSession = async (appointment: AppointmentWithMentor) => {
    const toastId = toast.loading("Joining session...", {
      dismissible: true
    });
    
    try {
      if (!appointment.meeting_link) {
        toast.dismiss(toastId);
        toast.error("Waiting for mentor to start the session", {
          dismissible: true
        });
      return;
    }

      // Navigate to the call page
      navigate(`/patient-dashboard/appointments/${appointment.id}/call`);
      
      toast.dismiss(toastId);
    } catch (error: any) {
      console.error('Error joining session:', error);
      toast.dismiss(toastId);
      toast.error("Failed to join session: " + (error.message || "Unknown error"), {
        dismissible: true
      });
    }
  };
  
  // Update the exportAppointmentsToPDF function
  const exportAppointmentsToPDF = async () => {
    const toastId = toast.loading("Generating PDF report...", {
      dismissible: true
    });
    
    try {
      // Filter appointments based on the active tab
      const filteredAppointments = appointments.filter(appointment => {
        if (activeTab === "upcoming") {
          return appointment.status === "pending" || appointment.status === "scheduled" || appointment.status === "confirmed";
        } else if (activeTab === "completed") {
          return appointment.status === "completed";
        } else if (activeTab === "cancelled") {
          return appointment.status === "cancelled";
        }
        return true;
      });
      
      if (filteredAppointments.length === 0) {
        toast.dismiss(toastId);
        toast.error("No appointments to export", {
          dismissible: true
        });
      return;
    }
      
      // Create PDF document
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Appointments Report', 14, 22);
      
      // Add export date
      doc.setFontSize(10);
      doc.text(`Generated on: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 28);
      doc.text(`Total Appointments: ${filteredAppointments.length}`, 14, 34);
      
      // Create table data
      const tableColumn = ["Mentor", "Date", "Time", "Type", "Status"];
      const tableRows = filteredAppointments.map(appointment => [
        appointment.mentor?.name || "Unknown Mentor",
        appointment.date || "",
        appointment.time || "",
        appointment.type || "",
        appointment.status || ""
      ]);
      
      // Generate table
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [39, 99, 175],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [240, 247, 255],
        }
      });
      
      // Add summary at bottom
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(10);
      doc.text("Emotions App - Patient Appointments Report", 14, pageHeight - 20);
      
      // Save the PDF
      const filename = `appointments_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(filename);
      
      toast.dismiss(toastId);
      toast.success("Appointments exported successfully as PDF!", {
        dismissible: true
      });
    } catch (error) {
      console.error("Error exporting appointments:", error);
      toast.dismiss(toastId);
      toast.error("Failed to export appointments. Please try again.", {
        dismissible: true
      });
    }
  };

  // Update the exportAppointmentsToCSV function
  const exportAppointmentsToCSV = async () => {
    const toastId = toast.loading("Generating CSV export...", {
      dismissible: true
    });
    
    try {
      // Filter appointments based on the active tab
      const filteredAppointments = appointments.filter(appointment => {
        if (activeTab === "upcoming") {
          return appointment.status === "pending" || appointment.status === "scheduled" || appointment.status === "confirmed";
        } else if (activeTab === "completed") {
          return appointment.status === "completed";
        } else if (activeTab === "cancelled") {
          return appointment.status === "cancelled";
        }
        return true;
      });

      if (filteredAppointments.length === 0) {
        toast.dismiss(toastId);
        toast.error("No appointments to export", {
          dismissible: true
        });
        return;
      }

      // Create CSV content
      const headers = ["Mentor", "Date", "Time", "Type", "Status"];
      const rows = filteredAppointments.map(appointment => [
        appointment.mentor?.name || "Unknown Mentor",
        appointment.date || "",
        appointment.time || "",
        appointment.type || "",
        appointment.status || ""
      ]);

      // Convert to CSV string
      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `appointments_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss(toastId);
      toast.success("Appointments exported successfully as CSV!", {
        dismissible: true
      });
    } catch (error) {
      console.error("Error exporting appointments to CSV:", error);
      toast.dismiss(toastId);
      toast.error("Failed to export appointments to CSV. Please try again.", {
        dismissible: true
      });
    }
  };

  const openReviewModal = async (appointment: AppointmentWithMentor) => {
    if (!appointment.mentor) {
      toast.error('Mentor information is missing');
      return;
    }

    try {
      // Check if the patient can review this appointment
      const { data: canReview, error: checkError } = await supabase
        .rpc('can_patient_review_appointment', { 
          appointment_id: appointment.id,
          patient_uuid: user?.id
        });
      
      if (checkError) {
        console.error("Error checking if can review:", checkError);
        throw new Error("Couldn't verify if you can review this appointment");
      }
      
      if (!canReview) {
        toast.error('You cannot review this appointment. It may already be reviewed or not completed.');
        return;
      }
      
      setSelectedAppointmentForReview({
        id: appointment.id,
        mentorId: appointment.mentor.id,
        mentorName: appointment.mentor.name,
      });
      setIsReviewModalOpen(true);
    } catch (error: any) {
      console.error("Error in openReviewModal:", error);
      toast.error(error.message || "Failed to open review form");
    }
  };

  // Update the exportSingleAppointmentToPDF function
  const exportSingleAppointmentToPDF = (appointment: AppointmentWithMentor) => {
    const toastId = toast.loading("Generating appointment summary...", {
      dismissible: true
    });
    
    try {
      // Create new PDF document
      const doc = new jsPDF();
      
      // Set title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 139); // Dark blue
      doc.text('EMOTIONS APP - APPOINTMENT SUMMARY', 20, 20, { align: 'left' });
      
      // Add horizontal line
      doc.setDrawColor(0, 0, 139);
      doc.setLineWidth(0.5);
      doc.line(20, 25, 190, 25);
      
      // Section header
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('APPOINTMENT DETAILS', 20, 35);
      
      // Details content
      doc.setFontSize(11);
      
      // Define the details with proper positioning
      const startY = 45;
      const lineHeight = 7;
      
      doc.setFont('helvetica', 'bold');
      doc.text('Mentor:', 20, startY);
      doc.setFont('helvetica', 'normal');
      doc.text(appointment.mentor?.name || 'Mood Mentor', 70, startY);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Specialty:', 20, startY + lineHeight);
      doc.setFont('helvetica', 'normal');
      doc.text(appointment.mentor?.specialty || 'Mental Health Support', 70, startY + lineHeight);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Date:', 20, startY + lineHeight * 2);
      doc.setFont('helvetica', 'normal');
      doc.text(appointment.date || '', 70, startY + lineHeight * 2);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Time:', 20, startY + lineHeight * 3);
      doc.setFont('helvetica', 'normal');
      doc.text(appointment.time || '', 70, startY + lineHeight * 3);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Type:', 20, startY + lineHeight * 4);
      doc.setFont('helvetica', 'normal');
      doc.text(appointment.type || '', 70, startY + lineHeight * 4);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Status:', 20, startY + lineHeight * 5);
      doc.setFont('helvetica', 'normal');
      doc.text(appointment.status || '', 70, startY + lineHeight * 5);
      
      let currentY = startY + lineHeight * 6 + 10;
      
      // Add notes if available
      if (appointment.notes) {
        doc.setFont('helvetica', 'bold');
        doc.text('SESSION NOTES', 20, currentY);
        currentY += 5;
        
        // Add line under notes header
        doc.setDrawColor(0, 0, 139);
        doc.setLineWidth(0.3);
        doc.line(20, currentY, 100, currentY);
        currentY += 10;
        
        doc.setFont('helvetica', 'normal');
        // Split text to ensure it fits on the page
        const splitText = doc.splitTextToSize(appointment.notes, 170);
        doc.text(splitText, 20, currentY);
      }
      
      // Add footer
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 10);
      
      // Save the PDF
      doc.save(`Appointment_Summary_${appointment.id}.pdf`);
      
      toast.dismiss(toastId);
      toast.success("Appointment summary exported as PDF successfully!", {
        dismissible: true
      });
    } catch (error) {
      console.error("Failed to export appointment:", error);
      toast.dismiss(toastId);
      toast.error("Failed to export appointment summary", {
        dismissible: true
      });
    }
  };

  const transformAppointments = (data: any[]): AppointmentWithMentor[] => {
    return data.map(appointment => ({
      id: appointment.id,
      patient_id: appointment.patient_id,
      mentor_id: appointment.mentor_id,
      title: appointment.title || 'Appointment',
      date: appointment.date,
      time: `${appointment.start_time} - ${appointment.end_time}`,
      type: appointment.meeting_type,
      status: appointment.status,
      notes: appointment.notes,
      meeting_link: appointment.meeting_link,
      meeting_type: appointment.meeting_type,
      mentor: appointment.mentor ? {
        id: appointment.mentor.id,
        name: appointment.mentor.name,
        specialty: appointment.mentor.specialty,
        avatar: appointment.mentor.avatar,
        email: appointment.mentor.email,
        phone: appointment.mentor.phone
      } : undefined,
      created_at: appointment.created_at,
      updated_at: appointment.updated_at,
      isReviewed: appointment.rating !== null
    }));
  };

      return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
          <p className="text-gray-500 mt-1">Manage your appointments and sessions</p>
          </div>
        
        <div className="bg-white rounded-lg border shadow-sm p-6">
          {/* Search and filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Search by mentor name, specialty..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
        </div>
            <div className="flex gap-4">
              <Select 
                value={activeTab} 
                onValueChange={(value) => setActiveTab(value)}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              
              <Select>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
              </Select>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Download className="h-4 w-4" />
                    Export
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportAppointmentsToCSV}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportAppointmentsToPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Mentor</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Date & Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="flex justify-center items-center">
                        <Spinner className="mr-2 text-blue-600" />
                        <span>Loading appointments...</span>
                      </div>
                      </td>
                  </tr>
                ) : appointments.filter(appt => {
                    // Filter by status tab
                    const matchesTab = 
                      activeTab === "upcoming" ? (appt.status === "pending" || appt.status === "scheduled" || appt.status === "confirmed") :
                      activeTab === "completed" ? appt.status === "completed" :
                      activeTab === "cancelled" ? appt.status === "cancelled" :
                      true;
                    
                    // Filter by search term
                    const matchesSearch = searchTerm === "" || 
                      (appt.mentor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       appt.mentor?.specialty?.toLowerCase().includes(searchTerm.toLowerCase()));
                    
                    return matchesTab && matchesSearch;
                  }).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
                        {activeTab === "upcoming" && <Calendar className="h-6 w-6 text-blue-600" />}
                        {activeTab === "completed" && <CheckCircle2 className="h-6 w-6 text-blue-600" />}
                        {activeTab === "cancelled" && <X className="h-6 w-6 text-blue-600" />}
                          </div>
                      <h3 className="text-lg font-medium mb-2">No {activeTab} appointments</h3>
                      <p className="text-gray-500 max-w-md mx-auto mb-6">
              {activeTab === "upcoming" 
                          ? "You don't have any upcoming appointments scheduled. Book an appointment with one of our mentors."
                : activeTab === "cancelled" 
                          ? "You don't have any cancelled appointments."
                          : "You don't have any completed appointments yet."}
            </p>
                      {activeTab === "upcoming" && (
            <Button 
              onClick={() => {
                // Scroll to the mood mentors section on the same page
                const mentorsSection = document.getElementById('mood-mentors-section');
                if (mentorsSection) {
                  mentorsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
            >
                          <CalendarPlus className="mr-2 h-4 w-4" />
              Book Appointment
            </Button>
                      )}
                      </td>
                  </tr>
                ) : (
                  appointments
                    .filter(appt => {
                      // Filter by status tab
                      const matchesTab = 
                        activeTab === "upcoming" ? (appt.status === "pending" || appt.status === "scheduled" || appt.status === "confirmed") :
                        activeTab === "completed" ? appt.status === "completed" :
                        activeTab === "cancelled" ? appt.status === "cancelled" :
                        true;
                      
                      // Filter by search term
                      const matchesSearch = searchTerm === "" || 
                        (appt.mentor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         appt.mentor?.specialty?.toLowerCase().includes(searchTerm.toLowerCase()));
                      
                      return matchesTab && matchesSearch;
                    })
                    .map((appointment) => (
                      <tr key={appointment.id} className="border-b hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarImage src={appointment.mentor?.avatar} alt={appointment.mentor?.name || "Mentor"} />
                              <AvatarFallback className="bg-blue-100 text-blue-600">
                                {appointment.mentor?.name?.charAt(0) || "M"}
                              </AvatarFallback>
                            </Avatar>
                          <div>
                              <div className="font-medium text-gray-900">{appointment.mentor?.name || "Mood Mentor"}</div>
                              <div className="text-sm text-gray-500">{appointment.mentor?.specialty || "Mental Health Support"}</div>
                          </div>
                        </div>
                      </td>
                        <td className="py-4 px-4">
                          <div className="text-gray-900">{appointment.date}</div>
                          <div className="text-sm text-gray-500">{appointment.time}</div>
                      </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            {appointment.type === "video" && <Video className="mr-2 h-4 w-4 text-blue-600" />}
                            {appointment.type === "audio" && <Phone className="mr-2 h-4 w-4 text-blue-600" />}
                            {appointment.type === "chat" && <MessageSquare className="mr-2 h-4 w-4 text-blue-600" />}
                            <span>{appointment.type.charAt(0).toUpperCase() + appointment.type.slice(1)}</span>
                        </div>
                      </td>
                        <td className="py-4 px-4">
                          {getStatusBadge(appointment.status)}
                      </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            {/* Actions based on appointment status */}
                            {appointment.status === "completed" && !appointment.isReviewed && (
                              <Button 
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointmentForReview({
                                    id: appointment.id,
                                    mentorId: appointment.mentor?.id || "",
                                    mentorName: appointment.mentor?.name || "Mood Mentor"
                                  });
                                  setIsReviewModalOpen(true);
                                }}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                <Star className="mr-1.5 h-3.5 w-3.5" />
                                Review
                              </Button>
                            )}
                              
                            {appointment.status === "completed" && (
                                <Button 
                                  variant="outline"
                                  size="sm"
                                onClick={() => exportSingleAppointmentToPDF(appointment)}
                                className="text-gray-600 border-gray-200 hover:bg-gray-50"
                                >
                                                                  <FileDown className="mr-1.5 h-3.5 w-3.5" />
                                  Export PDF
                                </Button>
                              )}
                              
                            {appointment.status === "completed" && (
                                <Button
                                  size="sm"
                                onClick={() => navigate('/booking', {
                                  state: {
                                    mentorId: appointment.mentor_id,
                                    mentorName: appointment.mentor?.name,
                                    specialty: appointment.mentor?.specialty,
                                    preselectedMentor: true
                                  }
                                })}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                                Book Again
                                </Button>
                              )}
                              
                            {(appointment.status === "pending" || appointment.status === "scheduled") && (
                              <>
                                <Button
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setCancelAppointmentId(appointment.id)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <X className="mr-1.5 h-3.5 w-3.5" />
                                  Cancel
                                </Button>
                                
                                {canJoinSession(appointment) ? (
                            <Button 
                              size="sm"
                                  onClick={() => handleJoinSession(appointment)}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {appointment.type === "video" && <Video className="mr-1.5 h-3.5 w-3.5" />}
                                    {appointment.type === "audio" && <Phone className="mr-1.5 h-3.5 w-3.5" />}
                                    {appointment.type === "chat" && <MessageSquare className="mr-1.5 h-3.5 w-3.5" />}
                                    Join
                                </Button>
                                ) : (
                            <Button 
                              size="sm"
                                    disabled
                                    className="bg-gray-200 text-gray-600 cursor-not-allowed"
                              >
                                    <Clock className="mr-1.5 h-3.5 w-3.5" />
                                    Waiting
                              </Button>
                                )}
                              </>
                          )}
                        </div>
                      </td>
                    </tr>
                    ))
                )}
                </tbody>
              </table>
          </div>
        </div>
        
        {/* Mood Mentors Section */}
        <div className="mt-10" id="mood-mentors-section">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Available Mentors</h2>
              <p className="text-gray-500">Book your next session with a specialist</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => navigate('/mood-mentors')}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              View All Mentors
            </Button>
          </div>
          
          {loadingMoodMentors ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border border-gray-100 shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[180px]" />
                        <Skeleton className="h-4 w-[120px]" />
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Skeleton className="h-9 w-full rounded-md" />
                      <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </CardContent>
        </Card>
              ))}
            </div>
          ) : moodMentors.length === 0 ? (
            <Card className="border border-gray-100 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-blue-100 rounded-full p-4 mb-4">
                  <GraduationCap className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Mentors Available</h3>
                <p className="text-gray-500 max-w-md mb-6">
                  There are currently no mood mentors available for booking. Please check back later.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {moodMentors.map((mentor) => (
                <Card key={mentor.id} className="border border-gray-100 shadow-sm hover:shadow transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <Avatar className="h-12 w-12 border border-gray-100">
                        <AvatarImage src={mentor.avatar} alt={mentor.name} />
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {mentor.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium text-gray-900">{mentor.name}</h3>
                        <p className="text-sm text-gray-500">{mentor.specialty}</p>
                      </div>
                    </div>
                    
                    {mentor.rating && (
                      <div className="flex items-center mb-3">
                        <div className="flex mr-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                i < Math.floor(mentor.rating || 0)
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">
                          {mentor.rating.toFixed(1)}
                          {mentor.reviews && mentor.reviews > 0 && ` (${mentor.reviews})`}
                        </span>
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                      {mentor.bio || `${mentor.name} is a mental health specialist with expertise in ${mentor.specialty}.`}
                    </p>
                    
                    <div className="flex gap-2">
                      <BookingButton 
                        moodMentorId={mentor.id}
                        moodMentorName={mentor.name}
                        nameSlug={mentor.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        buttonText="Book Session"
                      />
                <Button 
                        variant="outline" 
                        className="border-blue-200 text-blue-600 hover:bg-blue-50"
                        onClick={() => handleViewMentorProfile(mentor.id)}
                >
                        Profile
                </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
              </div>
        
        {/* Cancel Appointment Dialog */}
        <Dialog open={!!cancelAppointmentId} onOpenChange={() => setCancelAppointmentId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel Appointment</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this appointment? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-start">
                <Button 
                  variant="outline" 
                onClick={() => setCancelAppointmentId(null)}
                >
                No, Keep Appointment
                </Button>
              <Button 
                variant="destructive" 
                onClick={() => handleCancelAppointment(cancelAppointmentId!)}
                disabled={cancelingAppointment}
              >
                {cancelingAppointment ? "Cancelling..." : "Yes, Cancel Appointment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Review Modal */}
        {selectedAppointmentForReview && (
          <ReviewModal
            isOpen={isReviewModalOpen}
            onClose={() => {
              setIsReviewModalOpen(false);
            }}
            appointmentId={selectedAppointmentForReview.id}
            mentorId={selectedAppointmentForReview.mentorId}
            mentorName={selectedAppointmentForReview.mentorName}
            onSubmitReview={() => {
              // Let the modal handle the submission internally
              setIsReviewModalOpen(false);
              setSelectedAppointmentForReview(null);
              // Refresh the appointments list after submission
              fetchAppointments();
              toast.success("Thank you for your review!");
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
}