import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { appointmentService } from '@/services';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';

// Icons
import {
  Calendar,
  Clock,
  Video,
  MessageSquare,
  X,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  FileText,
} from 'lucide-react';

interface AppointmentDetailProps {
  appointment: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinSession?: () => void;
  isMentor?: boolean;
}

export function AppointmentDetailDialog({ 
  appointment,
  open,
  onOpenChange,
  onJoinSession,
  isMentor = false
}: AppointmentDetailProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  
  useEffect(() => {
    if (open && appointment?.patient_id) {
      fetchPatientDetails(appointment.patient_id);
    }
  }, [open, appointment]);
  
  const fetchPatientDetails = async (patientId: string) => {
    try {
      setLoading(true);
      
      // Try to get additional patient details if available
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', patientId)
        .single();
        
      if (!userError && userData) {
        setPatient(userData);
      } else {
        // Fallback to auth.users if profiles table doesn't exist
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(patientId);
          if (authUser?.user) {
            setPatient({
              id: authUser.user.id,
              full_name: authUser.user.user_metadata?.full_name || authUser.user.user_metadata?.name || 'Patient',
              email: authUser.user.email,
              avatar_url: authUser.user.user_metadata?.avatar_url
            });
          }
        } catch (adminError) {
          console.warn('Could not fetch user details from auth admin:', adminError);
        }
      }
    } catch (error) {
      console.error('Error in fetchPatientDetails:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStartSession = async () => {
    try {
      // Show loading toast
      toast.loading('Preparing video call room...');
      
      // First, ensure a room is created for this appointment
      const { data: sessionData, error: sessionError } = await appointmentService.startAppointmentSession(appointment.id);
      
      // Dismiss loading toast
      toast.dismiss();
      
      if (sessionError) {
        console.error('Error starting appointment session:', sessionError);
        toast.error('Failed to start call', {
          description: sessionError
        });
        return;
      }
      
      if (!sessionData || !sessionData.roomUrl) {
        toast.error('Failed to create video call room');
        return;
      }
      
      console.log('Room created successfully:', sessionData.roomUrl);
      
      // Update the appointment status to "scheduled" if it's not already
      if (appointment.status.toLowerCase() !== 'scheduled') {
        await supabase
          .from('appointments')
          .update({ 
            status: 'scheduled',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointment.id);
      }
      
      // Close the dialog first to avoid showing it again after navigation
      onOpenChange(false);
      
      // Now that we have confirmed the room is created, navigate to the call page
      toast.success('Video call room ready, joining session...');
      
      if (onJoinSession) {
        // Use the provided callback if available
        onJoinSession();
      } else {
        // Otherwise navigate directly
        navigate(`/mood-mentor-dashboard/appointments/${appointment.id}/call`);
      }
    } catch (error: any) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session', {
        description: error.message || 'An unexpected error occurred'
      });
    }
  };
  
  const handleMessagePatient = () => {
    if (appointment?.patient_id) {
      navigate(`/mood-mentor-dashboard/messages/${appointment.patient_id}`);
      onOpenChange(false);
    }
  };
  
  const handleCompleteAppointment = async () => {
    try {
      toast.loading('Updating appointment...');
      
      const result = await appointmentService.completeAppointment(appointment.id);
      
      toast.dismiss();
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      toast.success('Appointment marked as completed');
      onOpenChange(false);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to update appointment');
      console.error('Error completing appointment:', error);
    }
  };
  
  const handleCancelAppointment = async () => {
    try {
      toast.loading('Cancelling appointment...');
      
      const result = await appointmentService.cancelAppointment(appointment.id, 'Cancelled by mentor');
      
      toast.dismiss();
      
      if (result.error) {
        toast.error(result.error);
        return;
      }
      
      toast.success('Appointment cancelled');
      onOpenChange(false);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to cancel appointment');
      console.error('Error cancelling appointment:', error);
    }
  };
  
  // Check if appointment is starting within 15 minutes
  const isStartingSoon = () => {
    if (!appointment) return false;
    
    try {
      const now = new Date();
      const appointmentDate = new Date(appointment.date);
      const [hours, minutes] = appointment.time.split(' - ')[0].split(':').map(Number);
      appointmentDate.setHours(hours, minutes, 0, 0);
      
      // Calculate difference in minutes
      const diffInMinutes = (appointmentDate.getTime() - now.getTime()) / (1000 * 60);
      
      // Return true if appointment is within 15 minutes (and not more than 60 min in the past)
      return diffInMinutes >= -60 && diffInMinutes <= 15;
    } catch (error) {
      console.error('Error checking appointment time:', error);
      return false;
    }
  };
  
  // Get status badge with appropriate styling
  const getStatusBadge = () => {
    if (!appointment) return null;
    
    switch (appointment.status) {
      case 'scheduled':
      case 'upcoming':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Calendar className="mr-1 h-3 w-3" /> Upcoming
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
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
            <Clock className="mr-1 h-3 w-3" /> {appointment.status}
          </Badge>
        );
    }
  };
  
  if (!appointment) {
    return null;
  }
  
  const isPast = new Date(appointment.date) < new Date();
  const isActive = appointment.status === 'upcoming' || appointment.status === 'scheduled' || appointment.status === 'in progress';
  const canJoin = isActive && (isStartingSoon() || isMentor || appointment.status === 'in progress');
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            View and manage appointment information
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left column - Patient info */}
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-2">
                <AvatarImage src={appointment.patient?.avatar || ''} />
                <AvatarFallback>
                  {appointment.patient?.name?.charAt(0) || 'P'}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-medium text-lg">{appointment.patient?.name || 'Patient'}</h3>
              {getStatusBadge()}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Contact Information</h4>
              <div className="space-y-1">
                <div className="flex items-center text-sm">
                  <Mail className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span>{appointment.patient?.email || 'No email provided'}</span>
                </div>
                {appointment.patient?.phone && (
                  <div className="flex items-center text-sm">
                    <Phone className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                    <span>{appointment.patient.phone}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Patient Details</h4>
              {patient ? (
                <div className="space-y-1 text-sm">
                  {patient.age && (
                    <div className="flex items-center">
                      <span className="text-muted-foreground w-20">Age:</span>
                      <span>{patient.age}</span>
                    </div>
                  )}
                  {patient.gender && (
                    <div className="flex items-center">
                      <span className="text-muted-foreground w-20">Gender:</span>
                      <span>{patient.gender}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No additional patient details available</p>
              )}
            </div>
          </div>
          
          {/* Right column - Appointment details */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Appointment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>
                    {appointment.date ? format(new Date(appointment.date), 'EEEE, MMMM d, yyyy') : 'Date not specified'}
                  </span>
                </div>
                
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{appointment.time || 'Time not specified'}</span>
                </div>
                
                {appointment.type && (
                  <div className="flex items-center">
                    <Video className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{appointment.type} Session</span>
                  </div>
                )}
                
                {appointment.notes && (
                  <div className="mt-4">
                    <h4 className="font-medium text-sm mb-1">Notes:</h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {appointment.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 justify-end">
              {isActive && !isPast && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancelAppointment}
                  >
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleMessagePatient}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" /> Message
                  </Button>
                  
                  <Button
                    variant={canJoin ? "default" : "secondary"}
                    size="sm"
                    onClick={handleStartSession}
                    disabled={!canJoin}
                  >
                    <Video className="h-4 w-4 mr-1" />
                    {canJoin ? "Join Session" : "Cannot Join Yet"}
                  </Button>
                </>
              )}
              
              {isActive && isPast && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCompleteAppointment}
                >
                  <CheckCircle className="h-4 w-4 mr-1" /> Mark as Completed
                </Button>
              )}
              
              {!isActive && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Also export as default for backward compatibility
export default AppointmentDetailDialog; 