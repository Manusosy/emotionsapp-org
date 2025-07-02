import { UserWithMetadata } from './auth/auth.service';
import { supabase } from '@/lib/supabase';

// Import the mood mentor service
import { moodMentorService } from './mood-mentor/mood-mentor.service';
import type { IMoodMentorService } from './mood-mentor/mood-mentor.interface';

// Import the patient service
import { PatientService } from './patient/patient.service';
import type { IPatientService } from './patient/patient.interface';

// Import the messaging service
// import { MessagingService } from './messaging/messaging.interface'; // Removed
// import SupabaseMessagingService from './messaging/messaging.service'; // Removed

// Import the reviews service
import { reviewsService } from './reviews/reviews.service';

// Import the resource service
import { resourceService } from './resource/resource.service';

// Import the support groups service
import { supportGroupsService } from './support-groups/support-groups.service';
import type { ISupportGroupsService } from './support-groups/support-groups.interface';

// Export implemented services
export { authService } from './auth/auth.service';
export { appointmentService } from './appointments/appointment.service';
// export { messageService } from './messages/message.service'; // Removed, new messaging service is in features/messaging
export { userService } from './users/user.service';
export { notificationService } from './notifications/notification.service';
export { availabilityService } from './mood-mentor/availability.service';

// Service Interfaces
export interface ServiceResponse<T> {
  data?: T;
  error?: string;
}

export interface AppointmentData {
  patient_id: string;
  mentor_id: string;
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  meeting_link?: string;
  meeting_type: 'video' | 'audio' | 'chat';
  notes?: string;
}

export interface AppointmentService {
  bookAppointment: (data: AppointmentData) => Promise<ServiceResponse<any>>;
  getAppointments: (userId: string) => Promise<ServiceResponse<any[]>>;
  cancelAppointment: (appointmentId: string, reason?: string) => Promise<ServiceResponse<void>>;
  rescheduleAppointment: (appointmentId: string, newDate: string, newStartTime: string, newEndTime: string) => Promise<ServiceResponse<void>>;
  completeAppointment: (appointmentId: string, notes?: string) => Promise<ServiceResponse<void>>;
  rateAppointment: (appointmentId: string, rating: number, feedback?: string) => Promise<ServiceResponse<void>>;
  getPatientAppointments: (patientId: string, options?: { 
    status?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string; 
  }) => Promise<any[]>;
  getMoodMentorAppointments: (mentorId: string, options?: { 
    status?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string; 
  }) => Promise<any[]>;
  startAppointmentChat: (appointmentId: string) => Promise<ServiceResponse<string>>;
  getAppointmentById: (appointmentId: string) => Promise<ServiceResponse<any>>;
}

export interface UserService {
  getProfile: (userId: string) => Promise<ServiceResponse<any>>;
  updateProfile: (userId: string, data: Partial<UserWithMetadata>) => Promise<ServiceResponse<void>>;
}

export interface MessageService {
  sendMessage: (data: { senderId: string; recipientId: string; content: string }) => Promise<ServiceResponse<void>>;
  getMessages: (userId: string) => Promise<ServiceResponse<any[]>>;
  markAsRead: (messageId: string) => Promise<ServiceResponse<void>>;
  getOrCreateConversation: (user1Id: string, user2Id: string) => Promise<ServiceResponse<string>>;
}

// TODO: These services will be implemented later
interface DataService {
  saveStressAssessment: (assessment: any) => Promise<ServiceResponse<void>>;
  getJournalEntry: (entryId: string) => Promise<ServiceResponse<any>>;
  generateShareCode: (entryId: string) => Promise<ServiceResponse<any>>;
  getJournalEntries: (userId: string) => Promise<ServiceResponse<any[]>>;
  deleteJournalEntry: (entryId: string) => Promise<ServiceResponse<void>>;
  getResources: () => Promise<ServiceResponse<any[]>>;
  getResourcesByMentor: (mentorId: string) => Promise<ServiceResponse<any[]>>;
  getResourcesWithFavorites: (userId: string) => Promise<ServiceResponse<any[]>>;
  saveResource: (resource: any) => Promise<ServiceResponse<void>>;
  deleteResource: (resourceId: string) => Promise<ServiceResponse<void>>;
  addFavoriteResource: (userId: string, resourceId: string) => Promise<ServiceResponse<void>>;
  removeFavoriteResource: (userId: string, resourceId: string) => Promise<ServiceResponse<void>>;
  addMoodEntry: (moodEntry: MoodEntryData) => Promise<ServiceResponse<string>>;
  getMoodEntries: (userId: string, options?: { limit?: number; from?: Date; to?: Date }) => Promise<ServiceResponse<any[]>>;
  getMoodStreak: (userId: string) => Promise<ServiceResponse<number>>;
}

// Define the MoodEntryData interface
export interface MoodEntryData {
  user_id: string;
  mood: number;
  mood_type: 'happy' | 'calm' | 'sad' | 'angry' | 'worried' | 'neutral';
  assessment_result: string;
  assessment_score: number;
  notes?: string;
  tags?: string[];
  activities?: string[];
  created_at?: string;
  updated_at?: string;
}

interface ApiService {}

// Update the MoodMentorService interface
export type { IMoodMentorService as MoodMentorService };
export type { IPatientService };

// Export the service instances
export { moodMentorService };
export const patientService = new PatientService();
export { supportGroupsService };

// export const messagingService: MessagingService = new SupabaseMessagingService(); // Removed, new messaging service is in features/messaging
export const dataService: DataService = {
  async saveStressAssessment(assessment: any) {
    try {
      console.log("Raw assessment object:", assessment);
      
      // Create a properly formatted object for the database table
      const formattedAssessment = {
        user_id: assessment.userId,
        raw_score: assessment.rawScore,
        normalized_score: assessment.normalizedScore,
        health_percentage: assessment.healthPercentage,
        status: assessment.status,
        notes: assessment.notes || null,
        factors: assessment.factors || [],
        responses: JSON.stringify(assessment.responses || []),
        created_at: assessment.createdAt ? new Date(assessment.createdAt).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log("Formatted assessment for Supabase:", formattedAssessment);
      
      const { error } = await supabase
        .from('stress_assessments')
        .insert(formattedAssessment);
      
      if (error) {
        console.error("Supabase insert error:", error);
        throw error;
      }
      
      return { data: undefined };
    } catch (error: any) {
      console.error("Error details:", error);
      return { error: `Failed to save stress assessment: ${error?.message || 'Unknown error'}` };
    }
  },

  async addMoodEntry(moodEntry: MoodEntryData) {
    try {
      // Add timestamps if not already present
      const entryWithTimestamps = {
        ...moodEntry,
        created_at: moodEntry.created_at || new Date().toISOString(),
        updated_at: moodEntry.updated_at || new Date().toISOString()
      };

      // Insert the mood entry directly into Supabase
      const { data, error } = await supabase
        .from('mood_entries')
        .insert(entryWithTimestamps)
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }

      return { data: data.id };
    } catch (error: any) {
      return { 
        error: `Failed to save mood entry: ${error?.message || 'Unknown error'}` 
      };
    }
  },

  async getMoodEntries(userId: string, options = {}) {
    try {
      const { limit = 100, from, to } = options;
      
      let query = supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Add date range filters if specified
      if (from) {
        query = query.gte('created_at', from.toISOString());
      }
      
      if (to) {
        query = query.lte('created_at', to.toISOString());
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return { data };
    } catch (error: any) {
      return { error: `Failed to fetch mood entries: ${error.message}` };
    }
  },

  async getMoodStreak(userId: string) {
    try {
      // Call the get_mood_streak SQL function
      const { data, error } = await supabase
        .rpc('get_mood_streak', { user_id_param: userId });
      
      if (error) throw error;
      return { data: data || 0 };
    } catch (error: any) {
      return { error: `Failed to get mood streak: ${error.message}` };
    }
  },

  async getJournalEntry(entryId: string) {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', entryId)
        .single();
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: 'Failed to fetch journal entry' };
    }
  },

  async generateShareCode(entryId: string) {
    try {
      const shareCode = Math.random().toString(36).substring(2, 15);
      const { error } = await supabase
        .from('journal_entries')
        .update({ share_code: shareCode, is_shared: true })
        .eq('id', entryId);
      
      if (error) throw error;
      return { data: { share_code: shareCode } };
    } catch (error) {
      return { error: 'Failed to generate share code' };
    }
  },

  async getJournalEntries(userId: string) {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { data };
    } catch (error) {
      return { error: 'Failed to fetch journal entries' };
    }
  },

  async deleteJournalEntry(entryId: string) {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', entryId);
      
      if (error) throw error;
      return { data: undefined };
    } catch (error) {
      return { error: 'Failed to delete journal entry' };
    }
  },

  async getResources() {
    try {
      const result = await resourceService.getResources();
      if (!result.success) {
        return { error: result.error || 'Failed to fetch resources' };
      }
      return { data: result.data };
    } catch (error) {
      return { error: 'Failed to fetch resources' };
    }
  },

  async getResourcesWithFavorites(userId: string) {
    try {
      const result = await resourceService.getResourcesWithFavorites(userId);
      if (!result.success) {
        return { error: result.error || 'Failed to fetch resources with favorites' };
      }
      return { data: result.data };
    } catch (error) {
      return { error: 'Failed to fetch resources with favorites' };
    }
  },

  async getResourcesByMentor(mentorId: string) {
    try {
      const result = await resourceService.getResources({ mentorId });
      if (!result.success) {
        return { error: result.error || 'Failed to fetch mentor resources' };
      }
      return { data: result.data };
    } catch (error) {
      return { error: 'Failed to fetch mentor resources' };
    }
  },

  async saveResource(resource: any) {
    try {
      const result = await resourceService.addResource(resource);
      if (!result.success) {
        return { error: result.error || 'Failed to save resource' };
      }
      return { data: undefined };
    } catch (error) {
      return { error: 'Failed to save resource' };
    }
  },

  async deleteResource(resourceId: string) {
    try {
      const result = await resourceService.deleteResource(resourceId);
      if (!result.success) {
        return { error: result.error || 'Failed to delete resource' };
      }
      return { data: undefined };
    } catch (error) {
      return { error: 'Failed to delete resource' };
    }
  },

  async addFavoriteResource(userId: string, resourceId: string) {
    try {
      const result = await resourceService.addFavorite(userId, resourceId);
      if (!result.success) {
        return { error: result.error || 'Failed to add resource to favorites' };
      }
      return { data: undefined };
    } catch (error) {
      return { error: 'Failed to add resource to favorites' };
    }
  },

  async removeFavoriteResource(userId: string, resourceId: string) {
    try {
      const result = await resourceService.removeFavorite(userId, resourceId);
      if (!result.success) {
        return { error: result.error || 'Failed to remove resource from favorites' };
      }
      return { data: undefined };
    } catch (error) {
      return { error: 'Failed to remove resource from favorites' };
    }
  }
};

export const apiService: ApiService = {};

// Export the reviews service
export { reviewsService }; 