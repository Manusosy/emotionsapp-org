import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Users, MapPin, Video, AlertCircle, Heart, UserPlus, UserMinus, Bell, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/authContext";
import { supportGroupsService, SupportGroup, GroupSession } from '@/services/support-groups/support-groups.service';
import DashboardLayout from "../components/DashboardLayout";
import { formatDistanceToNow, format, isToday, isTomorrow, addDays, differenceInHours } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  joined_at: string;
  role: 'member' | 'facilitator';
  user_profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface GroupWithDetails extends SupportGroup {
  next_session?: GroupSession;
  recent_sessions?: GroupSession[];
  total_sessions?: number;
  my_attendance_rate?: number;
  upcoming_meetings?: GroupSession[];
}

const SupportGroupsPage = () => {
  const { user } = useAuth();
  const [joinedGroups, setJoinedGroups] = useState<GroupWithDetails[]>([]);
  const [availableGroups, setAvailableGroups] = useState<SupportGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithDetails | null>(null);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [groupToLeave, setGroupToLeave] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('my-groups');

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      console.log('Fetching groups for user:', user.id);
      
      // Fetch groups the user has joined
      let myGroups: SupportGroup[] = [];
      try {
        myGroups = await supportGroupsService.getUserGroups(user.id);
        console.log('My groups:', myGroups);
      } catch (myGroupsError) {
        console.error('Error fetching user groups:', myGroupsError);
        // Continue with empty array
      }
      
      // Fetch all available groups
      let allGroups: SupportGroup[] = [];
      try {
        allGroups = await supportGroupsService.getActiveGroups();
        console.log('All available groups:', allGroups);
      } catch (allGroupsError) {
        console.error('Error fetching active groups:', allGroupsError);
        throw allGroupsError; // This one we need to fail on
      }
      
      // Filter out groups the user has already joined
      const joinedGroupIds = myGroups.map(g => g.id);
      const available = allGroups.filter(g => !joinedGroupIds.includes(g.id));
      
      // Enhance joined groups with detailed information
      const enhancedGroups = await Promise.all(
        myGroups.map(async (group) => {
          try {
            const sessions = await supportGroupsService.getGroupSessions(group.id);
            console.log(`Sessions for group ${group.name}:`, sessions);
            
            // Combine date and time to create proper date objects for comparison
            const sessionsWithDateTime = sessions.map(session => {
              try {
                return {
                  ...session,
                  fullDateTime: new Date(`${session.session_date}T${session.start_time}`)
                };
              } catch (dateError) {
                console.error('Error parsing date for session:', session, dateError);
                return {
                  ...session,
                  fullDateTime: new Date()
                };
              }
            });
            
            const nextSession = sessionsWithDateTime.find(s => s.fullDateTime > new Date());
            const recentSessions = sessionsWithDateTime
              .filter(s => s.fullDateTime <= new Date())
              .sort((a, b) => b.fullDateTime.getTime() - a.fullDateTime.getTime())
              .slice(0, 5);
            
            const totalSessions = sessionsWithDateTime.length;
            
            // Calculate real attendance rate based on session attendance
            let attendanceRate = 0;
            try {
              // Get user's attendance records for this group
              const { data: attendanceRecords } = await supabase
                .from('group_session_attendance')
                .select('attended, session_id, group_sessions!inner(group_id)')
                .eq('user_id', user.id)
                .eq('group_sessions.group_id', group.id);
              
              if (attendanceRecords && attendanceRecords.length > 0) {
                const attendedCount = attendanceRecords.filter(record => record.attended === true).length;
                attendanceRate = Math.round((attendedCount / attendanceRecords.length) * 100);
              } else {
                // If no attendance records, show 0% instead of random number
                attendanceRate = 0;
              }
            } catch (error) {
              console.error('Error calculating attendance rate:', error);
              attendanceRate = 0;
            }
            
            const upcomingMeetings = sessionsWithDateTime
              .filter(s => s.fullDateTime > new Date())
              .sort((a, b) => a.fullDateTime.getTime() - b.fullDateTime.getTime())
              .slice(0, 3);
            
            return {
              ...group,
              next_session: nextSession,
              recent_sessions: recentSessions,
              total_sessions: totalSessions,
              my_attendance_rate: attendanceRate,
              upcoming_meetings: upcomingMeetings
            } as GroupWithDetails;
          } catch (sessionError) {
            console.error(`Error fetching sessions for group ${group.name}:`, sessionError);
            return {
              ...group,
              total_sessions: 0,
              my_attendance_rate: 0
            } as GroupWithDetails;
          }
        })
      );
      
      setJoinedGroups(enhancedGroups);
      setAvailableGroups(available);
    } catch (error) {
      console.error('Error fetching groups:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Detailed error:', errorMessage);
      console.error('Full error object:', error);
      toast.error(`Failed to load support groups: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      // Add comprehensive debugging
      console.log('=== FRONTEND JOIN GROUP DEBUG ===');
      console.log('User object:', user);
      console.log('User ID:', user.id);
      console.log('User email:', user.email);
      console.log('User metadata:', user.user_metadata);
      console.log('Group ID:', groupId);
      console.log('Supabase client auth status:');
      
      // Check auth status
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', session);
      console.log('Session error:', sessionError);
      
      if (session) {
        console.log('Session user ID:', session.user.id);
        console.log('Session user email:', session.user.email);
      }
      
      console.log('Frontend: Attempting to join group', { groupId, userId: user.id, userEmail: user.email });
      
      await supportGroupsService.joinGroup(groupId, user.id);
      toast.success('Successfully joined the support group!');
      
      // Send notification to mentor about new member
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'A member';
      await sendNotificationToMentor(groupId, `${userName} joined your support group`);
      
      fetchGroups();
    } catch (error) {
      console.error('Frontend: Error joining group:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to join support group';
      toast.error(errorMessage);
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;
    
    try {
      await supportGroupsService.leaveGroup(groupId, user.id);
      toast.success('You have left the support group');
      
      // Send notification to mentor about member leaving
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'A member';
      await sendNotificationToMentor(groupId, `${userName} left your support group`);
      
      setShowLeaveDialog(false);
      setGroupToLeave(null);
      fetchGroups();
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave support group');
    }
  };

  const sendNotificationToMentor = async (groupId: string, message: string) => {
    try {
      // Get group details to find mentor
      const group = await supportGroupsService.getGroupById(groupId);
      if (group?.mood_mentor_id) {
        // You can implement your notification service here
        console.log(`Notification to mentor ${group.mood_mentor_id}: ${message}`);
      }
    } catch (error) {
      console.error('Error sending notification to mentor:', error);
    }
  };

  const formatSessionTime = (session: GroupSession & { fullDateTime?: Date }) => {
    const date = session.fullDateTime || new Date(`${session.session_date}T${session.start_time}`);
    const now = new Date();
    
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    } else if (differenceInHours(date, now) < 168) { // Within a week
      return `${format(date, 'EEEE')} at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy \'at\' h:mm a');
    }
  };

  const getSessionStatus = (session: GroupSession & { fullDateTime?: Date }) => {
    const now = new Date();
    const sessionStart = session.fullDateTime || new Date(`${session.session_date}T${session.start_time}`);
    const sessionEnd = session.end_time ? new Date(`${session.session_date}T${session.end_time}`) : new Date(sessionStart.getTime() + 90 * 60 * 1000); // Default 90 min
    const hoursUntilStart = differenceInHours(sessionStart, now);
    
    if (now >= sessionStart && now <= sessionEnd) {
      return { status: 'live', color: 'bg-green-500', text: 'Live Now' };
    } else if (hoursUntilStart <= 24 && hoursUntilStart > 0) {
      return { status: 'soon', color: 'bg-orange-500', text: `In ${hoursUntilStart}h` };
    } else if (hoursUntilStart <= 0) {
      return { status: 'ended', color: 'bg-gray-500', text: 'Ended' };
    } else {
      return { status: 'scheduled', color: 'bg-blue-500', text: 'Scheduled' };
    }
  };

  const renderMyGroups = () => {
    if (joinedGroups.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No groups joined yet</h3>
          <p className="text-gray-500 mb-6">
            Join support groups to connect with others and participate in regular meetings
          </p>
          <Button onClick={() => setActiveTab('available')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Browse Available Groups
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {joinedGroups.map((group) => (
          <Card key={group.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl">{group.name}</CardTitle>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Heart className="h-3 w-3 mr-1" />
                      Joined
                    </Badge>
                  </div>
                  <CardDescription className="text-base">{group.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {group.facilitator?.avatar && (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={group.facilitator.avatar} />
                      <AvatarFallback>
                        {group.facilitator.name?.split(' ').map((n: string) => n[0]).join('') || 'M'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="text-right">
                    <p className="text-sm font-medium">{group.facilitator?.name}</p>
                    <p className="text-xs text-gray-500">{group.facilitator?.role}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Next Session */}
              {group.next_session && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-blue-900">Next Session</h4>
                    <Badge className={`${getSessionStatus(group.next_session).color} text-white`}>
                      {getSessionStatus(group.next_session).text}
                    </Badge>
                  </div>
                  <p className="text-blue-800 font-medium">{group.next_session.title || 'Group Session'}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-blue-700">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatSessionTime(group.next_session)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {group.next_session.start_time} - {group.next_session.end_time || 'TBD'}
                    </div>
                  </div>
                  {group.next_session.meeting_url && (
                    <Button size="sm" className="mt-3">
                      <Video className="h-4 w-4 mr-2" />
                      Join Meeting
                    </Button>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{group.current_participants}</div>
                  <div className="text-sm text-gray-500">Members</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{group.my_attendance_rate}%</div>
                  <div className="text-sm text-gray-500">Attendance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{group.total_sessions || 0}</div>
                  <div className="text-sm text-gray-500">Sessions</div>
                </div>
              </div>

              {/* Attendance Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Your Attendance Rate</span>
                  <span className="text-sm text-gray-500">{group.my_attendance_rate}%</span>
                </div>
                <Progress value={group.my_attendance_rate} className="h-2" />
              </div>

              {/* Upcoming meetings */}
              {group.upcoming_meetings && group.upcoming_meetings.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Upcoming Sessions</h5>
                  <div className="space-y-2">
                    {group.upcoming_meetings.slice(0, 2).map((session) => (
                      <div key={session.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                        <div>
                          <p className="text-sm font-medium">{session.title || 'Group Session'}</p>
                          <p className="text-xs text-gray-500">{formatSessionTime(session)}</p>
                        </div>
                        <Badge variant="outline">
                          {getSessionStatus(session).text}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="h-4 w-4" />
                  {group.meeting_type === 'online' ? 'Online' : group.location || 'TBD'}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setGroupToLeave(group.id);
                      setShowLeaveDialog(true);
                    }}
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Leave Group
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderAvailableGroups = () => {
    if (availableGroups.length === 0) {
      return (
        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">You've joined all available groups!</h3>
          <p className="text-gray-500">
            Check back later for new support groups or explore your current groups.
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2">
        {availableGroups.map((group) => (
          <Card key={group.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <Badge variant={group.current_participants >= group.max_participants ? "destructive" : "secondary"}>
                      {group.current_participants >= group.max_participants ? "Full" : "Open"}
                    </Badge>
                  </div>
                  <CardDescription>{group.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Facilitator */}
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={group.facilitator?.avatar} />
                  <AvatarFallback>
                    {group.facilitator?.name?.split(' ').map((n: string) => n[0]).join('') || 'M'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{group.facilitator?.name}</p>
                  <p className="text-xs text-gray-500">{group.facilitator?.role}</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  <span>{group.current_participants}/{group.max_participants} members</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>Weekly</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-4 w-4" />
                {group.meeting_type === 'online' ? 'Online' : group.location || 'TBD'}
              </div>

              <Button 
                className="w-full"
                disabled={group.current_participants >= group.max_participants}
                onClick={() => handleJoinGroup(group.id)}
              >
                {group.current_participants >= group.max_participants ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Group Full
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Group
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Groups</h1>
          <p className="text-gray-600">Connect with others and participate in group sessions</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="my-groups" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              My Groups ({joinedGroups.length})
            </TabsTrigger>
            <TabsTrigger value="available" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Available Groups ({availableGroups.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="my-groups" className="mt-6">
            {renderMyGroups()}
          </TabsContent>
          
          <TabsContent value="available" className="mt-6">
            {renderAvailableGroups()}
          </TabsContent>
        </Tabs>

        {/* Leave Group Confirmation Dialog */}
        <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave Support Group</DialogTitle>
              <DialogDescription>
                Are you sure you want to leave this support group? You will no longer have access to group sessions and messages.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLeaveDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => groupToLeave && handleLeaveGroup(groupToLeave)}
              >
                Leave Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default SupportGroupsPage;