import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '@/contexts/authContext';
import DashboardLayout from '../components/DashboardLayout';
import GroupSessionCall from '@/components/calls/GroupSessionCall';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import { supportGroupsService } from '@/services';

const GroupSessionPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meetingUrl, setMeetingUrl] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isMentor, setIsMentor] = useState(false);

  useEffect(() => {
    if (!sessionId || !user) {
      setError('Invalid session or user not authenticated');
      setLoading(false);
      return;
    }

    const fetchSessionDetails = async () => {
      try {
        // Check if user is a mentor
        const userRole = user.user_metadata?.role;
        setIsMentor(userRole === 'mood_mentor');

        if (userRole === 'mood_mentor') {
          // For mentors - get session details and start if not started
          const { data: session, error: sessionError } = await supportGroupsService.getSessionById(sessionId);
          
          if (sessionError || !session) {
            setError('Session not found');
            setLoading(false);
            return;
          }

          setGroupId(session.group_id);

          // If session is already in progress with a meeting link
          if (session.status === 'in_progress' && session.meeting_link) {
            setMeetingUrl(session.meeting_link);
          } else {
            // Start the session
            const result = await supportGroupsService.startSession(sessionId);
            
            if (result.error) {
              setError(`Failed to start session: ${result.error}`);
              setLoading(false);
              return;
            }

            if (result.data) {
              setMeetingUrl(result.data.meetingUrl);
            } else {
              setError('Failed to get meeting URL');
            }
          }
        } else {
          // For patients - check if they can join
          const result = await supportGroupsService.canUserJoinSession(sessionId, user.id);
          
          if (result.error) {
            setError(`Error: ${result.error}`);
            setLoading(false);
            return;
          }

          if (!result.data?.canJoin) {
            setError(result.data?.reason || 'You cannot join this session');
            setLoading(false);
            return;
          }

          // Track that user joined the session
          await supportGroupsService.trackSessionJoin(sessionId, user.id);
          
          // Set the meeting URL
          setMeetingUrl(result.data.meetingUrl);
          
          // Get session details for group ID
          const { data: session } = await supportGroupsService.getSessionById(sessionId);
          if (session) {
            setGroupId(session.group_id);
          }
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching session details:', error);
        setError('Failed to load session');
        setLoading(false);
      }
    };

    fetchSessionDetails();
  }, [sessionId, user]);

  const handleEndCall = async () => {
    if (isMentor && sessionId) {
      try {
        const result = await supportGroupsService.endSession(sessionId);
        
        if (result.error) {
          toast.error(`Failed to end session: ${result.error}`);
        } else {
          toast.success('Session ended successfully');
          navigate(-1);
        }
      } catch (error) {
        console.error('Error ending session:', error);
        toast.error('Failed to end session');
      }
    } else {
      // For patients, just navigate back
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#20C0F3] mx-auto mb-4" />
            <p className="text-gray-600">Loading session...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-4xl mx-auto">
            <Button 
              variant="ghost" 
              className="mb-6" 
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-red-500 text-lg mb-4">{error}</div>
                <Button onClick={() => navigate(-1)}>Return to Dashboard</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          
          {meetingUrl && sessionId && groupId && (
            <GroupSessionCall
              meetingUrl={meetingUrl}
              sessionId={sessionId}
              groupId={groupId}
              onEndCall={handleEndCall}
              isMentor={isMentor}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GroupSessionPage; 