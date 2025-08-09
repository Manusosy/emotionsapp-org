import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/authContext"; // Import useAuth hook

export default function NotFound() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole } = useAuth(); // Use the useAuth hook
  
  // Handle navigation based on context
  useEffect(() => {
    // If we're in a dashboard context, keep the user there
    const path = location.pathname;
    const isDashboardPath = path.includes('/patient-dashboard') || path.includes('/mood-mentor-dashboard');
    
    if (isDashboardPath) {
      // Extract the dashboard base path
      const dashboardBase = path.includes('/patient-dashboard') 
        ? '/patient-dashboard'
        : '/mood-mentor-dashboard';
      
      // Temporarily disabled for debugging 404 issues
      // const timer = setTimeout(() => {
      //   // Navigate back in history
      //   navigate(-1);
      // }, 3000);
      // return () => clearTimeout(timer);
    }
  }, [location.pathname, navigate, userRole]);
  
  // Get appropriate dashboard link based on user role
  const getDashboardLink = () => {
    if (userRole === 'mood_mentor') {
      return '/mood-mentor-dashboard';
    } else {
      return '/patient-dashboard';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-gray-50">
      <div className="space-y-6 max-w-md">
        <h1 className="text-6xl font-bold text-blue-600">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800">Page Not Found</h2>
        <p className="text-gray-600">
          The page you are looking for doesn't exist or has been moved.
          {location.pathname.includes('dashboard') && (
            " You'll be redirected back to your previous page automatically in a few seconds."
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="outline" asChild>
            <Link to={getDashboardLink()}>
              {location.pathname.includes('patient-dashboard') 
                ? 'Patient Dashboard' 
                : location.pathname.includes('mood-mentor-dashboard')
                  ? 'Mood Mentor Dashboard'
                  : 'Home'}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
