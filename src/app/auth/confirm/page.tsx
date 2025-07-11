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

        // We don't need to create the profile here since it's handled by the Edge Function
        // Just verify that metadata is correctly set
        if (userRole !== user.user_metadata?.role) {
          // Update user metadata if role doesn't match
          const { error: updateError } = await supabase.auth.updateUser({
            data: { role: userRole }
          });

          if (updateError) {
            console.error('Error updating user role:', updateError);
            setStatus('error');
            setMessage('Error updating user information. Please try again or contact support.');
            return;
          }
        }

        // After successful confirmation, handle different roles appropriately
        setStatus('success');
        
        // Determine the correct sign in URL based on user role
        const signInPath = userRole === 'mood_mentor' ? '/mentor-signin' : '/patient-signin';
        
        if (userRole === 'mood_mentor') {
          // For mentors, we need to ensure session is cleaned up properly
          await supabase.auth.signOut();
          toast.success('Email confirmed successfully!');
          
          // Give a slightly longer delay for mentor accounts
          setTimeout(() => {
            navigate(signInPath, { 
              state: { 
                confirmationSuccess: true,
                email: userEmail
              } 
            });
          }, 800); // Faster transition for better UX
        } else {
          // For patients, maintain the quick flow
          supabase.auth.signOut(); // Non-blocking
          toast.success('Email confirmed successfully!');
          setTimeout(() => {
            navigate(signInPath, { 
              state: { 
                confirmationSuccess: true,
                email: userEmail
              } 
            });
          }, 600);
        }

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
            <div className="mt-8 space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-[#20C0F3]/10 animate-ping" />
                </div>
                <Spinner className="absolute inset-0 m-auto w-16 h-16 text-[#20C0F3]" />
              </div>
              <div className="space-y-3">
                <p className="text-lg font-medium text-[#20C0F3] animate-pulse">
                  Verifying your email...
                </p>
                <p className="text-sm text-muted-foreground/70">
                  This will only take a moment
                </p>
              </div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="mt-8 space-y-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 animate-scale-up" />
                </div>
                <CheckCircle className="absolute inset-0 m-auto w-16 h-16 text-green-500 animate-fade-in" />
              </div>
              <div className="space-y-4">
                <h3 className="text-xl font-medium text-gray-900 animate-fade-in">
                  Email Confirmed Successfully! 🎉
                </h3>
                <div className="space-y-2 animate-fade-in-delayed">
                  <p className="text-gray-600">
                    Your email has been verified and your account is now active.
                  </p>
                  <p className="text-gray-600">
                    Redirecting you to sign in...
                  </p>
                </div>
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