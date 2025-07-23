import { IUserService, UserProfile } from './user.interface';
import { MoodMentorProfile } from '../../types/user';
import { supabase } from '@/lib/supabase';

/**
 * Unified User Service
 * Implements all user-related functionality
 */
export class UserService implements IUserService {
  /**
   * Get user preferences by user ID
   */
  async getUserPreferences(userId: string): Promise<Record<string, any>> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user preferences:', error);
        return { notification_settings: {} };
      }

      return data || { notification_settings: {} };
    } catch (error) {
      console.error('Error in getUserPreferences:', error);
      return { notification_settings: {} };
    }
  }
  
  /**
   * Update user preferences
   */
  async updateUserPreferences(userId: string, preferences: Record<string, any>): Promise<{ success: boolean, error: string | null }> {
    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error("Error updating user preferences:", error);
      return { success: false, error: 'Failed to update preferences' };
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data ? {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        avatarUrl: data.avatar_url,
        bio: data.bio,
        location: data.location,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      } : null;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  }
  
  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          name: data.name,
          bio: data.bio,
          location: data.location,
          avatar_url: data.avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        return null;
      }

      return updatedProfile ? {
        id: updatedProfile.id,
        email: updatedProfile.email,
        name: updatedProfile.name,
        role: updatedProfile.role,
        avatarUrl: updatedProfile.avatar_url,
        bio: updatedProfile.bio,
        location: updatedProfile.location,
        createdAt: updatedProfile.created_at,
        updatedAt: updatedProfile.updated_at
      } : null;
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      return null;
    }
  }
  
  /**
   * Get multiple user profiles
   */
  async getUserProfiles(userIds: string[]): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (error) {
        console.error('Error fetching user profiles:', error);
        return [];
      }

      return data.map(profile => ({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
        location: profile.location,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }));
    } catch (error) {
      console.error('Error in getUserProfiles:', error);
      return [];
    }
  }
  
  /**
   * Search for users
   */
  async searchUsers(
    query: string, 
    options?: { limit?: number, role?: string }
  ): Promise<UserProfile[]> {
    try {
      let supabaseQuery = supabase
        .from('profiles')
        .select('*');

      if (query) {
        supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
      }

      if (options?.role) {
        supabaseQuery = supabaseQuery.eq('role', options.role);
      }

      if (options?.limit) {
        supabaseQuery = supabaseQuery.limit(options.limit);
      }

      const { data, error } = await supabaseQuery;

      if (error) {
        console.error('Error searching users:', error);
        return [];
      }

      return data.map(profile => ({
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
        location: profile.location,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at
      }));
    } catch (error) {
      console.error('Error in searchUsers:', error);
      return [];
    }
  }
  
  /**
   * Update user avatar
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<{ success: boolean, error: string | null }> {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error("Error updating avatar:", error);
      return { success: false, error: 'Failed to update avatar' };
    }
  }
  
  /**
   * Delete user
   */
  async deleteUser(userId: string): Promise<{ success: boolean, error: string | null }> {
    try {
      // Note: User deletion should be handled through the database triggers
      // when the auth.users record is deleted (from Supabase dashboard or admin functions)
      // Client-side deletion is not supported for security reasons
      
      console.log('User deletion requested for:', userId);
      return { 
        success: false, 
        error: 'User deletion must be performed through Supabase dashboard or admin functions' 
      };
    } catch (error) {
      console.error("Error deleting user:", error);
      return { success: false, error: 'Failed to delete user' };
    }
  }
  
  /**
   * Update user metadata
   */
  async updateUserMetadata(data: { avatar_url?: string, full_name?: string, [key: string]: any }): Promise<{ success: boolean, error: string | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...data,
          updated_at: new Date().toISOString()
        }
      });

      if (error) throw error;
      return { success: true, error: null };
    } catch (error) {
      console.error("Error updating user metadata:", error);
      return { success: false, error: 'Failed to update user metadata' };
    }
  }

  /**
   * Get mood mentor profile by user ID
   */
  async getMoodMentorProfile(userId: string): Promise<MoodMentorProfile | null> {
    try {
      const { data, error } = await supabase
        .from('mood_mentor_profiles')
        .select(`
          *,
          profiles:id (
            email,
            name,
            avatar_url,
            bio
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        user_id: data.user_id,
        full_name: data.full_name,
        email: data.profiles.email,
        phone_number: data.phone_number,
        bio: data.profiles.bio || '',
        specialty: data.specialty || '',
        hourly_rate: data.hourly_rate || 0,
        availability_status: data.availability_status || 'unavailable',
        avatar_url: data.profiles.avatar_url || '',
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_free: data.is_free || false,
        languages: data.languages || [],
        education: data.education || [],
        experience: data.experience || [],
        session_duration: data.session_duration || '30 Min',
        rating: data.rating || 5.0,
        gender: data.gender,
        location: data.location || '',
        name_slug: data.name_slug,
        profile_completion: data.profile_completion || 0,
        is_active: data.is_active
      };
    } catch (error) {
      console.error('Error in getMoodMentorProfile:', error);
      return null;
    }
  }

  /**
   * Get all mood mentors
   */
  async getAllMoodMentors(limit = 10): Promise<MoodMentorProfile[]> {
    try {
      const { data, error } = await supabase
        .from('mood_mentors')
        .select(`
          *,
          profiles:user_id (
            name,
            email,
            avatar_url,
            bio
          )
        `)
        .eq('is_active', true)
        .limit(limit);

      if (error) {
        console.error('Error fetching mood mentors:', error);
        return [];
      }

      return data.map(mentor => ({
        id: mentor.id,
        user_id: mentor.user_id,
        full_name: mentor.profiles?.name || '',
        email: mentor.profiles?.email || '',
        phone_number: mentor.phone_number || '',
        bio: mentor.profiles?.bio || '',
        specialty: mentor.specialty || '',
        hourly_rate: mentor.hourly_rate || 0,
        availability_status: mentor.availability_status || 'unavailable',
        avatar_url: mentor.profiles?.avatar_url || '',
        created_at: mentor.created_at,
        updated_at: mentor.updated_at,
        isFree: mentor.is_free || false,
        languages: mentor.languages || [],
        education: mentor.education || '',
        experience: mentor.experience || '',
        session_duration: mentor.session_duration || '30 Min',
        rating: mentor.rating || 0
      }));
    } catch (error) {
      console.error('Error in getAllMoodMentors:', error);
      return [];
    }
  }

  /**
   * Update mood mentor profile
   */
  async updateMoodMentorProfile(userId: string, data: Partial<MoodMentorProfile>): Promise<MoodMentorProfile | null> {
    try {
      // First update the base profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          email: data.email,
          name: data.full_name,
          avatar_url: data.avatar_url,
          bio: data.bio,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Then update the mood mentor profile
      const { error: mentorError } = await supabase
        .from('mood_mentor_profiles')
        .update({
          full_name: data.full_name,
          email: data.email,
          phone_number: data.phone_number,
          bio: data.bio,
          specialty: data.specialty,
          hourly_rate: data.hourly_rate,
          availability_status: data.availability_status,
          avatar_url: data.avatar_url,
          is_free: data.is_free,
          languages: data.languages,
          education: data.education,
          experience: data.experience,
          session_duration: data.session_duration,
          rating: data.rating,
          gender: data.gender,
          location: data.location,
          name_slug: data.name_slug,
          profile_completion: data.profile_completion,
          is_active: data.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (mentorError) throw mentorError;

      // Return the updated profile
      return this.getMoodMentorProfile(userId);
    } catch (error) {
      console.error('Error in updateMoodMentorProfile:', error);
      return null;
    }
  }
}

// Export a singleton instance
export const userService = new UserService(); 