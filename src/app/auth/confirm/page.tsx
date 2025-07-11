import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function AuthConfirmPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const searchParams = useSearchParams()[0];
  
  useEffect(() => {
    const confirmEmail = async () => {
      try {
        // First sign out to ensure clean state
        await supabase.auth.signOut();
        
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        
        if (!token_hash || !type || type !== 'email') {
          setStatus('error');
          setMessage('Invalid confirmation link. Please check your email for the correct link or request a new one.');
          return;
        }

        // Get the current session if any
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // If there's an existing session, sign out first
          await supabase.auth.signOut();
        }
        
        // Verify the email confirmation token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email' as any,
        });
        
        if (error) {
          console.error('Email confirmation error:', error);
          setStatus('error');
          
          if (error.message.includes('expired')) {
            setMessage('This confirmation link has expired. Please request a new confirmation email from the sign-in page.');
          } else if (error.message.includes('invalid')) {
            setMessage('This confirmation link is invalid. Please check your email for the correct link.');
          } else {
            setMessage('Unable to confirm your email. Please try again or contact support.');
          }
          return;
        }
        
        if (!data?.user) {
          setStatus('error');
          setMessage('Unable to verify your account. Please try again or contact support.');
          return;
        }

        // Check if profile already exists
        const userRole = data.user.user_metadata?.role;
        const tableName = userRole === 'patient' ? 'patient_profiles' : 'mood_mentor_profiles';
        
        const { data: existingProfile } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', data.user.id)
          .single();

        if (!existingProfile) {
          // Create the user profile if it doesn't exist
          const profileData = {
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.name || 'User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            location: data.user.user_metadata?.country || '',
            gender: data.user.user_metadata?.gender || 'Prefer not to say',
            is_active: true
          };

          let profileError;
          if (userRole === 'patient') {
            const { error: err } = await supabase
              .from('patient_profiles')
              .insert([{
                ...profileData,
                is_profile_complete: false,
                name_slug: data.user.user_metadata?.name?.toLowerCase().replace(/\s+/g, '-') || 'user'
              }]);
            profileError = err;
          } else if (userRole === 'mood_mentor') {
            const { error: err } = await supabase
              .from('mood_mentor_profiles')
              .insert([{
                ...profileData,
                specialty: data.user.user_metadata?.specialty || 'General'
              }]);
            profileError = err;
          }

          if (profileError) {
            console.error('Error creating profile:', profileError);
            setStatus('error');
            setMessage('We encountered a technical issue setting up your account. Please contact support for assistance.');
            return;
          }
        }

        // Always sign out after confirmation to ensure clean state
        await supabase.auth.signOut();

        setStatus('success');
        setMessage('Your email has been confirmed! Please sign in to access your account.');
        toast.success('Email confirmed successfully!');
      } catch (error: any) {
        console.error('Unexpected error during email confirmation:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again or contact support.');
        
        // Ensure user is signed out in case of error
        await supabase.auth.signOut();
      }
    };
    
    confirmEmail();
  }, [searchParams, navigate]);
  
  const handleSignIn = () => {
    navigate('/signin');
  };

  const handleSupport = () => {
    navigate('/contact');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">
            Email Confirmation
          </h2>
        </div>
        
        <div className="text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <Spinner className="mx-auto" />
              <p className="text-gray-600">Verifying your email address...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-6">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">
                  Email Confirmed Successfully
                </h3>
                <p className="text-gray-600">{message}</p>
              </div>
              <Button 
                onClick={handleSignIn}
                className="w-full"
              >
                Sign In to Your Account
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-6">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">
                  Email Confirmation Failed
                </h3>
                <p className="text-gray-600">{message}</p>
              </div>
              <div className="space-y-4">
                <Button 
                  onClick={handleSignIn}
                  className="w-full"
                  variant="outline"
                >
                  Return to Sign In
                </Button>
                <Button
                  onClick={handleSupport}
                  className="w-full"
                >
                  Contact Support
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 