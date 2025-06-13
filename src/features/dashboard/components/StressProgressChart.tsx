import { useEffect, useState } from "react";
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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

interface StressProgressChartProps {
  assessments: Assessment[];
  moodEntries: MoodEntry[];
  showStressData?: boolean;
  showMoodData?: boolean;
  showHealthScore?: boolean;
  singleDataView?: boolean;
}

export default function StressProgressChart({ 
  assessments, 
  moodEntries,
  showStressData = true,
  showMoodData = true,
  showHealthScore = true,
  singleDataView = false
}: StressProgressChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  
  useEffect(() => {
    if (assessments.length === 0 && moodEntries.length === 0) return;
    
    // Sort assessments and mood entries by date
    const sortedAssessments = [...assessments].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    const sortedMoodEntries = [...moodEntries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    // Create map of dates for mood entries to quickly look up
    const moodEntriesByDate = new Map();
    sortedMoodEntries.forEach(entry => {
      const date = new Date(entry.created_at).toLocaleDateString();
      if (!moodEntriesByDate.has(date)) {
        moodEntriesByDate.set(date, []);
      }
      moodEntriesByDate.get(date).push(entry);
    });
    
    let data = [];
    
    // If we have stress assessments and should show them
    if (sortedAssessments.length > 0 && showStressData) {
      data = sortedAssessments.map(assessment => {
        const date = new Date(assessment.created_at);
        const formattedDate = date.toLocaleDateString();
        
        // Calculate emotional health from stress score
        const healthScore = calculateHealthScore(assessment.stress_score);
        
        // Find matching mood entries for this date
        const matchingMoodEntries = moodEntriesByDate.get(formattedDate) || [];
        const averageMoodScore = matchingMoodEntries.length > 0 && showMoodData
          ? matchingMoodEntries.reduce((sum: number, entry: MoodEntry) => sum + entry.mood_score, 0) / matchingMoodEntries.length
          : null;
        
        return {
          date: formattedDate,
          fullDate: date,
          healthScore: showHealthScore ? healthScore : null,
          stressLevel: assessment.stress_score,
          moodScore: averageMoodScore,
        };
      });
    }
    // If we have mood entries and no stress assessments (or not showing them)
    else if (sortedMoodEntries.length > 0 && showMoodData && (!showStressData || sortedAssessments.length === 0)) {
      data = sortedMoodEntries.map(entry => {
        const date = new Date(entry.created_at);
        const formattedDate = date.toLocaleDateString();
        
        return {
          date: formattedDate,
          fullDate: date,
          healthScore: null,
          stressLevel: null,
          moodScore: entry.mood_score,
        };
      });
      
      // Combine entries with the same date by averaging mood scores
      const consolidatedData = new Map();
      data.forEach(item => {
        if (!consolidatedData.has(item.date)) {
          consolidatedData.set(item.date, { 
            ...item, 
            count: 1 
          });
        } else {
          const existing = consolidatedData.get(item.date);
          existing.moodScore = (existing.moodScore * existing.count + item.moodScore) / (existing.count + 1);
          existing.count++;
        }
      });
      
      data = Array.from(consolidatedData.values());
    }
    
    // Sort by date for proper display
    data.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
    
    setChartData(data);
  }, [assessments, moodEntries, showStressData, showMoodData, showHealthScore]);
  
  // Calculate health score (inverse of stress level)
  const calculateHealthScore = (stressLevel: number): number => {
    // Convert stress level (0-10) to health percentage (0-100)
    const percentage = Math.max(0, 100 - (stressLevel * 10));
    return Math.round(percentage);
  };
  
  // Format date for X-axis
  const formatXAxis = (date: string) => {
    try {
      const dateObj = new Date(date);
      return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    } catch (e) {
      return date;
    }
  };
  
  // Customize tooltip for better readability
  const renderCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dateStr = payload[0]?.payload?.date || label;
      
      return (
        <div className="bg-white p-2 border border-slate-200 rounded shadow-sm text-xs">
          <p className="font-medium">{dateStr}</p>
          {payload.map((entry: any, index: number) => (
            entry.value !== null && (
              <p key={`item-${index}`} style={{ color: entry.color }}>
                {entry.name}: {entry.name === "Emotional Health" ? `${entry.value}%` : `${entry.value}/10`}
              </p>
            )
          ))}
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      {chartData.length > 0 ? (
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            tickFormatter={formatXAxis}
            stroke="#94a3b8"
            fontSize={12}
          />
          
          {/* Left Y-axis for health percentage */}
          {showHealthScore && (
            <YAxis 
              yAxisId="left" 
              domain={[0, 100]} 
              stroke="#94a3b8"
              fontSize={12}
              label={{ 
                value: singleDataView ? "Health Percentage (%)" : "", 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: '12px', fill: '#94a3b8' } 
              }}
            />
          )}
          
          {/* Right Y-axis for scores out of 10 */}
          {(showStressData || showMoodData) && (
            <YAxis 
              yAxisId="right" 
              orientation="right" 
              domain={[0, 10]} 
              stroke="#94a3b8"
              fontSize={12}
              label={{ 
                value: singleDataView ? (showStressData ? "Stress Level (/10)" : "Mood Score (/10)") : "", 
                angle: 90, 
                position: 'insideRight',
                style: { textAnchor: 'middle', fontSize: '12px', fill: '#94a3b8' } 
              }}
            />
          )}
          
          <Tooltip content={renderCustomTooltip} />
          <Legend />
          
          {/* Emotional Health line */}
          {showHealthScore && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="healthScore"
              name="Emotional Health"
              stroke="#10b981"
              activeDot={{ r: 8 }}
              strokeWidth={2}
              connectNulls
            />
          )}
          
          {/* Stress Level line */}
          {showStressData && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="stressLevel"
              name="Stress Level"
              stroke="#f97316"
              strokeWidth={2}
              connectNulls
            />
          )}
          
          {/* Mood Score line */}
          {showMoodData && chartData.some(item => item.moodScore !== null) && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="moodScore"
              name="Mood Score"
              stroke="#8b5cf6"
              strokeWidth={2}
              strokeDasharray={singleDataView ? "0" : "5 5"}
              connectNulls
            />
          )}
        </LineChart>
      ) : (
        <div className="h-full w-full flex items-center justify-center text-slate-400">
          Not enough data to generate chart
        </div>
      )}
    </ResponsiveContainer>
  );
} 