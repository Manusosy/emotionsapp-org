import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

interface EmailConfirmationPageProps {
  userType?: 'patient' | 'mentor';
}

export default function EmailConfirmationPage({ userType }: EmailConfirmationPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email and user type from location state
  const email = location.state?.email;
  const actualUserType = location.state?.userType || userType;
  
  useEffect(() => {
    // If no email in state, redirect to appropriate signup
    if (!email) {
      const signupPath = actualUserType === 'mentor' ? '/signup/mentor' : '/signup/patient';
      navigate(signupPath, { replace: true });
    }
  }, [email, actualUserType, navigate]);

  const handleBackToSignup = () => {
    const signupPath = actualUserType === 'mentor' ? '/signup/mentor' : '/signup/patient';
    navigate(signupPath);
  };

  const handleGoToSignIn = () => {
    navigate('/signin');
  };

  return (
    <AuthLayout>
      <div className="flex flex-col items-center justify-center space-y-6 text-center">
        <div className="rounded-full bg-blue-50 p-3">
          <Mail className="h-8 w-8 text-blue-500" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Check your email
          </h1>
          <p className="text-sm text-muted-foreground">
            We've sent a confirmation link to{' '}
            <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm">
              Please click the link in the email to verify your account. If you don't see the email, check your spam folder.
            </p>
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoToSignIn}
            >
              Return to Sign In
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleBackToSignup}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign Up
            </Button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
} 