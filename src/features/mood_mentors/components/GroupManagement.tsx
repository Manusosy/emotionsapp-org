import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Calendar, Clock, Users, TrendingUp, UserCheck, UserX, CalendarClock, BarChart2, Target, Award } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isAfter, isBefore } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { SupportGroup } from '@/services/support-groups/support-groups.service';

interface GroupMember {
  id: string;
  user_id: string;
  status: string;
  joined_at: string;
  patient_profile: {
    full_name: string;
    email: string;
  };
  attendance_records?: AttendanceRecord[];
}

interface GroupSession {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: string;
  attendance_count: number;
  notes?: string;
}

interface AttendanceRecord {
  id: string;
  session_id: string;
  user_id: string;
  attended: boolean;
  joined_at: string | null;
  left_at: string | null;
  duration_minutes: number;
  session: {
    session_date: string;
    start_time: string;
    end_time: string;
  };
}

interface ProgressData {
  meetingNumber: number;
  date: string;
  attendanceRate: number;
  totalMembers: number;
  presentMembers: number;
}

interface GroupManagementProps {
  group: SupportGroup;
  onClose: () => void;
}

export default function GroupManagement({ group, onClose }: GroupManagementProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<GroupSession | null>(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);

  useEffect(() => {
    fetchGroupData();
  }, [group.id]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchMembers(),
        fetchSessions(),
        generateProgressData()
      ]);
    } catch (error) {
      console.error('Error fetching group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        *,
        patient_profiles (
          full_name,
          email
        ),
        group_session_attendance (
          id,
          session_id,
          attended,
          joined_at,
          left_at,
          duration_minutes,
          group_sessions (
            session_date,
            start_time,
            end_time
          )
        )
      `)
      .eq('group_id', group.id)
      .eq('status', 'active');

    if (error) throw error;
    
    const transformedMembers = data?.map(member => ({
      ...member,
      patient_profile: member.patient_profiles,
      attendance_records: member.group_session_attendance
    })) || [];
    
    setMembers(transformedMembers);
  };

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('group_sessions')
      .select(`
        *,
        group_session_attendance (count)
      `)
      .eq('group_id', group.id)
      .order('session_date', { ascending: false });

    if (error) throw error;
    
    const transformedSessions = data?.map(session => ({
      ...session,
      attendance_count: Array.isArray(session.group_session_attendance) 
        ? session.group_session_attendance.length 
        : 0
    })) || [];
    
    setSessions(transformedSessions);
  };

  const generateProgressData = async () => {
    const { data: sessionData, error } = await supabase
      .from('group_sessions')
      .select(`
        id,
        session_date,
        start_time,
        end_time,
        group_session_attendance (
          attended
        )
      `)
      .eq('group_id', group.id)
      .order('session_date', { ascending: true });

    if (error) throw error;

    const progressData: ProgressData[] = sessionData?.map((session, index) => {
      const totalMembers = members.length || 1;
      const presentMembers = session.group_session_attendance?.filter(
        (attendance: any) => attendance.attended === true
      ).length || 0;
      
      return {
        meetingNumber: index + 1,
        date: format(parseISO(session.session_date), 'MMM dd'),
        attendanceRate: (presentMembers / totalMembers) * 100,
        totalMembers,
        presentMembers
      };
    }) || [];

    setProgressData(progressData);
  };

  const markAttendance = async (sessionId: string, userId: string, attended: boolean) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('group_session_attendance')
        .upsert({
          session_id: sessionId,
          user_id: userId,
          attended,
          joined_at: attended ? now : null,
          left_at: attended ? null : null,
          duration_minutes: attended ? 60 : 0
        });

      if (error) throw error;
      
      toast.success('Attendance updated successfully');
      fetchGroupData(); // Refresh data
    } catch (error: any) {
      toast.error('Failed to update attendance: ' + error.message);
    }
  };

  const createSession = async () => {
    try {
      const sessionDate = new Date();
      sessionDate.setDate(sessionDate.getDate() + 7); // Next week
      
      const { data, error } = await supabase
        .from('group_sessions')
        .insert({
          group_id: group.id,
          session_date: sessionDate.toISOString().split('T')[0],
          start_time: '10:00:00',
          end_time: '11:00:00',
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('New session created');
      fetchGroupData();
    } catch (error: any) {
      toast.error('Failed to create session: ' + error.message);
    }
  };

  const autoMarkAbsentees = async (sessionId: string) => {
    // This function automatically marks members as absent if they don't attend within a certain timeframe
    const now = new Date();
    const sessionDate = sessions.find(s => s.id === sessionId)?.session_date;
    
    if (!sessionDate) return;
    
    const sessionDateTime = parseISO(sessionDate);
    const cutoffTime = new Date(sessionDateTime);
    cutoffTime.setHours(cutoffTime.getHours() + 2); // 2 hours after session time
    
    if (isAfter(now, cutoffTime)) {
      // Mark all members without attendance as absent
      const { data: existingAttendance } = await supabase
        .from('group_session_attendance')
        .select('user_id')
        .eq('session_id', sessionId);
      
      const attendedUserIds = existingAttendance?.map(a => a.user_id) || [];
      const absentMembers = members.filter(m => !attendedUserIds.includes(m.user_id));
      
      for (const member of absentMembers) {
        await markAttendance(sessionId, member.user_id, false);
      }
    }
  };

  const getAttendanceStats = () => {
    const totalSessions = sessions.length;
    const totalPossibleAttendance = totalSessions * members.length;
    const totalActualAttendance = members.reduce((acc, member) => 
      acc + (member.attendance_records?.filter(r => r.attended === true).length || 0), 0
    );
    
    return {
      overallRate: totalPossibleAttendance > 0 ? (totalActualAttendance / totalPossibleAttendance) * 100 : 0,
      totalSessions,
      averageAttendance: members.length > 0 ? totalActualAttendance / Math.max(totalSessions, 1) : 0
    };
  };

  const stats = getAttendanceStats();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Loading group management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{group.name}</h2>
          <p className="text-gray-600 mt-1">{group.description}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={createSession} variant="outline">
            <CalendarClock className="h-4 w-4 mr-2" />
            Schedule Session
          </Button>
          <Button onClick={onClose} variant="ghost">
            Close
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Total Members</p>
                <p className="text-2xl font-bold">{members.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{stats.totalSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <p className="text-2xl font-bold">{stats.overallRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm text-gray-600">Avg. Attendance</p>
                <p className="text-2xl font-bold">{stats.averageAttendance.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">Members & Attendance</TabsTrigger>
          <TabsTrigger value="sessions">Session History</TabsTrigger>
          <TabsTrigger value="analytics">Progress Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Group Members</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Sessions Attended</TableHead>
                    <TableHead>Attendance Rate</TableHead>
                    <TableHead>Last Attendance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const attendanceRecords = member.attendance_records || [];
                    const presentCount = attendanceRecords.filter(r => r.attended === true).length;
                    const totalSessions = attendanceRecords.length;
                    const attendanceRate = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;
                    const lastAttendance = attendanceRecords
                      .filter(r => r.attended === true && r.joined_at)
                      .sort((a, b) => {
                        if (!a.joined_at || !b.joined_at) return 0;
                        return new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime();
                      })[0];

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{member.patient_profile?.full_name}</div>
                            <div className="text-sm text-gray-500">{member.patient_profile?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(parseISO(member.joined_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{presentCount}</span>
                            <span className="text-gray-500">/ {totalSessions}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full" 
                                style={{ width: `${Math.min(attendanceRate, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{attendanceRate.toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lastAttendance && lastAttendance.joined_at ? (
                            <div className="text-sm">
                              {format(parseISO(lastAttendance.joined_at!), 'MMM dd')}
                            </div>
                          ) : (
                            <span className="text-gray-500">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={attendanceRate >= 75 ? "default" : attendanceRate >= 50 ? "secondary" : "destructive"}
                          >
                            {attendanceRate >= 75 ? "Active" : attendanceRate >= 50 ? "Moderate" : "At Risk"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        {format(parseISO(session.session_date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {format(parseISO(`2000-01-01T${session.start_time}`), 'h:mm a')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-500" />
                          <span>{session.attendance_count} / {members.length}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedSession(session);
                            setShowSessionDetails(true);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Progressive Meeting Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart2 className="h-5 w-5" />
                  Meeting Continuity Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: any, name: string) => [
                        name === 'attendanceRate' ? `${value.toFixed(1)}%` : value,
                        name === 'attendanceRate' ? 'Attendance Rate' : name
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="attendanceRate" 
                      stroke="#8884d8" 
                      strokeWidth={3}
                      dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Attendance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Member Engagement Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="presentMembers" fill="#10b981" name="Present" />
                    <Bar dataKey="totalMembers" fill="#e5e7eb" name="Total" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Meeting Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Meeting Insights & Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">Consistency Score</h4>
                  <p className="text-2xl font-bold text-blue-600 mt-1">
                    {progressData.length > 0 ? 
                      Math.round(progressData.reduce((acc, curr) => acc + curr.attendanceRate, 0) / progressData.length) 
                      : 0}%
                  </p>
                  <p className="text-sm text-blue-700 mt-1">Average attendance across all meetings</p>
                </div>
                
                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900">Growth Trend</h4>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    {progressData.length >= 2 ? 
                      progressData[progressData.length - 1].attendanceRate > progressData[0].attendanceRate ? '+' : '-'
                      : ''}
                    {progressData.length >= 2 ? 
                      Math.abs(progressData[progressData.length - 1].attendanceRate - progressData[0].attendanceRate).toFixed(1)
                      : '0'}%
                  </p>
                  <p className="text-sm text-green-700 mt-1">Change from first to latest meeting</p>
                </div>
                
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-900">Peak Performance</h4>
                  <p className="text-2xl font-bold text-purple-600 mt-1">
                    {progressData.length > 0 ? 
                      Math.max(...progressData.map(p => p.attendanceRate)).toFixed(1) 
                      : 0}%
                  </p>
                  <p className="text-sm text-purple-700 mt-1">Highest attendance rate achieved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Session Details Dialog */}
      <Dialog open={showSessionDetails} onOpenChange={setShowSessionDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">
                    {format(parseISO(selectedSession.session_date), 'EEEE, MMMM dd, yyyy')}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {format(parseISO(`2000-01-01T${selectedSession.start_time}`), 'h:mm a')}
                  </p>
                </div>
                <Badge variant={selectedSession.status === 'completed' ? 'default' : 'secondary'}>
                  {selectedSession.status}
                </Badge>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-3">Attendance ({selectedSession.attendance_count}/{members.length})</h4>
                <div className="space-y-2">
                  {members.map((member) => {
                    const attendance = member.attendance_records?.find(
                      r => r.session_id === selectedSession.id
                    );
                    
                    return (
                      <div key={member.id} className="flex items-center justify-between">
                        <span>{member.patient_profile?.full_name}</span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              attendance?.attended === true ? 'default' : 'destructive'
                            }
                          >
                            {attendance?.attended === true ? 'Present' : 'Absent'}
                          </Badge>
                          {selectedSession.status !== 'completed' && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant={attendance?.attended === true ? 'default' : 'outline'}
                                onClick={() => markAttendance(selectedSession.id, member.user_id, true)}
                              >
                                Present
                              </Button>
                              <Button
                                size="sm"
                                variant={attendance?.attended === false ? 'default' : 'outline'}
                                onClick={() => markAttendance(selectedSession.id, member.user_id, false)}
                              >
                                Absent
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowSessionDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
