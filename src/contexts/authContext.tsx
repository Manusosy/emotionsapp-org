import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole } from '../types/user';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { User, AuthError, AuthSession, AuthResponse, AuthTokenResponse } from '@supabase/supabase-js';
import { UserWithMetadata, authService } from '@/services/auth/auth.service';
import { PostgrestError } from '@supabase/postgrest-js';

interface AuthContextType {
  user: UserWithMetadata | null;
  isAuthenticated: boolean;
  isEmailConfirmed: boolean;
  userRole: UserRole | null;
  isLoading: boolean;
  signIn: (credentials: { email: string; password: string }) => Promise<{ user: UserWithMetadata | null; error?: string }>;
  signUp: (data: { email: string; password: string; firstName: string; lastName: string; role: UserRole; country: string; gender?: string | null; full_name?: string; }) => Promise<{ user: UserWithMetadata | null; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getDashboardUrlForRole: (role: string | undefined | null) => string;
  getFullName: () => string;
  refreshSession: () => Promise<boolean>;
  deleteUser: (userId: string) => Promise<{ error?: string }>;
  updateUser: (options: { data?: Record<string, any>, password?: string, email?: string }) => Promise<{ error?: string }>;
  updateUserMetadata: (metadata: Record<string, any>) => Promise<{ error?: string }>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Export the context
export { AuthContext };

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserWithMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);

  const updateAuthState = (newUser: User | null) => {
    setUser(newUser as UserWithMetadata | null);
    setIsEmailConfirmed(!!newUser?.email_confirmed_at);
    setIsLoading(false);
  };

  const signIn = async (credentials: { email: string; password: string }) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw error;
      
      if (data.user) {
        // Check if email is confirmed
        if (!data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          return { 
            user: null, 
            error: "Please verify your email before signing in. Check your inbox for the confirmation link." 
          };
        }
        updateAuthState(data.user);
      }
      
      return { user: data.user as UserWithMetadata };
    } catch (error) {
      console.error('Error in signIn:', error);
      return { user: null, error: error.message };
    }
  };

  const signUp = async (data: { 
    email: string; 
    password: string; 
    firstName: string; 
    lastName: string; 
    role: UserRole;
    country: string;
    gender?: string | null;
    full_name?: string;
  }) => {
    try {
      // Use the AuthService which has proper validation and profile creation
      const result = await authService.signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        country: data.country,
        gender: data.gender
      });
      
      return result;
    } catch (err) {
      console.error('Error in signUp:', err);
      if (err instanceof AuthError || err instanceof PostgrestError) {
        return { user: null, error: err.message };
      }
      return { user: null, error: 'An unexpected error occurred during signup' };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error }: AuthResponse = await supabase.auth.signOut();
      if (error) throw error;
      updateAuthState(null);
    } catch (err) {
      console.error('Error signing out:', err);
      if (err instanceof AuthError || err instanceof PostgrestError) {
        toast.error(err.message);
      } else {
        toast.error('Error signing out');
      }
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      const { error }: AuthResponse = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
      toast.success('Password reset email sent');
    } catch (err) {
      console.error('Error resetting password:', err);
      if (err instanceof AuthError || err instanceof PostgrestError) {
        toast.error(err.message);
      } else {
        toast.error('Error sending password reset email');
      }
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error }: AuthTokenResponse = await supabase.auth.refreshSession();
      if (error || !session) {
        console.error('Error refreshing session:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Error in refreshSession:', err);
      if (err instanceof AuthError || err instanceof PostgrestError) {
        console.error('Session refresh error:', err.message);
      }
      return false;
    }
  };

  const updateUser = async (options: { 
    data?: Record<string, any>, 
    password?: string, 
    email?: string 
  }): Promise<{ error?: string }> => {
    try {
      // Make a safe copy of the options
      const updateOptions: any = {};
      
      // Only include properties that are provided
      if (options.data) updateOptions.data = options.data;
      if (options.password) updateOptions.password = options.password;
      if (options.email) updateOptions.email = options.email;
      
      // Call the Supabase updateUser method
      const { data, error } = await supabase.auth.updateUser(updateOptions);
      
      if (error) throw error;
      
      // Update the local user state if successful
      if (data.user) {
        updateAuthState(data.user);
      }
      
      return {};
    } catch (error) {
      console.error('Error updating user:', error);
      return { error: error.message };
    }
  };
  
  const updateUserMetadata = async (metadata: Record<string, any>): Promise<{ error?: string }> => {
    try {
      // Use the updateUser method but only with the data field
      const { error } = await updateUser({ data: metadata });
      
      if (error) throw new Error(error);
      
      return {};
    } catch (error) {
      console.error('Error updating user metadata:', error);
      return { error: error.message };
    }
  };

  const getDashboardUrlForRole = (role: string | undefined | null): string => {
    switch (role) {
      case 'mood_mentor':
        return '/mood-mentor-dashboard';
      case 'patient':
      default:
        return '/patient-dashboard';
    }
  };

  const getFullName = (): string => {
    return user?.user_metadata?.name || 'User';
  };

  const deleteUser = async (userId: string): Promise<{ error?: string }> => {
    try {
      // Use the AuthService for consistent deletion handling
      return await authService.deleteAccount(userId);
    } catch (error) {
      console.error('Error deleting user:', error);
      return { error: error.message };
    }
  };

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          updateAuthState(session.user);
          
          // Store the session timestamp
          const now = new Date().toISOString();
          localStorage.setItem('app_session_last_active', now);
          localStorage.setItem('app_session_active', JSON.stringify({
            active: true,
            created: now,
            refreshToken: true
          }));
        }
      } else if (event === 'SIGNED_OUT') {
        updateAuthState(null);
        // Clean up session data
        localStorage.removeItem('app_session_active');
        localStorage.removeItem('app_session_last_active');
      }
    });

    // Check for existing session on mount
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error instanceof AuthError) {
          console.error('Error getting session:', error.message);
          updateAuthState(null);
          return;
        }
        
        if (session?.user) {
          updateAuthState(session.user);
          
          // Verify session is still valid
          const lastActive = localStorage.getItem('app_session_last_active');
          if (lastActive) {
            const lastActiveTime = new Date(lastActive);
            const currentTime = new Date();
            const minutesSinceLastActive = (currentTime.getTime() - lastActiveTime.getTime()) / (1000 * 60);
            
            if (minutesSinceLastActive > 60) { // 1 hour
              console.log('Session expired due to inactivity');
              await signOut();
              return;
            }
          }
          
          // Refresh session
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError instanceof AuthError) {
            console.error('Error refreshing session:', refreshError.message);
            await signOut();
            return;
          }
        } else {
          updateAuthState(null);
        }
      } catch (error) {
        const authError = error as Error;
        console.error('Error checking session:', authError.message);
        updateAuthState(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isEmailConfirmed,
      userRole: user?.user_metadata?.role || null,
      isLoading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      getDashboardUrlForRole,
      getFullName,
      refreshSession,
      deleteUser,
      updateUser,
      updateUserMetadata
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 