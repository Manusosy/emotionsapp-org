import { authService, userService, dataService, apiService, patientService, moodMentorService, appointmentService } from '@/services'
import React, { useState, useEffect, useContext } from "react";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Video,
  MessageSquare,
  Check,
  X,
  Filter,
  Search,
  MoreVertical,
  FileText,
  Edit,
  Phone,
} from "lucide-react";
// Supabase import removed
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { format, addDays, startOfMonth, endOfMonth, isAfter, isBefore, isToday, startOfDay } from "date-fns";
import { AuthContext } from "@/contexts/authContext";
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { ChatButton } from "@/components/messaging/ChatButton";
import { useAuth } from "@/contexts/authContext";
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Appointment } from '@/types';
import { AppointmentDetailDialog } from '../components/AppointmentDetailDialog';
import { Spinner } from '@/components/ui/spinner';
import { Separator } from '@/components/ui/separator';
import { User } from 'lucide-react';

interface AppointmentDisplay {
  id: string;
  patient_id: string;
  date: string;
  time: string;
  type: string;
  status: string;
  patient: {
    name: string;
    avatar: string;
    email?: string;
    phone?: string;
  };
  notes?: string;
}

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Parse URL parameters for date filtering
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const dateParam = queryParams.get('date');
    
    if (dateParam) {
      // Set custom date filter
      setDateFilter('custom');
    }
  }, [location.search]);
  
  useEffect(() => {
    fetchAppointments();
  }, [user, statusFilter, dateFilter, location.search]);

  const fetchAppointments = async () => {
    try {
      setIsLoading(true);
      
      // Get the current user from auth context
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Check if user exists
      if (!currentUser || !currentUser.id) {
        console.error('User not authenticated or missing ID');
        toast.error("User authentication required");
        setIsLoading(false);
        return;
      }
      
      // Get current date in YYYY-MM-DD format
      const today = new Date();
      const todayFormatted = format(today, 'yyyy-MM-dd');
      
      // Fetch appointments from the database
      const { data, error } = await supabase
        .from('mentor_appointments_view')
        .select('*')
        .eq('mentor_id', currentUser.id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching appointments:', error);
        toast.error("Failed to fetch appointments: " + error.message);
        setIsLoading(false);
        return;
      }
      
      // If no data but no error, it means there are no appointments yet
      if (!data || data.length === 0) {
        console.log("No appointments found for this mentor");
        setAppointments([]);
        setIsLoading(false);
        return;
      }
      
      const normalizeStatus = (status: string) => {
        // Map "scheduled" and "pending" to "upcoming" for consistency
        if (status === "scheduled" || status === "pending") {
          return "upcoming";
        }
        return status;
      };
      
      const transformedData = data.map(appointment => ({
        id: appointment.id,
        patient_id: appointment.patient_id,
        date: appointment.date,
        time: `${appointment.start_time} - ${appointment.end_time}`,
        type: appointment.meeting_type,
        status: normalizeStatus(appointment.status || "upcoming"),
        notes: appointment.notes,
        patient: {
          name: appointment.patient_name || "Unknown Patient",
          avatar: appointment.patient_avatar_url || "",
          email: appointment.patient_email || "",
          phone: appointment.patient_phone || ""
        }
      }));
      
      console.log("Transformed appointment data:", transformedData);
      setAppointments(transformedData);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      toast.error("Failed to fetch appointments: " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId);

      if (error) throw error;
      toast.success(`Appointment ${newStatus} successfully`);
      fetchAppointments();
    } catch (error: any) {
      toast.error(error.message || "Failed to update appointment status");
    }
  };

  const handleJoinSession = async (appointment: Appointment) => {
    try {
      console.log('Joining session for appointment:', appointment.id);
      
      if (!appointment.id) {
        console.error('Cannot join session: Appointment ID is missing');
        toast.error('Cannot join session', {
          description: 'Appointment information is incomplete'
        });
        return;
      }

      // Navigate directly to the call page
      navigate(`/mood-mentor-dashboard/appointment/${appointment.id}/call`);
      
    } catch (error: any) {
      console.error('Error joining session:', error);
      toast.error('Failed to join session', {
        description: error.message || 'An unexpected error occurred'
      });
    }
  };

  // New function to view appointment details
  const handleViewAppointmentDetails = (appointment: Appointment) => {
    // Set the selected appointment and open the dialog
    setSelectedAppointment(appointment);
    setIsDialogOpen(true);
  };

  const handleExportAppointment = (appointment: AppointmentDisplay) => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.text('Appointment Details', 14, 22);
      
      // Add appointment info
      doc.setFontSize(12);
      
      // Create table with appointment details
      const tableColumn = ["Field", "Details"];
      const tableRows = [
        ["Patient", appointment.patient.name],
        ["Date", appointment.date],
        ["Time", appointment.time],
        ["Type", appointment.type],
        ["Status", appointment.status],
        ["Email", appointment.patient.email || "N/A"],
        ["Phone", appointment.patient.phone || "N/A"],
        ["Notes", appointment.notes || "No notes available"]
      ];
      
      // @ts-ignore - jsPDF-AutoTable typings issue
      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 3,
          overflow: 'linebreak',
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 'auto' }
        }
      });
      
      // Save the PDF
      doc.save(`appointment-${appointment.id}-${appointment.date}.pdf`);
      
      toast.success('Appointment details exported successfully');
    } catch (error: any) {
      console.error('Error exporting appointment:', error);
      toast.error('Failed to export appointment details');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      upcoming: {
        variant: "outline",
        label: "Upcoming",
        icon: <Calendar className="w-3 h-3 mr-1" />,
      },
      scheduled: {
        variant: "secondary",
        label: "In Progress",
        icon: <Clock className="w-3 h-3 mr-1" />,
      },
      completed: {
        variant: "success",
        label: "Completed",
        icon: <Check className="w-3 h-3 mr-1" />,
      },
      cancelled: {
        variant: "destructive",
        label: "Cancelled",
        icon: <X className="w-3 h-3 mr-1" />,
      },
    };

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || statusConfig.upcoming;
    
    return (
      <Badge variant={config.variant as any} className="flex items-center">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getAppointmentTypeBadge = (type: string) => {
    const typeConfig = {
      video: {
        variant: "secondary",
        label: "Video",
        icon: <Video className="w-3 h-3 mr-1" />,
      },
      chat: {
        variant: "secondary",
        label: "Chat",
        icon: <MessageSquare className="w-3 h-3 mr-1" />,
      },
      audio: {
        variant: "secondary",
        label: "Audio",
        icon: <Phone className="w-3 h-3 mr-1" />,
      },
    };

    const config = typeConfig[type.toLowerCase() as keyof typeof typeConfig] || {
      variant: "secondary",
      label: type,
      icon: <Calendar className="w-3 h-3 mr-1" />,
    };
    
    return (
      <Badge variant={config.variant as any} className="flex items-center">
        {config.icon}
        {config.label || type}
      </Badge>
    );
  };

  const filteredAppointments = appointments.filter(appointment => {
    // First, apply search filter
    if (searchQuery !== "") {
      const searchLower = searchQuery.toLowerCase();
      if (!(
        appointment.patient.name.toLowerCase().includes(searchLower) ||
        appointment.patient.email?.toLowerCase().includes(searchLower) ||
        appointment.patient.phone?.toLowerCase().includes(searchLower) ||
        appointment.id.toLowerCase().includes(searchLower)
      )) {
        return false;
      }
    }
    
    // Then, apply status filter
    if (statusFilter !== "all" && appointment.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    
    // Finally, apply date filter
    const appointmentDate = new Date(appointment.date);
    const today = new Date();
    
    if (dateFilter === "today") {
      return isToday(appointmentDate);
    } else if (dateFilter === "week") {
      const weekEnd = addDays(today, 7);
      return isAfter(appointmentDate, today) && isBefore(appointmentDate, weekEnd);
    } else if (dateFilter === "month") {
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      return isAfter(appointmentDate, monthStart) && isBefore(appointmentDate, monthEnd);
    } else if (dateFilter === "custom") {
      // For calendar selection or URL param date
      const dateParam = new URLSearchParams(location.search).get('date');
      const targetDate = dateParam ? new Date(dateParam) : selectedDate;
      return format(appointmentDate, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd');
    }
    
    // If no date filter or "all", include the appointment
    return true;
  });

  // Update the isAppointmentActive function to always allow mentors to start sessions
  const isAppointmentActive = () => {
    // Mentors can start sessions at any time
    return true;
  };

  // Sort appointments by date
  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    // Sort by date (newest first)
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
            <p className="text-muted-foreground">Manage your appointments and sessions</p>
          </div>
        </div>

        <Card>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by patient name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="scheduled">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      {new URLSearchParams(location.search).get('date') && (
                        <SelectItem value="custom">
                          {new Date(new URLSearchParams(location.search).get('date')!).toLocaleDateString()}
                        </SelectItem>
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        Loading appointments...
                      </TableCell>
                    </TableRow>
                  ) : sortedAppointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No appointments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedAppointments.map((appointment) => (
                      <TableRow 
                        key={appointment.id}
                        className="cursor-pointer"
                        onClick={() => handleViewAppointmentDetails(appointment)}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              {appointment.patient.avatar ? (
                                <img
                                  src={appointment.patient.avatar}
                                  alt={appointment.patient.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-lg font-bold text-gray-600">
                                  {appointment.patient.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{appointment.patient.name}</div>
                              {appointment.patient.email && (
                                <div className="text-sm text-gray-500">{appointment.patient.email}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1 text-gray-500" />
                              <span>{appointment.date}</span>
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Clock className="w-4 h-4 mr-1" />
                              <span>{appointment.time}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getAppointmentTypeBadge(appointment.type)}</TableCell>
                        <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* Upcoming/Scheduled/Pending Appointments */}
                            {(appointment.status.toLowerCase() === "upcoming" || 
                              appointment.status.toLowerCase() === "scheduled" || 
                              appointment.status.toLowerCase() === "pending") && (
                              <>
                                {isAppointmentActive() ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleJoinSession(appointment)}
                                    className={
                                      appointment.status.toLowerCase() === "scheduled"
                                        ? "bg-red-600 hover:bg-red-700 text-white" 
                                        : "bg-green-600 hover:bg-green-700 text-white"
                                    }
                                  >
                                    {appointment.status.toLowerCase() === "scheduled" ? (
                                      <><X className="w-3 h-3 mr-1" /> End Session</>
                                    ) : (
                                      <>
                                        {appointment.type.toLowerCase() === 'video' && (
                                          <><Video className="w-3 h-3 mr-1" /> Start Session</>
                                        )}
                                        {appointment.type.toLowerCase() === 'chat' && (
                                          <><MessageSquare className="w-3 h-3 mr-1" /> Start Session</>
                                        )}
                                        {appointment.type.toLowerCase() === 'audio' && (
                                          <><Phone className="w-3 h-3 mr-1" /> Start Session</>
                                        )}
                                        {!['video', 'chat', 'audio'].includes(appointment.type.toLowerCase()) && (
                                          <><Clock className="w-3 h-3 mr-1" /> Start Session</>
                                        )}
                                      </>
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleViewAppointmentDetails(appointment)}
                                    variant="outline"
                                    className="border-blue-200 text-blue-600 hover:bg-blue-50"
                                  >
                                    <FileText className="w-3 h-3 mr-1" /> View Details
                                  </Button>
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewAppointmentDetails(appointment)}>
                                      <FileText className="w-4 h-4 mr-2" /> View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleJoinSession(appointment)}>
                                      {appointment.status.toLowerCase() === "scheduled" ? (
                                        <><X className="w-4 h-4 mr-2" /> End Session</>
                                      ) : (
                                        <>
                                          {appointment.type.toLowerCase() === 'video' && (
                                            <><Video className="w-4 h-4 mr-2" /> Start Session</>
                                          )}
                                          {appointment.type.toLowerCase() === 'chat' && (
                                            <><MessageSquare className="w-4 h-4 mr-2" /> Start Session</>
                                          )}
                                          {appointment.type.toLowerCase() === 'audio' && (
                                            <><Phone className="w-4 h-4 mr-2" /> Start Session</>
                                          )}
                                          {!['video', 'chat', 'audio'].includes(appointment.type.toLowerCase()) && (
                                            <><FileText className="w-4 h-4 mr-2" /> Start Session</>
                                          )}
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "completed")}>
                                      <Check className="w-4 h-4 mr-2" /> Mark as Completed
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, "cancelled")}>
                                      <X className="w-4 h-4 mr-2" /> Cancel Appointment
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportAppointment(appointment)}>
                                      <FileText className="w-4 h-4 mr-2" /> Export Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                            
                            {/* Completed Appointments */}
                            {appointment.status.toLowerCase() === "completed" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewAppointmentDetails(appointment)}
                                >
                                  <FileText className="w-3 h-3 mr-1" /> View Details
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => navigate(`/mood-mentor-dashboard/notes/${appointment.id}`)}>
                                      <Edit className="w-4 h-4 mr-2" /> Edit Notes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleExportAppointment(appointment)}>
                                      <FileText className="w-4 h-4 mr-2" /> Export Details
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </>
                            )}
                            
                            {/* Cancelled Appointments */}
                            {appointment.status.toLowerCase() === "cancelled" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewAppointmentDetails(appointment)}
                                >
                                  <FileText className="w-3 h-3 mr-1" /> View Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleExportAppointment(appointment)}
                                >
                                  <FileText className="w-3 h-3 mr-1" /> Export
                                </Button>
                              </>
                            )}
                            
                            {/* Chat Button for all chat appointments */}
                            {appointment.type.toLowerCase() === 'chat' && (
                              <ChatButton
                                userId={user?.id || ''}
                                targetUserId={appointment.patient_id}
                                userRole="mood_mentor"
                                variant="outline"
                                size="sm"
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>

        {selectedAppointment && (
          <AppointmentDetailDialog
            appointment={selectedAppointment}
            open={isDialogOpen}
            onOpenChange={setIsDialogOpen}
            onJoinSession={() => handleJoinSession(selectedAppointment)}
            isMentor={true}
          />
        )}
      </div>
    </DashboardLayout>
  );
} 

// Appointment List Component
interface AppointmentListProps {
  appointments: Appointment[];
  loading: boolean;
  onAppointmentClick: (appointment: Appointment) => void;
  onJoinSession: (appointment: Appointment) => void;
}

const AppointmentList: React.FC<AppointmentListProps> = ({ 
  appointments, 
  loading, 
  onAppointmentClick,
  onJoinSession
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center h-64">
          <Spinner className="h-8 w-8" />
        </CardContent>
      </Card>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col justify-center items-center h-64 text-center">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No appointments found</h3>
          <p className="text-muted-foreground mt-1">
            There are no appointments scheduled for the selected period.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => {
        const appointmentDate = new Date(appointment.date);
        const isPast = isBefore(appointmentDate, new Date());
        
        return (
          <Card 
            key={appointment.id} 
            className={cn(
              "hover:shadow-md transition-shadow cursor-pointer",
              isPast ? "border-red-400 bg-red-50" : "border-blue-400 bg-blue-50"
            )}
          >
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                <div 
                  className={cn(
                    "p-4 flex flex-col justify-center items-center md:w-1/4 text-center border-b md:border-b-0 md:border-r",
                    isPast ? "bg-red-100" : "bg-blue-100"
                  )}
                >
                  <p className="text-sm font-medium text-muted-foreground">
                    {format(appointmentDate, 'EEEE')}
                  </p>
                  <p className="text-2xl font-bold">
                    {format(appointmentDate, 'd')}
                  </p>
                  <p className="text-sm font-medium">
                    {format(appointmentDate, 'MMMM yyyy')}
                  </p>
                  <p className="text-sm mt-2 font-semibold">
                    {format(appointmentDate, 'h:mm a')}
                  </p>
                </div>
                
                <div className="p-4 flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">
                          {appointment.patient?.name || 'Patient'}
                        </h3>
                        <Badge variant={isPast ? "outline" : "secondary"}>
                          {isPast ? "Completed" : "Upcoming"}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          <span>{appointment.patient?.email || 'No email provided'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span>50 minutes session</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 self-end md:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(appointment);
                        }}
                      >
                        Details
                      </Button>
                      
                      {!isPast && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onJoinSession(appointment);
                          }}
                        >
                          {appointment.type.toLowerCase() === 'video' && (
                            <><Video className="h-3.5 w-3.5 mr-1" /> Start Session</>
                          )}
                          {appointment.type.toLowerCase() === 'chat' && (
                            <><MessageSquare className="h-3.5 w-3.5 mr-1" /> Start Chat</>
                          )}
                          {appointment.type.toLowerCase() === 'audio' && (
                            <><Phone className="h-3.5 w-3.5 mr-1" /> Start Call</>
                          )}
                          {!['video', 'chat', 'audio'].includes(appointment.type.toLowerCase()) && (
                            <><Clock className="h-3.5 w-3.5 mr-1" /> Start Session</>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {appointment.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm font-medium mb-1">Notes:</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};


