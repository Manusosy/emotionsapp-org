import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '@/services'
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Supabase import removed
import { useAuth } from "@/contexts/authContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, parseISO, isAfter, startOfDay, differenceInDays } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { 
  Smile, 
  Frown, 
  Meh,
  TrendingUp,
  Calendar,
  BarChart,
  Download,
  FileDown,
  Share,
  ChevronDown
} from "lucide-react";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";

// Base interface for mood entry from Supabase
interface MoodEntryBase {
  id: string;
  created_at: string;
  mood_score: number;
  assessment_result: string;
  user_id?: string;
}

// Extended interface for chart data
interface MoodEntry extends MoodEntryBase {
  date?: string;
  value?: number;
  rawDate?: string;
  mood?: string;
}

interface MoodStats {
  averageScore: number;
  totalAssessments: number;
  mostFrequentMood: string;
  recentTrend: 'improving' | 'declining' | 'stable';
  lastUpdated: string;
}

interface MoodAnalyticsProps {
  timeRange: 'week' | 'month' | 'year';
}

export default function MoodAnalytics({ timeRange = 'week' }: MoodAnalyticsProps) {
  const { user } = useAuth();
  const [moodData, setMoodData] = useState<MoodEntry[]>([]);
  const [filteredData, setFilteredData] = useState<MoodEntry[]>([]);
  const [moodStats, setMoodStats] = useState<MoodStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const fetchMoodData = async () => {
      try {
        setIsLoading(true);
        
        console.log('MoodAnalytics: Fetching mood data...');
        
        if (!user) {
          console.log('No user found, returning empty data');
          setIsLoading(false);
          setHasData(false);
          return;
        }
        
        // Get date range based on timeRange prop
        const getDateRange = () => {
          const today = new Date();
          switch (timeRange) {
            case 'week':
              return subDays(today, 7);
            case 'month':
              return subDays(today, 30);
            case 'year':
              return subDays(today, 365);
            default:
              return subDays(today, 7);
          }
        };
        
        const startDate = getDateRange();
        
        console.log(`Fetching mood entries since: ${startDate.toISOString()}`);
        console.log(`User ID: ${user.id}`);
        
        // Fetch mood entries for the selected time period
        const { data: moodEntries, error } = await supabase
          .from('mood_entries')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error fetching mood entries:', error);
          setIsLoading(false);
          setHasData(false);
          return;
        }
        
        console.log(`Retrieved ${moodEntries?.length || 0} mood entries`);
        
        if (moodEntries && moodEntries.length > 0) {
          setHasData(true);
          // Process data for chart
          const processedData = moodEntries.map((entry: any) => ({
            id: entry.id,
            created_at: entry.created_at,
            mood_score: entry.mood || entry.mood_score,
            assessment_result: entry.assessment_result || entry.mood_type,
            user_id: entry.user_id,
            date: format(parseISO(entry.created_at), 'MMM dd'),
            value: entry.mood || entry.mood_score,
            rawDate: entry.created_at,
            mood: entry.assessment_result || entry.mood_type || 'Unknown'
          }));
          
          console.log('Processed mood data:', processedData);
          
          setMoodData(processedData);
          setFilteredData(processedData);
          
          // Calculate statistics
          const stats = calculateMoodStats(processedData);
          setMoodStats(stats);
        } else {
          // No data available
          console.log('No mood entries found');
          setHasData(false);
          setMoodData([]);
          setFilteredData([]);
          setMoodStats(null);
        }
      } catch (error) {
        console.error('Error processing mood data:', error);
        setHasData(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoodData();
    
    // Listen for mood assessment completion events
    const handleMoodAssessmentCompleted = () => {
      console.log('MoodAnalytics: Mood assessment completed event received');
      fetchMoodData();
    };
    
    const handleDashboardReloadNeeded = () => {
      console.log('MoodAnalytics: Dashboard reload event received');
      fetchMoodData();
    };
    
    window.addEventListener('mood-assessment-completed', handleMoodAssessmentCompleted);
    window.addEventListener('dashboard-reload-needed', handleDashboardReloadNeeded);
    
    return () => {
      window.removeEventListener('mood-assessment-completed', handleMoodAssessmentCompleted);
      window.removeEventListener('dashboard-reload-needed', handleDashboardReloadNeeded);
    };
  }, [user, timeRange]);

  const calculateMoodStats = (entries: MoodEntry[]): MoodStats => {
    if (!entries.length) {
      return {
        averageScore: 0,
        totalAssessments: 0,
        mostFrequentMood: 'No data',
        recentTrend: 'stable',
        lastUpdated: new Date().toISOString()
      };
    }

    // Calculate average score (with 1 decimal place)
    const totalScore = entries.reduce((acc, entry) => acc + entry.mood_score, 0);
    const averageScore = parseFloat((totalScore / entries.length).toFixed(1));

    // Count mood frequencies
    const moodFrequencies = entries.reduce((acc, entry) => {
      const mood = entry.assessment_result || 'Neutral';
      acc[mood] = (acc[mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Find most frequent mood
    const frequencyEntries = Object.entries(moodFrequencies);
    const mostFrequentMood = frequencyEntries.length > 0 
      ? frequencyEntries.sort(([,a], [,b]) => b - a)[0][0]
      : 'Neutral';

    // Calculate trend - use at least the last 3 entries if available
    const trendSampleSize = Math.min(Math.max(3, Math.floor(entries.length / 2)), entries.length);
    const recentEntries = entries.slice(-trendSampleSize);
    
    let recentTrend: 'improving' | 'declining' | 'stable' = 'stable';
    
    if (recentEntries.length >= 2) {
      // Split into first half and second half
      const midpoint = Math.floor(recentEntries.length / 2);
      const firstHalf = recentEntries.slice(0, midpoint);
      const secondHalf = recentEntries.slice(midpoint);
      
      // Calculate average for each half
      const firstAvg = firstHalf.reduce((sum, entry) => sum + entry.mood_score, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, entry) => sum + entry.mood_score, 0) / secondHalf.length;
      
      // Determine trend with threshold of 0.5 for significance
      if (secondAvg > firstAvg + 0.5) {
        recentTrend = 'improving';
      } else if (secondAvg < firstAvg - 0.5) {
        recentTrend = 'declining';
      } else {
        recentTrend = 'stable';
      }
    }
    
    // Get the last updated date from the most recent entry
    const lastUpdated = entries[entries.length - 1].created_at;

    return {
      averageScore,
      totalAssessments: entries.length,
      mostFrequentMood,
      recentTrend,
      lastUpdated
    };
  };

  const getMoodIcon = (mood: string) => {
    const lowerMood = (mood || '').toLowerCase();
    
    if (lowerMood.includes('happy') || lowerMood.includes('great')) {
      return <Smile className="w-5 h-5 text-green-500" />;
    } else if (lowerMood.includes('sad') || lowerMood.includes('low') || lowerMood.includes('down')) {
      return <Frown className="w-5 h-5 text-red-500" />;
    } else {
      return <Meh className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getTrendIcon = (trend: 'improving' | 'declining' | 'stable') => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      case 'declining':
        return <TrendingUp className="w-5 h-5 text-red-500 transform rotate-180" />;
      default:
        return <TrendingUp className="w-5 h-5 text-yellow-500 transform rotate-90" />;
    }
  };

  // Format chart data with consistent date formatting
  const chartData = filteredData.map(entry => ({
    date: format(parseISO(entry.rawDate || new Date().toISOString()), 'MMM dd'),
    value: entry.value,
    mood: entry.mood || 'Unknown'
  }));
  
  // Export to PDF function
  const exportToPdf = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 150);
      doc.text('Mood Analytics Report', 14, 20);
      
      // Add time range info
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Time Range: ${timeRange === 'week' ? 'Past 7 days' : timeRange === 'month' ? 'Past 30 days' : 'Past year'}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);
      
      // Add summary stats section
      if (moodStats) {
        doc.setFontSize(14);
        doc.text('Mood Analytics Summary', 14, 50);
        
        doc.setFontSize(11);
        doc.text(`Average Mood Score: ${moodStats.averageScore.toFixed(1)}/10`, 16, 60);
        doc.text(`Total Assessments: ${moodStats.totalAssessments}`, 16, 66);
        doc.text(`Most Frequent Mood: ${moodStats.mostFrequentMood}`, 16, 72);
        doc.text(`Recent Trend: ${moodStats.recentTrend.charAt(0).toUpperCase() + moodStats.recentTrend.slice(1)}`, 16, 78);
        doc.text(`Last Updated: ${format(parseISO(moodStats.lastUpdated || new Date().toISOString()), 'MMM dd, yyyy')}`, 16, 84);
      }
      
      // Add mood data table
      if (filteredData.length > 0) {
        doc.setFontSize(14);
        doc.text('Mood History', 14, 100);
        
        const tableRows = filteredData.map(entry => [
          format(parseISO(entry.rawDate || new Date().toISOString()), 'MMM dd, yyyy'),
          entry.value?.toFixed(1) + '/10',
          entry.mood || 'Unknown'
        ]);
        
        (doc as any).autoTable({
          head: [['Date', 'Score', 'Mood']],
          body: tableRows,
          startY: 110,
          styles: { 
            fontSize: 9,
            cellPadding: 3
          },
          headStyles: { 
            fillColor: [38, 99, 235],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          alternateRowStyles: {
            fillColor: [240, 247, 255]
          }
        });
      }
      
      // Save the PDF
      const fileName = `mood_analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("Mood analytics report has been downloaded as PDF");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to export mood analytics");
    }
  };
  
  // Export to CSV function
  const exportToCsv = () => {
    try {
      if (filteredData.length === 0) {
        toast.error("No mood data to export");
        return;
      }
      
      // Create CSV content
      const headers = ['Date', 'Mood Score', 'Mood'];
      const rows = filteredData.map(entry => [
        format(parseISO(entry.rawDate || new Date().toISOString()), 'yyyy-MM-dd'),
        entry.value?.toString() || '',
        entry.mood || 'Unknown'
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `mood_analytics_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Mood analytics data has been downloaded as CSV");
    } catch (error) {
      console.error("Error generating CSV:", error);
      toast.error("Failed to export mood analytics data");
    }
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-[200px] w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
          </div>
        </div>
      ) : filteredData.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6 min-h-[300px]">
            <div className="text-slate-500 mb-4">No mood data for this time period</div>
            <p className="text-sm text-slate-400 mb-4">Complete a mood assessment to see analytics</p>
            <Button size="sm" onClick={() => {
              const viewAllEvent = new CustomEvent('view-all-time-mood-data');
              window.dispatchEvent(viewAllEvent);
            }}>
              View All Time
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mood Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Mood Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      fontSize={12}
                      tick={{ fill: '#666' }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: '#666' }}
                      domain={[0, 10]}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}/10`, 'Mood Score']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ fill: '#2563eb', r: 4 }}
                      activeDot={{ fill: '#2563eb', r: 6, strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Mood</span>
                    <span className="font-medium">
                      {moodStats?.averageScore.toFixed(1)} / 10
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Assessments</span>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{moodStats?.totalAssessments}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Most Frequent</span>
                    <div className="flex items-center gap-2">
                      {getMoodIcon(moodStats?.mostFrequentMood || '')}
                      <span className="font-medium">{moodStats?.mostFrequentMood}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Recent Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-2xl font-semibold capitalize">
                      {moodStats?.recentTrend}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Based on recent assessments
                    </p>
                  </div>
                  {getTrendIcon(moodStats?.recentTrend || 'stable')}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
} 


