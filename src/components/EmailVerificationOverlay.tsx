import { useEffect, useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface EmailVerificationOverlayProps {
  email: string;
}

export default function EmailVerificationOverlay({ email }: EmailVerificationOverlayProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isResending, setIsResending] = useState(false);

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        toast.error('Failed to resend verification email');
      } else {
        toast.success('Verification email resent successfully');
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      toast.error('Failed to resend verification email');
    } finally {
      setIsResending(false);
    }
  };

  // Prevent closing the dialog by clicking outside or pressing escape
  const handleOpenChange = (open: boolean) => {
    // Only allow opening, not closing
    if (open) {
      setIsOpen(open);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
        <div className="container mx-auto flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mx-auto">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            
            <h2 className="text-xl font-semibold text-center text-gray-900">
              Verify Your Email Address
            </h2>
            
            <p className="text-center text-gray-600">
              We've sent a verification email to:
              <br />
              <span className="font-medium text-gray-900">{email}</span>
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-700">
                  You need to verify your email address before you can fully access your account.
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResendEmail}
                disabled={isResending}
              >
                {isResending ? 'Sending...' : 'Resend Verification Email'}
              </Button>
              
              <p className="text-sm text-center text-gray-500">
                Please check your spam folder if you don't see the email in your inbox.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
} 