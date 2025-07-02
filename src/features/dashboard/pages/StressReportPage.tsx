import { useState, useEffect, useContext } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthContext } from "@/contexts/authContext";
import { dataService } from "@/services";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  BarChart3, 
  ArrowUpRight, 
  Activity, 
  Calendar, 
  Brain, 
  HeartPulse, 
  TrendingUp,
  Sparkles,
  Clock,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import StressProgressChart from "../components/StressProgressChart";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Define types for our data
interface Assessment {
  id: string;
  user_id: string;
  stress_score: number;
  created_at: string;
}

interface MoodEntry {
  id: string;
  user_id: string;
  mood_score: number;
  created_at: string;
}

// Type for database tables
type Tables = {
  [key: string]: any;
}

export default function StressReportPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [isLoading, setIsLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [stressMetrics, setStressMetrics] = useState({
    currentLevel: 0,
    weeklyAverage: 0,
    monthlyAverage: 0,
    trend: 'stable' as 'improving' | 'declining' | 'stable',
    lastAssessmentDate: '',
    assessmentCount: 0,
    consistencyScore: 0
  });
  const [moodMetrics, setMoodMetrics] = useState({
    currentScore: 0,
    weeklyAverage: 0,
    trend: 'stable' as 'improving' | 'declining' | 'stable',
    consistencyPercentage: 0
  });
  
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        let assessmentsData: Assessment[] = [];
        let moodData: MoodEntry[] = [];
        let metricsData: any = null;
        
        // Check if we're in test mode (use session storage)
        const isTestMode = true; // For testing, always use test mode
        
        if (isTestMode) {
          // Load test data from sessionStorage
          try {
            // Load stress assessment data
            const testStressDataString = sessionStorage.getItem('test_stress_assessment');
            if (testStressDataString) {
              const testStressData = JSON.parse(testStressDataString);
              
              // Generate assessment data for visualization
              const now = new Date();
              
              // Create a series of test assessments over time
              assessmentsData = [
                {
                  id: 'test-1',
                  user_id: user.id || 'test-user',
                  stress_score: testStressData.stressLevel,
                  created_at: now.toISOString()
                }
              ];
              
              // Add some historical data points for better visualization
              // Generate data for the past 6 days with slight variation
              for (let i = 1; i <= 6; i++) {
                const pastDate = new Date();
                pastDate.setDate(now.getDate() - i);
                
                // Random variation around the current stress level for more realistic data
                const variation = (Math.random() * 2 - 1) * 0.5; // -0.5 to +0.5
                const historicalStressLevel = Math.max(0, Math.min(10, testStressData.stressLevel + variation));
                
                assessmentsData.push({
                  id: `test-${i+1}`,
                  user_id: user.id || 'test-user',
                  stress_score: historicalStressLevel, 
                  created_at: pastDate.toISOString()
                });
              }
              
              // Sort by date (oldest to newest)
              assessmentsData.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            }
            
            // Load mood assessment data
            const testMoodEntriesString = sessionStorage.getItem('test_mood_entries');
            if (testMoodEntriesString) {
              const entries = JSON.parse(testMoodEntriesString);
              if (Array.isArray(entries) && entries.length > 0) {
                // Use actual mood entries for the report
                moodData = entries.map(entry => ({
                  id: entry.id || `mood-${Math.random().toString(36).substring(2, 9)}`,
                  user_id: user.id || 'test-user',
                  mood_score: entry.mood_score,
                  created_at: entry.created_at
                }));
                
                // Sort by date (oldest to newest)
                moodData.sort((a, b) => 
                  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              }
            }
            
            // Generate metrics data
            if (assessmentsData.length > 0) {
              metricsData = {
                stress_level: assessmentsData[assessmentsData.length - 1].stress_score,
                last_assessment_at: assessmentsData[assessmentsData.length - 1].created_at
              };
            }
          } catch (error) {
            console.error("Error loading test data from sessionStorage:", error);
          }
        } else {
          // Fetch real data from database when not in test mode
          // Fetch stress assessments using dataService
          const { data: fetchedAssessments, error: assessmentsError } = await dataService.getStressAssessments(user.id, 10);
            
          if (assessmentsError) throw assessmentsError;
          assessmentsData = fetchedAssessments as Assessment[] || [];
          
          // Fetch mood entries using dataService
          const { data: fetchedMoodData, error: moodError } = await dataService.getMoodEntries(user.id, 20);
            
          if (moodError) throw moodError;
          moodData = fetchedMoodData as MoodEntry[] || [];
          
          // Fetch current stress metrics using patientService
          const { data: fetchedMetricsData, error: metricsError } = await patientService.getUserAssessmentMetrics(user.id);
            
          if (metricsError) throw metricsError;
          metricsData = fetchedMetricsData;
        }
        
        // Set data with type casting
        setAssessments(assessmentsData);
        setMoodEntries(moodData);
        
        // If we have assessments, calculate metrics
        if (assessmentsData.length > 0) {
          // Get most recent stress level
          const currentLevel = assessmentsData[assessmentsData.length - 1].stress_score;
          
          // Calculate weekly average
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const weeklyAssessments = assessmentsData.filter(a => new Date(a.created_at) >= weekAgo);
          const weeklyAvg = weeklyAssessments.length > 0
            ? weeklyAssessments.reduce((sum, a) => sum + a.stress_score, 0) / weeklyAssessments.length
            : currentLevel;
            
          // Calculate monthly average
          const monthAgo = new Date();
          monthAgo.setDate(monthAgo.getDate() - 30);
          const monthlyAssessments = assessmentsData.filter(a => new Date(a.created_at) >= monthAgo);
          const monthlyAvg = monthlyAssessments.length > 0
            ? monthlyAssessments.reduce((sum, a) => sum + a.stress_score, 0) / monthlyAssessments.length
            : currentLevel;
            
          // Calculate trend
          let trend: 'improving' | 'declining' | 'stable' = 'stable';
          if (weeklyAssessments.length >= 3) {
            const halfPoint = Math.floor(weeklyAssessments.length / 2);
            const firstHalf = weeklyAssessments.slice(0, halfPoint);
            const secondHalf = weeklyAssessments.slice(halfPoint);
            
            const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a.stress_score, 0) / firstHalf.length;
            const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a.stress_score, 0) / secondHalf.length;
            
            // Lower stress score = improvement
            if (secondHalfAvg < firstHalfAvg - 0.5) trend = 'improving';
            else if (secondHalfAvg > firstHalfAvg + 0.5) trend = 'declining';
          }
          
          // Calculate consistency score
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const lastThirtyDaysAssessments = assessmentsData.filter(a => new Date(a.created_at) >= thirtyDaysAgo);
          
          // Count unique days with entries
          const uniqueDays = new Set();
          lastThirtyDaysAssessments.forEach(a => {
            const dateStr = new Date(a.created_at).toDateString();
            uniqueDays.add(dateStr);
          });
          
          const consistencyScore = Math.round((uniqueDays.size / 30) * 100);
          
          // Format date nicely
          const formattedDate = new Date(assessmentsData[assessmentsData.length - 1].created_at)
            .toLocaleString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              hour12: true
            });
            
          // Set metrics  
          setStressMetrics({
            currentLevel: Number(currentLevel.toFixed(1)),
            weeklyAverage: Number(weeklyAvg.toFixed(1)),
            monthlyAverage: Number(monthlyAvg.toFixed(1)),
            trend,
            lastAssessmentDate: formattedDate,
            assessmentCount: assessmentsData.length,
            consistencyScore
          });
        } else if (metricsData) {
          // Use metrics from database 
          // Convert from 0-1 scale to 0-10 scale if needed
          const stressLevel = metricsData.stress_level > 1 ? 
            metricsData.stress_level : 
            metricsData.stress_level * 10;
            
          const lastAssessmentDate = metricsData.last_assessment_at ? 
            format(new Date(metricsData.last_assessment_at), "MMMM d, yyyy 'at' h:mm a") : 
            'No assessment date available';
            
          setStressMetrics({
            currentLevel: Number(stressLevel.toFixed(1)),
            weeklyAverage: Number(stressLevel.toFixed(1)),
            monthlyAverage: Number(stressLevel.toFixed(1)),
            trend: 'stable',
            lastAssessmentDate,
            assessmentCount: 0,
            consistencyScore: 0
          });
        } else {
          // No data available
          setStressMetrics({
            currentLevel: 0,
            weeklyAverage: 0,
            monthlyAverage: 0,
            trend: 'stable',
            lastAssessmentDate: 'No assessments taken',
            assessmentCount: 0,
            consistencyScore: 0
          });
        }
        
        // Calculate mood metrics if available
        if (moodData && moodData.length > 0) {
          const currentScore = moodData[moodData.length - 1].mood_score;
          
          // Weekly average
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const weeklyMoods = moodData.filter(m => new Date(m.created_at) >= weekAgo);
          const weeklyAvg = weeklyMoods.length > 0
            ? weeklyMoods.reduce((sum, m) => sum + m.mood_score, 0) / weeklyMoods.length
            : currentScore;
            
          // Calculate trend
          let trend: 'improving' | 'declining' | 'stable' = 'stable';
          if (weeklyMoods.length >= 3) {
            const halfPoint = Math.floor(weeklyMoods.length / 2);
            const firstHalf = weeklyMoods.slice(0, halfPoint);
            const secondHalf = weeklyMoods.slice(halfPoint);
            
            const firstHalfAvg = firstHalf.reduce((sum, m) => sum + m.mood_score, 0) / firstHalf.length;
            const secondHalfAvg = secondHalf.reduce((sum, m) => sum + m.mood_score, 0) / secondHalf.length;
            
            // Higher mood score = improved mood
            if (secondHalfAvg > firstHalfAvg + 0.5) trend = 'improving';
            else if (secondHalfAvg < firstHalfAvg - 0.5) trend = 'declining';
          }
          
          // Calculate consistency percentage (how many days they logged mood in the last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const lastThirtyDaysMoods = moodData.filter(m => new Date(m.created_at) >= thirtyDaysAgo);
          
          // Count unique days with entries
          const uniqueDays = new Set();
          lastThirtyDaysMoods.forEach(m => {
            const dateStr = new Date(m.created_at).toDateString();
            uniqueDays.add(dateStr);
          });
          
          const consistencyPercentage = Math.round((uniqueDays.size / 30) * 100);
          
          setMoodMetrics({
            currentScore: Number(currentScore.toFixed(1)),
            weeklyAverage: Number(weeklyAvg.toFixed(1)),
            trend,
            consistencyPercentage
          });
        } else {
          // No mood data available
          setMoodMetrics({
            currentScore: 0,
            weeklyAverage: 0,
            trend: 'stable',
            consistencyPercentage: 0
          });
        }
      } catch (error) {
        console.error("Error fetching stress data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  // Helper function to convert stress score to health percentage
  const getHealthPercentage = (stress: number) => {
    // Inverse relationship: lower stress = higher health
    return Math.round((10 - stress) * 10);
  };
  
  // Helper to get trend icon and color
  const getTrendIndicator = (trend: 'improving' | 'declining' | 'stable', isPositive = true) => {
    switch (trend) {
      case 'improving':
        return { 
          icon: <TrendingUp className={`w-4 h-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />, 
          color: isPositive ? 'text-green-500' : 'text-red-500', 
          text: 'Improving', 
          badge: 'bg-green-100 text-green-800'
        };
      case 'declining':
        return { 
          icon: <TrendingUp className={`w-4 h-4 rotate-180 ${isPositive ? 'text-red-500' : 'text-green-500'}`} />, 
          color: isPositive ? 'text-red-500' : 'text-green-500', 
          text: 'Declining',
          badge: 'bg-red-100 text-red-800'
        };
      default:
        return { 
          icon: <TrendingUp className="w-4 h-4 rotate-45 text-yellow-500" />, 
          color: 'text-yellow-500', 
          text: 'Stable',
          badge: 'bg-yellow-100 text-yellow-800'
        };
    }
  };
  
  // Helper to get color based on health percentage
  const getHealthColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-lime-600";
    if (percentage >= 40) return "text-yellow-600";
    if (percentage >= 20) return "text-orange-600";
    return "text-red-600";
  };
  
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-lime-500";
    if (percentage >= 40) return "bg-yellow-500";
    if (percentage >= 20) return "bg-orange-500";
    return "bg-red-500";
  };
  
  const getMoodColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-lime-600";
    if (score >= 4) return "text-yellow-600";
    if (score >= 2) return "text-orange-600";
    return "text-red-600";
  };
  
  const stressTrend = getTrendIndicator(stressMetrics.trend, false); // For stress, declining is positive
  const moodTrend = getTrendIndicator(moodMetrics.trend, true); // For mood, improving is positive
  const healthPercentage = getHealthPercentage(stressMetrics.currentLevel);
  
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Button 
              variant="ghost" 
              className="mb-2 pl-0 text-slate-500" 
              onClick={() => navigate('/patient-dashboard')}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Button>
            <h1 className="text-2xl font-semibold">Health Analytics & Recommendations</h1>
            <p className="text-slate-500 mt-1">
              {isLoading ? "Loading your personalized report..." : 
               stressMetrics.assessmentCount > 0 ? 
               `Based on ${stressMetrics.assessmentCount} assessment${stressMetrics.assessmentCount !== 1 ? 's' : ''}` : 
               "Complete your first assessment to see personalized insights"}
            </p>
          </div>
          <Button 
            variant="outline" 
            className="bg-[#20C0F3] hover:bg-[#1ba8d5] text-white border-none shadow"
            onClick={() => navigate('/patient-dashboard')}
          >
            <Brain className="w-4 h-4 mr-2" />
            New Assessment
          </Button>
        </div>
        
        {/* Health Score Summary Card */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center">
              <HeartPulse className="w-5 h-5 text-blue-500 mr-2" />
              <CardTitle className="text-lg">Emotional Health Summary</CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="pt-5">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Health Score */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-700">Current Health Score</h3>
                  <Badge className={stressTrend.badge}>
                    {stressTrend.text}
                    {stressTrend.icon}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="relative w-28 h-28">
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="10"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke={getProgressColor(healthPercentage)}
                        strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 45 * healthPercentage / 100} ${2 * Math.PI * 45 * (100 - healthPercentage) / 100}`}
                        strokeDashoffset={2 * Math.PI * 45 * 0.25}
                        strokeLinecap="round"
                        transform="rotate(-90 50 50)"
                      />
                      <text
                        x="50"
                        y="55"
                        fontSize="22"
                        fontWeight="bold"
                        fill={getHealthColor(healthPercentage)}
                        textAnchor="middle"
                      >
                        {healthPercentage}%
                      </text>
                    </svg>
                  </div>
                  
                  <div className="flex-1">
                    <div className="mb-3">
                      <div className="text-sm text-slate-600">
                        Stress Level: <span className="font-medium">{stressMetrics.currentLevel}/10</span>
                      </div>
                      <Progress 
                        value={stressMetrics.currentLevel * 10} 
                        className="h-2 mt-1" 
                        indicatorClassName={getProgressColor(100 - stressMetrics.currentLevel * 10)}
                      />
                    </div>
                    
                    <div>
                      <div className="text-sm text-slate-600">
                        30-Day Progress:
                      </div>
                      <div className="flex items-center mt-1 gap-2">
                        <div className="text-sm font-medium">
                          {stressMetrics.monthlyAverage.toFixed(1)}
                        </div>
                        <div className="h-0.5 flex-1 bg-slate-100">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{ width: `${stressMetrics.currentLevel < stressMetrics.monthlyAverage ? '100' : 
                              Math.round((stressMetrics.currentLevel / stressMetrics.monthlyAverage) * 100)}%` }} 
                          ></div>
                        </div>
                        <div className="text-sm font-medium">
                          {stressMetrics.currentLevel.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center text-sm">
                    <Clock className="w-4 h-4 text-slate-400 mr-1.5" />
                    <span className="text-slate-600">Last assessment: </span>
                    <span className="font-medium ml-1">
                      {stressMetrics.lastAssessmentDate === 'No assessments taken' ? 'Never' : stressMetrics.lastAssessmentDate}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Vertical Divider */}
              <div className="hidden md:block w-px bg-slate-200 self-stretch"></div>
              
              {/* Mood Tracking Data */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-slate-700">Mood Insights</h3>
                  {moodMetrics.currentScore > 0 && (
                    <Badge className={moodTrend.badge}>
                      {moodTrend.text}
                      {moodTrend.icon}
                    </Badge>
                  )}
                </div>
                
                {moodEntries.length > 0 ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`text-3xl font-bold ${getMoodColor(moodMetrics.currentScore)}`}>
                        {moodMetrics.currentScore.toFixed(1)}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-600">Current Mood Score</div>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                            <div 
                              key={value} 
                              className={`h-1.5 w-2 rounded-full ${
                                value <= moodMetrics.currentScore ? getMoodColor(value).replace('text-', 'bg-') : 'bg-slate-200'
                              }`}
                            ></div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-md p-3">
                        <div className="text-xs text-slate-500 mb-1">Weekly Average</div>
                        <div className={`text-xl font-medium ${getMoodColor(moodMetrics.weeklyAverage)}`}>
                          {moodMetrics.weeklyAverage.toFixed(1)}
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 rounded-md p-3">
                        <div className="text-xs text-slate-500 mb-1">Consistency</div>
                        <div className="text-xl font-medium text-blue-600">
                          {moodMetrics.consistencyPercentage}%
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-4 text-center">
                    <Sparkles className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">
                      No mood tracking data available yet
                    </p>
                    <Button 
                      variant="outline"
                      size="sm"
                      className="mt-3 text-blue-600 border-blue-200"
                      onClick={() => navigate('/patient-dashboard')}
                    >
                      Start Mood Tracking
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="bg-slate-50 border-t">
            <div className="w-full">
              <div className="flex items-center mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mr-1.5" />
                <h4 className="text-sm font-medium text-slate-700">Health Status:</h4>
                <span className={`ml-2 ${getHealthColor(healthPercentage)} font-medium`}>
                  {healthPercentage >= 80 ? 'Excellent' :
                   healthPercentage >= 60 ? 'Good' :
                   healthPercentage >= 40 ? 'Fair' :
                   healthPercentage >= 20 ? 'Concerning' : 'Worrying'}
                </span>
              </div>
              
              <p className="text-sm text-slate-600">
                {healthPercentage >= 60 ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    Your emotional health is in good condition. Continue maintaining your current stress management practices.
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Your stress levels indicate there may be room for improvement in your emotional well-being. Check the recommendations below.
                  </span>
                )}
              </p>
            </div>
          </CardFooter>
        </Card>
        
        {/* Stress Level Explanation */}
        <Card>
          <CardHeader>
            <CardTitle>Understanding Your Emotional Health Score</CardTitle>
            <CardDescription>
              How to interpret your assessment results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Your Emotional Health Score is calculated from your stress assessment responses. The score represents your overall emotional wellbeing, with higher percentages indicating better emotional health.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-3">
                <h3 className="font-medium">What your score means:</h3>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <p className="text-sm"><span className="font-medium">80-100%</span>: Excellent emotional health</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-lime-500"></div>
                  <p className="text-sm"><span className="font-medium">60-79%</span>: Good emotional health</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <p className="text-sm"><span className="font-medium">40-59%</span>: Fair emotional health</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <p className="text-sm"><span className="font-medium">20-39%</span>: Concerning emotional health</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <p className="text-sm"><span className="font-medium">0-19%</span>: Worrying emotional health</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium">Tips to improve your score:</h3>
                <ul className="space-y-2 text-sm text-slate-600 list-disc pl-5">
                  <li>Complete the stress assessment regularly to track your progress</li>
                  <li>Practice relaxation techniques like deep breathing and meditation</li>
                  <li>Maintain a consistent sleep schedule</li>
                  <li>Exercise regularly</li>
                  <li>Connect with supportive people</li>
                  <li>Speak with a mental health professional if your score is consistently low</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Detailed Reports */}
        <Tabs defaultValue="insights" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="insights">Insights & Recommendations</TabsTrigger>
            <TabsTrigger value="history">Assessment History</TabsTrigger>
            <TabsTrigger value="progress">Progress Tracking</TabsTrigger>
          </TabsList>
          
          {/* Insights & Recommendations Tab */}
          <TabsContent value="insights" className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" text="Loading insights..." />
              </div>
            ) : assessments.length < 2 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <Brain className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Complete More Assessments</h3>
                  <p className="text-slate-600 max-w-md mx-auto mb-6">
                    Take at least 2 stress assessments to receive personalized insights and recommendations based on your patterns.
                  </p>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => navigate('/patient-dashboard')}
                  >
                    Take Assessment Now
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Personalized Insights Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Sparkles className="w-5 h-5 text-blue-500 mr-2" />
                      Personalized Recommendations
                    </CardTitle>
                    <CardDescription>
                      Based on your assessment patterns and current stress levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Primary Recommendation */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                      <h3 className="text-lg font-medium text-blue-800 mb-3">Your Priority Focus</h3>
                      
                      {healthPercentage >= 80 ? (
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-blue-700 mb-2">Maintain Your Excellent Progress</h4>
                            <p className="text-sm text-slate-700">
                              Your emotional health score is excellent. Focus on maintaining your current routine and stress management practices.
                            </p>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-blue-700 mb-2">Key Action Items:</h4>
                            <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                              <li>Continue your effective stress management practices</li>
                              <li>Share your successful techniques with others</li>
                              <li>Gradually challenge yourself with new wellness goals</li>
                            </ul>
                          </div>
                        </div>
                      ) : healthPercentage >= 60 ? (
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-blue-700 mb-2">Build On Your Good Progress</h4>
                            <p className="text-sm text-slate-700">
                              Your emotional health score is good. Focus on consistency and building resilience.
                            </p>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-blue-700 mb-2">Key Action Items:</h4>
                            <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                              <li>Maintain regular exercise and sleep schedule</li>
                              <li>Practice mindfulness for 10 minutes daily</li>
                              <li>Limit exposure to stressful media content</li>
                            </ul>
                          </div>
                        </div>
                      ) : healthPercentage >= 40 ? (
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-blue-700 mb-2">Moderate Stress Reduction</h4>
                            <p className="text-sm text-slate-700">
                              Your stress levels are moderate but could be improved. Focus on implementing proven stress reduction techniques.
                            </p>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-blue-700 mb-2">Key Action Items:</h4>
                            <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                              <li>Practice deep breathing for 5 minutes, 3 times daily</li>
                              <li>Reduce caffeine and alcohol consumption</li>
                              <li>Schedule at least 30 minutes of physical activity daily</li>
                              <li>Establish a calming bedtime routine</li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <h4 className="font-medium text-blue-700 mb-2">Priority Stress Management</h4>
                            <p className="text-sm text-slate-700">
                              Your stress levels are elevated. Focus on immediate stress reduction techniques and consider professional support.
                            </p>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-blue-700 mb-2">Key Action Items:</h4>
                            <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
                              <li>Schedule shorter, more frequent breaks throughout the day</li>
                              <li>Try guided meditation sessions twice daily</li>
                              <li>Reduce commitments where possible</li>
                              <li>Consider speaking with a mental health professional</li>
                              <li>Prioritize 7-8 hours of quality sleep</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Stress Pattern Analysis */}
                    <div>
                      <h3 className="font-medium text-lg mb-3">Stress Pattern Analysis</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-start">
                            <div className="bg-blue-100 p-2 rounded-full mr-3">
                              <TrendingUp className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-medium mb-1">Trend Analysis</h4>
                              <p className="text-sm text-slate-600 mb-3">
                                Your stress levels are {stressMetrics.trend} {stressMetrics.trend === 'improving' ? '(getting better)' : stressMetrics.trend === 'declining' ? '(getting worse)' : '(neither improving nor declining significantly)'}.
                              </p>
                              <div className="text-sm">
                                {stressMetrics.trend === 'improving' ? (
                                  <div className="flex items-center text-green-600">
                                    <CheckCircle className="w-4 h-4 mr-1.5" />
                                    <span>Continue your current practices</span>
                                  </div>
                                ) : stressMetrics.trend === 'declining' ? (
                                  <div className="flex items-center text-amber-600">
                                    <AlertTriangle className="w-4 h-4 mr-1.5" />
                                    <span>Consider adding new stress management techniques</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center text-blue-600">
                                    <Activity className="w-4 h-4 mr-1.5" />
                                    <span>Try varying your stress management approaches</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                          <div className="flex items-start">
                            <div className="bg-purple-100 p-2 rounded-full mr-3">
                              <Calendar className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="font-medium mb-1">Consistency Insight</h4>
                              <p className="text-sm text-slate-600 mb-3">
                                You've completed {stressMetrics.assessmentCount} assessment{stressMetrics.assessmentCount !== 1 ? 's' : ''} with a consistency score of {stressMetrics.consistencyScore}%.
                              </p>
                              <div className="text-sm">
                                {stressMetrics.consistencyScore >= 70 ? (
                                  <div className="flex items-center text-green-600">
                                    <CheckCircle className="w-4 h-4 mr-1.5" />
                                    <span>Excellent tracking consistency</span>
                                  </div>
                                ) : stressMetrics.consistencyScore >= 40 ? (
                                  <div className="flex items-center text-blue-600">
                                    <Activity className="w-4 h-4 mr-1.5" />
                                    <span>Good tracking - aim for weekly assessments</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center text-amber-600">
                                    <AlertTriangle className="w-4 h-4 mr-1.5" />
                                    <span>Consider more regular tracking</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Practical Techniques */}
                    <div>
                      <h3 className="font-medium text-lg mb-3">Recommended Techniques</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <Card className="border-0 shadow-sm">
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2 text-blue-700">Deep Breathing</h4>
                            <p className="text-sm text-slate-600 mb-3">
                              Practice 4-7-8 breathing: Inhale for 4 seconds, hold for 7, exhale for 8. Repeat 5 times, 3× daily.
                            </p>
                            <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100">Quick Relief</Badge>
                          </CardContent>
                        </Card>
                        
                        <Card className="border-0 shadow-sm">
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2 text-purple-700">Progressive Relaxation</h4>
                            <p className="text-sm text-slate-600 mb-3">
                              Tense each muscle group for 5 seconds, then release. Work from toes to head for full-body relief.
                            </p>
                            <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-100">Evening Routine</Badge>
                          </CardContent>
                        </Card>
                        
                        <Card className="border-0 shadow-sm">
                          <CardContent className="p-4">
                            <h4 className="font-medium mb-2 text-emerald-700">Nature Walk</h4>
                            <p className="text-sm text-slate-600 mb-3">
                              Take a 20-minute walk outdoors. Focus on your surroundings and practice mindful observation.
                            </p>
                            <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100">Daily Activity</Badge>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Lifestyle and Sleep Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="w-5 h-5 text-indigo-500 mr-2" />
                      Lifestyle Recommendations
                    </CardTitle>
                    <CardDescription>
                      Balanced approach to improving overall emotional health
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium text-lg mb-3">Physical Well-being</h3>
                        <ul className="space-y-3">
                          <li className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-700">1</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">Exercise Regularly</h4>
                              <p className="text-xs text-slate-600">
                                Aim for 30 minutes of moderate activity at least 5 days per week
                              </p>
                            </div>
                          </li>
                          
                          <li className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-700">2</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">Prioritize Sleep</h4>
                              <p className="text-xs text-slate-600">
                                Maintain a consistent sleep schedule with 7-8 hours nightly
                              </p>
                            </div>
                          </li>
                          
                          <li className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-700">3</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">Balanced Nutrition</h4>
                              <p className="text-xs text-slate-600">
                                Reduce caffeine, alcohol, and processed foods. Increase complex carbs and protein
                              </p>
                            </div>
                          </li>
                          
                          <li className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-700">4</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">Hydration</h4>
                              <p className="text-xs text-slate-600">
                                Drink at least 8 glasses of water daily to support cognitive function
                              </p>
                            </div>
                          </li>
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-lg mb-3">Mental Well-being</h3>
                        <ul className="space-y-3">
                          <li className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-purple-700">1</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">Digital Detox</h4>
                              <p className="text-xs text-slate-600">
                                Take regular breaks from screens and social media
                              </p>
                            </div>
                          </li>
                          
                          <li className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-purple-700">2</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">Mindfulness Practice</h4>
                              <p className="text-xs text-slate-600">
                                Daily meditation, even for just 5-10 minutes
                              </p>
                            </div>
                          </li>
                          
                          <li className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-purple-700">3</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">Social Connection</h4>
                              <p className="text-xs text-slate-600">
                                Schedule regular time with supportive friends and family
                              </p>
                            </div>
                          </li>
                          
                          <li className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-purple-700">4</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium">Gratitude Journal</h4>
                              <p className="text-xs text-slate-600">
                                Write down three things you're grateful for each day
                              </p>
                            </div>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t">
                    <div className="w-full text-center">
                      <p className="text-sm text-slate-600 mb-3">
                        Track your progress by taking regular assessments
                      </p>
                      <Button 
                        className="bg-[#20C0F3] hover:bg-[#1ba8d5]"
                        onClick={() => navigate('/patient-dashboard')}
                      >
                        Return to Dashboard
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </>
            )}
          </TabsContent>
          
          {/* Assessment History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Assessments</CardTitle>
                <CardDescription>Your most recent stress assessments</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="md" text="Loading assessments..." />
                  </div>
                ) : assessments.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">
                    No stress assessments found. Complete your first assessment to see your results here.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assessments.map((assessment) => (
                      <Card key={assessment.id} className="bg-slate-50 border-0">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-medium mb-1">
                                {format(new Date(assessment.created_at), "MMMM d, yyyy 'at' h:mm a")}
                              </div>
                              <div className="text-2xl font-bold mb-2">
                                {getHealthPercentage(assessment.stress_score)}% Emotional Health
                              </div>
                              <div className="text-sm text-slate-500">
                                Stress level: {assessment.stress_score.toFixed(1)}/10
                              </div>
                            </div>
                            
                            <div className={`
                              px-3 py-1 rounded-full text-xs font-medium
                              ${assessment.stress_score < 3 ? 'bg-green-100 text-green-800' : 
                                assessment.stress_score < 5 ? 'bg-emerald-100 text-emerald-800' :
                                assessment.stress_score < 7 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'}
                            `}>
                              {assessment.stress_score < 3 ? 'Low Stress' : 
                               assessment.stress_score < 5 ? 'Moderate' :
                               assessment.stress_score < 7 ? 'High' : 'Very High'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Progress Tracking Tab */}
          <TabsContent value="progress" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Progress Overview</CardTitle>
                <CardDescription>Track your emotional health journey</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner size="md" text="Loading progress data..." />
                  </div>
                ) : assessments.length < 3 ? (
                  <div className="py-8 text-center text-slate-500">
                    <p className="mb-2">Complete at least 3 assessments to view progress tracking</p>
                    <p className="text-sm text-slate-400">
                      Regular assessments help us better understand your patterns
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-3">Emotional Health Progress</h3>
                      <div className="h-72 bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <StressProgressChart 
                          assessments={assessments} 
                          moodEntries={moodEntries} 
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-4">
                          <div className="text-xs text-slate-500 mb-1">Best Score</div>
                          <div className="text-xl font-medium text-green-600">
                            {Math.max(...assessments.map(a => getHealthPercentage(a.stress_score)))}%
                          </div>
                          <div className="text-xs text-slate-500 mt-1">Emotional Health</div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-4">
                          <div className="text-xs text-slate-500 mb-1">Average Score</div>
                          <div className="text-xl font-medium text-blue-600">
                            {Math.round(assessments.reduce((sum, a) => sum + getHealthPercentage(a.stress_score), 0) / assessments.length)}%
                          </div>
                          <div className="text-xs text-slate-500 mt-1">Emotional Health</div>
                        </CardContent>
                      </Card>
                      
                      <Card className="border-0 shadow-sm">
                        <CardContent className="p-4">
                          <div className="text-xs text-slate-500 mb-1">Assessment Count</div>
                          <div className="text-xl font-medium text-purple-600">
                            {assessments.length}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">Total Assessments</div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t">
                <Button 
                  variant="outline" 
                  className="text-slate-600"
                  onClick={() => navigate('/patient-dashboard')}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Dashboard
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => navigate('/patient-dashboard')}
                  disabled={assessments.length === 0}
                >
                  Take New Assessment
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 


