import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Play, 
  Users, 
  Clock, 
  Video, 
  Loader2, 
  CheckCircle, 
  Plus,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import { supportGroupsService } from '@/services';
import { format } from 'date-fns';
import type { SessionWithAttendance } from '@/services/support-groups/support-groups.interface';

interface TodaysSessionsTableProps {
  groupId: string;
  groupName: string;
  memberCount: number;
  onSessionStarted?: () => void;
  onSessionEnded?: () => void;
}

interface LiveSessionData {
  sessionId: string;
  attendeeCount: number;
  totalMembers: number;
}

const TodaysSessionsTable: React.FC<TodaysSessionsTableProps> = ({
  groupId,
  groupName,
  memberCount,
  onSessionStarted,
  onSessionEnded
}) => {
  const [sessions, setSessions] = useState<SessionWithAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingSessions, setStartingSessions] = useState<Set<string>>(new Set());
  const [endingSessions, setEndingSessions] = useState<Set<string>>(new Set());
  const [liveSessionData, setLiveSessionData] = useState<Map<string, LiveSessionData>>(new Map());

  useEffect(() => {
    fetchTodaysSessions();
    
    // Set up polling for live session data
    const interval = setInterval(() => {
      updateLiveSessionData();
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [groupId]);

  const fetchTodaysSessions = async () => {
    try {
      setLoading(true);
      
      // Get today's scheduled sessions
      const { data: todaySessions, error } = await supportGroupsService.getTodaysScheduledSessions(groupId);
      
      if (error) {
        console.error('Error fetching today\'s sessions:', error);
        toast.error('Failed to load today\'s sessions');
        return;
      }

      // If no sessions exist for today, create them based on group schedule
      if (!todaySessions || todaySessions.length === 0) {
        await createSessionsFromSchedule();
      } else {
        setSessions(todaySessions);
        // Initialize live data for in-progress sessions
        todaySessions.forEach(session => {
          if (session.status === 'in_progress') {
            setLiveSessionData(prev => new Map(prev.set(session.id, {
              sessionId: session.id,
              attendeeCount: session.attendance_count || 0,
              totalMembers: memberCount
            })));
          }
        });
      }
    } catch (error) {
      console.error('Error in fetchTodaysSessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const createSessionsFromSchedule = async () => {
    try {
      // Get group details to access meeting schedule
      const group = await supportGroupsService.getSupportGroupById(groupId);
      if (!group || !group.meeting_schedule) {
        setSessions([]);
        return;
      }

      const today = new Date();
      const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' });
      const todayDate = today.toISOString().split('T')[0];

      // Check if group meets today
      const todaysSchedule = group.meeting_schedule.find(
        schedule => schedule.day.toLowerCase() === todayDay.toLowerCase()
      );

      if (todaysSchedule) {
        // Create session for today
        const { data: newSession, error } = await supportGroupsService.createScheduledSession(
          groupId,
          todayDate,
          todaysSchedule.time
        );

        if (error) {
          console.error('Error creating scheduled session:', error);
          setSessions([]);
        } else if (newSession) {
          setSessions([{
            ...newSession,
            title: newSession.title || '',
            end_time: newSession.end_time || '',
            attendance_count: 0,
            total_members: memberCount,
            attendance_rate: 0
          }]);
        }
      } else {
        setSessions([]);
      }
    } catch (error) {
      console.error('Error creating sessions from schedule:', error);
      setSessions([]);
    }
  };

  const updateLiveSessionData = async () => {
    // Update attendance data for in-progress sessions
    const inProgressSessions = sessions.filter(s => s.status === 'in_progress');
    
    for (const session of inProgressSessions) {
      try {
        const attendance = await supportGroupsService.getSessionAttendance(session.id);
        const attendeeCount = attendance?.filter((a: any) => a.status === 'present').length || 0;
        
        setLiveSessionData(prev => new Map(prev.set(session.id, {
          sessionId: session.id,
          attendeeCount,
          totalMembers: memberCount
        })));
      } catch (error) {
        console.error('Error updating live session data:', error);
      }
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      setStartingSessions(prev => new Set(prev.add(sessionId)));
      
      toast.loading('Creating meeting room...');
      
      const { data: sessionData, error } = await supportGroupsService.startSession(sessionId);
      
      toast.dismiss();
      
      if (error) {
        toast.error('Failed to start session', { description: error });
        return;
      }

      if (sessionData) {
        toast.success('Session started successfully!', {
          description: 'All group members have been notified'
        });

        // Update session status in local state
        setSessions(prev => prev.map(session => 
          session.id === sessionId 
            ? { ...session, status: 'in_progress', meeting_link: sessionData.meetingUrl }
            : session
        ));

        // Initialize live session data
        setLiveSessionData(prev => new Map(prev.set(sessionId, {
          sessionId,
          attendeeCount: 0,
          totalMembers: memberCount
        })));

        // Open meeting room in new tab
        if (sessionData.meetingUrl) {
          window.open(sessionData.meetingUrl, '_blank');
        }

        if (onSessionStarted) {
          onSessionStarted();
        }
      }
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    } finally {
      setStartingSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      setEndingSessions(prev => new Set(prev.add(sessionId)));
      
      toast.loading('Ending session...');
      
      const result = await supportGroupsService.endSession(sessionId);
      
      toast.dismiss();
      
      if (result.error) {
        toast.error('Failed to end session', { description: result.error });
        return;
      }

      toast.success('Session ended successfully!');

      // Update session status in local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: 'completed', meeting_link: undefined }
          : session
      ));

      // Remove from live session data
      setLiveSessionData(prev => {
        const newMap = new Map(prev);
        newMap.delete(sessionId);
        return newMap;
      });

      if (onSessionEnded) {
        onSessionEnded();
      }
    } catch (error) {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    } finally {
      setEndingSessions(prev => {
        const newSet = new Set(prev);
        newSet.delete(sessionId);
        return newSet;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Scheduled</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-500 text-white">Live</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-gray-600">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[#20C0F3]" />
        <span className="ml-2 text-gray-600">Loading today's sessions...</span>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Sessions Today</h3>
        <p className="text-gray-500 mb-4">
          This group doesn't have any scheduled sessions for today based on the meeting schedule.
        </p>
        <p className="text-sm text-gray-400">
          Group meets: {/* Add schedule display here if needed */}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Attendance</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => {
            const isStarting = startingSessions.has(session.id);
            const isEnding = endingSessions.has(session.id);
            const liveData = liveSessionData.get(session.id);
            
            return (
              <TableRow key={session.id}>
                <TableCell>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      <div className="font-medium">
                        {session.start_time} - {session.end_time}
                      </div>
                      <div className="text-sm text-gray-500">
                        {session.title || `${groupName} Session`}
                      </div>
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  {getStatusBadge(session.status)}
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-gray-500" />
                    <div>
                      {session.status === 'in_progress' && liveData ? (
                        <div className="font-medium text-green-600">
                          {liveData.attendeeCount} / {memberCount} joined
                        </div>
                      ) : (
                        <div className="text-gray-600">
                          {memberCount} members
                        </div>
                      )}
                      {session.status === 'in_progress' && liveData && (
                        <div className="text-xs text-gray-500">
                          {Math.round((liveData.attendeeCount / memberCount) * 100)}% attendance
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center gap-2">
                    {session.status === 'scheduled' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartSession(session.id)}
                        disabled={isStarting}
                        className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                      >
                        {isStarting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Start Session
                      </Button>
                    )}
                    
                    {session.status === 'in_progress' && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const sessionData = sessions.find(s => s.id === session.id);
                            if (sessionData && 'meeting_link' in sessionData && sessionData.meeting_link) {
                              window.open(sessionData.meeting_link, '_blank');
                            } else {
                              toast.error('Meeting link not available');
                            }
                          }}
                          className="border-green-500 text-green-600 hover:bg-green-50"
                        >
                          <Video className="h-4 w-4 mr-2" />
                          Join Meeting
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEndSession(session.id)}
                          disabled={isEnding}
                          className="border-red-500 text-red-600 hover:bg-red-50"
                        >
                          {isEnding ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Square className="h-4 w-4 mr-2" />
                          )}
                          End Session
                        </Button>
                        <div className="flex items-center text-green-600 text-sm">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                          Live
                        </div>
                      </div>
                    )}
                    
                    {session.status === 'completed' && (
                      <div className="flex items-center text-gray-500 text-sm">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Completed
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {sessions.some(s => s.status === 'in_progress') && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse" />
            <div>
              <h4 className="font-medium text-green-800">Session in Progress</h4>
              <p className="text-sm text-green-600">
                Real-time attendance tracking is active. Members can join anytime during the session.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodaysSessionsTable; 