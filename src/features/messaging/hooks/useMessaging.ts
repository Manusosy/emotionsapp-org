import { useState, useEffect } from 'react';
import { supabase, setupMessagingSystem, isMessagingSystemSetup } from '@/lib/supabase';
import { toast } from 'sonner';

interface SetupResult {
  success: boolean;
  error?: Error | { message?: string } | unknown;
}

export function useMessaging() {
  const [isMessagingSetup, setIsMessagingSetup] = useState<boolean | null>(null);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if the messaging system is set up
  useEffect(() => {
    async function checkMessagingSetup() {
      setIsCheckingSetup(true);
      try {
        const isSetup = await isMessagingSystemSetup();
        
        if (isSetup) {
          setIsMessagingSetup(true);
          setError(null);
        } else {
          setIsMessagingSetup(false);
          setError('Messaging system is not set up yet. Please set it up to enable messaging.');
        }
      } catch (err) {
        console.error('Unexpected error checking messaging setup:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Unexpected error: ${errorMessage}`);
        setIsMessagingSetup(null);
      } finally {
        setIsCheckingSetup(false);
      }
    }

    checkMessagingSetup();
  }, []);

  // Function to set up the messaging system
  const setupMessaging = async () => {
    try {
      const result = await setupMessagingSystem() as SetupResult;
      if (result.success) {
        toast.success('Messaging system set up successfully!');
        setIsMessagingSetup(true);
        setError(null);
        return true;
      } else {
        const errorMessage = result.error instanceof Error 
          ? result.error.message 
          : typeof result.error === 'object' && result.error && 'message' in result.error 
            ? String(result.error.message) 
            : 'Unknown error';
            
        toast.error(`Failed to set up messaging system: ${errorMessage}`);
        setError(`Failed to set up messaging system: ${errorMessage}`);
        return false;
      }
    } catch (err) {
      console.error('Error setting up messaging system:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Error setting up messaging system: ${errorMessage}`);
      setError(`Error setting up messaging system: ${errorMessage}`);
      return false;
    }
  };

  return {
    isMessagingSetup,
    isCheckingSetup,
    error,
    setupMessaging
  };
} 