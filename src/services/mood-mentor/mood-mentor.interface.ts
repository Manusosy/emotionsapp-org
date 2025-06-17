/**
 * Mood Mentor Service Interface
 * Defines the contract for mood mentor operations
 */

export interface MoodMentor {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  bio: string;
  specialty: string;
  hourly_rate: number;
  availability_status: 'available' | 'unavailable' | 'busy';
  avatar_url: string;
  created_at?: string;
  updated_at?: string;
  is_free: boolean;
  languages: string[];
  education: Array<{degree: string, institution: string, year: string}>;
  experience: Array<{title: string, place: string, duration: string}>;
  therapy_types: string[];
  specialties: string[];
  session_duration: '30 Min' | '45 Min' | '60 Min' | '90 Min';
  rating?: number;
  gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
  location: string;
  name_slug: string;
  profile_completion?: number;
  is_profile_complete: boolean;
  is_active: boolean;
}

// Define a client-side camelCase version of the interface for UI
export interface MoodMentorUI {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  bio: string;
  specialty: string;
  hourlyRate: number;
  availabilityStatus: 'available' | 'unavailable' | 'busy';
  avatarUrl: string;
  createdAt?: string;
  updatedAt?: string;
  isFree: boolean;
  languages: string[];
  education: Array<{degree: string, institution: string, year: string}>;
  experience: Array<{title: string, place: string, duration: string}>;
  therapyTypes: string[];
  specialties: string[];
  sessionDuration: '30 Min' | '45 Min' | '60 Min' | '90 Min';
  rating?: number;
  gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
  location: string;
  nameSlug: string;
  profileCompletion?: number;
  isProfileComplete: boolean;
  isActive: boolean;
}

export interface AvailabilitySlot {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export interface MoodMentorReview {
  id: string;
  mentorId: string;
  patientId: string;
  patientName: string;
  patientAvatar?: string | null;
  rating: number;
  reviewText: string;
  createdAt: string;
  appointmentId: string;
  status: 'pending' | 'published' | 'rejected';
}

export interface SupportGroup {
  id: string;
  name: string;
  mood_mentor_id: string;
  description: string;
  created_at: string;
  max_participants?: number;
  current_participants?: number;
  category?: string;
  status?: 'active' | 'inactive';
  meeting_schedule?: string;
}

export interface MoodMentorSettings {
  id: string;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  autoConfirmAppointments: boolean;
  availableDays: string[];
  availableHours: { start: string; end: string };
  breakHours: { start: string; end: string };
  timezone: string;
  appointmentBuffer: number;
  defaultSessionDuration: number;
}

export interface MoodMentorStats {
  totalAppointments: number;
  totalClients: number;
  averageRating: number;
  totalEarnings: number;
  upcomingAppointments: Array<{
    id: string;
    date: string;
    startTime: string;
    status: string;
    patientName: string;
    patientAvatar: string | null;
  }>;
}

export interface IMoodMentorService {
  /**
   * Get all mood mentors
   */
  getMoodMentors(options?: {
    specialties?: string[];
    minRating?: number;
    maxHourlyRate?: number;
    limit?: number;
    offset?: number;
  }): Promise<MoodMentorUI[]>;
  
  /**
   * Get a specific mood mentor by ID
   */
  getMoodMentorById(id: string): Promise<{
    success: boolean;
    data: MoodMentorUI | null;
    error: string | null;
  }>;
  
  /**
   * Get formatted mood mentor data for display
   */
  getFormattedMoodMentorData(id: string): Promise<{
    success: boolean;
    data: MoodMentorUI | null;
    reviews: MoodMentorReview[];
    error: string | null;
  }>;
  
  /**
   * Get mood mentor reviews
   */
  getMoodMentorReviews(mentorId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<MoodMentorReview[]>;
  
  /**
   * Add a review for a mood mentor
   */
  addMoodMentorReview(review: Omit<MoodMentorReview, 'id' | 'createdAt'>): Promise<MoodMentorReview>;
  
  /**
   * Get a mood mentor's settings
   */
  getMoodMentorSettings(mentorId: string): Promise<{
    success: boolean;
    data: MoodMentorSettings | null;
    error: string | null;
  }>;
  
  /**
   * Update a mood mentor's settings
   */
  updateMoodMentorSettings(mentorId: string, settings: Partial<MoodMentorSettings>): Promise<{
    success: boolean;
    data: MoodMentorSettings | null;
    error: string | null;
  }>;
  
  /**
   * Update a mood mentor's profile
   */
  updateMoodMentorProfile(profile: Partial<MoodMentorUI> | Partial<MoodMentor>): Promise<{
    success: boolean;
    data: MoodMentorUI | null;
    error: string | null;
    details?: any;
  }>;
  
  /**
   * Upload a profile image for a mood mentor
   */
  uploadProfileImage(mentorId: string, file: File): Promise<{
    success: boolean;
    url: string | null;
    error: string | null;
  }>;
  
  /**
   * Get dashboard stats for a mood mentor
   */
  getDashboardStats(mentorId: string): Promise<MoodMentorStats>;
  
  /**
   * Get support groups for a mood mentor
   */
  getSupportGroups(): Promise<SupportGroup[]>;
  
  /**
   * Add a patient to a support group
   */
  addPatientToGroup(patientId: string, groupId: string): Promise<boolean>;
  
  /**
   * Get a specific mood mentor by name slug
   */
  getMoodMentorBySlug(nameSlug: string): Promise<{
    success: boolean;
    data: MoodMentorUI | null;
    error: string | null;
  }>;
} 