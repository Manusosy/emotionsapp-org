import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/authContext';
import { UserRole } from '@/types/user';
import { supabase } from '@/lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

/**
 * ProtectedRoute Component
 * 
 * Provides authentication and role-based access control.
 * 
 * @param children - The components to render if authenticated and authorized
 * @param requiredRole - Optional role or array of roles required to access the route
 */
export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, userRole, isEmailConfirmed } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isRefreshingSession, setIsRefreshingSession] = useState(false);
  const location = useLocation();

  // Session refresh function
  const refreshSession = async () => {
    try {
      setIsRefreshingSession(true);
      // Try to refresh the token
      const { data, error } = await supabase.auth.refreshSession();
      if (data?.session) {
        console.log('Session refreshed successfully');
        localStorage.setItem('app_session_last_active', new Date().toISOString());
      } else if (error) {
        console.error('Failed to refresh session:', error.message);
      }
    } catch (err) {
      console.error('Error during session refresh:', err);
    } finally {
      setIsRefreshingSession(false);
    }
  };

  // Check for valid session on protected route access
  useEffect(() => {
    const checkSession = async () => {
      setIsCheckingSession(true);
      
      // First check if we have a session in the auth context
      if (isAuthenticated) {
        // If authenticated, try to refresh the session to keep it active
        await refreshSession();
        setIsCheckingSession(false);
        return;
      }

      // If not authenticated through context, check for a valid supabase session
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
          // We have a valid session but context doesn't reflect it
          // This will trigger auth context to update via onAuthStateChange
          console.log('Valid session found, refreshing authentication state');
          await refreshSession();
        } else {
          console.log('No valid session found in supabase client');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsCheckingSession(false);
      }
    };
    
    checkSession();
  }, [isAuthenticated, location.pathname]);

  // Check authorization based on role
  useEffect(() => {
    // Check authorization based on user role and required role
    if (isAuthenticated && userRole) {
      if (!requiredRole) {
        // No specific role required, just authentication
        setIsAuthorized(true);
      } else if (Array.isArray(requiredRole)) {
        // Multiple roles accepted
        setIsAuthorized(requiredRole.includes(userRole as UserRole));
      } else {
        // Single role required
        setIsAuthorized(userRole === requiredRole);
      }
    } else if (!isAuthenticated) {
      setIsAuthorized(false);
    }
  }, [isAuthenticated, userRole, requiredRole]);

  // If we're checking the session, return a non-disruptive render
  // This prevents flashing of sign-in screen during checks
  if (isCheckingSession || isRefreshingSession) {
    // Return a simple fragment with children to avoid disruption
    // This prevents redirect loops during session checks
    return <>{children}</>;
  }

  // Skip loading state check and always render content when possible
  if (isAuthorized === null) {
    // Return the children anyway - this prevents showing a spinner
    return <>{children}</>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Store the location they were trying to access for later redirect
    return <Navigate to="/patient-signin" state={{ from: location }} replace />;
  }

  // Redirect to email confirmation page if email is not confirmed
  if (isAuthenticated && !isEmailConfirmed) {
    return <Navigate 
      to="/auth/email-confirmation" 
      state={{ 
        email: user?.email,
        userType: userRole === 'mood_mentor' ? 'mentor' : 'patient'
      }} 
      replace 
    />;
  }

  // Redirect to unauthorized page if user doesn't have required role
  if (!isAuthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Render the protected content
  return <>{children}</>;
} 