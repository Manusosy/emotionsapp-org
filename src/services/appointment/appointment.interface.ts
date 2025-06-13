/**
 * Appointment Service Interface
 * Defines the contract for appointment operations
 */

export interface Appointment {
  id: string;
  patient_id: string;
  mentor_id: string;
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  meeting_link?: string;
  meeting_type: 'video' | 'audio' | 'chat';
  notes?: string;
  created_at: string;
  updated_at: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  rating?: number;
  feedback?: string;
}

export interface AppointmentSlot {
  mentor_id: string;
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
}

export interface IAppointmentService {
  /**
   * Get appointments for a patient
   */
  getPatientAppointments(patientId: string, options?: {
    status?: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<Appointment[]>;
  
  /**
   * Get appointments for a mood mentor
   */
  getMoodMentorAppointments(mentorId: string, options?: {
    status?: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<Appointment[]>;
  
  /**
   * Get a specific appointment by ID
   */
  getAppointment(id: string): Promise<Appointment | null>;
  
  /**
   * Book a new appointment
   */
  bookAppointment(appointment: Omit<Appointment, 'id' | 'status' | 'created_at' | 'updated_at' | 'cancellation_reason' | 'cancelled_by' | 'rating' | 'feedback'>): Promise<Appointment>;
  
  /**
   * Update an appointment
   */
  updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | null>;
  
  /**
   * Cancel an appointment
   */
  cancelAppointment(id: string, reason?: string): Promise<boolean>;
  
  /**
   * Reschedule an appointment
   */
  rescheduleAppointment(id: string, newDate: string, newStartTime: string, newEndTime: string): Promise<Appointment | null>;
  
  /**
   * Complete an appointment
   */
  completeAppointment(id: string, notes?: string): Promise<Appointment | null>;
  
  /**
   * Rate an appointment
   */
  rateAppointment(id: string, rating: number, feedback?: string): Promise<Appointment | null>;
  
  /**
   * Get available appointment slots for a mood mentor
   */
  getAvailableSlots(mentorId: string, options?: {
    startDate?: string;
    endDate?: string;
  }): Promise<AppointmentSlot[]>;
} 