import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserRole } from '@/types/user';
import { validateSignupData, isDisposableEmail } from '@/utils/validation';


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
      // Validate input data
      const validationErrors = validateSignupData(data);
      if (validationErrors) {
        return { user: null, error: Object.values(validationErrors)[0] };
      }

      // Check for disposable email
      if (await isDisposableEmail(data.email)) {
        return { user: null, error: 'Please use a valid non-disposable email address' };
      }

      

      // Check if profile already exists using RPC function 
      const tableName = data.role === 'patient' ? 'patient_profiles' : 'mood_mentor_profiles';
      const { data: existingProfile, error: profileCheckError } = await supabase
        .rpc('check_profile_exists', {
          p_email: data.email,
          p_table_name: tableName
        });

      if (profileCheckError) {
        console.error('Error checking profile:', profileCheckError);
        return { user: null, error: 'Unable to process signup. Please try again.' };
      }

      if (existingProfile?.[0]?.profile_exists) {
        return { 
          user: null, 
          error: `Email already registered as a ${data.role === 'patient' ? 'Patient' : 'Mood Mentor'}` 
        };
      }

      // Create auth user with improved retry logic
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1000;
      let authResponse;

      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          authResponse = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                name: `${data.firstName} ${data.lastName}`,
                role: data.role,
                country: data.country,
                gender: data.gender,
                signupTimestamp: new Date().toISOString()
              },
              emailRedirectTo: `${window.location.origin}/auth/confirm`
            }
          });

          if (!authResponse.error) break;

          // If it's not a retryable error, break immediately
          if (!['AuthRetryable', 'NetworkError'].includes(authResponse.error?.name || '')) {
            throw authResponse.error;
          }

          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i))); // Exponential backoff
        } catch (error) {
          if (i === MAX_RETRIES - 1) throw error;
        }
      }

      if (!authResponse || authResponse.error) {
        throw authResponse?.error || new Error('Failed to create user account');
      }

      const user = authResponse.data.user;
      if (!user) {
        throw new Error('No user returned from auth signup');
      }

      // Profile will be automatically created by database triggers
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify the profile was created
      const { data: profile, error: profileError } = await supabase
        .from(tableName)
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Profile verification failed:', profileError);
        throw new Error('Profile creation failed. Please try again or contact support.');
      }

      

      return { user: user as UserWithMetadata };
    } catch (error: any) {
      console.error('Error in signUp:', error);
      
      // Enhance error messages for users
      let userMessage = 'An error occurred during signup. Please try again.';
      
      if (error.message?.toLowerCase().includes('password')) {
        userMessage = 'Please ensure your password meets the security requirements.';
      } else if (error.message?.toLowerCase().includes('email')) {
        userMessage = 'Please provide a valid email address.';
      } else if (error.message?.toLowerCase().includes('network')) {
        userMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message?.toLowerCase().includes('rate')) {
        userMessage = 'Too many attempts. Please wait a few minutes before trying again.';
      }
      
      return { user: null, error: userMessage };
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

      // Note: We can't directly delete users from client-side for security reasons.
      // In a production app, this would call a secure server function.
      // For now, we'll provide user instructions and sign them out.
      
      console.log('User deletion requested for:', userId);
      
      // Sign out the user
      await supabase.auth.signOut();
      
      return { 
        error: 'Please contact support to complete account deletion, or delete your account from the Supabase dashboard.' 
      };
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