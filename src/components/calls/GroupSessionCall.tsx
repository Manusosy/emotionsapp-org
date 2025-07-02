import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Video, VideoOff, Mic, MicOff, PhoneOff, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GroupSessionCallProps {
  meetingUrl: string;
  sessionId: string;
  groupId: string;
  onEndCall?: () => void;
  isMentor?: boolean;
}

const GroupSessionCall: React.FC<GroupSessionCallProps> = ({
  meetingUrl,
  sessionId,
  groupId,
  onEndCall,
  isMentor = false
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState('70vh');

  useEffect(() => {
    // Set iframe height based on window height
    const updateHeight = () => {
      setIframeHeight(`${window.innerHeight * 0.7}px`);
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleEndCall = async () => {
    if (onEndCall) {
      onEndCall();
    } else {
      // If no callback provided, navigate back
      navigate(-1);
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError('Failed to load video call. Please check your connection and try again.');
  };

  return (
    <Card className="w-full shadow-lg border-0">
      <CardHeader className="bg-[#20C0F3]/10 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl flex items-center">
            <Users className="mr-2 h-5 w-5 text-[#20C0F3]" />
            Group Session Call
          </CardTitle>
          {loading && (
            <div className="flex items-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Connecting...
            </div>
          )}
        </div>
        <CardDescription>
          {isMentor ? 'You are hosting this session' : 'You have joined this group session'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0 relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#20C0F3] mx-auto mb-4" />
              <p className="text-gray-600">Connecting to session...</p>
            </div>
          </div>
        )}
        
        {error ? (
          <div className="p-8 text-center">
            <VideoOff className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        ) : (
          <iframe
            src={meetingUrl}
            allow="camera; microphone; fullscreen; speaker; display-capture"
            style={{ width: '100%', height: iframeHeight, border: 'none' }}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          ></iframe>
        )}
      </CardContent>
      
      <CardFooter className="border-t p-4 flex justify-between bg-gray-50">
        <div className="text-sm text-gray-500 flex items-center">
          <Users className="h-4 w-4 mr-2" />
          Session ID: {sessionId.substring(0, 8)}...
        </div>
        <Button 
          variant="destructive" 
          onClick={handleEndCall} 
          className="bg-red-500 hover:bg-red-600"
        >
          <PhoneOff className="h-4 w-4 mr-2" />
          {isMentor ? 'End Session' : 'Leave Session'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default GroupSessionCall; 