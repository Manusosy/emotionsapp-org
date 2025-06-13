/**
 * User type definitions for the application
 */

export type UserRole = 'user' | 'patient' | 'mood_mentor';

export interface User {
  id: string;
  email: string;
  created_at?: string;
  first_name?: string;
  last_name?: string;
  role?: UserRole;
  full_name?: string;
  avatar_url?: string;
  phone_number?: string;
  date_of_birth?: string;
  country?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  patient_id?: string;
  gender?: string;
}

export interface UserProfile {
  id: string;
  patient_id?: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;
  gender?: string;
  country: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  avatar_url: string;
  created_at: string;
}

export interface MoodMentor {
  id: string;
  userId: string;
  name: string;
  title: string;
  specialties: string[];
  bio: string;
  experience: number;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  avatarUrl?: string;
  profileCompleted: boolean;
  gender: string;
  location: string;
  nameSlug: string;
  availability: MentorAvailability[];
}

export interface MentorReview {
  id: string;
  mentorId: string;
  userId: string;
  rating: number;
  comment: string;
  userName: string;
  userAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MentorSettings {
  id: string;
  mentorId: string;
  notifications: {
    email: boolean;
    app: boolean;
    sms: boolean;
  };
  availability: {
    autoConfirm: boolean;
    bufferTime: number;
  };
  payment: {
    hourlyRate: number;
    acceptsInsurance: boolean;
    insuranceProviders: string[];
  };
  preferences: {
    sessionReminders: boolean;
    videoQuality: string;
    theme: string;
  };
}

export interface MentorAvailability {
  day: string;
  slots: TimeSlot[];
}

export interface TimeSlot {
  start: string;
  end: string;
}

export interface MoodMentorProfile {
  id: string;
  userId?: string;
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
  sessionDuration: '30 Min' | '45 Min' | '60 Min' | '90 Min';
  rating?: number;
  gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
  location: string;
  nameSlug: string;
  isProfileComplete?: boolean;
  isActive?: boolean;
  specialties?: string[];
  therapyTypes?: string[];
  consultationFee?: number;
} 