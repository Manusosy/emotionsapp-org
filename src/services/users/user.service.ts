import { supabase } from '@/lib/supabase';
import { UserService, ServiceResponse } from '../index';
import { UserWithMetadata } from '../auth/auth.service';

class SupabaseUserService implements UserService {
  async getProfile(userId: string): Promise<ServiceResponse<any>> {
    try {
      // First get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const role = user?.user_metadata?.role;

      // Then get the profile data from the appropriate table
      const table = role === 'mood_mentor' ? 'mood_mentor_profiles' : 'patient_profiles';
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return { 
        data: {
          ...data,
          role,
          email: user?.email,
          name: user?.user_metadata?.name
        }
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { error: error.message };
    }
  }

  async updateProfile(userId: string, data: Partial<UserWithMetadata>): Promise<ServiceResponse<void>> {
    try {
      // Update auth metadata if provided
      if (data.user_metadata) {
        const { error: authError } = await supabase.auth.updateUser({
          data: data.user_metadata
        });
        if (authError) throw authError;
      }

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const role = user?.user_metadata?.role;
      const table = role === 'mood_mentor' ? 'mood_mentor_profiles' : 'patient_profiles';

      // Update profile data
      const { error: profileError } = await supabase
        .from(table)
        .update({
          full_name: data.user_metadata?.name,
          // Add other profile fields as needed
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      return {};
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { error: error.message };
    }
  }
}

export const userService = new SupabaseUserService(); 