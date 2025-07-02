import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Video, Clock, Play, Loader2, AlertCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { supportGroupsService } from '@/services';
import { format } from 'date-fns';

interface ActiveSession {
  sessionId: string;
  groupId: string;
  groupName: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  canJoin: boolean;
  reason?: string;
}

const ActiveGroupSessions: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningSession, setJoiningSession] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchActiveGroupSessions();
      
      // Poll for updates every 30 seconds
      const interval = setInterval(fetchActiveGroupSessions, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const fetchActiveGroupSessions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Get user's groups with active sessions
      const groupSessions = await supportGroupsService.getMemberGroupSessions(user.id);
      
      const activeSessionsData: ActiveSession[] = [];
      
      for (const groupData of groupSessions) {
        // Check for active session
        if (groupData.activeSession) {
          const canJoinResult = await supportGroupsService.canUserJoinSession(
            groupData.activeSession.session.id, 
            user.id
          );
          
          activeSessionsData.push({
            sessionId: groupData.activeSession.session.id,
            groupId: groupData.group.id,
            groupName: groupData.group.name,
            startTime: groupData.activeSession.session.start_time,
            endTime: groupData.activeSession.session.end_time,
            status: groupData.activeSession.session.status as any,
            canJoin: canJoinResult.data?.canJoin || false,
            reason: canJoinResult.data?.reason
          });
        }
      }
      
      setActiveSessions(activeSessionsData);
    } catch (error) {
      console.error('Error fetching active group sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async (session: ActiveSession) => {
    if (!session.canJoin) {
      toast.error('Cannot join session', {
        description: session.reason || 'Session not available'
      });
      return;
    }

    try {
      setJoiningSession(session.sessionId);
      
      // Track that user is joining the session
      await supportGroupsService.trackSessionJoin(session.sessionId, user!.id);
      
      // Navigate to the in-app session page
      navigate(`/patient-dashboard/group-session/${session.sessionId}`);
      
      toast.success('Joining session...', {
        description: `Joining ${session.groupName} meeting`
      });
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Failed to join session');
    } finally {
      setJoiningSession(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="text-blue-600">Scheduled</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-500 text-white animate-pulse">Live</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-gray-600">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Video className="w-5 h-5 mr-2 text-[#20C0F3]" />
            Active Group Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#20C0F3]" />
            <span className="ml-2 text-gray-600">Loading sessions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Video className="w-5 h-5 mr-2 text-[#20C0F3]" />
          Active Group Sessions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeSessions.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Active Sessions</h3>
            <p className="text-gray-500">
              Your group sessions will appear here when mentors start them.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div
                key={session.sessionId}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">{session.groupName}</h4>
                      {getStatusBadge(session.status)}
                    </div>
                    
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{session.startTime} - {session.endTime}</span>
                    </div>
                    
                    {!session.canJoin && session.reason && (
                      <div className="flex items-center text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        <span>{session.reason}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {session.status === 'in_progress' && session.canJoin && (
                      <Button
                        size="sm"
                        onClick={() => handleJoinSession(session)}
                        disabled={joiningSession === session.sessionId}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        {joiningSession === session.sessionId ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Join Session
                      </Button>
                    )}
                    
                    {session.status === 'scheduled' && (
                      <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded">
                        Waiting for mentor to start
                      </div>
                    )}
                    
                    {session.status === 'in_progress' && !session.canJoin && (
                      <div className="text-sm text-amber-600 bg-amber-100 px-3 py-1 rounded">
                        Cannot join yet
                      </div>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/patient-dashboard/group-session/${session.sessionId}`)}
                      className="flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                      {session.status === 'in_progress' && (
                        <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse ml-1.5"></span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ActiveGroupSessions; 