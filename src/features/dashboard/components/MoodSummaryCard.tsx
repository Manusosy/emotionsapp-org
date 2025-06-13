import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '@/services'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart, FileText, Smile, Meh, Frown, Download, FileDown, Share, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { useState, useEffect, useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "@/contexts/authContext";
import { format, parseISO } from 'date-fns';
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";

type MoodEntry = {
  id: string;
  mood_score: number;
  assessment_result: string;
  created_at: string;
};

export default function MoodSummaryCard() {
  const { user } = useContext(AuthContext);
  const [averageMood, setAverageMood] = useState<number | null>(null);
  const [moodTrend, setMoodTrend] = useState<'up' | 'down' | 'stable' | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    // Function to fetch mood data
    const fetchMoodData = async () => {
      if (!user) return;
  
      try {
        setLoading(true);
        
        console.log('MoodSummaryCard: Fetching mood data...');
        
        // Check sessionStorage first for recent assessments 
        let hasRecentAssessment = false;
        try {
          const lastAssessmentStr = sessionStorage.getItem('last_mood_assessment');
          if (lastAssessmentStr) {
            const lastAssessment = JSON.parse(lastAssessmentStr);
            const saveTime = new Date(lastAssessment.saveTime || lastAssessment.timestamp);
            const now = new Date();
            const timeDiff = now.getTime() - saveTime.getTime();
            
            // If assessment was saved in the last 30 seconds
            if (timeDiff < 30000) {
              console.log('MoodSummaryCard: Recent mood assessment found in storage');
              hasRecentAssessment = true;
            }
          }
        } catch (error) {
          console.error('Error checking for recent assessments:', error);
        }
        
        // Fetch the mood entries from Supabase
        const { data: moodEntries, error } = await supabase
          .from('mood_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(30);
  
        if (error) {
          console.error('Error fetching mood data:', error);
          return;
        }
        
        if (moodEntries && moodEntries.length > 0) {
          setHasData(true);
          // Calculate average mood
          const moodValues = moodEntries.map(entry => Number(entry.mood));
          const avgMood = moodValues.reduce((sum, mood) => sum + mood, 0) / moodValues.length;
          setAverageMood(parseFloat(avgMood.toFixed(1)));
          
          // Calculate mood trend (if we have enough entries)
          if (moodEntries.length >= 2) {
            // Compare first half with second half of the period
            const midpoint = Math.floor(moodEntries.length / 2);
            const recentEntries = moodEntries.slice(0, midpoint);
            const olderEntries = moodEntries.slice(midpoint);
            
            const recentAvg = recentEntries.reduce((sum, entry) => sum + Number(entry.mood), 0) / recentEntries.length;
            const olderAvg = olderEntries.reduce((sum, entry) => sum + Number(entry.mood), 0) / olderEntries.length;
            
            // Determine trend direction
            const difference = recentAvg - olderAvg;
            if (Math.abs(difference) < 0.5) {
              setMoodTrend('stable');
            } else if (difference > 0) {
              setMoodTrend('up');
            } else {
              setMoodTrend('down');
            }
          }
        } else {
          setAverageMood(null);
          setMoodTrend(null);
          setHasData(false);
        }
      } catch (error) {
        console.error('Error processing mood data:', error);
        setHasData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchMoodData();
    
    // Listen for mood assessment completion events
    const handleMoodAssessmentCompleted = () => {
      console.log('MoodSummaryCard: Mood assessment completed event received');
      fetchMoodData();
    };
    
    const handleDashboardReloadNeeded = () => {
      console.log('MoodSummaryCard: Dashboard reload event received');
      fetchMoodData();
    };
    
    window.addEventListener('mood-assessment-completed', handleMoodAssessmentCompleted);
    window.addEventListener('dashboard-reload-needed', handleDashboardReloadNeeded);
    
    return () => {
      window.removeEventListener('mood-assessment-completed', handleMoodAssessmentCompleted);
      window.removeEventListener('dashboard-reload-needed', handleDashboardReloadNeeded);
    };
  }, [user]);

  // Determine mood icon and color based on average mood
  const getMoodIcon = () => {
    if (!averageMood) return <Meh className="h-5 w-5 text-gray-400" />;
    
    if (averageMood >= 7) {
      return <Smile className="h-5 w-5 text-green-500" />;
    } else if (averageMood >= 4) {
      return <Meh className="h-5 w-5 text-amber-500" />;
    } else {
      return <Frown className="h-5 w-5 text-red-500" />;
    }
  };
  
  // Get trend icon
  const getTrendIcon = () => {
    if (moodTrend === 'up') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (moodTrend === 'down') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return null;
  };
  
  // Get trend text
  const getTrendText = () => {
    if (moodTrend === 'up') {
      return <span className="text-green-500">Improving</span>;
    } else if (moodTrend === 'down') {
      return <span className="text-red-500">Declining</span>;
    } else if (moodTrend === 'stable') {
      return <span className="text-gray-500">Stable</span>;
    }
    return <span className="text-gray-400">Not enough data</span>;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Mood Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-16">
            <div className="animate-pulse bg-gray-200 h-4 w-24 rounded"></div>
          </div>
        ) : hasData && averageMood ? (
          <div className="space-y-2">
            <div className="flex items-center">
              {getMoodIcon()}
              <span className="text-xl font-bold ml-2">{averageMood}/10</span>
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <span className="mr-1">7-day trend:</span>
              {getTrendIcon()}
              <span className="ml-1">{getTrendText()}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            No mood data available. Complete a mood assessment to see your summary.
          </div>
        )}
      </CardContent>
    </Card>
  );
} 


