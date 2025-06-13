import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Video, Phone, X, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import DailyIframe from '@daily-co/daily-js';
import { appointmentService } from '@/services/appointments/appointment.service';
import { getEnvVar } from '@/lib/utils';
import { EventBus } from '@/App';

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

// Standard fallback values - should match those in daily.service.ts
const FALLBACK_DOMAIN = 'emotionsapp.daily.co';

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
  
  // Fetch appointment details and get/create room when component mounts
  useEffect(() => {
    if (!id) return;
    
    const fetchAppointmentAndPrepareRoom = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (!id) {
          setError('Missing appointment ID');
          setIsLoading(false);
          return;
        }
        
        // First, fetch the appointment details
        const { data: appointmentData, error: appointmentError } = await appointmentService.getAppointmentById(id || '');
        
        if (appointmentError) {
          console.error('Error fetching appointment:', appointmentError);
          setError(`Failed to load appointment details: ${appointmentError}`);
          setIsLoading(false);
          return;
        }
        
        if (!appointmentData) {
          setError('Appointment not found');
          setIsLoading(false);
          return;
        }
        
        setAppointmentDetails(appointmentData);
        
        // Check if patient and mentor data need to be swapped
        if (appointmentData.patient && appointmentData.mentor) {
          // If the patient data has "Mentor" in the name and mentor data doesn't, swap them
          if (
            (appointmentData.patient.full_name && appointmentData.patient.full_name.includes('Mentor')) ||
            (appointmentData.patient.name && appointmentData.patient.name.includes('Mentor'))
          ) {
            console.log('Swapping patient and mentor data');
            const temp = appointmentData.patient;
            appointmentData.patient = appointmentData.mentor;
            appointmentData.mentor = temp;
          }
        }
        
        // Check if this is an audio-only call
        const callType = appointmentData.meeting_type?.toLowerCase() || 'video';
        setIsAudioOnly(callType === 'audio');
        
        // Then, start the appointment session to get/create a room
        const { data: sessionData, error: sessionError } = await appointmentService.startAppointmentSession(id);
        
        if (sessionError) {
          console.error('Error starting appointment session:', sessionError);
          setError(`Failed to start call: ${sessionError}`);
          setIsLoading(false);
          return;
        }
        
        if (!sessionData || !sessionData.roomUrl) {
          setError('Failed to create video call room');
          setIsLoading(false);
          return;
        }
        
        console.log('Room URL:', sessionData.roomUrl);
        setRoomUrl(sessionData.roomUrl);
        setIsLoading(false);
        
        // Notify that appointment session was started successfully
        EventBus.emit('appointment-session-started', { 
          appointmentId: id,
          roomUrl: sessionData.roomUrl
        });
      } catch (error) {
        console.error('Unexpected error in fetchAppointmentAndPrepareRoom:', error);
        setError(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
        setIsLoading(false);
      }
    };
    
    fetchAppointmentAndPrepareRoom();
  }, [id, refreshKey]);
  
  const startCall = () => {
    if (!roomUrl) {
      setError('Cannot start call: Room not ready yet.');
      return;
    }
    
    if (isInitializing) {
      console.log('Call initialization already in progress, ignoring duplicate request');
      return;
    }
    
    // Reset any previous error state
    setError(null);
    
    // Clean up any existing call frames to prevent stale state
    if (callFrameRef.current) {
      try {
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      } catch (e) {
        console.error('Error cleaning up existing call frame:', e);
      }
    }
    
    // Clean up any Daily iframes that might be lingering
    destroyAllDailyIframes();
    
    setIsInitializing(true);
    setIsCallStarted(true);
    
    console.log('Starting call initialization with delay...');
    toast.info('Preparing video call, please wait...');
    
    // Use a longer timeout to ensure the DOM is ready
    const timeoutId = window.setTimeout(() => {
      if (mountedRef.current) {
        console.log('Initializing call after delay');
        initializeCall();
      } else {
        console.log('Component unmounted during initialization delay, aborting');
      }
    }, 2000); // Increased to 2 seconds for better stability
  };
  
  const initializeCall = () => {
    // Check if room URL is available
    if (!roomUrl) {
      setError('Cannot initialize call: Room URL is not available.');
      setIsInitializing(false);
      return;
    }
    
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
      
      // Check for camera and mic permissions
      navigator.mediaDevices.getUserMedia({ video: !isAudioOnly, audio: true })
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
            
            // Set up a MutationObserver to detect when the Daily.co name input appears
            const observer = new MutationObserver((mutations) => {
              // Look for the Daily.co name input field
              const nameInput = document.querySelector('input[placeholder="Enter your name"]');
              if (nameInput) {
                console.log('Daily.co name input detected, hiding loading overlay');
                setIsInitializing(false);
                observer.disconnect();
              }
            });
            
            // Start observing the document with the configured parameters
            observer.observe(document.body, { 
              childList: true, 
              subtree: true 
            });
            
            // Clean up observer on component unmount
            const currentObserver = observer;
            const observerTimeoutId = window.setTimeout(() => {
              if (mountedRef.current) {
                currentObserver.disconnect();
              }
            }, 10000); // Disconnect after 10 seconds to avoid memory leaks
            
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
              // Simplified dailyConfig to avoid TypeScript errors
              dailyConfig: {
                // Using a simpler configuration
              },
              showFullscreenButton: true,
              videoSource: !isAudioOnly,
              audioSource: true
            });
            
            // Listen for Daily.co events
            callFrameRef.current
              .on('loaded', () => {
                console.log('Daily.co iframe loaded');
                // Hide our loading overlay after a short delay to allow the Daily.co UI to appear
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
                toast.info('Joining video call...');
              })
              .on('joined-meeting', () => {
                toast.success('You have joined the call');
              })
              .on('left-meeting', () => {
                  endCall();
              })
              .on('participant-joined', (event) => {
                const displayName = event.participant.user_name || 'Someone';
                toast.info(`${displayName} joined the call`);
              })
              .on('error', (error: any) => {
                console.error('Daily.co error:', error);
                toast.error('Call error', {
                  description: error?.errorMsg || 'An error occurred during the call'
                });
              });
            
            // Join the meeting
            callFrameRef.current.join();
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
                
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Possible solutions:</h4>
                  <ul className="list-disc list-inside text-left space-y-2">
              <li>Check that your camera and microphone are connected</li>
              <li>Allow browser permissions for camera and microphone when prompted</li>
              <li>Try using a different browser</li>
              <li>Restart your computer if the issue persists</li>
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
                      ? `Start Session with James Madd`
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
                          ? 'James Madd'
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