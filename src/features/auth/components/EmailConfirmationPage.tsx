import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle, ArrowLeft } from 'lucide-react';

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

  const title = actualUserType === 'mentor' ? 'Mood Mentor Account' : 'Patient Account';
  const roleText = actualUserType === 'mentor' ? 'mood mentor' : 'patient';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Check Your Email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {title} created successfully
          </p>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="text-center space-y-4">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Almost there!
              </h3>
              <p className="mt-2 text-gray-600">
                We've sent a confirmation email to:
              </p>
              <p className="mt-1 font-medium text-blue-600 break-all">
                {email}
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Next steps:</strong>
              </p>
              <ol className="mt-2 text-sm text-blue-700 list-decimal list-inside space-y-1">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the "Confirm My Email" button in the email</li>
                <li>You'll be automatically signed in to your {roleText} dashboard</li>
              </ol>
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                onClick={handleGoToSignIn}
                className="w-full"
                variant="brand"
              >
                I've Confirmed - Take Me to Sign In
              </Button>
              
              <Button 
                onClick={handleBackToSignup}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign Up
              </Button>
            </div>

            <div className="text-xs text-gray-500 pt-4">
              <p>Didn't receive the email? Check your spam folder or try signing up again.</p>
              <p className="mt-1">The confirmation link expires in 1 hour for security.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 