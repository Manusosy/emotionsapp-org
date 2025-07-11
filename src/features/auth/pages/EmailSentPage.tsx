import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';
import AuthLayout from '../components/AuthLayout';

export default function EmailSentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const userType = location.state?.userType;

  const handleResendEmail = async () => {
    // TODO: Implement resend email functionality
  };

  const handleBackToSignIn = () => {
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
              onClick={handleResendEmail}
            >
              Resend confirmation email
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={handleBackToSignIn}
            >
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
} 