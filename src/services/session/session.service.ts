import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for session data stored in the database
 */
export interface SessionData {
  id?: string;
  appointment_id: string;
  user_id: string;
  device_id: string;
  started_at: string;
  ended_at?: string | null;
  is_audio_only: boolean;
  status: 'active' | 'ended' | 'disconnected';
  last_heartbeat?: string;
}

/**
 * Interface for session events
 */
export interface SessionEvent {
  id?: string;
  appointment_id: string;
  event_type: 'mentor_joined' | 'patient_joined' | 'mentor_left' | 'patient_left' | 'session_ended' | 'connection_issue';
  initiated_by: 'mentor' | 'patient' | 'system';
  message?: string;
  created_at?: string;
}

/**
 * Service for managing video call sessions
 */
export class SessionService {
  private static instance: SessionService;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private activeSessionId: string | null = null;
  private deviceId: string;

  constructor() {
    // Generate or retrieve a persistent device ID
    this.deviceId = this.getOrCreateDeviceId();
  }

  /**
   * Get the singleton instance of SessionService
   */
  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  /**
   * Get or create a device ID for tracking sessions across page reloads
   */
  private getOrCreateDeviceId(): string {
    try {
      let deviceId = localStorage.getItem('device_id');
      if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem('device_id', deviceId);
      }
      return deviceId;
    } catch (e) {
      // If localStorage fails, generate a new ID each time
      return uuidv4();
    }
  }

  /**
   * Start tracking a new session
   */
  async startSession(
    appointmentId: string,
    userId: string,
    isAudioOnly: boolean
  ): Promise<{ success: boolean; sessionId: string | null; error?: string }> {
    try {
      // Check if there's already an active session for this appointment
      const { data: existingSessions, error: checkError } = await supabase
        .from('active_sessions')
        .select('id, status')
        .eq('appointment_id', appointmentId)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (checkError) {
        console.error('Error checking for existing sessions:', checkError);
      } else if (existingSessions && existingSessions.length > 0) {
        // Session already exists, update the heartbeat and return the existing ID
        const sessionId = existingSessions[0].id;
        await this.updateSessionHeartbeat(sessionId);
        this.activeSessionId = sessionId;
        this.startHeartbeat();
        return { success: true, sessionId };
      }

      // Create a new session record
      const sessionData: SessionData = {
        appointment_id: appointmentId,
        user_id: userId,
        device_id: this.deviceId,
        started_at: new Date().toISOString(),
        is_audio_only: isAudioOnly,
        status: 'active',
        last_heartbeat: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('active_sessions')
        .insert(sessionData)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating session:', error);
        return { success: false, sessionId: null, error: error.message };
      }

      // Store the session ID and start heartbeat
      this.activeSessionId = data.id;
      this.startHeartbeat();

      return { success: true, sessionId: data.id };
    } catch (e: any) {
      console.error('Exception in startSession:', e);
      return { success: false, sessionId: null, error: e.message };
    }
  }

  /**
   * End an active session
   */
  async endSession(
    appointmentId: string,
    userId: string,
    role: 'mentor' | 'patient'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Stop the heartbeat
      this.stopHeartbeat();

      // If we have an active session ID, use it for a more targeted update
      if (this.activeSessionId) {
        const { error } = await supabase
          .from('active_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', this.activeSessionId);

        if (error) {
          console.error('Error ending session by ID:', error);
          // Fall back to the appointment_id + user_id approach
        } else {
          // Log the session end event
          await this.logSessionEvent({
            appointment_id: appointmentId,
            event_type: 'session_ended',
            initiated_by: role,
            message: `Session ended by ${role}`
          });

          this.activeSessionId = null;
          return { success: true };
        }
      }

      // Update all active sessions for this appointment and user
      const { error } = await supabase
        .from('active_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('appointment_id', appointmentId)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error('Error ending session:', error);
        return { success: false, error: error.message };
      }

      // Log the session end event
      await this.logSessionEvent({
        appointment_id: appointmentId,
        event_type: 'session_ended',
        initiated_by: role,
        message: `Session ended by ${role}`
      });

      this.activeSessionId = null;
      return { success: true };
    } catch (e: any) {
      console.error('Exception in endSession:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Log a session event
   */
  async logSessionEvent(event: SessionEvent): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('session_events')
        .insert({
          ...event,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging session event:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (e: any) {
      console.error('Exception in logSessionEvent:', e);
      return { success: false, error: e.message };
    }
  }

  /**
   * Start sending heartbeat updates to keep the session active
   */
  private startHeartbeat(): void {
    // Clear any existing interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Send a heartbeat every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.activeSessionId) {
        this.updateSessionHeartbeat(this.activeSessionId).catch(err => {
          console.warn('Failed to update session heartbeat:', err);
        });
      }
    }, 30000); // 30 seconds
  }

  /**
   * Update the heartbeat timestamp for a session
   */
  private async updateSessionHeartbeat(sessionId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('active_sessions')
        .update({
          last_heartbeat: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) {
        console.warn('Error updating session heartbeat:', error);
      }
    } catch (e) {
      console.warn('Exception in updateSessionHeartbeat:', e);
    }
  }

  /**
   * Stop sending heartbeat updates
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Check if a participant has joined a session
   */
  async checkParticipantJoined(
    appointmentId: string,
    role: 'mentor' | 'patient'
  ): Promise<boolean> {
    try {
      const eventType = role === 'mentor' ? 'patient_joined' : 'mentor_joined';
      
      const { data, error } = await supabase
        .from('session_events')
        .select('id')
        .eq('appointment_id', appointmentId)
        .eq('event_type', eventType)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking if participant joined:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (e) {
      console.error('Exception in checkParticipantJoined:', e);
      return false;
    }
  }

  /**
   * Get all active sessions for debugging purposes
   */
  async getActiveSessions(): Promise<SessionData[]> {
    try {
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .eq('status', 'active');

      if (error) {
        console.error('Error getting active sessions:', error);
        return [];
      }

      return data || [];
    } catch (e) {
      console.error('Exception in getActiveSessions:', e);
      return [];
    }
  }
}

// Export a singleton instance
export const sessionService = SessionService.getInstance(); 