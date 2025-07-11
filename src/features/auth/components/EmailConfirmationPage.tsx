import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft } from 'lucide-react';

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
      const signupPath = actualUserType === 'mentor' ? '/mentor-signup' : '/patient-signup';
      navigate(signupPath, { replace: true });
    }
  }, [email, actualUserType, navigate]);

  const handleBackToSignup = () => {
    const signupPath = actualUserType === 'mentor' ? '/mentor-signup' : '/patient-signup';
    navigate(signupPath);
  };

  const handleGoToSignIn = () => {
    const signinPath = actualUserType === 'mentor' ? '/mentor-signin' : '/patient-signin';
    navigate(signinPath);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">
            Almost there!
          </h2>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600">
              We've sent a confirmation email to:
            </p>
            <p className="mt-1 font-medium text-blue-600">
              {email}
            </p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-900 font-medium">
              Next steps:
            </p>
            <ol className="text-sm text-gray-600 space-y-2">
              <li>1. Check your email inbox (and spam folder)</li>
              <li>2. Click the "Confirm My Email" button in the email</li>
              <li>3. Sign in to access your dashboard</li>
            </ol>
          </div>

          <div className="pt-4 space-y-4">
            <Button 
              onClick={handleGoToSignIn}
              className="w-full"
              variant="default"
            >
              Continue to Sign In
            </Button>
            
            <Button 
              onClick={handleBackToSignup}
              variant="ghost"
              className="w-full text-gray-600"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign Up
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Didn't receive the email? Check your spam folder or try signing up again.
          </p>
        </div>
      </div>
    </div>
  );
} 