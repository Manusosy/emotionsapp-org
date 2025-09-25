import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Clock,
  Video,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  MoreHorizontal,
  TrendingUp,
  Users,
  Activity,
  BarChart3,
  Eye,
  MessageSquare,
  Download,
  RefreshCw,
  PlayCircle,
  PauseCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format, parseISO, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Types
interface Appointment {
  id: string;
  patient_id: string;
  mentor_id: string;
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  meeting_type: 'video' | 'audio' | 'chat';
  meeting_link?: string;
  notes?: string;
  rating?: number;
  feedback?: string;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  mentor_name?: string;
  patient_avatar?: string;
  mentor_avatar?: string;
}

interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  pendingSessions: number;
  cancelledSessions: number;
  completionRate: number;
  avgSessionDuration: number;
  avgRating: number;
  totalRevenue: number;
}

const COLORS = ['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'];

export default function AdminSessionsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('week');

  // Chart data - will be populated from real data
  const [sessionStatusData, setSessionStatusData] = useState<any[]>([]);
  const [weeklySessionData, setWeeklySessionData] = useState<any[]>([]);
  const [sessionTypeData, setSessionTypeData] = useState<any[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<any[]>([]);

  useEffect(() => {
    fetchSessionData();
  }, [dateRange]);

  const fetchSessionData = async () => {
    try {
      setIsLoading(true);

      // Fetch appointments data first
      const { data: appointmentsData, error } = await supabase
        .from('appointments')
        .select('id, status, meeting_type, rating, created_at, patient_id, mentor_id')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data for display (simplified without joins for now)
      const transformedAppointments = (appointmentsData || []).map(apt => ({
        ...apt,
        patient_name: 'Patient', // Simplified for now
        mentor_name: 'Mentor', // Simplified for now
        patient_avatar: null,
        mentor_avatar: null,
      }));

      setAppointments(transformedAppointments);

      // Calculate statistics
      const total = transformedAppointments.length;
      const completed = transformedAppointments.filter(a => a.status === 'completed').length;
      const pending = transformedAppointments.filter(a => a.status === 'pending').length;
      const cancelled = transformedAppointments.filter(a => a.status === 'cancelled').length;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      // Calculate average rating
      const ratedSessions = transformedAppointments.filter(a => a.rating);
      const avgRating = ratedSessions.length > 0 
        ? ratedSessions.reduce((sum, a) => sum + (a.rating || 0), 0) / ratedSessions.length 
        : 0;

      setStats({
        totalSessions: total,
        completedSessions: completed,
        pendingSessions: pending,
        cancelledSessions: cancelled,
        completionRate,
        avgSessionDuration: 45, // Default duration - could be calculated from actual data later
        avgRating,
        totalRevenue: 0, // Not monetized yet
      });

      // Calculate real chart data
      const scheduled = transformedAppointments.filter(a => a.status === 'scheduled').length;
      const rescheduled = transformedAppointments.filter(a => a.status === 'rescheduled').length;

      // Session status data from real appointments
      const statusData = [
        { name: 'Completed', value: completed, color: '#10B981' },
        { name: 'Pending', value: pending, color: '#F59E0B' },
        { name: 'Scheduled', value: scheduled, color: '#3B82F6' },
        { name: 'Cancelled', value: cancelled, color: '#EF4444' },
      ].filter(item => item.value > 0); // Only show statuses that have data

      setSessionStatusData(statusData);

      // Session type data from real appointments
      const videoSessions = transformedAppointments.filter(a => a.meeting_type === 'video').length;
      const audioSessions = transformedAppointments.filter(a => a.meeting_type === 'audio').length;
      const chatSessions = transformedAppointments.filter(a => a.meeting_type === 'chat').length;

      const typeData = [
        { name: 'Video', value: videoSessions, color: '#3B82F6' },
        { name: 'Audio', value: audioSessions, color: '#10B981' },
        { name: 'Chat', value: chatSessions, color: '#F59E0B' },
      ].filter(item => item.value > 0); // Only show types that have data

      setSessionTypeData(typeData);

      // Weekly session data - simplified for now, showing just totals
      const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const weeklyData = weekDays.map(day => ({
        name: day,
        completed: 0, // Could be calculated by grouping appointments by day
        cancelled: 0,
        pending: 0,
      }));
      setWeeklySessionData(weeklyData);

      // Hourly distribution - simplified for now
      const hours = ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM'];
      const hourlyData = hours.map(hour => ({
        hour,
        sessions: 0, // Could be calculated by parsing start_time
      }));
      setHourlyDistribution(hourlyData);
    } catch (error) {
      console.error('Error fetching session data:', error);
      toast.error('Failed to load session data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'scheduled': return 'text-blue-600 bg-blue-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'rescheduled': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'scheduled': return <Calendar className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      case 'rescheduled': return <RefreshCw className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'audio': return <Phone className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      default: return <Video className="h-4 w-4" />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = 
      apt.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.mentor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue', subtitle }: {
    title: string;
    value: string | number;
    change?: number;
    icon: any;
    color?: string;
    subtitle?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={`p-2 rounded-lg bg-${color}-100`}>
          <Icon className={`h-4 w-4 text-${color}-600`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {change !== undefined && (
          <p className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'} mt-1`}>
            {change >= 0 ? '+' : ''}{change}% from last week
          </p>
        )}
        {subtitle && (
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Session Intelligence</h2>
          <p className="text-gray-600">
            Monitor appointments, session quality, and platform utilization
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sessions"
          value={stats?.totalSessions || 0}
          change={12}
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats?.completionRate.toFixed(1)}%`}
          change={5}
          icon={CheckCircle}
          color="green"
          subtitle={`${stats?.completedSessions} completed`}
        />
        <StatCard
          title="Average Rating"
          value={`${stats?.avgRating.toFixed(1)}/5`}
          change={2}
          icon={Activity}
          color="purple"
          subtitle="Session satisfaction"
        />
        <StatCard
          title="Avg Duration"
          value={`${stats?.avgSessionDuration}m`}
          change={-3}
          icon={Clock}
          color="orange"
          subtitle="Per session"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Session Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-blue-600" />
              Session Status Overview
            </CardTitle>
            <CardDescription>
              Current distribution of session statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sessionStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sessionStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Session Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
              Weekly Session Trends
            </CardTitle>
            <CardDescription>
              Session completion patterns by day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklySessionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10B981" name="Completed" />
                <Bar dataKey="pending" fill="#F59E0B" name="Pending" />
                <Bar dataKey="cancelled" fill="#EF4444" name="Cancelled" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Session Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Video className="mr-2 h-5 w-5 text-purple-600" />
              Session Types
            </CardTitle>
            <CardDescription>
              Preferred communication methods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sessionTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {sessionTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5 text-orange-600" />
              Peak Hours
            </CardTitle>
            <CardDescription>
              Session distribution throughout the day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="sessions" 
                  stroke="#F59E0B" 
                  fill="#F59E0B" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Session Management</CardTitle>
          <CardDescription>
            Detailed view of all appointments and sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAppointments.slice(0, 20).map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{appointment.title}</div>
                      <div className="text-xs text-gray-500">
                        #{appointment.id.slice(-8)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={appointment.patient_avatar} />
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                          {getInitials(appointment.patient_name || 'Patient')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{appointment.patient_name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={appointment.mentor_avatar} />
                        <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                          {getInitials(appointment.mentor_name || 'Mentor')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{appointment.mentor_name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {format(parseISO(appointment.date), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {appointment.start_time} - {appointment.end_time}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getMeetingTypeIcon(appointment.meeting_type)}
                      <span className="text-sm capitalize">{appointment.meeting_type}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(appointment.status)} border-0`}>
                      {getStatusIcon(appointment.status)}
                      <span className="ml-1 capitalize">{appointment.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {appointment.rating ? (
                      <div className="flex items-center space-x-1">
                        <span className="text-sm font-medium">{appointment.rating}</span>
                        <span className="text-yellow-400">★</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No rating</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          View Messages
                        </DropdownMenuItem>
                        {appointment.meeting_link && (
                          <DropdownMenuItem>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Join Session
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Export Data
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
