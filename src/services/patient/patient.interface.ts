/**
 * Patient Service Interface
 * Defines the contract for patient-related operations
 */

import { UserProfile } from '../user/user.interface';
import { Appointment as AppointmentType } from '../appointment/appointment.interface';

export interface PatientProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  nameSlug?: string;
  emergencyContact?: string;
  healthConditions?: string[];
  isProfileComplete?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserActivity {
  id: string;
  activityType: 'login' | 'profile_update' | 'assessment' | 'appointment' | 'journal' | 'message' | 'session';
  description: string;
  deviceInfo?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// Use the shared Appointment type
export type Appointment = AppointmentType;

export interface AppointmentReport {
  id: string;
  appointmentId: string;
  patientId: string;
  moodMentorId: string;
  date: string;
  summary: string;
  recommendations: string[];
  followUpDate?: string;
  moodScore?: number;
}

export interface PatientMetric {
  id: string;
  patientId: string;
  type: string;
  value: number;
  timestamp: string;
}

export interface Assessment {
  id: string;
  patientId: string;
  type: string;
  date: string;
  score: number;
  responses: Record<string, any>;
}

export interface PatientDashboardData {
  metrics: {
    moodScore: number;
    stressLevel: number;
    consistency: number;
    lastCheckInStatus: string;
    streak: number;
    firstCheckInDate: string;
    lastCheckInTime?: string;
    lastCheckInDate?: string;
    lastAssessmentDate?: string;
    hasAssessments: boolean;
  };
  journalEntries: any[];
  supportGroups: any[];
}

export interface UserMetricsUpdate {
  moodScore?: number;
  stressLevel?: number;
  consistency?: number;
  streak?: number;
  lastAssessmentAt?: string;
}

export interface IPatientService {
  /**
   * Get all patients
   */
  getAllPatients(): Promise<PatientProfile[]>;

  /**
   * Subscribe to patient updates
   */
  subscribeToPatientUpdates(callback: () => void): (() => void) | undefined;

  /**
   * Get a patient by ID
   */
  getPatientById(id: string): Promise<{
    success: boolean;
    data: PatientProfile | null;
    error: string | null;
  }>;

  /**
   * Update patient profile
   */
  updatePatientProfile(profile: Partial<PatientProfile>): Promise<{
    success: boolean;
    data: PatientProfile | null;
    error: string | null;
  }>;

  /**
   * Upload profile image
   */
  uploadProfileImage(patientId: string, file: File): Promise<{
    success: boolean;
    url: string | null;
    error: string | null;
  }>;

  /**
   * Get a patient's appointments
   */
  getAppointments(patientId: string, options?: {
    status?: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Appointment[]>;
  
  /**
   * Get a patient's appointment reports
   */
  getAppointmentReports(options: {
    patientId?: string;
    moodMentorId?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    success: boolean;
    data: AppointmentReport[];
    error: string | null;
  }>;
  
  /**
   * Create an appointment
   */
  createAppointment(appointment: Omit<Appointment, 'id' | 'status' | 'created_at' | 'updated_at' | 'cancellation_reason' | 'cancelled_by' | 'rating' | 'feedback'>): Promise<Appointment>;
  
  /**
   * Update an appointment
   */
  updateAppointment(id: string, data: Partial<Appointment>): Promise<Appointment | null>;
  
  /**
   * Cancel an appointment
   */
  cancelAppointment(id: string, reason?: string): Promise<boolean>;
  
  /**
   * Get a patient's metrics
   */
  getMetrics(patientId: string, options?: {
    type?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PatientMetric[]>;
  
  /**
   * Get a patient's assessments
   */
  getAssessments(patientId: string, options?: {
    type?: string;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<Assessment[]>;
  
  /**
   * Mock appointment reports for development
   */
  getMockAppointmentReports(options: {
    patientId?: string;
    moodMentorId?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): AppointmentReport[];
  
  /**
   * Get patient dashboard data
   */
  getPatientDashboardData(patientId: string): Promise<{
    success: boolean;
    data: PatientDashboardData | null;
    error: string | null;
  }>;
  
  /**
   * Save a new assessment
   */
  saveAssessment(assessment: Omit<Assessment, 'id'>): Promise<Assessment>;
  
  /**
   * Update patient metrics
   */
  updateMetrics(patientId: string, metricsUpdate: UserMetricsUpdate): Promise<boolean>;

  /**
   * Get user activity
   */
  getUserActivity(userId: string, limit?: number): Promise<{
    success: boolean;
    data: UserActivity[];
    error: string | null;
  }>;

  /**
   * Record user activity
   */
  recordUserActivity(activity: Omit<UserActivity, 'id'>): Promise<boolean>;
} 