import { useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/contexts/authContext';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  avatar_url?: string;
}

export function useUser() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get user profile based on role
        const role = user.user_metadata?.role;
        let profile;

        if (role === 'patient') {
          const { data, error } = await supabase
            .from('patient_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (error) throw error;
          profile = data;
        } else if (role === 'mood_mentor') {
          const { data, error } = await supabase
            .from('mood_mentor_profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (error) throw error;
          profile = data;
        }

        setUserData({
          ...user,
          profile
        });
      } catch (error: any) {
        console.error('Error fetching user data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return { user: userData, loading, error };
} 


