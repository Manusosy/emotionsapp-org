import { supabase } from '@/lib/supabase';

class AppointmentService {
  /**
   * Start an appointment session
   * @param appointmentId The ID of the appointment to start
   * @returns Result object with data or error
   */
  async startAppointmentSession(appointmentId: string): Promise<{ data?: any; error?: string }> {
    try {
      // Update appointment status to scheduled
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'scheduled' })
        .eq('id', appointmentId);
        
      if (error) {
        console.error('Error starting appointment session:', error);
        return { error: error.message };
      }
      
      // Create session event
      await this.createSessionEvent(
        appointmentId,
        'session_started',
        'mentor',
        'Session started by mentor'
      );
      
      return { data: { success: true } };
    } catch (error: any) {
      console.error('Error in startAppointmentSession:', error);
      return { error: error.message || 'Unknown error starting session' };
    }
  }
  
  /**
   * Complete an appointment
   * @param appointmentId The ID of the appointment to complete
   * @returns Result object with data or error
   */
  async completeAppointment(appointmentId: string): Promise<{ data?: any; error?: string }> {
    try {
      // Update appointment status to completed
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId);
        
      if (error) {
        console.error('Error completing appointment:', error);
        return { error: error.message };
      }
      
      // Create session event
      await this.createSessionEvent(
        appointmentId,
        'session_ended',
        'mentor',
        'Session completed by mentor'
      );
      
      return { data: { success: true } };
    } catch (error: any) {
      console.error('Error in completeAppointment:', error);
      return { error: error.message || 'Unknown error completing appointment' };
    }
  }
  
  /**
   * Cancel an appointment
   * @param appointmentId The ID of the appointment to cancel
   * @param reason Optional reason for cancellation
   * @returns Result object with data or error
   */
  async cancelAppointment(appointmentId: string, reason?: string): Promise<{ data?: any; error?: string }> {
    try {
      // Update appointment status to cancelled
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancellation_reason: reason || 'No reason provided'
        })
        .eq('id', appointmentId);
        
      if (error) {
        console.error('Error cancelling appointment:', error);
        return { error: error.message };
      }
      
      return { data: { success: true } };
    } catch (error: any) {
      console.error('Error in cancelAppointment:', error);
      return { error: error.message || 'Unknown error cancelling appointment' };
    }
  }

  /**
   * Create a session event for tracking session state changes
   * @param appointmentId The ID of the appointment
   * @param eventType The type of event (e.g., 'session_started', 'session_ended')
   * @param initiatedBy Who initiated the event ('mentor' or 'patient')
   * @param message Optional message describing the event
   * @param metadata Optional additional data
   * @returns Result object with data or error
   */
  async createSessionEvent(
    appointmentId: string,
    eventType: string,
    initiatedBy: string,
    message?: string,
    metadata?: any
  ): Promise<{ data?: any; error?: string }> {
    try {
      // Check if the session_events table exists
      const { error: tableCheckError } = await supabase
        .from('session_events')
        .select('id')
        .limit(1);

      // If table doesn't exist, return gracefully
      if (tableCheckError && tableCheckError.message.includes('does not exist')) {
        console.warn('session_events table does not exist yet');
        return { error: 'Session events tracking is not available' };
      }

      // Insert the event
      const { data, error } = await supabase
        .from('session_events')
        .insert({
          appointment_id: appointmentId,
          event_type: eventType,
          initiated_by: initiatedBy,
          message,
          metadata
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating session event:', error);
        return { error: error.message };
      }

      return { data };
    } catch (error: any) {
      console.error('Error in createSessionEvent:', error);
      return { error: error.message || 'Unknown error creating session event' };
    }
  }
}

export const appointmentService = new AppointmentService(); 