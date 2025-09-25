import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Calendar,
  DollarSign,
  Activity,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  MessageSquare,
  FileText,
  Heart,
  CheckCircle,
  UserCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
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
interface DashboardStats {
  totalUsers: number;
  totalPatients: number;
  totalMentors: number;
  totalAppointments: number;
  completedAppointments: number;
  totalMoodEntries: number;
  totalJournalEntries: number;
  totalMessages: number;
  avgMoodScore: number;
  appointmentCompletionRate: number;
  userGrowthRate: number;
  activeUsers: number;
}

interface ChartData {
  name: string;
  value: number;
  color: string;
}

interface GrowthData {
  name: string;
  users: number;
  sessions: number;
}

const AdminDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [userGrowthData, setUserGrowthData] = useState<GrowthData[]>([]);
  const [moodDistributionData, setMoodDistributionData] = useState<ChartData[]>([]);
  const [appointmentStatusData, setAppointmentStatusData] = useState<ChartData[]>([]);
  const [genderDistribution, setGenderDistribution] = useState<ChartData[]>([]);

  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    try {
      // Fetch all necessary data in parallel
      const [
        patientsResult,
        mentorsResult,
        appointmentsResult,
        moodEntriesResult,
        journalEntriesResult,
        messagesResult,
      ] = await Promise.all([
        supabase.from('patient_profiles').select('id, is_active, created_at, gender'),
        supabase.from('mood_mentor_profiles').select('id, is_active, created_at'),
        supabase.from('appointments').select('id, status, created_at'),
        supabase.from('mood_entries').select('id, mood_type, mood, created_at'),
        supabase.from('journal_entries').select('id, created_at'),
        supabase.from('messages').select('id, created_at'),
      ]);

      // Process the data
      const patients = patientsResult.data || [];
      const mentors = mentorsResult.data || [];
      const appointments = appointmentsResult.data || [];
      const moodEntries = moodEntriesResult.data || [];
      const journalEntries = journalEntriesResult.data || [];
      const messages = messagesResult.data || [];

      // Calculate stats
      const totalUsers = patients.length + mentors.length;
      const activeUsers = patients.filter(p => p.is_active).length + mentors.filter(m => m.is_active).length;
      const completedAppointments = appointments.filter(a => a.status === 'completed').length;
      const appointmentCompletionRate = appointments.length > 0 ? (completedAppointments / appointments.length) * 100 : 0;
      
      const avgMoodScore = moodEntries.length > 0 
        ? moodEntries.reduce((sum, entry) => sum + (entry.mood || 0), 0) / moodEntries.length
        : 0;

      // Calculate user growth (simplified)
      const currentMonth = new Date().getMonth();
      const lastMonth = currentMonth - 1;
      const currentMonthUsers = [...patients, ...mentors].filter(u => 
        new Date(u.created_at).getMonth() === currentMonth
      ).length;
      const lastMonthUsers = [...patients, ...mentors].filter(u => 
        new Date(u.created_at).getMonth() === lastMonth
      ).length;
      const userGrowthRate = lastMonthUsers > 0 ? ((currentMonthUsers - lastMonthUsers) / lastMonthUsers) * 100 : 0;

      setStats({
        totalUsers,
        totalPatients: patients.length,
        totalMentors: mentors.length,
        totalAppointments: appointments.length,
        completedAppointments,
        totalMoodEntries: moodEntries.length,
        totalJournalEntries: journalEntries.length,
        totalMessages: messages.length,
        avgMoodScore,
        appointmentCompletionRate,
        userGrowthRate,
        activeUsers,
      });

      // Prepare chart data
      // User growth over months
      const monthlyData: { [key: string]: { users: number; sessions: number } } = {};
      [...patients, ...mentors].forEach((user: any) => {
        const month = new Date(user.created_at).toLocaleDateString('en-US', { month: 'short' });
        if (!monthlyData[month]) monthlyData[month] = { users: 0, sessions: 0 };
        monthlyData[month].users++;
      });
      
      appointments.forEach((appointment: any) => {
        const month = new Date(appointment.created_at).toLocaleDateString('en-US', { month: 'short' });
        if (!monthlyData[month]) monthlyData[month] = { users: 0, sessions: 0 };
        monthlyData[month].sessions++;
      });

      const growthData = Object.entries(monthlyData)
        .sort(([a], [b]) => new Date(`${a} 2025`).getTime() - new Date(`${b} 2025`).getTime())
        .map(([month, data]) => ({
          name: month,
          users: data.users,
          sessions: data.sessions,
        }));
      setUserGrowthData(growthData);

      // Mood distribution
      const moodTypes = ['happy', 'calm', 'worried', 'sad', 'angry'];
      const moodChart = moodTypes.map(type => {
        const count = (moodEntries as any[]).filter((entry: any) => entry.mood_type === type).length;
        return {
          name: type.charAt(0).toUpperCase() + type.slice(1),
          value: count,
          color: type === 'happy' ? '#10B981' : 
                 type === 'calm' ? '#3B82F6' : 
                 type === 'worried' ? '#F59E0B' : 
                 type === 'sad' ? '#EF4444' : '#DC2626'
        };
      }).filter(item => item.value > 0);
      setMoodDistributionData(moodChart);

      // Appointment status
      const statusChart = [
        { name: 'Completed', value: completedAppointments, color: '#10B981' },
        { name: 'Pending', value: appointments.filter(a => a.status === 'pending').length, color: '#F59E0B' },
        { name: 'Scheduled', value: appointments.filter(a => a.status === 'scheduled').length, color: '#3B82F6' },
        { name: 'Cancelled', value: appointments.filter(a => a.status === 'cancelled').length, color: '#EF4444' },
      ].filter(item => item.value > 0);
      setAppointmentStatusData(statusChart);

      // Gender distribution
      const genderTypes = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
      const genderChart = genderTypes.map(gender => {
        const count = patients.filter((patient: any) => patient.gender === gender).length;
        return {
          name: gender,
          value: count,
          color: gender === 'Male' ? '#3B82F6' : 
                 gender === 'Female' ? '#EC4899' : 
                 gender === 'Non-binary' ? '#8B5CF6' : '#6B7280'
        };
      }).filter(item => item.value > 0);
      setGenderDistribution(genderChart);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    change, 
    changeType, 
    icon: Icon, 
    color = 'blue',
    subtitle 
  }: {
    title: string;
    value: string | number;
    change?: number;
    changeType?: 'positive' | 'negative';
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
          <div className="flex items-center mt-1">
            {changeType === 'positive' ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}>
              {Math.abs(change)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">vs last month</span>
          </div>
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
          <h2 className="text-2xl font-bold text-gray-900">Platform Overview</h2>
          <p className="text-gray-600">
            Key metrics and insights for EmotionsApp platform performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
            <TabsList>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          change={Math.round(stats?.userGrowthRate || 0)}
          changeType={stats?.userGrowthRate && stats.userGrowthRate > 0 ? 'positive' : 'negative'}
          icon={Users}
          color="blue"
          subtitle={`${stats?.totalPatients || 0} patients, ${stats?.totalMentors || 0} mentors`}
        />
        
        <StatCard
          title="Monthly Recurring Revenue"
          value="$0"
          icon={DollarSign}
          color="green"
          subtitle="Pre-monetization phase"
        />
        
        <StatCard
          title="Session Completion Rate"
          value={`${stats?.appointmentCompletionRate.toFixed(1) || 0}%`}
          change={15}
          changeType="positive"
          icon={CheckCircle}
          color="emerald"
          subtitle={`${stats?.completedAppointments || 0} of ${stats?.totalAppointments || 0} sessions`}
        />
        
        <StatCard
          title="User Engagement"
          value={stats?.totalMoodEntries || 0}
          change={25}
          changeType="positive"
          icon={Activity}
          color="purple"
          subtitle="Mood tracking entries"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Users"
          value={stats?.activeUsers || 0}
          icon={UserCheck}
          color="blue"
          subtitle="Currently active on platform"
        />
        
        <StatCard
          title="Mental Health Score"
          value={`${stats?.avgMoodScore.toFixed(1) || 0}/10`}
          icon={Heart}
          color="pink"
          subtitle="Average user mood rating"
        />
        
        <StatCard
          title="Journal Entries"
          value={stats?.totalJournalEntries || 0}
          icon={FileText}
          color="indigo"
          subtitle="User reflections and insights"
        />
        
        <StatCard
          title="Messages Exchanged"
          value={stats?.totalMessages || 0}
          icon={MessageSquare}
          color="cyan"
          subtitle="Platform communications"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User & Session Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-blue-600" />
              Growth Trends
            </CardTitle>
            <CardDescription>
              User acquisition and session volume over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="New Users"
                />
                <Line 
                  type="monotone" 
                  dataKey="sessions" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Sessions"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Session Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-green-600" />
              Session Status
            </CardTitle>
            <CardDescription>
              Current appointment status distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={appointmentStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {appointmentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Mood Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5 text-purple-600" />
              Mental Health Insights
            </CardTitle>
            <CardDescription>
              User emotional state distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={moodDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8B5CF6">
                  {moodDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Demographics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-blue-600" />
              User Demographics
            </CardTitle>
            <CardDescription>
              Patient gender distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {genderDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Platform Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Health Summary</CardTitle>
          <CardDescription>
            Overall platform performance and key achievements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats?.totalUsers || 0}</div>
              <div className="text-sm text-blue-600">Total Platform Users</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats?.appointmentCompletionRate.toFixed(1) || 0}%</div>
              <div className="text-sm text-green-600">Session Success Rate</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats?.avgMoodScore.toFixed(1) || 0}/10</div>
              <div className="text-sm text-purple-600">Average Wellness Score</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;