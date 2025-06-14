import { supabase } from '@/lib/supabase';
import { AppointmentService, AppointmentData, ServiceResponse } from '../index';
import { tables } from '@/lib/supabase';
import { Appointment } from '@/types/database.types';
// import { messagingService } from '@/services'; // Removed old import
// import { messageService } from '@/services'; // Removed old import
import SupabaseMessagingService from '@/features/messaging/services/messaging.service'; // New import
import { dailyService } from '../daily/daily.service'; // Import the Daily service
import { EventBus } from '@/App';

const newMessagingService = new SupabaseMessagingService(); // Instantiate new service

class SupabaseAppointmentService implements AppointmentService {
  // Add a cache-busting mechanism
  private generateCacheBuster() {
    return `_cb=${Date.now()}`;
  }

  async bookAppointment(data: AppointmentData): Promise<ServiceResponse<any>> {
    try {
      console.log('Booking appointment with data:', JSON.stringify(data, null, 2));
      
      // Verify the mentor_id exists in mood_mentor_profiles table instead of auth.users
      const { data: mentorProfile, error: mentorCheckError } = await supabase
        .from('mood_mentor_profiles')
        .select('id, user_id')
        .eq('user_id', data.mentor_id)
        .maybeSingle();
        
      if (mentorCheckError) {
        console.error('Error checking mentor profile:', mentorCheckError);
        return { error: 'Error verifying mentor profile: ' + mentorCheckError.message };
      }
      
      if (!mentorProfile) {
        console.error('Mentor profile not found for user_id:', data.mentor_id);
        return { error: 'Mentor profile not found. The user may not be registered as a mood mentor.' };
      }
      
      // First create a meeting room with Daily.co
      const roomName = `appointment-${data.patient_id.substring(0, 8)}-${data.mentor_id.substring(0, 8)}-${Date.now()}`;
      const { data: roomData, error: roomError } = await dailyService.createRoom({
        name: roomName,
        privacy: 'public',
        properties: {
          enable_chat: true,
          enable_screenshare: true
        }
      });

      if (roomError) {
        console.error('Error creating room:', roomError);
        return { error: 'Failed to create meeting room: ' + roomError };
      }

      // Use the meeting link from the room data or a fallback
      const meetingLink = roomData?.url || `https://emotionsapp.daily.co/${roomName}`;
      console.log('Created room with URL:', meetingLink);
      
      // Use the correct field names that match the database schema
      const appointmentData = {
        patient_id: data.patient_id,
        mentor_id: data.mentor_id,
        title: data.title,
        description: data.description || null,
        date: data.date, // Use date as in the schema
        start_time: data.start_time, // Use start_time as in the schema
        end_time: data.end_time,
        meeting_link: meetingLink,
        meeting_type: data.meeting_type, // Use meeting_type as in the schema
        notes: data.notes || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Formatted appointment data:', JSON.stringify(appointmentData, null, 2));
      
      const { data: result, error } = await supabase
        .from(tables.appointments)
        .insert(appointmentData)
        .select();

      if (error) {
        console.error('Supabase error when booking appointment:', error);
        throw error;
      }
      
      console.log('Appointment booked successfully:', result);
      return { data: result };
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      return { error: error.message || 'Failed to book appointment' };
    }
  }

  async getAppointments(userId: string): Promise<ServiceResponse<any[]>> {
    try {
      // Add cache-busting parameter to prevent stale data
      const cacheBuster = this.generateCacheBuster();
      console.log(`Fetching appointments for user ${userId} with cache buster ${cacheBuster}`);
      
      const { data, error } = await supabase
        .from(tables.appointments)
        .select(`
          *,
          patient:patient_id (*),
          mentor:mood_mentor_id (*)
        `)
        .or(`patient_id.eq.${userId},mood_mentor_id.eq.${userId}`)
        .order('date', { ascending: true });
      
      if (error) {
        console.error('Error fetching appointments:', error);
        return { error: error.message };
      }
      
      // Emit event to notify that appointments were fetched
      EventBus.emit('appointments-fetched', { userId, count: data?.length || 0 });
      
      return { data };
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      return { error: error.message || 'Failed to fetch appointments' };
    }
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: 'User not authenticated' };
      }
      
      // First get the appointment details to know who to notify
      const { data: appointment, error: fetchError } = await supabase
        .from(tables.appointments)
        .select('id, patient_id, mentor_id, title, date, start_time')
        .eq('id', appointmentId)
        .single();
        
      if (fetchError) {
        console.error('Error fetching appointment for cancellation:', fetchError);
        return { error: 'Could not find the appointment' };
      }
      
      if (!appointment) {
        return { error: 'Appointment not found' };
      }
      
      // Update the appointment status
      const { error } = await supabase
        .from(tables.appointments)
        .update({ 
          status: 'cancelled',
          cancellation_reason: reason || null,
          cancelled_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;
      
      // Create a notification for the other party
      try {
        // Determine who to notify (the other person)
        const recipientId = user.id === appointment.patient_id 
          ? appointment.mentor_id 
          : appointment.patient_id;
          
        const isCancelledByMentor = user.id === appointment.mentor_id;
        
        // Format the date for the notification
        const appointmentDate = new Date(appointment.date);
        const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric'
        });
        
        // Create notification
        const notificationData = {
          user_id: recipientId,
          title: 'Appointment Cancelled',
          message: isCancelledByMentor
            ? `Your appointment on ${formattedDate} at ${appointment.start_time} has been cancelled by your mood mentor.${reason ? ` Reason: ${reason}` : ''}`
            : `Your patient has cancelled their appointment scheduled for ${formattedDate} at ${appointment.start_time}.${reason ? ` Reason: ${reason}` : ''}`,
          type: 'appointment',
          is_read: false,
          created_at: new Date().toISOString()
        };
        
        const { error: notifyError } = await supabase
          .from('notifications')
          .insert(notificationData);
          
        if (notifyError) {
          console.error('Error creating cancellation notification:', notifyError);
          // Continue anyway as this is not critical
        }
      } catch (notifyError) {
        console.warn('Error creating cancellation notification:', notifyError);
        // Continue anyway as this is not critical
      }
      
      return {};
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      return { error: error.message };
    }
  }
  
  async rescheduleAppointment(
    appointmentId: string, 
    newDate: string, 
    newStartTime: string, 
    newEndTime: string
  ): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from(tables.appointments)
        .update({ 
          date: newDate,
          start_time: newStartTime,
          end_time: newEndTime,
          status: 'rescheduled',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;
      return {};
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      return { error: error.message };
    }
  }
  
  async completeAppointment(appointmentId: string): Promise<ServiceResponse<any>> {
    try {
      // First, get the appointment details to verify it exists
      const { data: appointment, error: fetchError } = await supabase
        .from(tables.appointments)
        .select('id, mentor_id, patient_id, status')
        .eq('id', appointmentId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching appointment for completion:', fetchError);
        return { error: 'Could not find the appointment' };
      }
      
      if (!appointment) {
        return { error: 'Appointment not found' };
      }
      
      // Check if user is the mentor for this appointment
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'User not authenticated' };
      }
      
      if (appointment.mentor_id !== user.id) {
        return { error: 'You are not authorized to complete this appointment' };
      }
      
      // Only allow completion if current status is scheduled or pending
      if (!['scheduled', 'pending'].includes(appointment.status)) {
        return { error: `Cannot complete appointment with status: ${appointment.status}` };
      }
      
      // Update the appointment status to completed
      const { error: updateError } = await supabase
        .from(tables.appointments)
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);
        
      if (updateError) {
        console.error('Error updating appointment status:', updateError);
        return { error: 'Failed to complete the appointment: ' + updateError.message };
      }
      
      // Notify the patient that their appointment was completed (optional)
      try {
        // Create activity for the patient
        await supabase
          .from('activities')
          .insert({
            user_id: appointment.patient_id,
            type: 'appointment_completed',
            message: `Your appointment with your mood mentor has been completed.`,
            created_at: new Date().toISOString()
          });
      } catch (activityError) {
        console.warn('Error creating activity for completed appointment:', activityError);
      }
      
      return {};
    } catch (error: any) {
      console.error('Error completing appointment:', error);
      return { error: error.message };
    }
  }
  
  async rateAppointment(
    appointmentId: string, 
    rating: number, 
    feedback?: string
  ): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from(tables.appointments)
        .update({ 
          rating: rating,
          feedback: feedback || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;
      return {};
    } catch (error: any) {
      console.error('Error rating appointment:', error);
      return { error: error.message };
    }
  }
  
  async getPatientAppointments(patientId: string, options?: { 
    status?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string; 
  }): Promise<any[]> {
    try {
      const { status, limit = 10, offset = 0, startDate, endDate } = options || {};
      
      let query = supabase
        .from(tables.appointments)
        .select(`
          *,
          mentor:mentor_id(id, full_name, email, avatar_url, specialty)
        `)
        .eq('patient_id', patientId);

      if (status) {
        query = query.eq('status', status);
      }
      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching patient appointments:', error);
      throw error;
    }
  }

  async getMoodMentorAppointments(mentorId: string, options?: { 
    status?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string; 
  }): Promise<any[]> {
    try {
      const { status, limit = 10, offset = 0, startDate, endDate } = options || {};

      let query = supabase
        .from(tables.appointments)
        .select(`
          *,
          patient:patient_id(id, full_name, email, avatar_url)
        `)
        .eq('mentor_id', mentorId);

      if (status) {
        query = query.eq('status', status);
      }
      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching mood mentor appointments:', error);
      throw error;
    }
  }

  createMeetingLink(patientId: string, mentorId: string): string {
    // Use our main domain with a /meet path
    return `https://emotionsapp.org/meet/${patientId}/${mentorId}`;
  }

  async getAppointmentById(id: string): Promise<ServiceResponse<any>> {
    try {
      // Add cache-busting parameter to prevent stale data
      const cacheBuster = this.generateCacheBuster();
      console.log(`Fetching appointment ${id} with cache buster ${cacheBuster}`);
      
      // First try the normal join approach
      let { data, error } = await supabase
        .from(tables.appointments)
        .select(`
          *,
          patient:patient_id (*),
          mentor:mood_mentor_id (*)
        `)
        .eq('id', id)
        .single();
      
      // If there's an error with the join and it mentions relationship issues
      if (error && error.message.includes('relationship')) {
        console.warn('Join query failed, falling back to separate queries:', error.message);
        
        // Get the basic appointment data first
        const { data: basicAppointment, error: basicError } = await supabase
          .from(tables.appointments)
          .select('*')
          .eq('id', id)
          .single();
          
        if (basicError) {
          console.error('Error fetching basic appointment data:', basicError);
          return { error: basicError.message };
        }
        
        data = basicAppointment;
        
        // If we have patient_id, fetch patient separately
        if (basicAppointment.patient_id) {
          const { data: patientData } = await supabase
            .from('users')
            .select('*')
            .eq('id', basicAppointment.patient_id)
            .single();
            
          if (patientData) {
            data.patient = patientData;
          }
        }
        
        // If we have mood_mentor_id, fetch mentor separately
        if (basicAppointment.mood_mentor_id) {
          const { data: mentorData } = await supabase
            .from('mood_mentors')
            .select('*')
            .eq('id', basicAppointment.mood_mentor_id)
            .single();
            
          if (mentorData) {
            data.mentor = mentorData;
          }
        }
        
        // Clear the error since we've handled it
        error = null;
      }
      
      if (error) {
        console.error('Error fetching appointment by ID:', error);
        return { error: error.message };
      }
      
      return { data };
    } catch (error: any) {
      console.error('Error fetching appointment by ID:', error);
      return { error: error.message || 'Failed to fetch appointment' };
    }
  }

  async startAppointmentChat(appointmentId: string): Promise<ServiceResponse<string>> {
    try {
      const { data: appointment, error: fetchError } = await supabase
        .from(tables.appointments)
        .select('id, patient_id, mentor_id')
        .eq('id', appointmentId)
        .single();

      if (fetchError) {
        console.error('Error fetching appointment for chat:', fetchError);
        return { error: 'Appointment not found.' };
      }

      if (!appointment) {
        return { error: 'Appointment not found.' };
      }

      // Use the conversational messaging system with the new schema
      const { data: conversationId, error } = await newMessagingService.getOrCreateConversation(
        appointment.patient_id,
        appointment.mentor_id,
        appointment.id
      );

      if (error) {
        console.error('Error getting or creating conversation for appointment:', error);
        return { error: 'Failed to start chat for appointment.' };
      }

      return { data: conversationId };
    } catch (error: any) {
      console.error('Unexpected error starting appointment chat:', error);
      return { error: 'An unexpected error occurred while starting chat.' };
    }
  }

  async startAppointmentSession(appointmentId: string): Promise<ServiceResponse<any>> {
    try {
      // Add cache-busting timestamp to prevent stale state
      const cacheBuster = this.generateCacheBuster();
      console.log(`Starting appointment session for ${appointmentId} with cache buster ${cacheBuster}`);
      
      // Validate the appointment ID
      if (!appointmentId || typeof appointmentId !== 'string') {
        console.error('Invalid appointment ID:', appointmentId);
        return { error: 'Invalid appointment ID' };
      }
      
      // Fetch the basic appointment data
      const { data: appointment, error: fetchError } = await supabase
        .from(tables.appointments)
        .select('id, status, patient_id, mentor_id, meeting_type')
        .eq('id', appointmentId)
        .single();
      
      if (fetchError) {
        console.error('Error fetching appointment for session start:', fetchError);
        return { error: fetchError.message };
      }
      
      if (!appointment) {
        return { error: 'Appointment not found' };
      }
      
      console.log('Creating new room for appointment:', appointmentId);
      
      // Generate a unique room name based on appointment ID and timestamp
      // This ensures a new room is created for each session
      const timestamp = Date.now();
      const roomName = `appointment-${appointmentId.replace(/[^a-zA-Z0-9]/g, '')}-${timestamp}`;
      
      console.log('Generated unique room name:', roomName);
      
      // Create a new room with Daily.co
      const isAudioOnly = appointment.meeting_type && appointment.meeting_type.toLowerCase() === 'audio';
      console.log(`Creating ${isAudioOnly ? 'audio-only' : 'video'} call room for appointment type: ${appointment.meeting_type}`);
      
      const { data: roomData, error: roomError } = await dailyService.createRoom({
        name: roomName,
        privacy: 'public',
        expiry: 24 * 60 * 60, // 24 hours
        properties: {
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: isAudioOnly,
          start_audio_off: false
        }
      });
        
      if (roomError) {
        console.error('Error creating room:', roomError);
        return { error: roomError };
      }
        
      if (!roomData || !roomData.url) {
        console.error('No room URL returned from Daily.co');
        return { error: 'Failed to create room: No URL returned' };
      }
      
      const roomUrl = roomData.url;
      console.log('Room created successfully with URL:', roomUrl);
        
      // Update the appointment with the meeting link
      const { error: updateError } = await supabase
        .from(tables.appointments)
        .update({ 
          meeting_link: roomUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);
        
      if (updateError) {
        console.error('Error updating appointment with meeting link:', updateError);
        // Still return the room URL even if we couldn't update the DB
        return { 
          data: { 
            roomUrl: roomUrl,
            isNew: true,
            warning: 'Room created but appointment not updated in database'
          },
          error: `Room created but appointment not updated: ${updateError.message}`
        };
      }
        
      // Emit event to notify that a session was started
      EventBus.emit('appointment-session-created', { 
        appointmentId, 
        roomUrl: roomUrl 
      });
        
      return { 
        data: { 
          roomUrl: roomUrl,
          isNew: true
        } 
      };
    } catch (error: any) {
      console.error('Error starting appointment session:', error);
      return { error: error.message || 'Failed to start appointment session' };
    }
  }
}

export const appointmentService = new SupabaseAppointmentService();