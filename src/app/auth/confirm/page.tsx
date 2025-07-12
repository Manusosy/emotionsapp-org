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
        // Always start with a clean auth state
        await supabase.auth.signOut();
        
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');
        const userType = searchParams.get('userType');
        
        if (!token_hash || !type || type !== 'email') {
          setStatus('error');
          setMessage('Invalid confirmation link. Please check your email for the correct link or request a new one.');
          return;
        }

        // Verify the email confirmation token
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email' as any,
        });
        
        if (error || !data?.user?.email) {
          console.error('Email confirmation error:', error);
          setStatus('error');
          
          const errorMessage = error?.message || '';
          if (errorMessage.includes('expired')) {
            setMessage('This confirmation link has expired. Please request a new confirmation email from the sign-in page.');
          } else if (errorMessage.includes('invalid')) {
            setMessage('This confirmation link is invalid. Please check your email for the correct link.');
          } else {
            setMessage('Unable to confirm your email. Please try again or contact support.');
          }
          return;
        }

        const user = data.user;
        const userEmail = user.email;
        const userRole = user.user_metadata?.role;
        
        // Verify we have the required user data
        if (!userRole || !userEmail) {
          setStatus('error');
          setMessage('Invalid account data. Please contact support.');
          return;
        }

        // Check if profile exists and create if needed
        const tableName = userRole === 'patient' ? 'patient_profiles' : 'mood_mentor_profiles';
        
        const { data: existingProfile } = await supabase
          .from(tableName)
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingProfile) {
          // Create the user profile if it doesn't exist
          const profileData = {
            id: user.id,
            email: userEmail,
            full_name: user.user_metadata?.name || 'User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            location: user.user_metadata?.country || '',
            gender: user.user_metadata?.gender || 'Prefer not to say',
            is_active: true,
            is_profile_complete: false,
            name_slug: user.user_metadata?.name?.toLowerCase().replace(/\s+/g, '-') || 'user'
          };

          const { error: profileError } = await supabase
            .from(tableName)
            .insert([profileData]);

          if (profileError) {
            console.error('Error creating profile:', profileError);
            setStatus('error');
            setMessage('We encountered a technical issue setting up your account. Please contact support for assistance.');
            return;
          }
        }

        // After successful confirmation and profile creation/verification
        setStatus('success');
        toast.success('Email confirmed successfully! Please sign in to continue.');
        
        // Determine the correct sign in URL based on user role
        const signInPath = userRole === 'mood_mentor' ? '/mentor-signin' : '/patient-signin';
        
        // Redirect to appropriate sign in page after a brief delay
        setTimeout(() => {
          navigate(signInPath, { 
            state: { 
              confirmationSuccess: true,
              email: userEmail
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
                <p className="text-gray-600">
                  Your email has been confirmed. Redirecting you to sign in...
                </p>
              </div>
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
                  onClick={() => navigate('/signin')}
                  className="w-full"
                  variant="outline"
                >
                  Return to Sign In
                </Button>
                <Button
                  onClick={() => navigate('/contact')}
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