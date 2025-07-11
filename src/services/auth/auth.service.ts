import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserRole } from '@/types/user';

// Extended User type to include metadata
export interface UserWithMetadata extends User {
  user_metadata: {
    name: string;
    role: UserRole;
    avatar_url?: string;
  };
}

export interface AuthService {
  getCurrentUser: () => Promise<UserWithMetadata | null>;
  getUserRole: () => Promise<UserRole | null>;
  signIn: (email: string, password: string) => Promise<{ user: UserWithMetadata | null; error?: string }>;
  signUp: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    country: string;
    gender?: string | null;
  }) => Promise<{ user: UserWithMetadata | null; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error?: string }>;
  updateProfile: (userId: string, data: Partial<UserWithMetadata>) => Promise<{ error?: string }>;
  deleteAccount: (userId: string) => Promise<{ error?: string }>;
  updateUserMetadata: (metadata: Record<string, any>) => Promise<{ 
    success: boolean; 
    data: any | null; 
    error: string | null; 
  }>;
}

class SupabaseAuthService implements AuthService {
  async getCurrentUser(): Promise<UserWithMetadata | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user as UserWithMetadata | null;
  }

  async getUserRole(): Promise<UserRole | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata?.role || null;
  }

  async signIn(email: string, password: string): Promise<{ user: UserWithMetadata | null; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (!data.user) {
        return { user: null, error: "Invalid login credentials" };
      }

      // Check email verification status
      if (!data.user.email_confirmed_at) {
        await supabase.auth.signOut();
        return { 
          user: null, 
          error: "Please verify your email before signing in. Check your inbox for the confirmation link." 
        };
      }

      // Check if profile exists
      const tableName = data.user.user_metadata?.role === 'patient' ? 'patient_profiles' : 'mood_mentor_profiles';
      const { data: profile, error: profileError } = await supabase
        .from(tableName)
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        return {
          user: null,
          error: "Account setup incomplete. Please contact support."
        };
      }

      return { user: data.user as UserWithMetadata };
    } catch (error: any) {
      console.error('Error in signIn:', error);
      return { user: null, error: error.message };
    }
  }

  async signUp(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    country: string;
    gender?: string | null;
  }): Promise<{ user: UserWithMetadata | null; error?: string }> {
    try {
      // First check if a profile already exists
      const tableName = data.role === 'patient' ? 'patient_profiles' : 'mood_mentor_profiles';
      const { data: existingProfile } = await supabase
        .from(tableName)
        .select('id')
        .eq('email', data.email)
        .maybeSingle();

      if (existingProfile) {
        return { user: null, error: `Email already registered as a ${data.role === 'patient' ? 'Patient' : 'Mood Mentor'}` };
      }

      // Create auth user with retry logic
      let authResponse = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: `${data.firstName} ${data.lastName}`,
            role: data.role,
            country: data.country,
            gender: data.gender
          }
        }
      });
      
      for (let i = 0; i < 1; i++) { // Try one more time if first attempt fails
        if (!authResponse.error) break;
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        
        authResponse = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              name: `${data.firstName} ${data.lastName}`,
              role: data.role,
              country: data.country,
              gender: data.gender
            }
          }
        });
      }

      if (authResponse.error) {
        throw authResponse.error;
      }

      const user = authResponse.data.user;
      if (!user) {
        throw new Error('No user returned from auth signup');
      }

      // Create profile with retry logic
      const profileData = {
        id: user.id,
        full_name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        country: data.country,
        gender: data.gender
      };

      let profileError;
      for (let i = 0; i < 2; i++) { // Try twice
        const { error } = await supabase
          .from(tableName)
          .insert(profileData);
        
        if (!error) {
          profileError = null;
          break;
        }
        
        profileError = error;
        if (i === 0) await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      }

      if (profileError) {
        // If profile creation fails, attempt to clean up the auth user
        try {
          // Note: We can't delete the user directly from the client
          // Instead, mark them for deletion in user metadata
          await supabase.auth.updateUser({
            data: { 
              needsDeletion: true,
              failedProfileCreation: true
            }
          });
        } catch (cleanupError) {
          console.error('Failed to mark user for deletion:', cleanupError);
        }
        throw new Error('Failed to create user profile');
      }

      return { user: user as UserWithMetadata };
    } catch (error: any) {
      console.error('Error in signUp:', error);
      return { user: null, error: error.message };
    }
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  async resetPassword(email: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
      return {};
    } catch (error: any) {
      console.error('Error resetting password:', error);
      return { error: error.message };
    }
  }

  async updatePassword(currentPassword: string, newPassword: string): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      return {};
    } catch (error: any) {
      console.error('Error updating password:', error);
      return { error: error.message };
    }
  }

  async updateProfile(userId: string, data: Partial<UserWithMetadata>): Promise<{ error?: string }> {
    try {
      const { error } = await supabase.auth.updateUser(data);
      if (error) throw error;
      return {};
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return { error: error.message };
    }
  }

  async deleteAccount(userId: string): Promise<{ error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Delete the user's profile based on their role
      const userRole = user.user_metadata?.role;
      if (userRole === 'patient') {
        const { error: profileError } = await supabase
          .from('patient_profiles')
          .delete()
          .eq('id', userId);
        if (profileError) throw profileError;
      } else if (userRole === 'mood_mentor') {
        const { error: profileError } = await supabase
          .from('mood_mentor_profiles')
          .delete()
          .eq('id', userId);
        if (profileError) throw profileError;
      }

      // We can't directly delete the user with client API
      // We'll need to trigger account deletion workflow
      // This would typically send a request to a server function
      // For now, just sign out the user
      await supabase.auth.signOut();
      
      return {};
    } catch (error: any) {
      console.error('Error deleting account:', error);
      return { error: error.message };
    }
  }

  async updateUserMetadata(metadata: Record<string, any>): Promise<{ 
    success: boolean; 
    data: any | null; 
    error: string | null; 
  }> {
    try {
      const { error } = await supabase.auth.updateUser({ data: metadata });
      if (error) throw error;
      return { success: true, data: null, error: null };
    } catch (error: any) {
      console.error('Error updating user metadata:', error);
      return { success: false, data: null, error: error.message };
    }
  }
}

export const authService = new SupabaseAuthService(); 