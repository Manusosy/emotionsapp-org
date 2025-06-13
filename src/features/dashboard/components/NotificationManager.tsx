import { useEffect, useState } from 'react';
import { subDays, isThisWeek, format, isSameDay, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

interface NotificationManagerProps {
  checkInDates: Date[]; // All check-in dates
  userId: string;
  userEmail?: string;
  testMode?: boolean; // Add test mode option
}

// Component that handles automated notifications for consistency tracking
export default function NotificationManager({ 
  checkInDates, 
  userId,
  userEmail,
  testMode = true // Default to test mode for development
}: NotificationManagerProps) {
  // State to track if we've shown a test notification
  const [hasShownTestNotification, setHasShownTestNotification] = useState(false);
  
  // Schedule weekly notification to run every day at 7am
  // If it's the 7th day of activity, send a positive reinforcement message
  useEffect(() => {
    // Wait for check-in dates to be loaded
    if (!checkInDates.length) return;
    
    // Get today and calculate a week ago
    const today = new Date();
    const weekAgo = subDays(today, 7);
    
    // Check if we need to show a notification
    const shouldCheckForNotification = () => {
      if (testMode) {
        // In test mode, show notification if we haven't shown one yet
        if (!hasShownTestNotification && checkInDates.length > 0) {
          // Only show once during this component lifecycle
          setHasShownTestNotification(true);
          return true;
        }
        return false;
      }
      
      // In production mode, only trigger at 7am
      const currentHour = today.getHours();
      
      // Check if we've already shown a notification today
      const lastNotification = sessionStorage.getItem('last_weekly_notification');
      const alreadyShownToday = lastNotification === today.toDateString();
      
      return currentHour === 7 && !alreadyShownToday; 
    };
    
    // Count check-ins from the past week
    const weeklyCheckIns = checkInDates.filter(date => {
      // Get dates that are within this week or today
      return isThisWeek(date) || isSameDay(date, today);
    });
    
    // Get unique days with check-ins this week
    const uniqueDaysThisWeek = new Set(
      weeklyCheckIns.map(date => format(date, 'yyyy-MM-dd'))
    ).size;
    
    // Calculate active days (for test mode)
    const firstCheckInDate = checkInDates.reduce(
      (earliest, date) => (date < earliest ? date : earliest),
      new Date()
    );
    
    const activeDays = Math.max(1, differenceInDays(today, firstCheckInDate) + 1);
    
    // Check if we should send a notification
    if (shouldCheckForNotification()) {
      // Create the message based on performance
      let message = '';
      let title = '';
      
      if (testMode) {
        // In test mode, use the actual data we have
        title = 'Weekly Progress Report 📊';
        message = `You've checked in ${uniqueDaysThisWeek} day${uniqueDaysThisWeek !== 1 ? 's' : ''} this week and been active for ${activeDays} day${activeDays !== 1 ? 's' : ''} overall. Keep up the good work!`;
      } else if (uniqueDaysThisWeek >= 6) {
        title = 'Outstanding Progress! 🌟';
        message = "You've been incredibly consistent this week with check-ins on nearly every day! Keep up this amazing work!";
      } else if (uniqueDaysThisWeek >= 4) {
        title = 'Great Week! 👏';
        message = `You've checked in ${uniqueDaysThisWeek} days this week. That's excellent consistency!`;
      } else if (uniqueDaysThisWeek >= 2) {
        title = 'Good Progress! 👍';
        message = `You checked in ${uniqueDaysThisWeek} days this week. Can you aim for one more day next week?`;
      } else {
        title = 'Getting Started! 🌱';
        message = "You've made a start this week. Try to check in more frequently for better insights!";
      }
      
      // Show toast notification
      toast(title, {
        description: message,
        icon: <Bell className="h-5 w-5 text-blue-500" />,
        duration: 8000, // Show for 8 seconds
      });
      
      // In a real implementation, you would call an API to send an email here
      // This is a simulated email for the testing implementation
      if (userEmail) {
        console.log(`[TEST MODE] Email would be sent to ${userEmail} with subject: "${title}" and body: "${message}"`);
        
        // In real implementation, this would be:
        // sendEmail(userEmail, title, message);
      }
      
      // Store that we sent a notification today so we don't send multiples
      sessionStorage.setItem('last_weekly_notification', today.toDateString());
    }
    
    // For non-test mode, check every hour
    if (!testMode) {
      const checkInterval = setInterval(() => {
        shouldCheckForNotification();
      }, 60 * 60 * 1000); // Check every hour
      
      return () => clearInterval(checkInterval);
    }
    
  }, [checkInDates, userId, userEmail, testMode, hasShownTestNotification]);
  
  // This is a background component with no UI
  return null;
} 