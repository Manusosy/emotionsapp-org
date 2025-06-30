/**
 * Basic Database Types
 * These define the data models used throughout the application
 */

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  patient_id?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  date_of_birth?: string;
  gender?: string;
  country?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  role: 'user' | 'mood_mentor';
  created_at: string;
  updated_at: string;
}

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

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood_score?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  mood: number;
  mood_type: 'happy' | 'calm' | 'sad' | 'angry' | 'worried' | 'neutral';
  assessment_result: string;
  assessment_score: number;
  notes?: string;
  tags?: string[];
  activities?: string[];
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  user_id: string;
  type: string;
  score: number;
  responses: Record<string, any>;
  created_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'podcast' | 'document' | 'group' | 'workshop' | 'image' | 'link';
  url: string;
  file_url?: string;
  thumbnail_url?: string;
  category: string;
  tags?: string[];
  author?: string;
  author_role?: string;
  author_avatar?: string;
  date?: string;
  read_time?: string;
  duration?: string;
  featured?: boolean;
  downloads?: number;
  shares?: number;
  mood_mentor_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  created_at: string;
}

export interface SupportGroup {
  id: string;
  name: string;
  description: string;
  group_type: string;
  meeting_schedule: string;
  max_participants: number;
  mood_mentor_id: string;
  created_at: string;
  updated_at: string;
}

export interface MentorReview {
  id: string;
  mentor_id: string;
  patient_id: string;
  appointment_id: string | null;
  rating: number;
  review_text: string | null;
  status: 'pending' | 'published' | 'rejected' | 'flagged';
  is_featured: boolean;
  display_order: number;
  keywords: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface ReviewResponse {
  id: string;
  review_id: string;
  mentor_id: string;
  content: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewNote {
  id: string;
  review_id: string;
  mentor_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewRequestLink {
  id: string;
  mentor_id: string;
  appointment_id: string | null;
  patient_id: string | null;
  token: string;
  is_used: boolean;
  used_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
  expires_at: string;
}

// Database namespace mock to match Supabase-generated types
export namespace Database {
  export namespace schema {
    export namespace Tables {
      export interface journal_entries {
        Row: JournalEntry;
      }
      export interface mood_entries {
        Row: MoodEntry;
      }
      export interface user_profiles {
        Row: UserProfile;
      }
      export interface appointments {
        Row: Appointment;
      }
      export interface messages {
        Row: Message;
      }
      export interface assessments {
        Row: Assessment;
      }
      export interface resources {
        Row: Resource;
      }
      export interface notifications {
        Row: Notification;
      }
      export interface support_groups {
        Row: SupportGroup;
      }
      export interface mentor_reviews {
        Row: MentorReview;
      }
      export interface review_responses {
        Row: ReviewResponse;
      }
      export interface review_notes {
        Row: ReviewNote;
      }
      export interface review_request_links {
        Row: ReviewRequestLink;
      }
    }
    export namespace Enums {
      export type mood_type = 'happy' | 'calm' | 'sad' | 'angry' | 'worried' | 'neutral';
    }
  }
}

/**
 * This file defines types for the Supabase database schema
 * It helps provide type safety when interacting with Supabase
 * 
 * In a production environment, you would typically generate this file
 * using the Supabase CLI with `supabase gen types typescript --local`
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          role: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          role?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          role?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          mentor_id: string
          title: string
          description: string | null
          date: string
          start_time: string
          end_time: string
          status: string
          meeting_link: string | null
          meeting_type: string
          notes: string | null
          created_at: string
          updated_at: string
          cancellation_reason: string | null
          cancelled_by: string | null
          rating: number | null
          feedback: string | null
        }
        Insert: {
          id?: string
          patient_id: string
          mentor_id: string
          title: string
          description?: string | null
          date: string
          start_time: string
          end_time: string
          status: string
          meeting_link?: string | null
          meeting_type: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          cancellation_reason?: string | null
          cancelled_by?: string | null
          rating?: number | null
          feedback?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          mentor_id?: string
          title?: string
          description?: string | null
          date?: string
          start_time?: string
          end_time?: string
          status?: string
          meeting_link?: string | null
          meeting_type?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          cancellation_reason?: string | null
          cancelled_by?: string | null
          rating?: number | null
          feedback?: string | null
        }
      }
      mood_entries: {
        Row: {
          id: string
          user_id: string
          mood: number
          mood_type: 'happy' | 'calm' | 'sad' | 'angry' | 'worried' | 'neutral'
          assessment_result: string
          assessment_score: number
          notes: string | null
          tags: string[] | null
          activities: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mood: number
          mood_type: 'happy' | 'calm' | 'sad' | 'angry' | 'worried' | 'neutral'
          assessment_result: string
          assessment_score: number
          notes?: string | null
          tags?: string[] | null
          activities?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mood?: number
          mood_type?: 'happy' | 'calm' | 'sad' | 'angry' | 'worried' | 'neutral'
          assessment_result?: string
          assessment_score?: number
          notes?: string | null
          tags?: string[] | null
          activities?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      patient_appointments_view: {
        Row: {
          id: string
          patient_id: string
          mentor_id: string
          title: string
          description: string | null
          date: string
          start_time: string
          end_time: string
          status: string
          meeting_link: string | null
          meeting_type: string
          notes: string | null
          created_at: string
          updated_at: string
          cancellation_reason: string | null
          cancelled_by: string | null
          rating: number | null
          feedback: string | null
          mentor_name: string
          mentor_specialty: string
          mentor_avatar_url: string | null
        }
      }
      mentor_appointments_view: {
        Row: {
          id: string
          patient_id: string
          mentor_id: string
          title: string
          description: string | null
          date: string
          start_time: string
          end_time: string
          status: string
          meeting_link: string | null
          meeting_type: string
          notes: string | null
          created_at: string
          updated_at: string
          cancellation_reason: string | null
          cancelled_by: string | null
          rating: number | null
          feedback: string | null
          patient_name: string
          patient_email: string
          patient_avatar_url: string | null
        }
      }
    }
  }
} 
