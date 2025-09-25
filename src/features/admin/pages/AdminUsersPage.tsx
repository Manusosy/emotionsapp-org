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
  Users,
  UserCheck,
  UserX,
  Search,
  Filter,
  MoreHorizontal,
  Mail,
  Calendar,
  Activity,
  TrendingUp,
  MapPin,
  Phone,
  Eye,
  MessageSquare,
  Ban,
  CheckCircle,
  AlertCircle,
  BarChart3,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

// Types
interface PatientProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  phone_number?: string;
  location?: string;
  gender?: string;
  date_of_birth?: string;
  is_active: boolean;
  created_at: string;
  last_seen?: string;
  health_conditions?: string[];
}

interface MentorProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  bio: string;
  specialty: string;
  specialties: string[];
  hourly_rate: number;
  is_free: boolean;
  availability_status: 'available' | 'unavailable' | 'busy';
  rating: number;
  is_active: boolean;
  created_at: string;
  last_seen?: string;
}

interface UserStats {
  totalUsers: number;
  totalPatients: number;
  totalMentors: number;
  activeUsers: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AdminUsersPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Chart data
  const userTypeData = [
    { name: 'Patients', value: 32, color: '#3B82F6' },
    { name: 'Mentors', value: 4, color: '#10B981' },
  ];

  const userGrowthData = [
    { name: 'Jul', patients: 8, mentors: 2, total: 10 },
    { name: 'Aug', patients: 18, mentors: 3, total: 21 },
    { name: 'Sep', patients: 32, mentors: 4, total: 36 },
  ];

  const genderDistribution = [
    { name: 'Female', value: 18, color: '#F59E0B' },
    { name: 'Male', value: 12, color: '#3B82F6' },
    { name: 'Non-binary', value: 1, color: '#8B5CF6' },
    { name: 'Not specified', value: 1, color: '#6B7280' },
  ];

  const ageGroups = [
    { name: '18-25', value: 8 },
    { name: '26-35', value: 14 },
    { name: '36-45', value: 7 },
    { name: '46-55', value: 2 },
    { name: '55+', value: 1 },
  ];

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);

      // Fetch patients
      const { data: patientsData, error: patientsError } = await supabase
        .from('patient_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (patientsError) throw patientsError;

      // Fetch mentors
      const { data: mentorsData, error: mentorsError } = await supabase
        .from('mood_mentor_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (mentorsError) throw mentorsError;

      setPatients(patientsData || []);
      setMentors(mentorsData || []);

      // Calculate stats
      const totalPatients = patientsData?.length || 0;
      const totalMentors = mentorsData?.length || 0;
      const totalUsers = totalPatients + totalMentors;
      const activeUsers = (patientsData?.filter(p => p.is_active).length || 0) + 
                         (mentorsData?.filter(m => m.is_active).length || 0);

      // Mock growth rate calculation
      const userGrowthRate = ((totalUsers - 26) / 26) * 100; // Assuming 26 users last month

      setStats({
        totalUsers,
        totalPatients,
        totalMentors,
        activeUsers,
        newUsersThisMonth: 10, // Mock data
        userGrowthRate,
      });
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setIsLoading(false);
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

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMentors = mentors.filter(mentor =>
    mentor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mentor.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }: {
    title: string;
    value: string | number;
    change?: number;
    icon: any;
    color?: string;
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
            {change >= 0 ? '+' : ''}{change}% from last month
          </p>
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
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600">
            Manage patients, mentors, and platform users
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          change={stats?.userGrowthRate}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Active Patients"
          value={stats?.totalPatients || 0}
          change={15}
          icon={UserCheck}
          color="green"
        />
        <StatCard
          title="Mood Mentors"
          value={stats?.totalMentors || 0}
          change={33}
          icon={Activity}
          color="purple"
        />
        <StatCard
          title="New This Month"
          value={stats?.newUsersThisMonth || 0}
          change={25}
          icon={TrendingUp}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-blue-600" />
              User Distribution
            </CardTitle>
            <CardDescription>
              Breakdown of users by type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
              User Growth
            </CardTitle>
            <CardDescription>
              Monthly user acquisition trends
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
                  dataKey="patients" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Patients"
                />
                <Line 
                  type="monotone" 
                  dataKey="mentors" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Mentors"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Demographics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-purple-600" />
              Gender Distribution
            </CardTitle>
            <CardDescription>
              Patient demographics breakdown
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

        {/* Age Groups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5 text-orange-600" />
              Age Distribution
            </CardTitle>
            <CardDescription>
              Patient age group breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ageGroups}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* User Tables */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="patients">Patients ({filteredPatients.length})</TabsTrigger>
          <TabsTrigger value="mentors">Mentors ({filteredMentors.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Management</CardTitle>
              <CardDescription>
                View and manage patient accounts and profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={patient.avatar_url} />
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                              {getInitials(patient.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{patient.full_name}</div>
                            <div className="text-sm text-gray-500">{patient.gender || 'Not specified'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-1 text-gray-400" />
                            {patient.email}
                          </div>
                          {patient.phone_number && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Phone className="h-3 w-3 mr-1 text-gray-400" />
                              {patient.phone_number}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <MapPin className="h-3 w-3 mr-1 text-gray-400" />
                          {patient.location || 'Not provided'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={patient.is_active ? "default" : "secondary"}>
                          {patient.is_active ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(patient.created_at), 'MMM d, yyyy')}
                        </div>
                        {patient.last_seen && (
                          <div className="text-xs text-gray-500">
                            Last seen: {format(new Date(patient.last_seen), 'MMM d')}
                          </div>
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
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend Account
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
        </TabsContent>

        <TabsContent value="mentors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Mentor Management</CardTitle>
              <CardDescription>
                View and manage mood mentor accounts and profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mentor</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMentors.map((mentor) => (
                    <TableRow key={mentor.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={mentor.avatar_url} />
                            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                              {getInitials(mentor.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{mentor.full_name}</div>
                            <div className="text-sm text-gray-500">{mentor.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{mentor.specialty}</div>
                        {mentor.specialties && mentor.specialties.length > 1 && (
                          <div className="text-xs text-gray-500">
                            +{mentor.specialties.length - 1} more
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="text-sm font-medium">{mentor.rating.toFixed(1)}</div>
                          <div className="ml-1 text-yellow-400">★</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            mentor.availability_status === 'available' ? 'default' :
                            mentor.availability_status === 'busy' ? 'secondary' : 'outline'
                          }
                        >
                          {mentor.availability_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {mentor.is_free ? (
                            <Badge variant="secondary">Free</Badge>
                          ) : (
                            `$${mentor.hourly_rate}/hr`
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(mentor.created_at), 'MMM d, yyyy')}
                        </div>
                        {mentor.last_seen && (
                          <div className="text-xs text-gray-500">
                            Last seen: {format(new Date(mentor.last_seen), 'MMM d')}
                          </div>
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
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend Account
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
