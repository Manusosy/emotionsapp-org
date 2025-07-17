import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/authContext";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format, subDays, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Users, 
  Calendar, 
  UserCheck, 
  UserX, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Download,
  Clock,
  Star,
  FileText,
  BarChart2,
  PieChart as PieChartIcon,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

// Define interfaces for our data
interface MentorStats {
  totalPatients: number;
  activePatients: number;
  totalAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  averageRating: number;
  reviewCount: number;
}

interface AppointmentData {
  id: string;
  date: string;
  status: string;
  patient_id: string;
  patient_name: string;
  meeting_type: string;
}

interface ReviewData {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  patient_name: string;
}

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsPage() {
  const authContext = useContext(AuthContext);
  const { user } = authContext || {};
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [stats, setStats] = useState<MentorStats>({
    totalPatients: 0,
    activePatients: 0,
    totalAppointments: 0,
    upcomingAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    averageRating: 0,
    reviewCount: 0
  });
  const [appointmentsByDate, setAppointmentsByDate] = useState<any[]>([]);
  const [appointmentsByType, setAppointmentsByType] = useState<any[]>([]);
  const [appointmentsByStatus, setAppointmentsByStatus] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [reviews, setReviews] = useState<ReviewData[]>([]);

  useEffect(() => {
    if (user) {
      fetchAnalyticsData();
    }
  }, [user, timeRange]);

  const fetchAnalyticsData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Check if mentor profile is complete first
      const { data: mentorProfile, error: profileError } = await supabase
        .from('mood_mentor_profiles')
        .select('is_profile_complete')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error checking mentor profile:', profileError);
        toast.error('Failed to load analytics data');
        return;
      }

      // If profile is not complete, show welcome dialog and return
      if (!mentorProfile?.is_profile_complete) {
        setIsProfileComplete(false);
        setShowWelcomeDialog(true);
        setIsLoading(false);
        return;
      }

      setIsProfileComplete(true);

      // Calculate date range
      const today = new Date();
      let startDate;
      
      switch (timeRange) {
        case 'week':
          startDate = subDays(today, 7);
          break;
        case 'month':
          startDate = subDays(today, 30);
          break;
        case 'year':
          startDate = subDays(today, 365);
          break;
        default:
          startDate = subDays(today, 30);
      }

      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(today, 'yyyy-MM-dd');

      // Fetch mentor dashboard stats
      const { data: dashboardStats, error: statsError } = await supabase
        .from('mentor_dashboard_stats')
        .select('*')
        .eq('mentor_id', user.id)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        console.error('Error fetching dashboard stats:', statsError);
        toast.error('Failed to load analytics data');
      } else if (dashboardStats) {
        setStats({
          totalPatients: dashboardStats.total_clients || 0,
          activePatients: dashboardStats.total_clients || 0, // Use total_clients as active patients for now
          totalAppointments: dashboardStats.total_appointments || 0,
          upcomingAppointments: dashboardStats.upcoming_appointments || 0,
          completedAppointments: dashboardStats.completed_appointments || 0,
          cancelledAppointments: dashboardStats.cancelled_appointments || 0,
          averageRating: dashboardStats.average_rating || 0,
          reviewCount: 0 // Will be calculated from reviews data
        });
      }

      // Fetch appointments for the date range
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('mentor_appointments_view')
        .select('*')
        .eq('mentor_id', user.id)
        .gte('date', formattedStartDate)
        .lte('date', formattedEndDate)
        .order('date', { ascending: true });

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
      } else if (appointmentsData) {
        setAppointments(appointmentsData.map(apt => ({
          id: apt.id,
          date: apt.date,
          status: apt.status,
          patient_id: apt.patient_id,
          patient_name: apt.patient_name || 'Unknown Patient',
          meeting_type: apt.meeting_type
        })));

        // Process appointment data for charts
        processAppointmentsData(appointmentsData);
      }

      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('mentor_reviews_view')
        .select('*')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false });

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
      } else if (reviewsData) {
        const processedReviews = reviewsData.map(review => ({
          id: review.id,
          rating: review.rating,
          comment: review.review_text || '',
          created_at: review.created_at,
          patient_name: review.patient_name || 'Anonymous Patient'
        }));
        
        setReviews(processedReviews);
        
        // Update review count in stats
        setStats(prevStats => ({
          ...prevStats,
          reviewCount: processedReviews.length
        }));
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const processAppointmentsData = (appointmentsData: any[]) => {
    // Process appointments by date
    const appointmentsByDateMap = new Map();
    
    appointmentsData.forEach(apt => {
      const date = apt.date;
      if (!appointmentsByDateMap.has(date)) {
        appointmentsByDateMap.set(date, 0);
      }
      appointmentsByDateMap.set(date, appointmentsByDateMap.get(date) + 1);
    });

    const appointmentsByDateArray = Array.from(appointmentsByDateMap.entries()).map(([date, count]) => ({
      date: format(parseISO(date), 'MMM dd'),
      count
    }));

    setAppointmentsByDate(appointmentsByDateArray);

    // Process appointments by type
    const appointmentsByTypeMap = new Map();
    
    appointmentsData.forEach(apt => {
      const type = apt.meeting_type || 'unknown';
      if (!appointmentsByTypeMap.has(type)) {
        appointmentsByTypeMap.set(type, 0);
      }
      appointmentsByTypeMap.set(type, appointmentsByTypeMap.get(type) + 1);
    });

    const appointmentsByTypeArray = Array.from(appointmentsByTypeMap.entries()).map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count
    }));

    setAppointmentsByType(appointmentsByTypeArray);

    // Process appointments by status
    const appointmentsByStatusMap = new Map();
    
    appointmentsData.forEach(apt => {
      const status = apt.status || 'unknown';
      if (!appointmentsByStatusMap.has(status)) {
        appointmentsByStatusMap.set(status, 0);
      }
      appointmentsByStatusMap.set(status, appointmentsByStatusMap.get(status) + 1);
    });

    const appointmentsByStatusArray = Array.from(appointmentsByStatusMap.entries()).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count
    }));

    setAppointmentsByStatus(appointmentsByStatusArray);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-500';
    if (rating >= 3.5) return 'text-blue-500';
    if (rating >= 2.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const exportToPdf = () => {
    try {
      const doc = new jsPDF();
      
      // Add title and date
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 150);
      doc.text('Mentor Analytics Report', 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Mentor: ${user?.user_metadata?.name || 'Unknown'}`, 14, 30);
      doc.text(`Date Range: ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)}`, 14, 36);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 42);
      
      // Add overview stats
      doc.setFontSize(14);
      doc.text('Overview Statistics', 14, 52);
      
      doc.setFontSize(10);
      const statsData = [
        ['Total Patients', stats.totalPatients.toString()],
        ['Active Patients', stats.activePatients.toString()],
        ['Total Appointments', stats.totalAppointments.toString()],
        ['Upcoming Appointments', stats.upcomingAppointments.toString()],
        ['Completed Appointments', stats.completedAppointments.toString()],
        ['Cancelled Appointments', stats.cancelledAppointments.toString()],
        ['Average Rating', stats.averageRating.toFixed(1) + ' / 5'],
        ['Review Count', stats.reviewCount.toString()]
      ];
      
      (doc as any).autoTable({
        startY: 58,
        head: [['Metric', 'Value']],
        body: statsData,
        theme: 'grid',
        headStyles: {
          fillColor: [32, 192, 243],
          textColor: [255, 255, 255]
        }
      });
      
      // Save the PDF
      const fileName = `mentor_analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("Analytics report has been downloaded");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to export analytics report');
    }
  };

  const handleCloseWelcomeDialog = () => {
    setShowWelcomeDialog(false);
    navigate('/mood-mentor-dashboard/profile');
  };

  return (
    <DashboardLayout>
      {/* Welcome Dialog for incomplete profile */}
      <Dialog open={showWelcomeDialog} onOpenChange={setShowWelcomeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
            <DialogDescription>
              You need to complete your profile before accessing analytics.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex items-center p-3 bg-amber-50 text-amber-800 rounded-lg">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <p className="text-sm">
                Analytics are only available after completing your profile information.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWelcomeDialog(false)}>
              Later
            </Button>
            <Button onClick={handleCloseWelcomeDialog}>
              Complete Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-gray-500">
              Monitor your performance and patient engagement
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="bg-white border rounded-md overflow-hidden flex">
              <Button 
                variant={timeRange === 'week' ? 'default' : 'ghost'} 
                size="sm" 
                className="rounded-none"
                onClick={() => setTimeRange('week')}
              >
                Week
              </Button>
              <Button 
                variant={timeRange === 'month' ? 'default' : 'ghost'} 
                size="sm" 
                className="rounded-none"
                onClick={() => setTimeRange('month')}
              >
                Month
              </Button>
              <Button 
                variant={timeRange === 'year' ? 'default' : 'ghost'} 
                size="sm" 
                className="rounded-none"
                onClick={() => setTimeRange('year')}
              >
                Year
              </Button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToPdf}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6" onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full sm:w-[400px]">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="ratings">Ratings</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Patients</p>
                      <h3 className="text-2xl font-bold mt-1">{stats.totalPatients}</h3>
                    </div>
                    <div className="p-2 rounded-full bg-blue-100">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Active Patients</p>
                      <h3 className="text-2xl font-bold mt-1">{stats.activePatients}</h3>
                      <p className="text-xs text-green-600 mt-1">
                        {stats.totalPatients > 0 ? 
                          `${Math.round((stats.activePatients / stats.totalPatients) * 100)}% engagement` : 
                          'No patients yet'}
                      </p>
                    </div>
                    <div className="p-2 rounded-full bg-green-100">
                      <UserCheck className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Appointments</p>
                      <h3 className="text-2xl font-bold mt-1">{stats.totalAppointments}</h3>
                      <p className="text-xs text-blue-600 mt-1">
                        {stats.completedAppointments} completed
                      </p>
                    </div>
                    <div className="p-2 rounded-full bg-purple-100">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Average Rating</p>
                      <h3 className={`text-2xl font-bold mt-1 ${getRatingColor(stats.averageRating)}`}>
                        {stats.averageRating.toFixed(1)}/5
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        From {stats.reviewCount} reviews
                      </p>
                    </div>
                    <div className="p-2 rounded-full bg-yellow-100">
                      <Star className="h-5 w-5 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Appointment Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Appointment Distribution</CardTitle>
                <CardDescription>
                  Overview of your appointment data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Appointment by Type */}
                  <div className="flex flex-col items-center">
                    <h4 className="text-sm font-medium text-gray-500 mb-4">By Meeting Type</h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={appointmentsByType}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {appointmentsByType.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Appointment by Status */}
                  <div className="flex flex-col items-center">
                    <h4 className="text-sm font-medium text-gray-500 mb-4">By Status</h4>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={appointmentsByStatus}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#8884d8" name="Appointments">
                            {appointmentsByStatus.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Trends</CardTitle>
                <CardDescription>
                  Appointment frequency over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={appointmentsByDate}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                        name="Appointments"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Appointments</CardTitle>
                <CardDescription>
                  Your latest appointments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {appointments.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">
                    No appointments in the selected time range
                  </p>
                ) : (
                  <div className="space-y-4">
                    {appointments.slice(0, 5).map(appointment => (
                      <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <Calendar className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{appointment.patient_name}</p>
                            <p className="text-sm text-gray-500">{format(parseISO(appointment.date), 'MMM dd, yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={
                            appointment.status === 'completed' ? 'bg-green-100 text-green-700 border-green-200' :
                            appointment.status === 'scheduled' || appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            appointment.status === 'cancelled' ? 'bg-red-100 text-red-700 border-red-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                          }>
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </Badge>
                          <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                            {appointment.meeting_type.charAt(0).toUpperCase() + appointment.meeting_type.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    
                    {appointments.length > 5 && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-2"
                        onClick={() => navigate('/mood-mentor-dashboard/appointments')}
                      >
                        View All Appointments
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Ratings Tab */}
          <TabsContent value="ratings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ratings & Reviews</CardTitle>
                <CardDescription>
                  Patient feedback and satisfaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-6">
                  <Card className="flex-1 bg-gray-50 border-0">
                    <CardContent className="pt-6">
                      <div className="flex flex-col items-center">
                        <h3 className={`text-5xl font-bold ${getRatingColor(stats.averageRating)}`}>
                          {stats.averageRating.toFixed(1)}
                        </h3>
                        <div className="flex items-center mt-2">
                          {[1, 2, 3, 4, 5].map(i => (
                            <Star 
                              key={i}
                              className={`h-5 w-5 ${i <= Math.round(stats.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Based on {stats.reviewCount} reviews
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex-1">
                    {reviews.length === 0 ? (
                      <div className="text-center text-gray-500 py-4">
                        No reviews yet
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {reviews.slice(0, 3).map(review => (
                          <div key={review.id} className="border-b pb-4 last:border-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{review.patient_name}</p>
                              <p className="text-xs text-gray-500">
                                {format(parseISO(review.created_at), 'MMM dd, yyyy')}
                              </p>
                            </div>
                            <div className="flex items-center mt-1">
                              {[1, 2, 3, 4, 5].map(i => (
                                <Star 
                                  key={i}
                                  className={`h-4 w-4 ${i <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                            </div>
                            {review.comment && (
                              <p className="text-sm text-gray-600 mt-2">
                                "{review.comment}"
                              </p>
                            )}
                          </div>
                        ))}
                        
                        {reviews.length > 3 && (
                          <Button 
                            variant="outline" 
                            className="w-full mt-2"
                            onClick={() => navigate('/mood-mentor-dashboard/reviews')}
                          >
                            View All Reviews
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 