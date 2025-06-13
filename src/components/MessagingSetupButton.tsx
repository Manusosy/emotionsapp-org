import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMessaging } from '@/features/messaging/hooks/useMessaging';

const MessagingSetupButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; error?: any } | null>(null);
  const { setupMessaging } = useMessaging();

  const handleSetupMessaging = async () => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const success = await setupMessaging();
      setResult({ success });
    } catch (error) {
      setResult({ success: false, error });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button 
        onClick={handleSetupMessaging} 
        disabled={isLoading}
        variant="default"
      >
        {isLoading ? 'Setting up messaging system...' : 'Set Up Messaging System'}
      </Button>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          <AlertDescription>
            {result.success 
              ? "Messaging system has been successfully set up!" 
              : `Failed to set up messaging system: ${result.error?.message || 'Unknown error'}`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default MessagingSetupButton; 