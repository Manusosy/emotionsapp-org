import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Users,
  Calendar,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AdminFinancePage() {
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');

  const [mentorEarningsData, setMentorEarningsData] = useState<any[]>([]);
  
  // Revenue data - all zeros since not monetized yet
  const revenueData = [
    { name: 'Jan', revenue: 0, subscriptions: 0, sessions: 0 },
    { name: 'Feb', revenue: 0, subscriptions: 0, sessions: 0 },
    { name: 'Mar', revenue: 0, subscriptions: 0, sessions: 0 },
    { name: 'Apr', revenue: 0, subscriptions: 0, sessions: 0 },
    { name: 'May', revenue: 0, subscriptions: 0, sessions: 0 },
    { name: 'Jun', revenue: 0, subscriptions: 0, sessions: 0 },
  ];

  const revenueSourceData = [
    { name: 'Premium Subscriptions', value: 0, color: '#3B82F6' },
    { name: 'Session Fees', value: 0, color: '#10B981' },
    { name: 'Corporate Plans', value: 0, color: '#F59E0B' },
    { name: 'One-time Purchases', value: 0, color: '#EF4444' },
  ];

  useEffect(() => {
    fetchMentorData();
  }, []);

  const fetchMentorData = async () => {
    try {
      const { data: mentorsData, error } = await supabase
        .from('mood_mentor_profiles')
        .select('full_name, is_free, hourly_rate')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedMentors = (mentorsData || []).map(mentor => ({
        name: mentor.full_name,
        earnings: 0, // All free currently
        sessions: 0, // Could be calculated from appointments
        is_free: mentor.is_free,
        hourly_rate: mentor.hourly_rate
      }));

      setMentorEarningsData(transformedMentors);
    } catch (error) {
      console.error('Error fetching mentor data:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Financial Intelligence</h2>
          <p className="text-gray-600">
            Revenue analytics, financial forecasting, and monetization insights
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="quarter">Quarter</TabsTrigger>
              <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Revenue KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Monthly Revenue"
          value="$0"
          icon={DollarSign}
          color="green"
          subtitle="Not monetized yet"
        />
        <StatCard
          title="Average Revenue Per User"
          value="$0"
          icon={Users}
          color="blue"
          subtitle="Free service currently"
        />
        <StatCard
          title="Conversion Rate"
          value="0%"
          icon={TrendingUp}
          color="purple"
          subtitle="No paid plans yet"
        />
        <StatCard
          title="Churn Rate"
          value="0%"
          icon={RefreshCw}
          color="orange"
          subtitle="Free service retention"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
              Revenue Growth
            </CardTitle>
            <CardDescription>
              Monthly revenue breakdown by source
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, '']} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="subscriptions" 
                  stackId="1"
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.6}
                  name="Subscriptions"
                />
                <Area 
                  type="monotone" 
                  dataKey="sessions" 
                  stackId="1"
                  stroke="#10B981" 
                  fill="#10B981" 
                  fillOpacity={0.6}
                  name="Session Fees"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="mr-2 h-5 w-5 text-blue-600" />
              Revenue Sources
            </CardTitle>
            <CardDescription>
              Distribution of revenue streams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={revenueSourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {revenueSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Financial Projections */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>MRR Projection</CardTitle>
            <CardDescription>Monthly Recurring Revenue forecast</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600 mb-2">$0</div>
            <p className="text-sm text-gray-600 mb-4">Ready for monetization</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current MRR</span>
                <span>$0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Active Users</span>
                <span className="text-blue-600">36</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Platform Ready</span>
                <span className="text-green-600">✓ Yes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Lifetime Value</CardTitle>
            <CardDescription>Potential value per customer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600 mb-2">TBD</div>
            <p className="text-sm text-gray-600 mb-4">To be determined</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Users</span>
                <span>36</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Engagement</span>
                <span className="text-green-600">High</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Retention</span>
                <span className="text-green-600">Strong</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acquisition Cost</CardTitle>
            <CardDescription>Customer acquisition metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-600 mb-2">$0</div>
            <p className="text-sm text-gray-600 mb-4">Organic growth</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Marketing Spend</span>
                <span>$0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Organic Users</span>
                <span className="text-green-600">36</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Growth Rate</span>
                <span className="text-green-600">+80%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mentor Earnings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5 text-orange-600" />
            Mentor Earnings
          </CardTitle>
          <CardDescription>
            Top performing mentors by revenue generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mentorEarningsData.length > 0 ? (
              mentorEarningsData.map((mentor, index) => (
                <div key={mentor.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{mentor.name}</div>
                      <div className="text-sm text-gray-500">
                        {mentor.is_free ? 'Free service' : `$${mentor.hourly_rate}/hr`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-600">$0</div>
                    <div className="text-xs text-gray-500">Free currently</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                Loading mentor data...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Health Indicators */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">$0</div>
            <p className="text-sm text-gray-500">Pre-monetization phase</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Revenue</span>
                <span>$0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Operating Costs</span>
                <span>Minimal</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Platform Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">High</div>
            <p className="text-sm text-gray-500">User engagement & retention</p>
            <Badge className="mt-2 bg-green-100 text-green-800">
              Ready to Scale
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Growth Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">+80%</div>
            <p className="text-sm text-gray-500">User growth (3 months)</p>
            <Badge className="mt-2 bg-blue-100 text-blue-800">
              Strong Growth
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
