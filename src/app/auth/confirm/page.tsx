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
        setMessage('Email confirmed successfully!');
        toast.success('Email confirmed successfully!');
        
        // Sign out the user to ensure a clean sign-in
        await supabase.auth.signOut();
      } catch (error: any) {
        console.error('Unexpected error during email confirmation:', error);
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again or contact support.');
      }
    };
    
    confirmEmail();
  }, [searchParams, navigate]);
  
  const handleSignIn = () => {
    navigate('/signin');
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
              <p className="text-gray-600">Confirming your email...</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-6">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">
                  Email Confirmed!
                </h3>
                <p className="text-gray-600">{message}</p>
              </div>
              <Button 
                onClick={handleSignIn}
                className="w-full"
              >
                Continue to Sign In
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-6">
              <XCircle className="mx-auto h-12 w-12 text-red-500" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900">
                  Confirmation Failed
                </h3>
                <p className="text-gray-600">{message}</p>
              </div>
              <Button 
                onClick={handleSignIn}
                className="w-full"
              >
                Go to Sign In
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 