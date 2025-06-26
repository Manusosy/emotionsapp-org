import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Phone, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import DailyIframe from '@daily-co/daily-js';
import { appointmentService } from '@/services/appointments/appointment.service';
import { dailyService } from '@/services/daily/daily.service';
import { getEnvVar } from '@/lib/utils';
import { EventBus } from '@/App';
import { supabase } from '@/lib/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// Function to aggressively clean up any existing Daily.co iframes
const destroyAllDailyIframes = () => {
  // Find and remove any Daily.co iframes in the DOM
  try {
    // Find all iframes that might be Daily.co iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      if (iframe.src && (
          iframe.src.includes('daily.co') || 
          iframe.dataset.dailyIframe || 
          iframe.id?.includes('daily') ||
          iframe.className?.includes('daily')
        )) {
        // Remove the iframe from the DOM
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }
    });
  } catch (e) {
    console.error('Error cleaning up Daily.co DOM elements:', e);
  }
};

// Standard fallback values - get from environment
const FALLBACK_DOMAIN = getEnvVar('VITE_DAILY_DOMAIN', 'emotionsapp.daily.co');

// Add this function at the top level, outside of any component
const getApiKeyErrorMessage = (error: string | null): string | null => {
  if (!error) return null;
  
  // Check for specific API key related errors
  if (error.includes('authentication-error') || 
      error.includes('API error (401)') || 
      error.includes('API error (403)')) {
    return 'The Daily.co API key appears to be invalid or expired. Please check your environment variables and ensure you have a valid API key.';
  }
  
  if (error.includes('API error (400)')) {
    return 'There was an error creating the video call room. This might be due to an invalid room configuration or API key issues.';
  }
  
  if (error.includes('Network error')) {
    return 'Could not connect to the Daily.co API. Please check your internet connection and try again.';
  }
  
  return error;
};

interface AppointmentUpdate {
  new: {
    id: string;
    meeting_link?: string;
    status: string;
  } | null;
  old: {
    id: string;
    meeting_link?: string;
    status: string;
  } | null;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  schema: string;
  table: string;
}

// Base Call Page Component
const DirectCallPage = ({ isMentor, redirectPath }: { isMentor: boolean, redirectPath: string }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<ReturnType<typeof DailyIframe.createFrame> | null>(null);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<number | null>(null);
  const [isRoomReady, setIsRoomReady] = useState(false);
  
  // Daily.co configuration - use only domain as we don't need API key in frontend component
  const dailyDomain = getEnvVar('VITE_DAILY_DOMAIN', FALLBACK_DOMAIN);
  
  // Clean up on mount and unmount
  useEffect(() => {
    mountedRef.current = true;
    destroyAllDailyIframes();
    
    return () => {
      mountedRef.current = false;
      
      // Clear any pending retries
      if (retryTimeoutRef.current) {
        window.clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (callFrameRef.current) {
        try {
          callFrameRef.current.leave().catch(() => {}).finally(() => {
            if (callFrameRef.current) {
              callFrameRef.current.destroy();
              callFrameRef.current = null;
            }
          });
        } catch (e) {
          console.error('Error cleaning up call frame:', e);
        }
      }
      destroyAllDailyIframes();
    };
  }, [id, isMentor, refreshKey]);
  
  // Function to force a complete refresh of the component
  const forceRefresh = useCallback(() => {
    // Clean up any existing call frame
    if (callFrameRef.current) {
      try {
        callFrameRef.current.leave().catch(() => {}).finally(() => {
          if (callFrameRef.current) {
            callFrameRef.current.destroy();
            callFrameRef.current = null;
          }
        });
      } catch (e) {
        console.error('Error cleaning up call frame during refresh:', e);
      }
    }
    
    // Clean up any Daily iframes
    destroyAllDailyIframes();
    
    // Reset state
    setIsCallStarted(false);
    setIsInitializing(false);
    setError(null);
    
    // Increment the refresh key to trigger a re-render
    setRefreshKey(prev => prev + 1);
    
    // Show feedback to user
    toast.info('Refreshing call data...');
  }, []);
  
  // Add subscription for real-time updates
  useEffect(() => {
    if (!id) return;

    const appointmentSubscription = supabase
      .channel('appointment_room_updates')
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `id=eq.${id}`
        },
        (payload: AppointmentUpdate) => {
          console.log('Appointment update received:', payload);
          
          // If we receive an update with a meeting link, update our state
          if (payload.new && payload.new.meeting_link) {
            setRoomUrl(payload.new.meeting_link);
            setIsRoomReady(true);
            setIsLoading(false);
          }
        }
      )
      .subscribe();

    return () => {
      appointmentSubscription.unsubscribe();
    };
  }, [id]);
  
  // Fetch appointment details and get/create room when component mounts
  useEffect(() => {
    if (!id) return;
    
    const fetchAppointmentAndPrepareRoom = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('Fetching appointment data and preparing room...');
        
        if (!id) {
          throw new Error('Appointment ID is missing');
        }
        
        // First, fetch the appointment details
        const { data: appointmentData, error: appointmentError } = await appointmentService.getAppointmentById(id);
        
        if (appointmentError || !appointmentData) {
          throw new Error(appointmentError || 'Failed to fetch appointment details');
        }
        
        // Store appointment details
        setAppointmentDetails(appointmentData);
        
        // Set audio-only mode based on appointment type
        if (appointmentData.meeting_type && appointmentData.meeting_type.toLowerCase() === 'audio') {
          console.log('Setting audio-only mode for this call');
          setIsAudioOnly(true);
        } else {
          setIsAudioOnly(false);
        }
        
        console.log('Appointment details loaded:', JSON.stringify(appointmentData, null, 2));
        
        // Check if we already have a meeting link
        if (appointmentData.meeting_link) {
          console.log('Using existing meeting link:', appointmentData.meeting_link);
          setRoomUrl(appointmentData.meeting_link);
          setIsRoomReady(true);
          setIsLoading(false);
          return;
        }
        
        // If we're not the mentor and there's no meeting link, show waiting message
        if (!isMentor) {
          setIsLoading(false);
          setError('Waiting for mentor to start the session...');
          return;
        }
        
        // Only mentors can create rooms
        if (isMentor) {
          // No meeting link found, create a new room
          console.log('No meeting link found, creating a new room...');
          toast.info('Creating video call room...');
          
          // Explicitly create a room for this appointment
          const { data: sessionData, error: sessionError } = await appointmentService.startAppointmentSession(id);
          
          if (sessionError || !sessionData || !sessionData.roomUrl) {
            console.error('Failed to create room:', sessionError);
            throw new Error(sessionError || 'Failed to create video call room');
          }
          
          console.log('Room created successfully:', sessionData.roomUrl);
          toast.success('Video call room ready');
          
          // Set the room URL
          setRoomUrl(sessionData.roomUrl);
          setIsRoomReady(true);
        }
        
        setIsLoading(false);
      } catch (error: any) {
        console.error('Error in fetchAppointmentAndPrepareRoom:', error);
        setError(error.message || 'Failed to prepare video call');
        toast.error('Failed to prepare video call', { 
          description: error.message || 'Please try again later'
        });
        setIsLoading(false);
      } 
    };
    
    fetchAppointmentAndPrepareRoom();
  }, [id, refreshKey, isMentor]);
  
  const startCall = () => {
    try {
      console.log('Starting call...');
      setIsInitializing(true);
      setError(null); // Clear any previous errors
      toast.loading('Initializing video call...');

      if (!roomUrl) {
        throw new Error('Room URL is missing. Cannot start call.');
      }
      
      // Log the room URL being used
      console.log('Initializing call with room URL:', roomUrl);
      setIsCallStarted(true);
      
      // Add a small delay before initializing the call frame
      const timeoutId = window.setTimeout(() => {
        if (!mountedRef.current) return;
        
        // Initialize the call and handle potential errors
        initializeCall().catch(err => {
          console.error('Error during call initialization:', err);
          setError(`Failed to initialize call: ${err instanceof Error ? err.message : 'Unknown error'}`);
          setIsInitializing(false);
          setIsCallStarted(false);
          toast.dismiss();
          toast.error('Failed to initialize call');
        });
      }, 1000);
    } catch (error: any) {
      console.error('Error starting call:', error);
      setError(`Failed to start call: ${error.message || 'Unknown error'}`);
      setIsInitializing(false);
      setIsCallStarted(false);
      toast.dismiss();
      toast.error('Failed to start video call');
    }
  };
  
  const initializeCall = async () => {
    // Check if room URL is available
    if (!roomUrl) {
      setError('Cannot initialize call: Room URL is not available.');
      setIsInitializing(false);
      return;
    }
    
    console.log('Using room URL:', roomUrl);
    
    // Check if the wrapper element is available
    if (!wrapperRef.current) {
      setError('Cannot initialize call: Video container not ready.');
      setIsInitializing(false);
      return;
    }
    
    // Add a small delay to ensure DOM is ready
    const initTimeoutId = window.setTimeout(() => {
      if (!mountedRef.current) {
        return;
      }
      
      // Check for camera and mic permissions based on call type
      console.log(`Requesting permissions for ${isAudioOnly ? 'audio-only' : 'video'} call`);
      navigator.mediaDevices.getUserMedia({ video: isAudioOnly ? false : true, audio: true })
        .then(() => {
          try {
            // Destroy any existing call frame
            if (callFrameRef.current) {
                try {
                  callFrameRef.current.destroy();
                } catch (e) {
                console.warn('Error destroying existing call frame:', e);
              }
              callFrameRef.current = null;
            }
            
            // Clean up any Daily iframes that might be lingering one more time
            destroyAllDailyIframes();
            
            // Create Daily.co call frame with proper configuration
            // Make sure wrapper element exists before creating frame
            if (!wrapperRef.current) {
              throw new Error('Wrapper element not found');
            }
            
            // Determine user name to display in the call
            let userName = isMentor 
              ? (appointmentDetails?.mentor?.full_name || 'Mentor') 
              : (appointmentDetails?.patient?.full_name || 'Patient');
            
            console.log('Setting user name for call:', userName);
            console.log('Creating Daily.co frame with URL:', roomUrl);
            
            // Create the call frame with the room URL
            if (isAudioOnly) {
              console.log('Creating audio-only call frame');
              callFrameRef.current = DailyIframe.createFrame(wrapperRef.current, {
                url: roomUrl,
                showLeaveButton: true,
                iframeStyle: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '8px'
                },
                showFullscreenButton: true,
                videoSource: false,
                audioSource: true
              });
            } else {
              console.log('Creating video call frame');
              callFrameRef.current = DailyIframe.createFrame(wrapperRef.current, {
                url: roomUrl,
                showLeaveButton: true,
                iframeStyle: {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '8px'
                },
                showFullscreenButton: true,
                videoSource: true,
                audioSource: true
              });
            }
            
            // Add debugging info
            console.log('Call frame created, adding event listeners...');
            
            // Listen for Daily.co events
            callFrameRef.current
              .on('loading', () => {
                console.log('Daily.co iframe loading');
              })
              .on('loaded', () => {
                console.log('Daily.co iframe loaded');
                // Hide our loading overlay after a short delay to allow the Daily.co UI to appear
                toast.dismiss(); // Dismiss the loading toast
                const uiTimeoutId = window.setTimeout(() => {
                  setIsInitializing(false);
                }, 1000);
              })
              .on('started-camera', () => {
                console.log('Daily.co camera started');
              })
              .on('camera-error', (error) => {
                console.error('Daily.co camera error:', error);
                toast.error('Camera error', {
                  description: 'There was a problem accessing your camera'
                });
              })
              .on('joining-meeting', () => {
                console.log('Joining meeting...');
                toast.info('Joining video call...');
              })
              .on('joined-meeting', () => {
                console.log('Joined meeting successfully');
                toast.dismiss(); // Dismiss any loading toasts
                toast.success('You have joined the call');
              })
              .on('left-meeting', () => {
                console.log('Left meeting');
                  endCall();
              })
              .on('participant-joined', (event) => {
                console.log('Participant joined:', event);
                const displayName = event.participant.user_name || 'Someone';
                toast.info(`${displayName} joined the call`);
              })
              .on('error', (error: any) => {
                console.error('Daily.co error:', error);
                toast.error('Call error', {
                  description: error?.errorMsg || 'An error occurred during the call'
                });
              });
            
            // Log right before joining
            console.log('About to join meeting with call frame:', callFrameRef.current);
            
            // Join the meeting
            callFrameRef.current.join();
            console.log('Join method called');
            
          } catch (err) {
            console.error('Error initializing call:', err);
            setError(`Failed to initialize call: ${err instanceof Error ? err.message : 'Unknown error'}`);
            setIsInitializing(false);
          }
        })
        .catch((err) => {
          console.error('Permission error:', err);
          setError('Camera or microphone access denied. Please check your browser permissions and try again.');
          setIsInitializing(false);
        });
    }, 1000);
  };
  
  const endCall = () => {
    console.log('Ending call...');
    
    if (callFrameRef.current) {
      try {
        // Destroy the call frame
        callFrameRef.current.leave().catch(() => {}).finally(() => {
          if (callFrameRef.current) {
            callFrameRef.current.destroy();
            callFrameRef.current = null;
          }
          
          // Clean up any potential rogue iframes
          destroyAllDailyIframes();
          
          // Reset state
            setIsCallStarted(false);
            setIsInitializing(false);
          
          // Navigate back to the appointments page
          if (redirectPath) {
            navigate(redirectPath);
          }
        });
      } catch (e) {
        console.error('Error ending call:', e);
        
        // Clean up aggressively if there was an error
        destroyAllDailyIframes();
        callFrameRef.current = null;
          setIsCallStarted(false);
          setIsInitializing(false);
        
        // Navigate back to the appointments page
        if (redirectPath) {
          navigate(redirectPath);
        }
      }
    } else {
      // No call frame, just navigate back
        setIsCallStarted(false);
        setIsInitializing(false);
      
      if (redirectPath) {
        navigate(redirectPath);
      }
    }
  };
  
  const retryFetchRoom = async () => {
    forceRefresh();
  };
  
    return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8">
      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {isAudioOnly ? (
              <>
                <div className="flex items-center space-x-2">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>Audio Call</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <Video className="h-5 w-5 text-primary" />
                  <span>Video Call</span>
                </div>
              </>
            )}
            
            {!isCallStarted && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate(redirectPath)}
                aria-label="Close"
                className="rounded-full h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {error ? (
            <div className="bg-destructive/10 p-4 rounded-lg text-center mb-4">
              <h3 className="text-xl font-semibold text-destructive mb-4">Video Call Error</h3>
              
              <div className="space-y-4">
                <p className="text-lg">We encountered an error</p>
                <p className="text-destructive">{error}</p>
                
                {getApiKeyErrorMessage(error) && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-amber-800 font-medium">API Key Issue Detected</p>
                    <p className="text-amber-700 mt-1">{getApiKeyErrorMessage(error)}</p>
                    <p className="text-amber-700 mt-2 text-sm">
                      Visit the <a href="https://dashboard.daily.co/developers" target="_blank" rel="noopener noreferrer" className="underline">Daily.co Developer Dashboard</a> to generate a new API key.
                    </p>
                  </div>
                )}
                
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Possible solutions:</h4>
                  <ul className="list-disc list-inside text-left space-y-2">
              <li>Check that your camera and microphone are connected</li>
              <li>Allow browser permissions for camera and microphone when prompted</li>
              <li>Try using a different browser</li>
              <li>Restart your computer if the issue persists</li>
                    {error.includes('API') && (
                      <li className="text-amber-700">Contact your administrator to verify the Daily.co API configuration</li>
                    )}
            </ul>
          </div>
          
                <div className="flex justify-center space-x-4 mt-6">
            <Button
                    onClick={retryFetchRoom} 
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
            </Button>
            
            <Button 
                    onClick={() => navigate(redirectPath)} 
              variant="outline" 
                    className="flex items-center space-x-1"
            >
                    <X className="h-4 w-4 mr-2" />
              Return to Dashboard
            </Button>
          </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
              <p>Loading appointment details...</p>
            </div>
          ) : isCallStarted ? (
            <div ref={wrapperRef} className="relative aspect-video rounded-lg overflow-hidden w-full min-h-[500px]">
              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent mb-4"></div>
                    <p>Initializing call...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center space-y-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  {isAudioOnly ? (
                    <Phone className="h-12 w-12 text-primary" />
                  ) : (
                    <Video className="h-12 w-12 text-primary" />
                  )}
          </div>
          
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {isMentor 
                      ? `Start Session with ${appointmentDetails?.patient?.full_name || 'Patient'}`
                      : `Join Session with ${appointmentDetails?.mentor?.full_name || appointmentDetails?.mentor?.name || 'Mentor'}`
                    }
                  </h3>
                  
                  <p className="text-muted-foreground mb-6">
                    {isAudioOnly
                      ? 'This is an audio-only call. Your camera will remain off during the session.'
                      : 'Your camera and microphone will be activated when you join the call.'
                    }
                  </p>
                  
                  {appointmentDetails && (
                    <div className="text-sm text-muted-foreground mb-6">
                      <p>
                        <span className="font-medium">
                          {isMentor ? 'Patient' : 'Mentor'}:
                        </span>{' '}
                        {isMentor 
                          ? (appointmentDetails.patient?.full_name || 
                             appointmentDetails.patient?.name ||
                             appointmentDetails.patient?.email || 
                             'Patient')
                          : (appointmentDetails.mentor?.full_name || 
                             appointmentDetails.mentor?.name ||
                             appointmentDetails.mentor?.email || 
                             'Mentor')
                        }
                      </p>
                      
                      <p>
                        <span className="font-medium">Date:</span>{' '}
                        {appointmentDetails.date}
                      </p>
                      
                      <p>
                        <span className="font-medium">Time:</span>{' '}
                        {appointmentDetails.start_time} - {appointmentDetails.end_time}
                      </p>
                    </div>
                  )}
            
            <Button 
                    onClick={startCall}
                    size="lg"
                    className="w-full md:w-auto min-w-[200px]"
                  >
                    {isMentor ? 'Start Session' : 'Join Session'}
            </Button>
          </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export const PatientDirectCallPage = () => {
  return <DirectCallPage isMentor={false} redirectPath="/patient-dashboard/appointments" />;
};

export const MentorDirectCallPage = () => {
  return <DirectCallPage isMentor={true} redirectPath="/mood-mentor-dashboard/appointments" />;
};

export default DirectCallPage; 