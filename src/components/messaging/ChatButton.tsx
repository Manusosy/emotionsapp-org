import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import SupabaseMessagingService from '@/features/messaging/services/messaging.service';

// Create an instance of the messaging service
const messagingService = new SupabaseMessagingService();

interface ChatButtonProps {
  userId: string;
  targetUserId: string;
  userRole?: 'patient' | 'mood_mentor';
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ChatButton({ 
  userId, 
  targetUserId, 
  userRole = 'patient',
  className = '',
  variant = 'default',
  size = 'default'
}: ChatButtonProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async () => {
    try {
      setIsLoading(true);
      console.log("Chat button clicked - starting conversation with:", targetUserId);
      
      // Verify users exist
      if (!userId || !targetUserId) {
        console.error("Missing user information:", { userId, targetUserId });
        toast.error('Cannot start chat: Missing user information');
        setIsLoading(false);
        return;
      }

      // Determine the correct path based on user role
      let basePath = userRole === 'patient' ? '/patient-dashboard/messages' : '/mood-mentor-dashboard/messages';
      
      // First navigate immediately to show the interface
      navigate(`${basePath}/${targetUserId}`);
      
      // Then create/retrieve the conversation in the background
      setTimeout(async () => {
        try {
          const result = await messagingService.getOrCreateConversation(userId, targetUserId);
          
          if (!result.data) {
            console.error("Failed to create conversation:", result.error);
            // Don't show error to user yet, let them see interface first
          } else {
            console.log("Conversation created/retrieved successfully:", result.data);
            // If we got a different ID than the target user ID, update the URL
            if (result.data !== targetUserId) {
              navigate(`${basePath}/${result.data}`, { replace: true });
            }
          }
        } catch (error) {
          console.error("Error in background conversation creation:", error);
          // Errors handled by the messaging page component
        }
        setIsLoading(false);
      }, 100);
    } catch (error) {
      console.error("Error in ChatButton:", error);
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className={className}
      variant={variant}
      size={size}
    >
      {isLoading ? (
        <div className="flex items-center">
          <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
          <span>Opening...</span>
        </div>
      ) : (
        <>
          <MessageSquare className="h-4 w-4 mr-2" />
          Message
        </>
      )}
    </Button>
  );
} 