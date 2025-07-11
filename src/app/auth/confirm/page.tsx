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
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        
        if (!token_hash || !type) {
          setStatus('error');
          setMessage('Invalid confirmation link. Please try signing up again.');
          return;
        }
        
        // Verify the email confirmation token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });
        
        if (error) {
          console.error('Email confirmation error:', error);
          setStatus('error');
          
          if (error.message.includes('expired')) {
            setMessage('This confirmation link has expired. Please sign up again to receive a new confirmation email.');
          } else if (error.message.includes('invalid')) {
            setMessage('This confirmation link is invalid. Please sign up again.');
          } else {
            setMessage('Email confirmation failed. Please try again or contact support.');
          }
          return;
        }
        
        if (!data?.user) {
          setStatus('error');
          setMessage('Email confirmation completed but user data is missing. Please try signing in.');
          return;
        }

        // Now that email is confirmed, create the user profile
        const userRole = data.user.user_metadata?.role;
        const profileData = {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.name || 'User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        let profileError;
        if (userRole === 'patient') {
          const { error: err } = await supabase
            .from('patient_profiles')
            .insert([{
              ...profileData,
              location: data.user.user_metadata?.country || '',
              gender: data.user.user_metadata?.gender || 'Prefer not to say',
              is_profile_complete: false,
              is_active: true,
              name_slug: data.user.user_metadata?.name?.toLowerCase().replace(/\s+/g, '-') || 'user'
            }]);
          profileError = err;
        } else if (userRole === 'mood_mentor') {
          const { error: err } = await supabase
            .from('mood_mentor_profiles')
            .insert([{
              ...profileData,
              specialty: 'General',
              location: data.user.user_metadata?.country || '',
              gender: data.user.user_metadata?.gender || 'Prefer not to say'
            }]);
          profileError = err;
        }

        if (profileError) {
          console.error('Error creating profile:', profileError);
          setStatus('error');
          setMessage('Your email was confirmed but we encountered an error creating your profile. Please try signing in or contact support.');
          return;
        }

        setStatus('success');
        setMessage('Email confirmed successfully! Redirecting to sign in...');
        toast.success('Email confirmed successfully!');
        
        // Sign out the user to ensure a clean sign-in
        await supabase.auth.signOut();
        
        // Redirect to sign in after 2 seconds
        setTimeout(() => {
          const signInPath = userRole === 'mood_mentor' ? '/mentor-signin' : '/patient-signin';
          navigate(signInPath, {
            state: { 
              message: 'Your email has been confirmed! Please sign in to continue.',
              email: data.user.email
            }
          });
        }, 2000);
      } catch (error: any) {
        console.error('Unexpected error during email confirmation:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again or contact support.');
      }
    };
    
    confirmEmail();
  }, [searchParams, navigate]);
  
  const handleRetrySignup = () => {
    navigate('/');
  };
  
  const handleSignIn = () => {
    navigate('/signin');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            Email Confirmation
          </h2>
        </div>
        
        <div className="bg-white shadow-md rounded-lg p-6">
          {status === 'loading' && (
            <div className="text-center">
              <Spinner className="mx-auto mb-4" />
              <p className="text-gray-600">Confirming your email...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Email Confirmed!
              </h3>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">
                You will be redirected to sign in in a few seconds...
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center">
              <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirmation Failed
              </h3>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="space-y-3">
                <Button 
                  onClick={handleRetrySignup}
                  variant="outline"
                  className="w-full"
                >
                  Try Signing Up Again
                </Button>
                <Button 
                  onClick={handleSignIn}
                  className="w-full"
                >
                  Go to Sign In
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 