import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '@/services'
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, isValid } from "date-fns";
import { AuthContext } from "@/contexts/authContext";
import { supabase } from "@/lib/supabase";
// Supabase import removed
import StressProgressChart from "../components/StressProgressChart";
import ConsistencyHeatmap from "../components/ConsistencyHeatmap";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { 
  TrendingUp, 
  Calendar, 
  ChevronLeft, 
  ChevronDown, 
  Download, 
  FileDown, 
  Share,
  Activity, 
  Brain, 
  HeartPulse,
  CheckCircle,
  AlertTriangle,
  CalendarRange,
  Sparkles,
  Users,
  FileText,
  BarChart3
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Custom error boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error): void {
    console.error("Error caught in ErrorBoundary:", error);
  }
  
  render(): React.ReactNode {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    
    return this.props.children;
  }
}

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
  assessment_result?: string;
}

export default function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [dateRange, setDateRange] = useState("30");
  const [activeTab, setActiveTab] = useState("summary");
  const [isLoading, setIsLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [healthMetrics, setHealthMetrics] = useState({
    stressLevel: 0,
    moodScore: 0,
    weeklyStressAvg: 0,
    weeklyMoodAvg: 0,
    stressTrend: 'stable' as 'improving' | 'declining' | 'stable',
    moodTrend: 'stable' as 'improving' | 'declining' | 'stable',
    consistencyScore: 0,
    lastAssessmentDate: null as Date | null,
    lastMoodEntryDate: null as Date | null,
    healthPercentage: 0,
    isFirstTimeUser: true,
    daysWithData: 0
  });
  const [checkInDates, setCheckInDates] = useState<Date[]>([]);
  const [firstCheckInDate, setFirstCheckInDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, [user, dateRange]);

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Use real data mode instead of test mode
      const isTestMode = false;
      
      let assessmentsData: Assessment[] = [];
      let moodData: MoodEntry[] = [];
      
      if (isTestMode) {
        // Test mode code remains unchanged
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
                created_at: entry.created_at,
                assessment_result: entry.assessment_result || 'Normal'
              }));
              
              // Sort by date (newest to oldest) for display
              moodData.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              
              // If only one mood entry exists, create a few historical entries with variations for better visualization
              if (moodData.length === 1 && moodData[0].mood_score) {
                const baseMoodScore = moodData[0].mood_score;
                const baseDate = new Date(moodData[0].created_at);
                
                // Add some historical data points
                for (let i = 1; i <= 4; i++) {
                  const pastDate = new Date(baseDate);
                  pastDate.setDate(pastDate.getDate() - i);
                  
                  // Random variation for more realistic data
                  const variation = (Math.random() * 2 - 1) * 0.8; // -0.8 to +0.8
                  const historicalMoodScore = Math.max(1, Math.min(10, baseMoodScore + variation));
                  
                  moodData.push({
                    id: `mood-hist-${i}`,
                    user_id: user.id || 'test-user',
                    mood_score: historicalMoodScore,
                    created_at: pastDate.toISOString(),
                    assessment_result: 'Normal'
                  });
                }
                
                // Re-sort after adding historical data
                moodData.sort((a, b) => 
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
              }
            }
          }
        } catch (error) {
          console.error("Error loading test data from sessionStorage:", error);
        }
      } else {
        // This section will now run as isTestMode is set to false
        try {
          // Calculate date range
          const endDate = new Date();
          const startDate = subDays(endDate, parseInt(dateRange));
          
          // Use direct Supabase queries for stress assessments
          const { data: fetchedAssessments, error: assessmentsError } = await supabase
            .from('stress_assessments')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (assessmentsError) {
            console.error("Error fetching stress assessments:", assessmentsError);
            throw assessmentsError;
          }
          
          // Map the fetched assessments to the expected format
          assessmentsData = (fetchedAssessments || []).map(assessment => ({
            id: assessment.id,
            user_id: assessment.user_id,
            stress_score: assessment.normalized_score, // Use normalized score
            created_at: assessment.created_at
          }));
          
          console.log("Fetched stress assessments:", assessmentsData);
          
          // Filter by date range
          assessmentsData = assessmentsData.filter(a => {
            const date = new Date(a.created_at);
            return isValid(date) && date >= startDate && date <= endDate;
          });
          
          // Use direct Supabase queries for mood entries
          const { data: fetchedMoodData, error: moodError } = await supabase
            .from('mood_entries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
            
          if (moodError) {
            console.error("Error fetching mood entries:", moodError);
            throw moodError;
          }
          
          // Map the fetched mood entries to the expected format
          moodData = (fetchedMoodData || []).map(entry => ({
            id: entry.id,
            user_id: entry.user_id,
            mood_score: entry.assessment_score || entry.mood, // Use assessment_score or fallback to mood
            created_at: entry.created_at,
            assessment_result: entry.assessment_result || 'Normal'
          }));
          
          console.log("Fetched mood entries:", moodData);
          
          // Filter by date range
          moodData = moodData.filter(m => {
            const date = new Date(m.created_at);
            return isValid(date) && date >= startDate && date <= endDate;
          });
        } catch (error) {
          console.error("Error fetching real data:", error);
          toast.error("Failed to load reports data");
        }
      }
      
      // Set data
      setAssessments(assessmentsData);
      setMoodEntries(moodData);
      
      // Calculate metrics
      calculateMetrics(assessmentsData, moodData);
    } catch (error) {
      console.error("Error in fetchData:", error);
      toast.error("Failed to load reports data");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate all metrics based on fetched data
  const calculateMetrics = (assessments: Assessment[], moodEntries: MoodEntry[]) => {
    // Default values
    let metrics = {
      stressLevel: 0,
      moodScore: 0,
      weeklyStressAvg: 0,
      weeklyMoodAvg: 0,
      stressTrend: 'stable' as 'improving' | 'declining' | 'stable',
      moodTrend: 'stable' as 'improving' | 'declining' | 'stable',
      consistencyScore: 0,
      lastAssessmentDate: null as Date | null,
      lastMoodEntryDate: null as Date | null,
      healthPercentage: 0,
      isFirstTimeUser: false,
      daysWithData: 0
    };
    
    // Process stress assessments if available
    if (assessments.length > 0) {
      // Group assessments by day to calculate daily averages
      const assessmentsByDay = groupByDay(assessments);
      const dailyAverages = calculateDailyAverages(assessmentsByDay);
      
      // Get today's average stress score (or most recent day's average)
      const today = new Date().toDateString();
      const mostRecentDate = Object.keys(dailyAverages).sort().reverse()[0]; // Get most recent day
      const currentStress = dailyAverages[today] || dailyAverages[mostRecentDate] || assessments[0].stress_score;
      
      metrics.stressLevel = currentStress;
      
      // Calculate health percentage (inverse of stress)
      metrics.healthPercentage = Math.max(0, 100 - (currentStress * 10));
      
      // Set last assessment date
      const lastAssessmentDate = new Date(assessments[0].created_at);
      if (isValid(lastAssessmentDate)) {
        metrics.lastAssessmentDate = lastAssessmentDate;
      }
      
      // Calculate weekly average using daily averages
      const oneWeekAgo = subDays(new Date(), 7);
      const daysInLastWeek = Object.keys(dailyAverages).filter(dateStr => {
        const date = new Date(dateStr);
        return isValid(date) && date >= oneWeekAgo;
      });
      
      if (daysInLastWeek.length > 0) {
        const weeklyTotal = daysInLastWeek.reduce((sum, dateStr) => sum + dailyAverages[dateStr], 0);
        metrics.weeklyStressAvg = weeklyTotal / daysInLastWeek.length;
      }
      
      // Calculate trend - need at least 2 days of data
      metrics.daysWithData = Object.keys(dailyAverages).length;
      
      if (Object.keys(dailyAverages).length >= 2) {
        // Sort dates from oldest to newest
        const sortedDates = Object.keys(dailyAverages).sort((a, b) => {
          return new Date(a).getTime() - new Date(b).getTime();
        });
        
        // For trend analysis, split into two halves
        const halfPoint = Math.floor(sortedDates.length / 2);
        const firstHalfDates = sortedDates.slice(0, halfPoint);
        const secondHalfDates = sortedDates.slice(halfPoint);
        
        // Calculate average stress for each half
        const firstHalfTotal = firstHalfDates.reduce((sum, date) => sum + dailyAverages[date], 0);
        const secondHalfTotal = secondHalfDates.reduce((sum, date) => sum + dailyAverages[date], 0);
        
        const firstHalfAvg = firstHalfTotal / firstHalfDates.length;
        const secondHalfAvg = secondHalfTotal / secondHalfDates.length;
        
        // Lower stress = improved health
        if (secondHalfAvg < firstHalfAvg - 0.5) metrics.stressTrend = 'improving';
        else if (secondHalfAvg > firstHalfAvg + 0.5) metrics.stressTrend = 'declining';
      } else {
        // First-time user, not enough data for trends
        metrics.isFirstTimeUser = true;
      }
      
      // Calculate consistency score with safety check for date validity
      if (assessments.length > 0 && isValid(new Date(assessments[assessments.length - 1].created_at))) {
        const oldestAssessment = new Date(assessments[assessments.length - 1].created_at);
        const daysSinceFirstAssessment = Math.ceil(
          (new Date().getTime() - oldestAssessment.getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        
        // Get unique days with assessments, not total assessments
        const uniqueAssessmentDays = new Set(assessments.map(a => 
          new Date(a.created_at).toDateString()
        )).size;
        
        // Get unique days with mood entries, not total entries
        const uniqueMoodDays = new Set(moodEntries.map(m => 
          new Date(m.created_at).toDateString()
        )).size;
        
        // Count unique days where any assessment was done
        const allDatesStrings = [
          ...assessments.map(a => new Date(a.created_at).toDateString()),
          ...moodEntries.map(m => new Date(m.created_at).toDateString())
        ];
        const uniqueCheckInDays = new Set(allDatesStrings).size;
        
        // More reasonable consistency calculation based on days, not individual tests:
        if (daysSinceFirstAssessment <= 3) {
          // For users who just started (1-3 days), even one check-in shows commitment
          metrics.consistencyScore = uniqueCheckInDays > 0 ? 60 : 0;
        } else if (daysSinceFirstAssessment <= 7) {
          // For a week or less, we want to see a few days of check-ins
          metrics.consistencyScore = Math.min(100, Math.round((uniqueCheckInDays / daysSinceFirstAssessment) * 100));
        } else {
          // For longer periods, aim for at least 3 check-ins per week (every other day)
          const expectedDays = Math.ceil(daysSinceFirstAssessment * (3/7)); // ~3 days per week
          metrics.consistencyScore = Math.min(
            100, 
            Math.round((uniqueCheckInDays / expectedDays) * 100)
          );
        }
        
        // Set the first check-in date
        setFirstCheckInDate(oldestAssessment);
      } else {
        // Default if we can't determine dates properly
        metrics.consistencyScore = assessments.length > 0 ? 60 : 0;
      }
      
      // Generate array of all check-in dates for the heatmap with safety check
      const dates: Date[] = [
        ...assessments.map(a => new Date(a.created_at)),
        ...moodEntries.map(m => new Date(m.created_at))
      ].filter(date => isValid(date));
      
      setCheckInDates(dates);
    }
    
    // Process mood entries if available
    if (moodEntries.length > 0) {
      // Group mood entries by day to calculate daily averages
      const moodEntriesByDay = groupByDay(moodEntries);
      const dailyMoodAverages = calculateDailyAverages(moodEntriesByDay);
      
      // Get today's mood score or most recent
      const today = new Date().toDateString();
      const mostRecentMoodDate = Object.keys(dailyMoodAverages).sort().reverse()[0];
      const currentMood = dailyMoodAverages[today] || dailyMoodAverages[mostRecentMoodDate] || moodEntries[0].mood_score;
      
      metrics.moodScore = currentMood;
      
      // Set last mood entry date
      metrics.lastMoodEntryDate = new Date(moodEntries[0].created_at);
      
      // Calculate weekly mood average
      const oneWeekAgo = subDays(new Date(), 7);
      const moodDaysInLastWeek = Object.keys(dailyMoodAverages).filter(dateStr => {
        const date = new Date(dateStr);
        return isValid(date) && date >= oneWeekAgo;
      });
      
      if (moodDaysInLastWeek.length > 0) {
        const weeklyMoodTotal = moodDaysInLastWeek.reduce((sum, dateStr) => sum + dailyMoodAverages[dateStr], 0);
        metrics.weeklyMoodAvg = weeklyMoodTotal / moodDaysInLastWeek.length;
      }
      
      // Calculate mood trend - need at least 2 days of data
      metrics.daysWithData = Math.max(metrics.daysWithData, Object.keys(dailyMoodAverages).length);
      
      if (Object.keys(dailyMoodAverages).length >= 2) {
        // Sort dates from oldest to newest for mood trend analysis
        const sortedMoodDates = Object.keys(dailyMoodAverages).sort((a, b) => {
          return new Date(a).getTime() - new Date(b).getTime();
        });
        
        // Split into two halves
        const halfPoint = Math.floor(sortedMoodDates.length / 2);
        const firstHalfDates = sortedMoodDates.slice(0, halfPoint);
        const secondHalfDates = sortedMoodDates.slice(halfPoint);
        
        // Calculate average mood for each half
        const firstHalfTotal = firstHalfDates.reduce((sum, date) => sum + dailyMoodAverages[date], 0);
        const secondHalfTotal = secondHalfDates.reduce((sum, date) => sum + dailyMoodAverages[date], 0);
        
        const firstHalfAvg = firstHalfTotal / firstHalfDates.length;
        const secondHalfAvg = secondHalfTotal / secondHalfDates.length;
        
        // Higher mood = improved mood
        if (secondHalfAvg > firstHalfAvg + 0.5) metrics.moodTrend = 'improving';
        else if (secondHalfAvg < firstHalfAvg - 0.5) metrics.moodTrend = 'declining';
      } else {
        // First-time user, not enough data for trends
        metrics.isFirstTimeUser = true;
      }
    }
    
    setHealthMetrics(metrics);
  };
  
  // Helper function to group entries by day
  const groupByDay = <T extends { created_at: string }>(entries: T[]): Record<string, T[]> => {
    return entries.reduce((acc, entry) => {
      const date = new Date(entry.created_at);
      if (!isValid(date)) return acc;
      
      const dateStr = date.toDateString();
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      acc[dateStr].push(entry);
      return acc;
    }, {} as Record<string, T[]>);
  };
  
  // Helper function to calculate daily averages from grouped entries
  const calculateDailyAverages = <T extends { stress_score?: number, mood_score?: number }>(
    entriesByDay: Record<string, T[]>
  ): Record<string, number> => {
    const result: Record<string, number> = {};
    
    Object.keys(entriesByDay).forEach(day => {
      const entries = entriesByDay[day];
      const total = entries.reduce((sum, entry) => {
        // Check which type of score is present
        const score = typeof entry.stress_score !== 'undefined' ? entry.stress_score : entry.mood_score;
        return sum + (score || 0);
      }, 0);
      
      result[day] = total / entries.length;
    });
    
    return result;
  };

  // Helper functions
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
  
  const getTrendIndicator = (trend: 'improving' | 'declining' | 'stable', isPositive = true, isFirstTimeUser = false) => {
    if (isFirstTimeUser) {
      return { 
        icon: <Calendar className="w-4 h-4 text-blue-500" />, 
        color: 'text-blue-500', 
        text: 'Gathering Data', 
        badge: 'bg-blue-100 text-blue-800'
      };
    }
    
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
  
  // Format date safely with fallback message
  const formatDate = (date: Date | null, fallback: string = "No data") => {
    return date && isValid(date) ? format(date, "MMMM d, yyyy") : fallback;
  };
  
  const stressTrend = getTrendIndicator(healthMetrics.stressTrend, false, healthMetrics.isFirstTimeUser); // For stress, declining is positive
  const moodTrend = getTrendIndicator(healthMetrics.moodTrend, true, healthMetrics.isFirstTimeUser); // For mood, improving is positive

  // Export Functions
  const exportToPdf = (section: 'summary' | 'stress' | 'mood' | 'trends') => {
    try {
      const doc = new jsPDF();
      const userName = user?.user_metadata?.name || "User";
      const dateRangeText = dateRange === "7" 
        ? "Past 7 days" 
        : dateRange === "30" 
          ? "Past 30 days" 
          : dateRange === "90" 
            ? "Past 3 months" 
            : dateRange === "180" 
              ? "Past 6 months" 
              : "Past year";

      // Add title
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 150);
      
      // Different title based on section
      const titles = {
        summary: 'Emotional Health Summary',
        stress: 'Stress Analytics Report',
        mood: 'Mood Tracking Report',
        trends: 'Trends & Patterns Report'
      };
      
      doc.text(titles[section], 14, 20);

      // Add patient info
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Patient: ${userName}`, 14, 30);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);
      doc.text(`Date Range: ${dateRangeText}`, 14, 42);

      // Add health metrics based on section
      doc.setFontSize(14);
      doc.text('Health Metrics', 14, 55);

      let yPos = 65;
      
      // Common metrics for all reports
      const addCommonMetrics = () => {
        doc.setFontSize(10);
        doc.text(`Emotional Health Score: ${Math.round(healthMetrics.healthPercentage)}%`, 16, yPos);
        
        // Draw a percentage indicator
        const healthColor = healthMetrics.healthPercentage >= 80 ? [0, 128, 0] : 
                          healthMetrics.healthPercentage >= 60 ? [0, 192, 0] :
                          healthMetrics.healthPercentage >= 40 ? [255, 192, 0] :
                          healthMetrics.healthPercentage >= 20 ? [255, 128, 0] : [255, 0, 0];
        
        doc.setFillColor(healthColor[0], healthColor[1], healthColor[2]);
        doc.rect(110, yPos - 3, healthMetrics.healthPercentage / 2, 4, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(110, yPos - 3, 50, 4, 'D');
        
        yPos += 10;
        
        doc.text(`Current Stress Level: ${healthMetrics.stressLevel.toFixed(1)}/10`, 16, yPos);
        
        // Draw stress level indicator
        const stressColor = healthMetrics.stressLevel <= 3 ? [0, 192, 0] :
                         healthMetrics.stressLevel <= 5 ? [255, 192, 0] :
                         healthMetrics.stressLevel <= 7 ? [255, 128, 0] : [255, 0, 0];
        
        doc.setFillColor(stressColor[0], stressColor[1], stressColor[2]);
        doc.rect(110, yPos - 3, healthMetrics.stressLevel * 5, 4, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(110, yPos - 3, 50, 4, 'D');
        
        yPos += 10;
        
        doc.text(`Average Mood Score: ${healthMetrics.moodScore.toFixed(1)}/10`, 16, yPos);
        
        // Draw mood score indicator
        const moodColor = healthMetrics.moodScore >= 7 ? [0, 192, 0] :
                       healthMetrics.moodScore >= 5 ? [255, 192, 0] :
                       healthMetrics.moodScore >= 3 ? [255, 128, 0] : [255, 0, 0];
        
        doc.setFillColor(moodColor[0], moodColor[1], moodColor[2]);
        doc.rect(110, yPos - 3, healthMetrics.moodScore * 5, 4, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(110, yPos - 3, 50, 4, 'D');
        
        yPos += 10;
        
        doc.text(`Consistency Score: ${Math.round(healthMetrics.consistencyScore)}%`, 16, yPos);
        
        // Draw consistency indicator
        const consistencyColor = healthMetrics.consistencyScore >= 80 ? [0, 128, 0] : 
                              healthMetrics.consistencyScore >= 60 ? [0, 192, 0] :
                              healthMetrics.consistencyScore >= 40 ? [255, 192, 0] :
                              healthMetrics.consistencyScore >= 20 ? [255, 128, 0] : [255, 0, 0];
        
        doc.setFillColor(consistencyColor[0], consistencyColor[1], consistencyColor[2]);
        doc.rect(110, yPos - 3, healthMetrics.consistencyScore / 2, 4, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(110, yPos - 3, 50, 4, 'D');
        
        yPos += 15;
      };
      
      // Add section-specific content
      if (section === 'summary') {
        addCommonMetrics();
        
        // Add summary specific content
        doc.setFontSize(14);
        doc.text('Action Plan', 14, yPos + 5);
        yPos += 15;
        
        // Add action items
        doc.setFontSize(10);
        const actionItems = [
          'Try daily 5-minute breathing exercises to reduce stress levels',
          'Schedule activities that bring you joy at least twice weekly',
          'Maintain consistent sleep schedule to support emotional health',
          'Practice mindfulness for 10 minutes daily to improve awareness'
        ];
        
        actionItems.forEach((item, index) => {
          doc.text(`• ${item}`, 16, yPos);
          yPos += 8;
        });
      } 
      else if (section === 'stress') {
        addCommonMetrics();
        
        // Add stress analytics data table
        doc.setFontSize(14);
        doc.text('Stress Assessment History', 14, yPos + 5);
        yPos += 15;
        
        if (assessments.length > 0) {
          const tableRows = assessments.map(assessment => [
            format(new Date(assessment.created_at), 'MMM dd, yyyy'),
            assessment.stress_score.toFixed(1),
            assessment.stress_score <= 3 ? 'Low' : 
            assessment.stress_score <= 6 ? 'Moderate' : 'High'
          ]);
          
          // Add table with stress assessment data
          (doc as any).autoTable({
            head: [['Date', 'Stress Score', 'Stress Level']],
            body: tableRows,
            startY: yPos,
            styles: { 
              fontSize: 9,
              cellPadding: 3
            },
            headStyles: { 
              fillColor: [0, 102, 204],
              textColor: [255, 255, 255],
              fontStyle: 'bold'
            },
            alternateRowStyles: {
              fillColor: [240, 247, 255]
            }
          });
        } else {
          doc.setFontSize(10);
          doc.text('No stress assessment data available for the selected period.', 16, yPos);
        }
      }
      else if (section === 'mood') {
        addCommonMetrics();
        
        // Add mood tracking data table
        doc.setFontSize(14);
        doc.text('Mood Assessment History', 14, yPos + 5);
        yPos += 15;
        
        if (moodEntries.length > 0) {
          const tableRows = moodEntries.map(entry => [
            format(new Date(entry.created_at), 'MMM dd, yyyy'),
            entry.mood_score.toFixed(1),
            entry.assessment_result || 'Normal'
          ]);
          
          // Add table with mood data
          (doc as any).autoTable({
            head: [['Date', 'Mood Score', 'Assessment Result']],
            body: tableRows,
            startY: yPos,
            styles: { 
              fontSize: 9,
              cellPadding: 3
            },
            headStyles: { 
              fillColor: [76, 175, 80],
              textColor: [255, 255, 255],
              fontStyle: 'bold'
            },
            alternateRowStyles: {
              fillColor: [240, 255, 240]
            }
          });
        } else {
          doc.setFontSize(10);
          doc.text('No mood tracking data available for the selected period.', 16, yPos);
        }
      }
      else if (section === 'trends') {
        addCommonMetrics();
        
        // Add trends and patterns
        doc.setFontSize(14);
        doc.text('Observed Trends & Patterns', 14, yPos + 5);
        yPos += 15;
        
        doc.setFontSize(10);
        doc.text(`Stress Trend: ${healthMetrics.stressTrend.charAt(0).toUpperCase() + healthMetrics.stressTrend.slice(1)}`, 16, yPos);
        yPos += 8;
        doc.text(`Mood Trend: ${healthMetrics.moodTrend.charAt(0).toUpperCase() + healthMetrics.moodTrend.slice(1)}`, 16, yPos);
        yPos += 8;
        
        // Add consistency information
        doc.text(`Consistency Analysis: You've tracked your emotions for ${assessments.length + moodEntries.length} days`, 16, yPos);
        yPos += 8;
        
        const consistencyMessage = healthMetrics.consistencyScore >= 70 ? 
          'Your tracking consistency is excellent. Regular monitoring helps you stay aware of your emotional health.' :
          healthMetrics.consistencyScore >= 40 ?
          'Your tracking consistency is good. Try setting reminders to maintain regular check-ins.' :
          'Your tracking consistency could improve. Regular check-ins will help you gain better insights into your emotional health.';
        
        doc.text(`Consistency Assessment: ${consistencyMessage}`, 16, yPos);
      }
      
      // Add disclaimer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Disclaimer: This report is for informational purposes only and should not replace professional medical advice.', 14, 280);

      // Save the PDF
      const fileName = `emotional_health_${section}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success(`${section.charAt(0).toUpperCase() + section.slice(1)} report has been downloaded`);
    } catch (error) {
      console.error(`Error generating ${section} PDF:`, error);
      toast.error(`Failed to export ${section} report`);
    }
  };

  const exportToCsv = (section: 'stress' | 'mood' | 'all') => {
    try {
      let data: string[][];
      let fileName: string;
      
      if (section === 'stress') {
        // Export stress assessment data
        data = [
          ['Date', 'Stress Score', 'Stress Level'],
          ...assessments.map(assessment => [
            format(new Date(assessment.created_at), 'yyyy-MM-dd'),
            assessment.stress_score.toString(),
            assessment.stress_score <= 3 ? 'Low' : 
            assessment.stress_score <= 6 ? 'Moderate' : 'High'
          ])
        ];
        fileName = `stress_assessments_${new Date().toISOString().split('T')[0]}.csv`;
      } 
      else if (section === 'mood') {
        // Export mood entries data
        data = [
          ['Date', 'Mood Score', 'Assessment Result'],
          ...moodEntries.map(entry => [
            format(new Date(entry.created_at), 'yyyy-MM-dd'),
            entry.mood_score.toString(),
            entry.assessment_result || 'Normal'
          ])
        ];
        fileName = `mood_tracking_${new Date().toISOString().split('T')[0]}.csv`;
      }
      else {
        // Export all data
        data = [
          ['Date', 'Type', 'Score', 'Assessment Result'],
          ...assessments.map(assessment => [
            format(new Date(assessment.created_at), 'yyyy-MM-dd'),
            'Stress',
            assessment.stress_score.toString(),
            assessment.stress_score <= 3 ? 'Low' : 
            assessment.stress_score <= 6 ? 'Moderate' : 'High'
          ]),
          ...moodEntries.map(entry => [
            format(new Date(entry.created_at), 'yyyy-MM-dd'),
            'Mood',
            entry.mood_score.toString(),
            entry.assessment_result || 'Normal'
          ])
        ];
        fileName = `emotional_health_data_${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      // Convert data array to CSV string
      const csvContent = data.map(row => row.map(cell => {
        // Check if cell contains commas or quotes, and wrap with quotes if needed
        if (cell.includes(',') || cell.includes('"')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')).join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`${section === 'all' ? 'Complete' : section.charAt(0).toUpperCase() + section.slice(1)} data has been downloaded as CSV`);
    } catch (error) {
      console.error(`Error generating CSV:`, error);
      toast.error(`Failed to export ${section} data`);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Emotional Health Reports</h1>
            <p className="text-slate-500">
              Track your mental wellbeing and stress levels over time
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <CalendarRange className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select timeframe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => navigate("/patient-dashboard")} className="w-full sm:w-auto">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Tabs for different report views */}
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
            <TabsTrigger value="summary" className="text-xs sm:text-sm">Summary</TabsTrigger>
            <TabsTrigger value="stress" className="text-xs sm:text-sm">Stress</TabsTrigger>
            <TabsTrigger value="mood" className="text-xs sm:text-sm">Mood</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs sm:text-sm">Trends</TabsTrigger>
          </TabsList>
          
          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            {isLoading ? (
              // Loading state
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {[1, 2, 3].map(i => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <Skeleton className="h-16 w-full" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Health Overview Card */}
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Stress Analytics</CardTitle>
                        <CardDescription>
                          {dateRange === "7" 
                            ? "Past 7 days" 
                            : dateRange === "30" 
                              ? "Past 30 days" 
                              : dateRange === "90" 
                                ? "Past 3 months" 
                                : dateRange === "180" 
                                  ? "Past 6 months" 
                                  : "Past year"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                              <Download className="h-4 w-4 mr-1" />
                              Export
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportToPdf('summary')}>
                              <Download className="h-4 w-4 mr-2" />
                              Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToCsv('all')}>
                              <FileDown className="h-4 w-4 mr-2" />
                              Export CSV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          <Share className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {/* Emotional Health Score */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-slate-500">Emotional Health</p>
                              <p className={`text-2xl font-bold ${getHealthColor(Math.round(healthMetrics.healthPercentage))}`}>
                                {Math.round(healthMetrics.healthPercentage)}%
                              </p>
                            </div>
                            <div className={`bg-${
                              healthMetrics.stressTrend === 'improving' ? "green" :
                              healthMetrics.stressTrend === 'declining' ? "red" : "yellow"
                            }-100 p-2 rounded-full`}>
                              <Badge className={
                                healthMetrics.stressTrend === 'improving' ? "bg-green-100 text-green-800" :
                                healthMetrics.stressTrend === 'declining' ? "bg-red-100 text-red-800" : 
                                "bg-yellow-100 text-yellow-800"
                              }>
                                {stressTrend.text}
                                {stressTrend.icon}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="text-xs text-slate-500 mb-1">Current Stress Level: {healthMetrics.stressLevel.toFixed(1)}/10</div>
                            <Progress 
                              value={healthMetrics.stressLevel * 10} 
                              className="h-2" 
                              indicatorClassName={getProgressColor(100 - Math.round(healthMetrics.stressLevel * 10))}
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Last assessment: {formatDate(healthMetrics.lastAssessmentDate, "No assessments yet")}
                          </p>
                          {healthMetrics.daysWithData > 0 && (
                            <p className="text-xs text-slate-500 italic mt-1">
                              *Showing daily average across {healthMetrics.daysWithData} day{healthMetrics.daysWithData !== 1 ? 's' : ''}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                      
                      {/* Mood Score */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-slate-500">Mood Score</p>
                              <p className={`text-2xl font-bold ${getMoodColor(healthMetrics.moodScore)}`}>
                                {healthMetrics.moodScore.toFixed(1)}/10
                              </p>
                            </div>
                            <div className={`bg-${
                              healthMetrics.moodTrend === 'improving' ? "green" :
                              healthMetrics.moodTrend === 'declining' ? "red" : "yellow"
                            }-100 p-2 rounded-full`}>
                              <Badge className={
                                healthMetrics.moodTrend === 'improving' ? "bg-green-100 text-green-800" :
                                healthMetrics.moodTrend === 'declining' ? "bg-red-100 text-red-800" : 
                                "bg-yellow-100 text-yellow-800"
                              }>
                                {moodTrend.text}
                                {moodTrend.icon}
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="flex items-center gap-1 mt-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
                                <div 
                                  key={value} 
                                  className={`h-1.5 w-2 rounded-full ${
                                    value <= healthMetrics.moodScore ? getMoodColor(value).replace('text-', 'bg-') : 'bg-slate-200'
                                  }`}
                                ></div>
                              ))}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Last mood entry: {formatDate(healthMetrics.lastMoodEntryDate, "No mood entries yet")}
                          </p>
                          {healthMetrics.daysWithData > 0 && (
                            <p className="text-xs text-slate-500 italic mt-1">
                              *Showing daily average across {healthMetrics.daysWithData} day{healthMetrics.daysWithData !== 1 ? 's' : ''}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                      
                      {/* Consistency */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-slate-500">Assessment Consistency</p>
                              <p className={`text-2xl font-bold ${
                                healthMetrics.consistencyScore >= 80 ? "text-green-600" :
                                healthMetrics.consistencyScore >= 60 ? "text-lime-600" :
                                healthMetrics.consistencyScore >= 40 ? "text-yellow-600" :
                                healthMetrics.consistencyScore >= 20 ? "text-orange-600" : "text-red-600"
                              }`}>
                                {Math.round(healthMetrics.consistencyScore)}%
                              </p>
                            </div>
                            <div className={`bg-${
                              healthMetrics.consistencyScore >= 80 ? "green" :
                              healthMetrics.consistencyScore >= 60 ? "lime" :
                              healthMetrics.consistencyScore >= 40 ? "yellow" :
                              healthMetrics.consistencyScore >= 20 ? "orange" : "red"
                            }-100 p-2 rounded-full`}>
                              <Activity className={`h-5 w-5 ${
                                healthMetrics.consistencyScore >= 80 ? "text-green-600" :
                                healthMetrics.consistencyScore >= 60 ? "text-lime-600" :
                                healthMetrics.consistencyScore >= 40 ? "text-yellow-600" :
                                healthMetrics.consistencyScore >= 20 ? "text-orange-600" : "text-red-600"
                              }`} />
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="text-xs text-slate-500 mb-1">Tracking Regularity</div>
                            <Progress 
                              value={healthMetrics.consistencyScore} 
                              className="h-2"
                              indicatorClassName={
                                healthMetrics.consistencyScore >= 80 ? "bg-green-500" :
                                healthMetrics.consistencyScore >= 60 ? "bg-lime-500" :
                                healthMetrics.consistencyScore >= 40 ? "bg-yellow-500" :
                                healthMetrics.consistencyScore >= 20 ? "bg-orange-500" : "bg-red-500"
                              }
                            />
                          </div>
                          <p className="text-xs text-slate-500 mt-2">
                            Based on {assessments.length} assessment{assessments.length !== 1 ? 's' : ''} and {moodEntries.length} mood entries
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Progress charts - Now separated into two graphs */}
                    {(assessments.length >= 1 || moodEntries.length >= 1) ? (
                      <div className="mt-6 space-y-6">
                        {/* First-time user message if they don't have enough data */}
                        {healthMetrics.isFirstTimeUser && (
                          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                            <div className="flex items-start">
                              <div className="bg-blue-100 p-2 rounded-full mr-3">
                                <Calendar className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-medium text-blue-800 mb-1">Check in tomorrow to see trends</h3>
                                <p className="text-sm text-blue-700">
                                  We need at least two days of data to generate meaningful trends and patterns. 
                                  Come back tomorrow for your personalized insights!
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Stress Level Chart */}
                        {assessments.length >= 1 && (
                          <div>
                            <h3 className="text-sm font-medium mb-3">Stress Level & Emotional Health</h3>
                            <div className="h-[260px] bg-slate-50 rounded-lg p-3 border">
                              <StressProgressChart 
                                assessments={assessments} 
                                moodEntries={[]} 
                                showMoodData={false}
                                singleDataView={true}
                              />
                            </div>
                            <div className="mt-1 text-xs text-slate-500 text-center">
                              {assessments.length === 1 ? 
                                "Your stress level is shown for today. Check in tomorrow to see trends over time." :
                                "Chart shows your stress level (orange) and emotional health score (green)"}
                            </div>
                          </div>
                        )}
                        
                        {/* Mood Score Chart */}
                        {moodEntries.length >= 1 && (
                          <div>
                            <h3 className="text-sm font-medium mb-3">Mood Tracking</h3>
                            <div className="h-[260px] bg-slate-50 rounded-lg p-3 border">
                              <StressProgressChart 
                                assessments={[]} 
                                moodEntries={moodEntries} 
                                showStressData={false}
                                showHealthScore={false}
                                singleDataView={true}
                              />
                            </div>
                            <div className="mt-1 text-xs text-slate-500 text-center">
                              {moodEntries.length === 1 ?
                                "Your mood score is shown for today. Check in tomorrow to see trends over time." :
                                "Chart shows your mood score over time (purple)"}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-6 text-center py-12 bg-slate-50 rounded-lg border border-slate-200">
                        <Brain className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2">Not Enough Data Yet</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                          Complete at least 2 stress assessments or mood entries to view your progress charts.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                          <Button onClick={() => navigate("/patient-dashboard")}>
                            <Brain className="h-4 w-4 mr-2" />
                            Take Stress Assessment
                          </Button>
                          <Button variant="outline" onClick={() => navigate("/patient-dashboard/mood-tracker")}>
                            <HeartPulse className="h-4 w-4 mr-2" />
                            Track Your Mood
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="bg-slate-50 border-t">
                    <div className="w-full">
                      <div className="flex items-center mb-2">
                        {healthMetrics.healthPercentage >= 60 ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mr-1.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-500 mr-1.5" />
                        )}
                        <h4 className="text-sm font-medium text-slate-700">Health Status:</h4>
                        <span className={`ml-2 ${getHealthColor(Math.round(healthMetrics.healthPercentage))} font-medium`}>
                          {Math.round(healthMetrics.healthPercentage) >= 80 ? 'Excellent' :
                           Math.round(healthMetrics.healthPercentage) >= 60 ? 'Good' :
                           Math.round(healthMetrics.healthPercentage) >= 40 ? 'Fair' :
                           Math.round(healthMetrics.healthPercentage) >= 20 ? 'Concerning' : 'Worrying'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-slate-600">
                        {Math.round(healthMetrics.healthPercentage) >= 60 ? (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                            Your emotional health is in good condition. Continue maintaining your current practices.
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            Your emotional health scores indicate there may be room for improvement. Check the recommendations.
                          </span>
                        )}
                      </p>
                    </div>
                  </CardFooter>
                </Card>
                
                {/* Personalized Recommendations Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Sparkles className="w-5 h-5 text-blue-500 mr-2" />
                      Personalized Recommendations
                    </CardTitle>
                    <CardDescription>
                      Based on your assessment data and mood patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-medium text-lg mb-3">Your Insights</h3>
                        
                        {assessments.length >= 2 || moodEntries.length >= 2 ? (
                          <div className="space-y-4">
                            {/* Emotional Health Insight */}
                            {assessments.length >= 2 && (
                              <div className="bg-slate-50 rounded-lg p-4 border">
                                <div className="flex gap-3">
                                  <div className="bg-blue-100 p-2 h-fit rounded-full">
                                    <Activity className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">Emotional Health</h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                      {healthMetrics.healthPercentage >= 80 ? 
                                        'Your emotional health is excellent. Continue your effective stress management practices.' :
                                       healthMetrics.healthPercentage >= 60 ? 
                                        'Your emotional health is good. Focus on maintaining consistency in stress management.' :
                                       healthMetrics.healthPercentage >= 40 ? 
                                        'Your emotional health is fair. Consider implementing new stress reduction techniques.' :
                                        'Your emotional health needs attention. Prioritize self-care and stress management.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Stress Trend Insight */}
                            {assessments.length >= 3 && (
                              <div className="bg-slate-50 rounded-lg p-4 border">
                                <div className="flex gap-3">
                                  <div className="bg-blue-100 p-2 h-fit rounded-full">
                                    <Brain className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">Stress Pattern</h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                      {healthMetrics.stressTrend === 'improving' ? 
                                        'Your stress levels are improving. Continue your current practices and build on your success.' :
                                       healthMetrics.stressTrend === 'declining' ?
                                        'Your stress levels have been increasing. Consider new stress management techniques and be gentle with yourself.' :
                                        'Your stress levels have been stable. Consider varying your stress management approaches to see improvement.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Mood Pattern Insight */}
                            {moodEntries.length >= 3 && (
                              <div className="bg-slate-50 rounded-lg p-4 border">
                                <div className="flex gap-3">
                                  <div className="bg-purple-100 p-2 h-fit rounded-full">
                                    <HeartPulse className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">Mood Pattern</h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                      {healthMetrics.moodTrend === 'improving' ? 
                                        'Your mood has been improving consistently. Keep up the good work and note what activities boost your mood.' :
                                       healthMetrics.moodTrend === 'declining' ?
                                        'Your mood has been declining. Try to identify factors that might be affecting you and consider activities that bring you joy.' :
                                        'Your mood has been relatively stable. Consider tracking specific factors that affect your mood to gain more insights.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Consistency Insight */}
                            {(assessments.length >= 2 || moodEntries.length >= 2) && (
                              <div className="bg-slate-50 rounded-lg p-4 border">
                                <div className="flex gap-3">
                                  <div className="bg-green-100 p-2 h-fit rounded-full">
                                    <Calendar className="w-4 h-4 text-green-600" />
                                  </div>
                                  <div>
                                    <h4 className="font-medium text-sm">Tracking Consistency</h4>
                                    <p className="text-sm text-slate-600 mt-1">
                                      {healthMetrics.consistencyScore >= 70 ? 
                                        'Your tracking consistency is excellent. Regular monitoring helps you stay aware of your emotional health.' :
                                       healthMetrics.consistencyScore >= 40 ?
                                        'Your tracking consistency is good. Try setting reminders to maintain regular check-ins.' :
                                        'Your tracking consistency could improve. Regular check-ins will help you gain better insights into your emotional health.'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-slate-50 rounded-lg p-4 border text-center">
                            <p className="text-sm text-slate-600">
                              Complete more assessments to receive personalized insights
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-medium text-lg mb-3">Action Plan</h3>
                        {assessments.length >= 2 || moodEntries.length >= 2 ? (
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
                            <h4 className="font-medium text-blue-700 mb-3">
                              {healthMetrics.healthPercentage >= 80 ? 'Maintain Your Success' :
                               healthMetrics.healthPercentage >= 60 ? 'Build On Your Progress' :
                               healthMetrics.healthPercentage >= 40 ? 'Focus Areas for Improvement' :
                               'Priority Wellness Actions'}
                            </h4>
                            
                            <ul className="space-y-3 text-sm text-slate-700">
                              {/* Personalized recommendations based on health scores */}
                              {healthMetrics.healthPercentage < 60 && (
                                <li className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                  <span>Try <b>daily 5-minute breathing exercises</b> to reduce stress levels</span>
                                </li>
                              )}
                              
                              {healthMetrics.moodScore < 6 && moodEntries.length >= 2 && (
                                <li className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                  <span>Schedule <b>activities that bring you joy</b> at least twice weekly</span>
                                </li>
                              )}
                              
                              {healthMetrics.consistencyScore < 50 && (
                                <li className="flex items-start gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                  <span>Set reminders for <b>regular check-ins</b> to track your emotional health</span>
                                </li>
                              )}
                              
                              {/* General recommendations based on trends */}
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                <span>{healthMetrics.stressTrend === 'declining' ? 
                                  <>Prioritize <b>sleep quality</b> and establish a calming bedtime routine</> :
                                  <>Maintain <b>consistent sleep schedule</b> to support emotional health</>}</span>
                              </li>
                              
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                <span>Practice <b>mindfulness</b> for 10 minutes daily to improve awareness</span>
                              </li>
                              
                              {/* Resource recommendations */}
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                <span>Browse our <Button variant="link" className="h-auto p-0 text-blue-600" onClick={() => navigate("/resources")}>Resources</Button> for guided meditations and tools</span>
                              </li>
                              
                              <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                                <span className="text-gray-600 mt-4 block">Need personalized guidance? Connect with our <Button variant="link" className="p-0 h-auto text-blue-600" onClick={() => navigate("/mood-mentors")}>Mood Mentors</Button> for personalized support</span>
                              </li>
                            </ul>
                          </div>
                        ) : (
                          <div className="bg-slate-50 rounded-lg p-4 border text-center">
                            <p className="text-sm text-slate-600">
                              Complete more assessments to receive a personalized action plan
                            </p>
                          </div>
                        )}
                        
                        <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                          <h4 className="font-medium text-blue-700 mb-2 flex items-center">
                            <Sparkles className="w-4 h-4 mr-1" />
                            Additional Resources
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Button 
                              variant="outline" 
                              className="border-blue-200 text-blue-700 hover:bg-blue-100"
                              onClick={() => navigate("/help-groups")}
                            >
                              <Users className="w-3.5 h-3.5 mr-1.5" />
                              Support Groups
                            </Button>
                            <Button 
                              variant="outline" 
                              className="border-blue-200 text-blue-700 hover:bg-blue-100"
                              onClick={() => navigate("/journal")}
                            >
                              <FileText className="w-3.5 h-3.5 mr-1.5" />
                              Journal
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
          
          {/* Stress Analytics Tab */}
          <TabsContent value="stress" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="flex items-center">
                          <Brain className="w-5 h-5 text-blue-500 mr-2" />
                          Stress Assessment Analytics
                        </CardTitle>
                        <CardDescription>
                          Detailed analysis of your stress levels and emotional health
                        </CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                              <Download className="h-4 w-4 mr-1" />
                              Export
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportToPdf('stress')}>
                              <Download className="h-4 w-4 mr-2" />
                              Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToCsv('stress')}>
                              <FileDown className="h-4 w-4 mr-2" />
                              Export CSV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          <Share className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {assessments.length >= 2 ? (
                      <>
                        {/* Stress Level chart */}
                        <div>
                          <h3 className="text-sm font-medium mb-3">Stress Levels Over Time</h3>
                          <div className="h-[300px] bg-slate-50 rounded-lg p-3 border">
                            <StressProgressChart 
                              assessments={assessments} 
                              moodEntries={[]} // Only show stress data in this view
                            />
                          </div>
                        </div>
                        
                        {/* Health score explanation */}
                        <div className="mt-6">
                          <div className="flex items-center mb-3">
                            <HeartPulse className="h-5 w-5 text-blue-500 mr-2" />
                            <h3 className="text-base font-medium">Emotional Health Score: {Math.round(healthMetrics.healthPercentage)}%</h3>
                          </div>
                          
                                                      <div className="bg-slate-50 rounded-lg p-4 border">
                              <div className="flex flex-col lg:flex-row gap-6">
                              <div className="flex-1">
                                <div className="flex items-center justify-center">
                                  <div className="relative w-32 h-32">
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
                                        stroke={getProgressColor(Math.round(healthMetrics.healthPercentage))}
                                        strokeWidth="10"
                                        strokeDasharray={`${2 * Math.PI * 45 * Math.round(healthMetrics.healthPercentage) / 100} ${2 * Math.PI * 45 * (100 - Math.round(healthMetrics.healthPercentage)) / 100}`}
                                        strokeDashoffset={2 * Math.PI * 45 * 0.25}
                                        strokeLinecap="round"
                                        transform="rotate(-90 50 50)"
                                      />
                                      <text
                                        x="50"
                                        y="50"
                                        fontSize="18"
                                        fontWeight="bold"
                                        fill={getHealthColor(Math.round(healthMetrics.healthPercentage))}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                      >
                                        {Math.round(healthMetrics.healthPercentage)}%
                                      </text>
                                    </svg>
                                  </div>
                                </div>
                                <div className="text-center mt-2">
                                  <span className={`font-medium ${getHealthColor(Math.round(healthMetrics.healthPercentage))}`}>
                                    {healthMetrics.healthPercentage >= 80 ? 'Excellent' :
                                     healthMetrics.healthPercentage >= 60 ? 'Good' :
                                     healthMetrics.healthPercentage >= 40 ? 'Fair' :
                                     healthMetrics.healthPercentage >= 20 ? 'Concerning' : 'Worrying'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex-1 space-y-3">
                                <div>
                                  <div className="text-sm text-slate-600 mb-1">Current Stress Level: {healthMetrics.stressLevel.toFixed(1)}/10</div>
                                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className={getProgressColor(100 - Math.round(healthMetrics.stressLevel * 10))}
                                      style={{ width: `${healthMetrics.stressLevel * 10}%`, height: '100%' }}
                                    ></div>
                                  </div>
                                </div>
                                
                                <div>
                                  <div className="text-sm text-slate-600 mb-1">Weekly Average: {healthMetrics.weeklyStressAvg.toFixed(1)}/10</div>
                                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className={getProgressColor(100 - Math.round(healthMetrics.weeklyStressAvg * 10))}
                                      style={{ width: `${healthMetrics.weeklyStressAvg * 10}%`, height: '100%' }}
                                    ></div>
                                  </div>
                                </div>
                                
                                {/* Consistency Score */}
                                <Card>
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <p className="text-sm text-slate-500">Consistency</p>
                                        <p className={`text-2xl font-bold ${
                                          healthMetrics.consistencyScore >= 70 ? "text-green-500" :
                                          healthMetrics.consistencyScore >= 40 ? "text-yellow-600" :
                                          "text-red-500"
                                        }`}>
                                          {Math.round(healthMetrics.consistencyScore)}%
                                        </p>
                                      </div>
                                      <div>
                                        <Badge className={
                                          healthMetrics.consistencyScore >= 70 ? "bg-green-100 text-green-800" :
                                          healthMetrics.consistencyScore >= 40 ? "bg-yellow-100 text-yellow-800" :
                                          "bg-red-100 text-red-800"
                                        }>
                                          {healthMetrics.consistencyScore >= 70 ? "Excellent" :
                                            healthMetrics.consistencyScore >= 40 ? "Good" : "Needs Improvement"}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="mt-3">
                                      <Progress 
                                        value={healthMetrics.consistencyScore} 
                                        className="h-2" 
                                        indicatorClassName={
                                          healthMetrics.consistencyScore >= 70 ? "bg-green-500" :
                                          healthMetrics.consistencyScore >= 40 ? "bg-yellow-500" :
                                          "bg-red-500"
                                        }
                                      />
                                    </div>
                                  </CardContent>
                                </Card>
                                
                                <div className="pt-2">
                                  <div className="flex items-center text-sm">
                                    <Calendar className="w-4 h-4 text-slate-400 mr-1.5" />
                                    <span className="text-slate-600">Last assessment: </span>
                                    <span className="font-medium ml-1">
                                      {formatDate(healthMetrics.lastAssessmentDate, "No assessments yet")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Recent assessments */}
                        <div className="mt-6">
                          <h3 className="text-sm font-medium mb-3">Recent Assessments</h3>
                        <div className="space-y-3">
                            {assessments.slice(0, 5).map((assessment) => (
                              <Card key={assessment.id} className="bg-slate-50 border-0">
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="text-sm font-medium mb-1">
                                        {format(new Date(assessment.created_at), "MMMM d, yyyy 'at' h:mm a")}
                                      </div>
                                      <div className="text-2xl font-bold mb-2">
                                        {Math.round(Math.max(0, 100 - (assessment.stress_score * 10)))}% Emotional Health
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
                            
                            {assessments.length > 5 && (
                              <div className="text-center pt-2">
                                <Button
                                  variant="link"
                                  onClick={() => navigate("/patient-dashboard/stress-report")}
                                >
                                  View All Assessments
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Brain className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2">No Stress Assessment Data</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                          Complete at least 2 stress assessments to view detailed analytics and track your progress over time.
                        </p>
                        <Button onClick={() => navigate("/patient-dashboard")}>
                          Take Your First Assessment
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Understanding your score */}
                <Card>
                  <CardHeader>
                    <CardTitle>Understanding Your Emotional Health Score</CardTitle>
                    <CardDescription>
                      How to interpret your assessment results
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-slate-600">
                      Your Emotional Health Score is calculated from your stress assessment responses. 
                      The score represents your overall emotional wellbeing, with higher percentages indicating better emotional health.
                    </p>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
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
              </>
            )}
          </TabsContent>
                    
          {/* Mood Tracking Tab */}
          <TabsContent value="mood" className="space-y-6">
            {isLoading ? (
                    <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="flex items-center">
                          <HeartPulse className="w-5 h-5 text-red-500 mr-2" />
                          Mood Tracking
                        </CardTitle>
                        <CardDescription>
                          Analysis of your mood patterns over time
                        </CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                              <Download className="h-4 w-4 mr-1" />
                              Export
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportToPdf('mood')}>
                              <Download className="h-4 w-4 mr-2" />
                              Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => exportToCsv('mood')}>
                              <FileDown className="h-4 w-4 mr-2" />
                              Export CSV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          <Share className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {moodEntries.length >= 2 ? (
                      <>
                        {/* Mood Tracking Chart */}
                        <div>
                          <h3 className="text-sm font-medium mb-3">Mood Trends Over Time</h3>
                          <div className="h-[300px] bg-slate-50 rounded-lg p-3 border">
                            <StressProgressChart 
                              assessments={[]} // Only show mood data in this view
                              moodEntries={moodEntries} 
                            />
                          </div>
                        </div>
                        
                        {/* Mood Distribution */}
                        <div className="mt-6">
                          <div className="flex items-center mb-3">
                            <BarChart3 className="h-5 w-5 text-purple-500 mr-2" />
                            <h3 className="text-base font-medium">Mood Distribution</h3>
                          </div>
                          
                          <div className="bg-slate-50 rounded-lg p-4 border">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="flex-1">
                                {/* Mood score scale visualization */}
                        <div className="space-y-3">
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs text-slate-500">Very Negative (1-2)</span>
                                      <span className="text-xs font-medium">
                                        {moodEntries.filter(m => m.mood_score <= 2).length} entries
                                      </span>
                              </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="bg-red-500"
                                        style={{ 
                                          width: `${moodEntries.filter(m => m.mood_score <= 2).length / moodEntries.length * 100}%`, 
                                          height: '100%' 
                                        }}
                                      ></div>
                            </div>
                          </div>
                          
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs text-slate-500">Negative (3-4)</span>
                                      <span className="text-xs font-medium">
                                        {moodEntries.filter(m => m.mood_score > 2 && m.mood_score <= 4).length} entries
                                      </span>
                              </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="bg-orange-500"
                                        style={{ 
                                          width: `${moodEntries.filter(m => m.mood_score > 2 && m.mood_score <= 4).length / moodEntries.length * 100}%`, 
                                          height: '100%' 
                                        }}
                                      ></div>
                            </div>
                          </div>
                          
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs text-slate-500">Neutral (5-6)</span>
                                      <span className="text-xs font-medium">
                                        {moodEntries.filter(m => m.mood_score > 4 && m.mood_score <= 6).length} entries
                                      </span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="bg-yellow-500"
                                        style={{ 
                                          width: `${moodEntries.filter(m => m.mood_score > 4 && m.mood_score <= 6).length / moodEntries.length * 100}%`, 
                                          height: '100%' 
                                        }}
                                      ></div>
                            </div>
                          </div>
                          
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs text-slate-500">Positive (7-8)</span>
                                      <span className="text-xs font-medium">
                                        {moodEntries.filter(m => m.mood_score > 6 && m.mood_score <= 8).length} entries
                                      </span>
                            </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="bg-lime-500"
                                        style={{ 
                                          width: `${moodEntries.filter(m => m.mood_score > 6 && m.mood_score <= 8).length / moodEntries.length * 100}%`, 
                                          height: '100%' 
                                        }}
                                      ></div>
                          </div>
                        </div>
                                  
                                  <div>
                                    <div className="flex justify-between mb-1">
                                      <span className="text-xs text-slate-500">Very Positive (9-10)</span>
                                      <span className="text-xs font-medium">
                                        {moodEntries.filter(m => m.mood_score > 8).length} entries
                                      </span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                      <div
                                        className="bg-green-500"
                                        style={{ 
                                          width: `${moodEntries.filter(m => m.mood_score > 8).length / moodEntries.length * 100}%`, 
                                          height: '100%' 
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                  </div>
                </div>
                
                              <div className="flex-1 space-y-3">
                                <div>
                                  <div className="text-sm font-medium mb-2">Mood Metrics</div>
                <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-sm text-slate-600">Current Mood:</span>
                                      <span className={`text-sm font-medium ${getMoodColor(healthMetrics.moodScore)}`}>
                                        {healthMetrics.moodScore.toFixed(1)}/10
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between">
                                      <span className="text-sm text-slate-600">Weekly Average:</span>
                                      <span className={`text-sm font-medium ${getMoodColor(healthMetrics.weeklyMoodAvg)}`}>
                                        {healthMetrics.weeklyMoodAvg.toFixed(1)}/10
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between">
                                      <span className="text-sm text-slate-600">Entries in Period:</span>
                                      <span className="text-sm font-medium">
                                        {moodEntries.length} entries
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between">
                                      <span className="text-sm text-slate-600">Trend:</span>
                                      <span className={`text-sm font-medium flex items-center ${moodTrend.color}`}>
                                        {moodTrend.text}
                                        {moodTrend.icon}
                                      </span>
                  </div>
                                    
                                    <div className="flex justify-between">
                                      <span className="text-sm text-slate-600">Last Entry:</span>
                                      <span className="text-sm font-medium">
                                        {formatDate(healthMetrics.lastMoodEntryDate, "No entries")}
                                      </span>
                </div>
                                  </div>
                                </div>
                                
                                <div className="pt-2">
                                  <div className="text-sm font-medium mb-2">Predominant Mood</div>
                                  <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center">
                                        {healthMetrics.moodScore >= 8 ? (
                                          <span className="text-3xl mr-3">😊</span>
                                        ) : healthMetrics.moodScore >= 6 ? (
                                          <span className="text-3xl mr-3">😌</span>
                                        ) : healthMetrics.moodScore >= 4 ? (
                                          <span className="text-3xl mr-3">😐</span>
                                        ) : healthMetrics.moodScore >= 2 ? (
                                          <span className="text-3xl mr-3">😔</span>
                                        ) : (
                                          <span className="text-3xl mr-3">😢</span>
                                        )}
                  <div>
                                          <div className="font-medium">
                                            {healthMetrics.moodScore >= 8 ? 'Happy' : 
                                             healthMetrics.moodScore >= 6 ? 'Content' :
                                             healthMetrics.moodScore >= 4 ? 'Neutral' :
                                             healthMetrics.moodScore >= 2 ? 'Sad' : 'Very Sad'}
                  </div>
                                          <div className="text-xs text-slate-500">
                                            Based on your recent entries
                  </div>
                </div>
                                      </div>
                                      <Badge className={getMoodColor(healthMetrics.moodScore).replace('text-', 'bg-').replace('-600', '-100')}>
                                        <span className={getMoodColor(healthMetrics.moodScore)}>
                                          {healthMetrics.moodScore.toFixed(1)}/10
                                        </span>
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Recent Mood Entries */}
                        <div className="mt-6">
                          <h3 className="text-sm font-medium mb-3">Recent Mood Entries</h3>
                          <div className="space-y-3">
                            {moodEntries.slice(0, 5).map((entry) => (
                              <Card key={entry.id} className="bg-slate-50 border-0">
                                <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                                      <div className="text-sm font-medium mb-1">
                                        {format(new Date(entry.created_at), "MMMM d, yyyy 'at' h:mm a")}
                          </div>
                                      <div className={`text-2xl font-bold mb-2 ${getMoodColor(entry.mood_score)}`}>
                                        {entry.mood_score.toFixed(1)}/10
                        </div>
                                      {entry.assessment_result && (
                                        <div className="text-sm text-slate-500">
                                          Mood: {entry.assessment_result}
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className={`
                                      px-3 py-1 rounded-full text-xs font-medium
                                      ${entry.mood_score >= 8 ? 'bg-green-100 text-green-800' : 
                                        entry.mood_score >= 6 ? 'bg-lime-100 text-lime-800' :
                                        entry.mood_score >= 4 ? 'bg-yellow-100 text-yellow-800' :
                                        entry.mood_score >= 2 ? 'bg-orange-100 text-orange-800' :
                                        'bg-red-100 text-red-800'}
                                    `}>
                                      {entry.mood_score >= 8 ? 'Very Good' : 
                                       entry.mood_score >= 6 ? 'Good' :
                                       entry.mood_score >= 4 ? 'Neutral' :
                                       entry.mood_score >= 2 ? 'Poor' : 'Very Poor'}
                                    </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                            
                            {moodEntries.length > 5 && (
                              <div className="text-center pt-2">
                                <Button
                                  variant="link"
                                  onClick={() => navigate("/patient-dashboard/mood-tracker")}
                                >
                                  View All Mood Entries
                                </Button>
                </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <HeartPulse className="h-12 w-12 text-purple-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2">No Mood Data Yet</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                          Track your mood regularly to see patterns and insights. Complete at least 2 mood entries to view detailed analytics.
                        </p>
                        <Button onClick={() => navigate("/patient-dashboard/mood-tracker")}>
                          Track Your Mood
                        </Button>
                      </div>
                    )}
              </CardContent>
            </Card>
            
                {/* Understanding Mood Tracking */}
            <Card>
              <CardHeader>
                    <CardTitle>Understanding Mood Tracking</CardTitle>
                    <CardDescription>
                      How mood tracking benefits your emotional health
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">
                        Mood tracking helps you understand patterns in your emotional wellbeing and identify factors that affect your mood.
                        Regular tracking provides valuable insights for improving your mental health.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg border">
                          <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mb-3">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                          <h3 className="font-medium mb-2">Track Patterns</h3>
                          <p className="text-sm text-slate-600">
                            Identify patterns in your mood fluctuations to understand what affects you
                          </p>
                  </div>
                        
                        <div className="bg-slate-50 p-4 rounded-lg border">
                          <div className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center mb-3">
                            <Activity className="w-4 h-4 text-purple-600" />
                </div>
                          <h3 className="font-medium mb-2">Monitor Progress</h3>
                          <p className="text-sm text-slate-600">
                            Track how your mood changes over time to evaluate your mental health journey
                          </p>
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-lg border">
                          <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center mb-3">
                            <Sparkles className="w-4 h-4 text-green-600" />
                          </div>
                          <h3 className="font-medium mb-2">Gain Insights</h3>
                          <p className="text-sm text-slate-600">
                            Develop self-awareness about your emotional triggers and resilience factors
                          </p>
                        </div>
                  </div>
                </div>
              </CardContent>
            </Card>
              </>
            )}
          </TabsContent>
          
          {/* Trends & Patterns Tab */}
          <TabsContent value="trends" className="space-y-6">
            {isLoading ? (
              <Card>
                <CardHeader>
                  <Skeleton className="h-8 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[400px] w-full" />
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="flex items-center">
                          <TrendingUp className="w-5 h-5 text-indigo-500 mr-2" />
                          Trends & Patterns
                        </CardTitle>
                        <CardDescription>
                          Long-term analysis of your emotional health
                        </CardDescription>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                              <Download className="h-4 w-4 mr-1" />
                              Export
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => exportToPdf('trends')}>
                              <Download className="h-4 w-4 mr-2" />
                              Export PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>
                              <FileDown className="h-4 w-4 mr-2" />
                              Export CSV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <Button variant="outline" size="sm" className="w-full sm:w-auto">
                          <Share className="h-4 w-4 mr-1" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {assessments.length >= 2 && moodEntries.length >= 2 ? (
                      <>
                        {/* Combined chart showing both metrics */}
                        <div className="h-[350px] bg-slate-50 rounded-lg p-3 border">
                          <StressProgressChart 
                            assessments={assessments} 
                            moodEntries={moodEntries} 
                          />
                        </div>
                        <div className="text-sm text-slate-500 text-center">
                          This chart combines all your emotional health data to help you see relationships between stress and mood
                        </div>
                        
                        <div className="bg-slate-50 rounded-lg p-5 border mt-6">
                          <h3 className="font-medium text-lg mb-4">Pattern Insights</h3>
                          <div className="space-y-4">
                            <div className="flex gap-4 items-start">
                              <div className="bg-blue-100 p-2 rounded-full">
                                <Brain className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Stress and Mood Relationship</h4>
                                <p className="text-sm text-slate-600 mt-1">
                                  {healthMetrics.stressTrend === healthMetrics.moodTrend ?
                                    "Your stress and mood patterns are changing in parallel. This suggests your emotional health is strongly connected to your stress levels." :
                                    "Your stress and mood are showing different patterns. This suggests there may be other factors affecting your emotional wellbeing beyond stress."}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-4 items-start">
                              <div className="bg-purple-100 p-2 rounded-full">
                                <HeartPulse className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Emotional Balance</h4>
                                <p className="text-sm text-slate-600 mt-1">
                                  {healthMetrics.healthPercentage >= 60 && healthMetrics.moodScore >= 6 ?
                                    "Your emotional health and mood scores are both positive, indicating good emotional balance." :
                                   healthMetrics.healthPercentage < 60 && healthMetrics.moodScore < 6 ?
                                    "Both your stress levels and mood scores indicate room for improvement in your emotional balance." :
                                    "There's a disconnect between your stress levels and mood, which may indicate specific factors affecting one area more than the other."}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex gap-4 items-start">
                              <div className="bg-green-100 p-2 rounded-full">
                                <Sparkles className="w-5 h-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-medium">Recommendations</h4>
                                <p className="text-sm text-slate-600 mt-1">
                                  Based on your patterns, we recommend focusing on {healthMetrics.healthPercentage < 60 ? "stress reduction" : "maintaining your stress management practices"} 
                                  and {healthMetrics.moodScore < 6 ? "activities that boost your mood" : "continuing activities that maintain your positive mood"}.
                                </p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-blue-600 border-blue-200"
                                    onClick={() => navigate("/resources")}
                                  >
                                    View Resources
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-purple-600 border-purple-200"
                                    onClick={() => navigate("/mood-mentors")}
                                  >
                                    Find a Mood Mentor
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {checkInDates.length >= 3 && (
                          <div className="mt-6">
                            <h3 className="font-medium text-lg mb-4">Consistency Tracking</h3>
                            <ErrorBoundary
                              fallback={
                                <div className="text-center p-6 bg-slate-50 rounded-lg border">
                                  <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                                  <p className="text-slate-600">There was an issue rendering the consistency heatmap.</p>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-3"
                                    onClick={() => {
                                      // Reset check-in dates and try again
                                      setCheckInDates([]);
                                      fetchData();
                                    }}
                                  >
                                    Refresh Data
                                  </Button>
                                </div>
                              }
                            >
                              <ConsistencyHeatmap 
                                checkInDates={checkInDates}
                                firstCheckInDate={firstCheckInDate && isValid(firstCheckInDate) ? firstCheckInDate : undefined}
                              />
                            </ErrorBoundary>
                            <p className="text-xs text-slate-500 text-center mt-3">
                              This visualization shows your check-in patterns over time, with colored squares representing days you logged data.
                              <br />Longer streaks show darker colors. Try to maintain a daily streak for best results!
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-12">
                        <Activity className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2">More Data Needed</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                          To see trend patterns and relationships between your stress and mood, you need at least 2 entries of each type.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                          {assessments.length < 2 && (
                            <Button onClick={() => navigate("/patient-dashboard")}>
                              <Brain className="h-4 w-4 mr-2" />
                              Take Stress Assessment
                            </Button>
                          )}
                          {moodEntries.length < 2 && (
                            <Button variant={assessments.length < 2 ? "outline" : "default"} onClick={() => navigate("/patient-dashboard/mood-tracker")}>
                              <HeartPulse className="h-4 w-4 mr-2" />
                              Track Your Mood
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
          
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 


