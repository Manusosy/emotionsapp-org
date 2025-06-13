import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole } from '../types/user';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { User } from '@supabase/supabase-js';
import { UserWithMetadata } from '@/services/auth/auth.service';

interface AuthContextType {
  user: UserWithMetadata | null;
  isAuthenticated: boolean;
  userRole: UserRole | null;
  isLoading: boolean;
  signIn: (credentials: { email: string; password: string }) => Promise<{ user: UserWithMetadata | null; error?: string }>;
  signUp: (data: { email: string; password: string; firstName: string; lastName: string; role: UserRole; country: string; gender?: string | null; }) => Promise<{ user: UserWithMetadata | null; error?: string }>;
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

  const updateAuthState = (newUser: User | null) => {
    setUser(newUser as UserWithMetadata | null);
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
  }) => {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
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
      
      if (error) throw error;
      
      if (authData.user) {
        updateAuthState(authData.user);
      }
      
      return { user: authData.user as UserWithMetadata };
    } catch (error) {
      console.error('Error in signUp:', error);
      return { user: null, error: error.message };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      updateAuthState(null);
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Error signing out');
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      
      if (error) throw error;
      toast.success('Password reset email sent');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Error sending password reset email');
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error || !session) {
        console.error('Error refreshing session:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in refreshSession:', error);
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
      // Delete the user's profile based on their role
      const userRole = user?.user_metadata?.role;
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
      // For now, just sign out the user
      await signOut();
      
      return {};
    } catch (error) {
      console.error('Error deleting user:', error);
      return { error: error.message };
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('AuthContext: Error getting session:', sessionError.message);
          updateAuthState(null);
          return;
        }
        
        if (!session) {
          console.log('AuthContext: No active session found');
          updateAuthState(null);
          return;
        }
        
        updateAuthState(session.user);
      } catch (error) {
        console.error('AuthContext: Error initializing auth:', error);
        updateAuthState(null);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        updateAuthState(session.user);
      } else if (event === 'SIGNED_OUT') {
        updateAuthState(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 