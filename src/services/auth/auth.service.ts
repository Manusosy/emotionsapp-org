import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { UserRole } from '@/types/user';
import { validateSignupData, isDisposableEmail } from '@/utils/validation';
import { rateLimiter } from '@/utils/rateLimiter';

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
        return { user: null, error: Object.values(validationErrors)[0] as string };
      }

      // Check for disposable email
      if (await isDisposableEmail(data.email)) {
        return { user: null, error: 'Please use a valid non-disposable email address' };
      }

      // Rate limiting check using client IP
      const ipAddress = window.localStorage.getItem('client_ip') || 'unknown';
      if (!rateLimiter.checkRateLimit(ipAddress)) {
        const timeoutMs = rateLimiter.getTimeoutRemaining(ipAddress);
        const timeoutMinutes = Math.ceil(timeoutMs / 60000);
        return { 
          user: null, 
          error: `Too many signup attempts. Please try again in ${timeoutMinutes} minutes` 
        };
      }

      // Check if profile already exists using direct table query
      const tableName = data.role === 'patient' ? 'patient_profiles' : 'mood_mentor_profiles';
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from(tableName)
        .select('id')
        .eq('email', data.email)
        .single();

      if (profileCheckError && profileCheckError.code !== 'PGRST116') {
        console.error('Error checking profile:', profileCheckError);
        return { user: null, error: 'Unable to process signup. Please try again.' };
      }

      if (existingProfile) {
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

      // Create profile with direct table insertion
      const profileData = {
        id: user.id,
        full_name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        country: data.country,
        gender: data.gender,
        is_active: true,
        is_profile_complete: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Insert profile directly into the appropriate table
      const { error: profileError } = await supabase
        .from(tableName)
        .insert([profileData]);

      if (profileError) {
        // If profile creation fails, try to clean up the auth user
        try {
          await supabase.auth.updateUser({
            data: { 
              needsDeletion: true,
              failedProfileCreation: true,
              failureReason: profileError.message,
              failureTimestamp: new Date().toISOString()
            }
          });
        } catch (cleanupError) {
          console.error('Failed to handle failed signup:', cleanupError);
        }
        
        // Return a more specific error message
        if (profileError.code === '23505') { // Unique constraint violation
          return { user: null, error: 'Email already registered. Please sign in instead.' };
        }
        
        return { user: null, error: 'Failed to create user profile. Please try again or contact support.' };
      }

      // Reset rate limit on successful signup
      rateLimiter.resetAttempts(ipAddress);

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