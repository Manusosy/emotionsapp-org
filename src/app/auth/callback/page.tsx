import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/authContext';
import { isCountryAllowedForMentors } from '@/features/auth/utils/mentor-countries';
import { toast } from 'sonner';

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const navigate = useNavigate();
  const searchParams = useSearchParams()[0];
  const { userRole, getDashboardUrlForRole } = useAuth();
  
  // Function to clear browser storage and sign out
  const handleClearAndSignOut = async () => {
    // Clear all Supabase-related items from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('app_session')) {
        localStorage.removeItem(key);
      }
    });
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Redirect to home
    navigate('/');
  };
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("Auth callback initiated");
        console.log("Search params:", Object.fromEntries(searchParams.entries()));
        
        // Get user role preferences from URL
        const userType = searchParams.get('userType');
        const isSignUp = searchParams.get('isSignUp') === 'true';
        
        console.log("User type from URL:", userType);
        console.log("Is signup:", isSignUp);
        
        // If no userType is specified, we can't proceed properly
        if (!userType) {
          console.error("No userType specified in URL");
          setError("Authentication failed: Missing user type information. Please try again.");
          return;
        }
        
        // Ensure userType is valid
        if (userType !== 'patient' && userType !== 'mentor') {
          console.error("Invalid userType specified:", userType);
          setError("Authentication failed: Invalid user type. Please try again.");
          return;
        }
        
        // Check if we have a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          throw sessionError;
        }
        
        if (!session) {
          console.log("No session found, exchanging code for session");
          // Try to exchange the code for a session
          const { error: authError } = await supabase.auth.exchangeCodeForSession(
            window.location.search
          );
          
          if (authError) {
            console.error("Auth error:", authError);
            throw authError;
          }
        } else {
          console.log("Session found:", session.user.id);
        }
        
        // Get the latest user data
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.error("User not found after authentication");
          throw new Error('User not found after authentication');
        }
        
        console.log("User retrieved:", user.id);
        console.log("User metadata:", user.user_metadata);
        console.log("User email:", user.email);
        
        // When signing up, immediately update user metadata with the correct role
        if (isSignUp) {
          const role = userType === 'mentor' ? 'mood_mentor' : 'patient';
          const { error: updateError } = await supabase.auth.updateUser({
            data: { 
              role,
              signup_completed: false // Add this flag to track signup completion
            }
          });

          if (updateError) {
            console.error("Error updating user metadata:", updateError);
            throw updateError;
          }

          // For mentors, verify country eligibility
          if (userType === 'mentor') {
            const userCountry = user.user_metadata?.country;
            if (!isCountryAllowedForMentors(userCountry)) {
              setError("Mood Mentor registration is currently not available in your country.");
              await handleClearAndSignOut();
              return;
            }
          }

          // Redirect to email confirmation page
          navigate('/auth/email-sent', { 
            state: { 
              email: user.email,
              userType: userType
            }
          });
          return;
        }

        // For non-signup flows, check existing profiles
        const { data: existingPatient } = await supabase
          .from('patient_profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
          
        const { data: existingMentor } = await supabase
          .from('mood_mentor_profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
        
        // Also check if the email is already used in either profile table
        // This catches cases where the same Google account tries to create different role profiles
        const { data: existingPatientByEmail } = await supabase
          .from('patient_profiles')
          .select('id, email')
          .eq('email', user.email)
          .maybeSingle();
          
        const { data: existingMentorByEmail } = await supabase
          .from('mood_mentor_profiles')
          .select('id, email')
          .eq('email', user.email)
          .maybeSingle();
        
        console.log("Existing patient profile by ID:", existingPatient);
        console.log("Existing mentor profile by ID:", existingMentor);
        console.log("Existing patient profile by email:", existingPatientByEmail);
        console.log("Existing mentor profile by email:", existingMentorByEmail);
        
        // If user already exists in one of the profile tables, use that role
        let role = user.user_metadata?.role;
        console.log("Initial role from metadata:", role);
        
        // Check if the user is trying to create a new account with an email that's already used
        if (isSignUp) {
          if (userType === 'patient' && existingMentorByEmail) {
            const errorMsg = 'This Google account is already registered as a mood mentor. You cannot use the same email for both patient and mentor accounts.';
            console.error(errorMsg);
            setError(errorMsg);
            await supabase.auth.signOut();
            return;
          }
          
          if (userType === 'mentor' && existingPatientByEmail) {
            const errorMsg = 'This Google account is already registered as a patient. You cannot use the same email for both patient and mentor accounts.';
            console.error(errorMsg);
            setError(errorMsg);
            await supabase.auth.signOut();
            return;
          }
        }
        
        // Now handle the existing profiles by ID
        if (existingPatient) {
          role = 'patient';
          console.log("Setting role to patient based on existing profile");
          
          // If they're trying to sign up as a mentor but already have a patient account
          if (userType === 'mentor') {
            const errorMsg = 'This Google account is already registered as a patient. Please use a different Google account for your mentor profile.';
            console.error(errorMsg);
            setError(errorMsg);
            await supabase.auth.signOut();
            return;
          }
          
          // Update user metadata with role if it doesn't match
          if (user.user_metadata?.role !== 'patient') {
            console.log("Updating user metadata with role: patient");
            await supabase.auth.updateUser({
              data: { role: 'patient' }
            });
          }
        } else if (existingMentor) {
          role = 'mood_mentor';
          console.log("Setting role to mood_mentor based on existing profile");
          
          // If they're trying to sign up as a patient but already have a mentor account
          if (userType === 'patient') {
            const errorMsg = 'This Google account is already registered as a mood mentor. Please use a different Google account for your patient profile.';
            console.error(errorMsg);
            setError(errorMsg);
            await supabase.auth.signOut();
            return;
          }
          
          // Update user metadata with role if it doesn't match
          if (user.user_metadata?.role !== 'mood_mentor') {
            console.log("Updating user metadata with role: mood_mentor");
            await supabase.auth.updateUser({
              data: { role: 'mood_mentor' }
            });
          }
        } else if (isSignUp && userType) {
          // New user - assign role based on userType
          role = userType === 'mentor' ? 'mood_mentor' : 'patient';
          console.log("New user, setting role to:", role);
          
          // For mood mentors, check if they are from an allowed country
          if (role === 'mood_mentor' && user.user_metadata?.country) {
            const countryCode = user.user_metadata.country;
            if (!isCountryAllowedForMentors(countryCode)) {
              // Country not allowed for mentors, sign out and redirect to error page
              const errorMsg = 'Mood Mentor sign up is currently only available in Kenya, Uganda, Rwanda, Sierra Leone, and Ghana. Please sign up as a patient instead.';
              console.error(errorMsg);
              await supabase.auth.signOut();
              setError(errorMsg);
              return;
            }
          }
          
          // Update user metadata with role
          console.log("Updating user metadata with role:", role);
          await supabase.auth.updateUser({
            data: { role }
          });
          
          // Create appropriate profile
          if (role === 'patient') {
            // Create patient profile
            console.log("Creating patient profile");
            const { error: profileError } = await supabase.from('patient_profiles').upsert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Patient User',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
            if (profileError) {
              console.error('Error creating patient profile:', profileError);
            }
          } else if (role === 'mood_mentor') {
            // Create mood mentor profile with required fields
            console.log("Creating mood mentor profile");
            const { error: profileError } = await supabase.from('mood_mentor_profiles').upsert({
              id: user.id,
              email: user.email,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Mood Mentor',
              specialty: 'General', // Default specialty
              // Add country from user metadata if available
              location: user.user_metadata?.country_name || '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            
            if (profileError) {
              console.error('Error creating mood mentor profile:', profileError);
            }
          }
        } else {
          // Handle case where user is signing in but userType doesn't match their role
          console.log("User signing in with userType:", userType);
          
          // Check if they're trying to sign in with the wrong role
          if (userType === 'mentor' && existingPatientByEmail) {
            const errorMsg = 'This Google account is registered as a patient. Please sign in as a Patient instead.';
            console.error(errorMsg);
            setError(errorMsg);
            await supabase.auth.signOut();
            return;
          }
          
          if (userType === 'patient' && existingMentorByEmail) {
            const errorMsg = 'This Google account is registered as a mood mentor. Please sign in as a Mood Mentor instead.';
            console.error(errorMsg);
            setError(errorMsg);
            await supabase.auth.signOut();
            return;
          }
          
          // If they're trying to sign in as a role they don't have
          if ((userType === 'mentor' && role !== 'mood_mentor') || 
              (userType === 'patient' && role !== 'patient')) {
            
            // If they don't have any profile yet, create one based on userType
            if (!existingPatient && !existingMentor && !existingPatientByEmail && !existingMentorByEmail) {
              role = userType === 'mentor' ? 'mood_mentor' : 'patient';
              console.log("Creating new profile with role:", role);
              
              // Update user metadata with role
              await supabase.auth.updateUser({
                data: { role }
              });
              
              // Create appropriate profile
              if (role === 'patient') {
                console.log("Creating patient profile for sign-in user");
                const { error: profileError } = await supabase.from('patient_profiles').upsert({
                  id: user.id,
                  email: user.email,
                  full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Patient User',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
                
                if (profileError) {
                  console.error('Error creating patient profile:', profileError);
                }
              } else if (role === 'mood_mentor') {
                console.log("Creating mood mentor profile for sign-in user");
                const { error: profileError } = await supabase.from('mood_mentor_profiles').upsert({
                  id: user.id,
                  email: user.email,
                  full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Mood Mentor',
                  specialty: 'General', // Default specialty
                  location: user.user_metadata?.country_name || '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                });
                
                if (profileError) {
                  console.error('Error creating mood mentor profile:', profileError);
                }
              }
            } else {
              // They have a profile but it doesn't match the userType they're trying to use
              const errorMsg = userType === 'mentor' 
                ? 'This account is not registered as a Mood Mentor. Please sign in as a Patient instead.'
                : 'This account is not registered as a Patient. Please sign in as a Mood Mentor instead.';
              console.error(errorMsg);
              setError(errorMsg);
              await supabase.auth.signOut();
              return;
            }
          }
        }
        
        // Get the latest user data after updates
        const { data: { user: updatedUser } } = await supabase.auth.getUser();
        const finalRole = updatedUser?.user_metadata?.role || role;
        console.log("Final role:", finalRole);
        
        // Make sure the role is correctly set in user metadata before redirecting
        if (finalRole !== updatedUser?.user_metadata?.role) {
          console.log("Updating user metadata with final role:", finalRole);
          await supabase.auth.updateUser({
            data: { role: finalRole }
          });
        }
        
        // Double check that the role matches the requested userType
        const expectedRole = userType === 'mentor' ? 'mood_mentor' : 'patient';
        if (finalRole !== expectedRole) {
          console.error(`Role mismatch: User has role ${finalRole} but tried to access as ${expectedRole}`);
          const errorMsg = userType === 'mentor' 
            ? 'This account is registered as a patient. Please sign in as a Patient instead.'
            : 'This account is registered as a mood mentor. Please sign in as a Mood Mentor instead.';
          setError(errorMsg);
          await supabase.auth.signOut();
          return;
        }
        
        // Navigate to appropriate dashboard based on role
        if (finalRole === 'mood_mentor') {
          console.log("Navigating to mood mentor dashboard");
          navigate('/mood-mentor-dashboard');
        } else {
          console.log("Navigating to patient dashboard");
          navigate('/patient-dashboard');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('Authentication failed. Please try again.');
        setDebugInfo(JSON.stringify(error, null, 2));
      }
    };
    
    handleCallback();
  }, [navigate, searchParams]);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {error ? (
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h2>
          <p className="mb-4">{error}</p>
          {debugInfo && (
            <pre className="text-xs text-left bg-gray-100 p-4 rounded mb-4 overflow-auto max-h-40">
              {debugInfo}
            </pre>
          )}
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Return to Homepage
            </button>
            <button
              onClick={handleClearAndSignOut}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Clear Browser Data & Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Completing authentication, please wait...</p>
        </div>
      )}
    </div>
  );
} 