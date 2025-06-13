import { useEffect, useState, useContext } from 'react';
import { Calendar, Bell, ChevronRight } from 'lucide-react';
import { AuthContext } from '@/contexts/authContext';
import { availabilityService } from '@/services/mood-mentor/availability.service';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Activity {
  id: string;
  title: string;
  created_at: string;
  activity_type: string;
  mentor_name?: string;
  patient_name?: string;
}

interface RecentActivity {
  id: string;
  title: string;
  time: string;
  icon: React.ReactNode;
  iconBgClass: string;
  iconColorClass: string;
}

export default function MoodMentorDashboard() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);

  // Format the activity time in a user-friendly way
  const formatActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);
    
    if (diffMin < 60) {
      return `${diffMin} min ago`;
    } else if (diffMin < 1440) {
      const hours = Math.floor(diffMin / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return format(date, 'MMM d, yyyy');
    }
  };

  const fetchRecentActivities = async () => {
    if (!authContext?.user) return;
    
    setActivitiesLoading(true);
    try {
      const activities = await availabilityService.getActivities(authContext.user.id, 'mentor');
      
      if (!activities || activities.length === 0) {
        setRecentActivities([]);
        setHasMoreActivities(false);
      } else {
        // Map the activity data to our UI format
        const formattedActivities = activities.slice(0, 3).map((activity: Activity) => {
          let icon, iconBgClass, iconColorClass;
          
          // Set the appropriate icon and styles based on activity type
          switch (activity.activity_type) {
            case 'appointment':
              icon = <Calendar className="h-4 w-4" />;
              iconBgClass = 'bg-blue-100';
              iconColorClass = 'text-blue-600';
              break;
            default:
              icon = <Bell className="h-4 w-4" />;
              iconBgClass = 'bg-gray-100';
              iconColorClass = 'text-gray-600';
          }
          
          return {
            id: activity.id,
            title: activity.title,
            time: formatActivityTime(activity.created_at),
            icon,
            iconBgClass,
            iconColorClass
          };
        });
        
        setRecentActivities(formattedActivities);
        // Set hasMoreActivities to true if we got exactly 3 activities (meaning there might be more)
        setHasMoreActivities(activities.length >= 3);
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setRecentActivities([]);
      setHasMoreActivities(false);
    } finally {
      setActivitiesLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentActivities();
  }, [authContext?.user]);

  const handleViewAllClick = () => {
    navigate('/mood-mentor-dashboard/activities');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Recent Activity</h3>
        {hasMoreActivities && (
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            onClick={handleViewAllClick}
          >
            View All
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
      
      {activitiesLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start animate-pulse">
              <div className="w-8 h-8 rounded-full bg-gray-200 mr-4"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : recentActivities.length > 0 ? (
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start">
              <div className={`w-8 h-8 rounded-full ${activity.iconBgClass} ${activity.iconColorClass} flex items-center justify-center mr-4 flex-shrink-0`}>
                {activity.icon}
              </div>
              <div>
                <p className="text-sm text-gray-900">{activity.title}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <Bell className="mx-auto h-10 w-10 text-gray-400 mb-2" />
          <h3 className="text-sm font-medium text-gray-900">No recent activity</h3>
          <p className="text-sm text-gray-500 mt-1">
            Your activity feed will show up here
          </p>
        </div>
      )}
    </div>
  );
} 