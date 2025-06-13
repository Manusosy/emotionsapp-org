import { useState, useEffect } from 'react';
import { subDays, addDays, format, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, differenceInDays, isValid } from 'date-fns';

interface ConsistencyHeatmapProps {
  checkInDates: Date[];
  startDate?: Date; // Optional start date
  endDate?: Date; // Optional end date
  firstCheckInDate?: Date; // First time user checked in
  className?: string;
}

export default function ConsistencyHeatmap({ 
  checkInDates, 
  startDate: customStartDate, 
  endDate: customEndDate,
  firstCheckInDate,
  className = '' 
}: ConsistencyHeatmapProps) {
  // Default to last 3 months if no custom dates provided
  const endDate = customEndDate || new Date();
  const startDate = customStartDate || subDays(endDate, 90);
  
  // Calculate first check-in info
  const actualFirstCheckIn = firstCheckInDate || (checkInDates.length > 0 ? 
    checkInDates.reduce((earliest, curr) => curr < earliest ? curr : earliest, checkInDates[0]) : 
    startDate);
  
  const daysActive = Math.ceil((endDate.getTime() - actualFirstCheckIn.getTime()) / (1000 * 60 * 60 * 24));
  
  // Generate dates for the heatmap
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);
  
  useEffect(() => {
    // Generate all days between start and end date
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    setCalendarDays(days);
  }, [startDate, endDate]);
  
  // Process check-in dates to ensure we're only using real dates
  // Ensure we don't display fake data
  const filteredCheckInDates = checkInDates.filter(date => {
    // Make sure the date is valid and within our display range
    return isValid(date) && date >= startDate && date <= endDate;
  });
  
  // Sort dates by most recent to oldest
  const sortedFilteredDates = [...filteredCheckInDates].sort((a, b) => 
    b.getTime() - a.getTime()
  );
  
  // Calculate weekly rows for the calendar
  const weeks: Date[][] = [];
  if (calendarDays.length > 0) {
    let currentWeek: Date[] = [];
    
    // Ensure we start with a Sunday
    const firstDay = calendarDays[0];
    const weekStart = startOfWeek(firstDay);
    
    // Add any padding days at the beginning
    if (firstDay > weekStart) {
      const paddingDays = eachDayOfInterval({ start: weekStart, end: subDays(firstDay, 1) });
      currentWeek = [...paddingDays];
    }
    
    // Add all calendar days
    calendarDays.forEach(day => {
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    
    // Add any remaining days and padding at the end
    if (currentWeek.length > 0) {
      const lastDay = currentWeek[currentWeek.length - 1];
      const weekEnd = endOfWeek(lastDay);
      
      if (lastDay < weekEnd) {
        const paddingDays = eachDayOfInterval({ start: addDays(lastDay, 1), end: weekEnd });
        currentWeek = [...currentWeek, ...paddingDays];
      }
      
      weeks.push(currentWeek);
    }
  }
  
  // Calculate color intensity based on check-in status
  const getCellColor = (day: Date) => {
    // Count how many check-ins occurred on this day
    const checkInsOnDay = filteredCheckInDates.filter(checkInDate => isSameDay(checkInDate, day)).length;
    
    if (checkInsOnDay === 0) return 'bg-slate-100';
    
    // Use gradient colors for each day based on number of check-ins
    if (checkInsOnDay >= 4) return 'bg-gradient-to-br from-emerald-600 to-emerald-700'; // 4+ tests
    if (checkInsOnDay === 3) return 'bg-gradient-to-br from-emerald-500 to-emerald-600'; // 3 tests
    if (checkInsOnDay === 2) return 'bg-gradient-to-br from-emerald-400 to-emerald-500'; // 2 tests
    if (checkInsOnDay === 1) return 'bg-gradient-to-br from-emerald-300 to-emerald-400'; // 1 test
    
    return 'bg-emerald-200'; // Fallback
  };
  
  // Get tooltip text for a day
  const getTooltipText = (day: Date) => {
    const checkInsOnDay = filteredCheckInDates.filter(checkInDate => isSameDay(checkInDate, day)).length;
    const dateStr = format(day, 'MMM d, yyyy');
    
    if (checkInsOnDay === 0) {
      return `${dateStr}: No check-ins`;
    } else {
      return `${dateStr}: ${checkInsOnDay} check-in${checkInsOnDay !== 1 ? 's' : ''}`;
    }
  };
  
  // Calculate consistency percentage - modified to be more accurate
  const totalDays = calendarDays.length;
  
  // Count unique days that have check-ins, not total check-ins
  const uniqueCheckInDays = new Set(filteredCheckInDates.map(d => d.toDateString())).size;
  
  // More accurate consistency calculation based on actual data collection period
  const daysSinceFirstCheckIn = firstCheckInDate ? 
    differenceInDays(new Date(), firstCheckInDate) + 1 : // Add 1 to include the first day
    totalDays;
    
  // For a brand new user (first day), don't show 100% consistency yet
  // They need at least a few days of history for meaningful consistency
  const expectedDays = Math.min(daysSinceFirstCheckIn, totalDays);
  const consistencyPercentage = expectedDays > 2 ? 
    Math.round((uniqueCheckInDays / expectedDays) * 100) : 
    uniqueCheckInDays > 0 ? 10 : 0; // Show minimal progress for first-time users
  
  // Calculate longest streak
  let longestStreak = 0;
  let currentStreak = 0;
  
  // Sort dates first - use our filtered dates
  const sortedDates = [...filteredCheckInDates].sort((a, b) => a.getTime() - b.getTime());
  
  // Calculate current streak - check if today or yesterday has an entry
  let currentStreakActive = false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = subDays(today, 1);
  
  // Check if today has an entry
  const hasTodayEntry = sortedDates.some(date => isSameDay(date, today));
  
  // Check if yesterday has an entry (only relevant if today doesn't have one)
  const hasYesterdayEntry = !hasTodayEntry && sortedDates.some(date => isSameDay(date, yesterday));
  
  // Current streak is active if there's an entry today or yesterday
  currentStreakActive = hasTodayEntry || hasYesterdayEntry;
  
  for (let i = 0; i < sortedDates.length; i++) {
    if (i === 0) {
      currentStreak = 1;
    } else {
      const prevDate = sortedDates[i - 1];
      const currDate = sortedDates[i];
      
      // Check if this is the next day
      const dayDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        currentStreak++;
      } else {
        // Streak broken
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }
  }
  
  // Check final streak
  longestStreak = Math.max(longestStreak, currentStreak);
  
  // If the last entry isn't today or yesterday, current streak is 0
  if (!currentStreakActive) {
    currentStreak = 0;
  }
  
  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${className}`}>
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-medium">Activity Heatmap</h3>
          <p className="text-xs text-slate-500">Your check-in patterns</p>
        </div>
        <div className="text-right">
          <div className="font-semibold text-emerald-600">{consistencyPercentage}%</div>
          <div className="flex items-center justify-end">
            <p className="text-xs text-slate-500">Consistency</p>
            <div className="relative group ml-1">
              <div className="cursor-help text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
              </div>
              <div className="absolute z-10 invisible group-hover:visible bg-slate-800 text-white p-2 rounded shadow-lg text-xs right-0 w-48">
                Consistency is calculated as the percentage of days you've checked in since your first activity.
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">{uniqueCheckInDays}/{expectedDays} days</p>
        </div>
      </div>
      
      <div className="mb-4 overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-7 gap-1 mb-1 text-center">
            <div className="text-xs text-slate-500">Sun</div>
            <div className="text-xs text-slate-500">Mon</div>
            <div className="text-xs text-slate-500">Tue</div>
            <div className="text-xs text-slate-500">Wed</div>
            <div className="text-xs text-slate-500">Thu</div>
            <div className="text-xs text-slate-500">Fri</div>
            <div className="text-xs text-slate-500">Sat</div>
          </div>
          
          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`
                      h-7 w-full rounded-sm ${getCellColor(day)}
                      ${day < startDate || day > endDate ? 'opacity-30' : ''}
                      flex items-center justify-center
                    `}
                    title={getTooltipText(day)}
                  >
                    <span className="text-[10px] text-slate-800 opacity-70">
                      {format(day, 'd')}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-xl font-semibold text-emerald-600">{longestStreak}</div>
          <p className="text-xs text-slate-500">Longest streak</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-xl font-semibold text-indigo-600">{currentStreak}</div>
          <p className="text-xs text-slate-500">Current streak</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3">
          <div className="text-xl font-semibold text-blue-600">{daysActive}</div>
          <p className="text-xs text-slate-500">Days active</p>
        </div>
      </div>
      
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-sm bg-slate-100"></div>
          <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-emerald-300 to-emerald-400"></div>
          <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-emerald-400 to-emerald-500"></div>
          <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-emerald-500 to-emerald-600"></div>
          <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-emerald-600 to-emerald-700"></div>
        </div>
        <div className="text-xs text-slate-500 flex items-center">
          <span>None</span>
          <span className="mx-1">→</span>
          <span>1</span>
          <span className="mx-1">→</span>
          <span>2</span>
          <span className="mx-1">→</span>
          <span>3</span>
          <span className="mx-1">→</span>
          <span>4+</span>
        </div>
      </div>
    </div>
  );
} 