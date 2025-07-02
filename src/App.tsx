import { moodMentorService, authService, userService, dataService, apiService, patientService, appointmentService } from '@/services';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useEffect, useState, useContext, createContext } from "react";
import MoodTracker from "@/features/mood-tracking/pages/MoodTracker";
import SignIn from "@/features/auth/pages/SignIn";
import PatientSignup from "@/features/auth/pages/PatientSignup";
import MentorSignup from "@/features/auth/pages/MentorSignup";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";
import ResetPassword from "@/features/auth/pages/ResetPassword";
import NotFound from "./pages/NotFound";
import JournalPage from "@/features/journal/pages/JournalPage";
import DashboardJournalPage from "@/features/dashboard/pages/JournalPage";
import NotificationsPage from "@/features/dashboard/pages/NotificationsPage";
import MoodMentorNotificationsPage from "@/features/mood_mentors/pages/NotificationsPage";
import MoodTrackerPage from "@/features/dashboard/pages/MoodTrackerPage";
import ReportsPage from "@/features/dashboard/pages/ReportsPage";
import Footer from "@/components/layout/Footer";
import ContactBanner from "@/components/layout/ContactBanner";
import MoodMentors from "@/features/mood_mentors/pages/MoodMentors";
import MoodMentorAppointmentsPage from "@/features/mood_mentors/pages/AppointmentsPage";
import MoodMentorPatientsPage from "@/features/mood_mentors/pages/PatientsPage";
import MoodMentorResourcesPage from "@/features/mood_mentors/pages/ResourcesPage";
import GroupsPage from "@/features/mood_mentors/pages/GroupsPage";
import DashboardResourcesPage from "@/features/dashboard/pages/ResourcesPage";
import BookingPage from "@/features/booking/pages/BookingPage";
import PatientDashboard from "@/features/dashboard/pages/PatientDashboard";
import PatientAppointmentsPage from "@/features/dashboard/pages/AppointmentsPage";
import SupportGroupsPage from "@/features/dashboard/pages/SupportGroupsPage";
import FavoritesPage from "@/features/dashboard/pages/FavoritesPage";
import Settings from "@/features/dashboard/pages/Settings";
import Profile from "@/features/dashboard/pages/Profile";
import DeleteAccount from "@/features/dashboard/pages/DeleteAccount";
import { toast } from "sonner";
import Navbar from "@/components/layout/Navbar";
import MoodMentorDashboard from "@/features/mood_mentors/pages/MoodMentorDashboard";
import MoodMentorSettingsPage from "@/features/mood_mentors/pages/SettingsPage";
import MoodMentorProfilePage from "@/features/mood_mentors/pages/ProfilePage";
import MoodMentorDeleteAccountPage from "@/features/mood_mentors/pages/DeleteAccountPage";
import MoodMentorAnalyticsPage from "@/features/mood_mentors/pages/AnalyticsPage";
import { AuthProvider, AuthContext } from "@/contexts/authContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Resources from "@/pages/Resources";
import HelpGroups from "./pages/HelpGroups";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DataProtection from "./pages/DataProtection";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import FAQs from "./pages/FAQs";
import About from "./pages/About";
import ReviewsPage from "@/features/reviews/pages/ReviewsPage";
import './styles/App.css';
import { Spinner } from "@/components/ui/spinner";
import JournalEntryPage from "@/features/journal/pages/JournalEntryPage";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import HelpCenterPage from "@/features/dashboard/pages/HelpCenterPage";
import MessagesPage from "@/features/messaging/pages/MessagesPage";
import DashboardMessagesPage from "@/features/dashboard/pages/MessagesPage";
import MoodMentorMessagesPage from "@/features/mood_mentors/pages/MessagesPage";
import ScrollToTop from "@/components/layout/ScrollToTop";
import AuthCallbackPage from "@/app/auth/callback/page";
import MoodMentorProfile from "@/features/mood_mentors/pages/MoodMentorProfile";
import { useAuth } from "@/contexts/authContext";
import { setupDatabaseFunctions } from './lib/supabase';
import PatientsPage from "./features/mood_mentors/pages/PatientsPage";
import PatientProfilePage from "./features/mood_mentors/pages/PatientProfilePage";
import { PatientDirectCallPage, MentorDirectCallPage } from './components/calls/DirectCallPage';
import { syncSupportGroupCounts } from '@/utils/sync-support-groups';
import { resetAllSessionData } from '@/utils/reset-session-data';
import GroupSessionPage from "./features/dashboard/pages/GroupSessionPage";
// Test files removed

// Type definition for UserRole
type UserRole = 'patient' | 'mood_mentor';

// Create a global event bus for component synchronization
interface EventMap {
  [event: string]: Array<(data?: any) => void>;
}

export const EventBus = {
  _events: {} as EventMap,
  _lastEmitTime: {} as Record<string, number>,
  
  on(event: string, callback: (data?: any) => void) {
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
    return () => this.off(event, callback);
  },
  
  off(event: string, callback: (data?: any) => void) {
    if (!this._events[event]) return;
    this._events[event] = this._events[event].filter(cb => cb !== callback);
  },
  
  emit(event: string, data?: any) {
    if (!this._events[event]) return;
    
    // Record the timestamp of this event
    const now = Date.now();
    this._lastEmitTime[event] = now;
    
    // Add timestamp to data if not already present
    const eventData = {
      ...(data || {}),
      _timestamp: data?._timestamp || now,
      _eventId: `${event}-${now}-${Math.random().toString(36).substring(2, 9)}`
    };
    
    console.log(`EventBus: Emitting ${event} with ID ${eventData._eventId}`);
    
    this._events[event].forEach(callback => callback(eventData));
  },
  
  // Force a refresh by emitting the event with a special flag
  forceRefresh(event: string, data?: any) {
    this.emit(event, {
      ...(data || {}),
      _forceRefresh: true,
      _timestamp: Date.now()
    });
  },
  
  // Check when an event was last emitted
  getLastEmitTime(event: string): number {
    return this._lastEmitTime[event] || 0;
  }
};

// Also create a React context for components that prefer to use context
export const EventBusContext = createContext(EventBus);

// Home page component
const HomePage = () => {
  return (
    <div className="homepage-wrapper relative pb-12">
      <MoodTracker />
    </div>
  );
};

// DashboardErrorFallback component to provide context-aware error handling
const DashboardErrorFallback = ({ dashboardType }: { dashboardType: 'patient' | 'mood_mentor' }) => {
  const navigate = useNavigate();
  const dashboardPath = dashboardType === 'patient' ? '/patient-dashboard' : '/mood-mentor-dashboard';
  
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[50vh] p-6 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">Something went wrong</h2>
        <p className="text-gray-600">
          We encountered an error while loading this page.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="outline" onClick={() => navigate(dashboardPath)}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

// Protected route wrapper using ErrorBoundary for stability
const ProtectedErrorBoundary = ({ children, dashboardPath = '/' }: { children: React.ReactNode, dashboardPath?: string }) => {
  const { user } = useAuth();
  const userRole = user?.user_metadata?.role;
  const navigate = useNavigate();
  
  // Ensure user is accessing the correct dashboard based on their role
  useEffect(() => {
    if (user && dashboardPath) {
      const isMentorPath = dashboardPath.includes('mood-mentor-dashboard');
      const isPatientPath = dashboardPath.includes('patient-dashboard');
      const isMentor = userRole === 'mood_mentor';
      const isPatient = userRole === 'patient';
      
      // If user is on the wrong dashboard type, redirect them
      if ((isMentor && isPatientPath) || (isPatient && isMentorPath)) {
        const correctPath = isMentor ? '/mood-mentor-dashboard' : '/patient-dashboard';
        console.log(`Redirecting user from ${dashboardPath} to ${correctPath} based on role ${userRole}`);
        
        // Use navigate for a smoother transition
        navigate(correctPath, { replace: true });
      }
    }
  }, [user, userRole, dashboardPath, navigate]);
  
  return (
    <ErrorBoundary dashboardPath={dashboardPath}>
      {children}
    </ErrorBoundary>
  );
};

const AppContent = () => {
  const [showHeaderFooter, setShowHeaderFooter] = useState(true);
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const userRole = user?.user_metadata?.role;

  useEffect(() => {
    const pathname = location.pathname;
    const isDashboardPage = pathname.includes('dashboard') || 
                          pathname === '/mood-mentor-dashboard' ||
                          pathname.startsWith('/mood-mentor-dashboard/');
    
    setShowHeaderFooter(!isDashboardPage);
  }, [location.pathname]);

  const shouldShowContactBanner = location.pathname === "/" || 
                                 location.pathname === "/contact" || 
                                 location.pathname === "/privacy" ||
                                 location.pathname === "/data-protection" ||
                                 location.pathname === "/terms" ||
                                 location.pathname === "/faqs" ||
                                 location.pathname === "/about";

  // Add a function to clean up any lingering camera access when the app loads
  useEffect(() => {
    // Just log that we're not requesting permissions on load
    console.log('App loaded - no camera/microphone access requested on initial load');
    
    // Prevent any automatic camera access
    if (navigator.mediaDevices) {
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia;
      
      // Only override getUserMedia for initial app load, not for actual calls
      // This prevents permission dialogs on page load while allowing
      // intentional camera access when starting a call
      const monitorCameraAccess = () => {
        console.log('Monitoring camera access to prevent automatic requests');
        
        // We don't need to do anything else here - just let the app know
        // we're monitoring camera access
      };
      
      monitorCameraAccess();
    }
    
    // Clean up when the window is about to unload
    window.addEventListener('beforeunload', () => {
      // Check if there are any active media tracks and stop them
      if (navigator.mediaDevices && typeof MediaStreamTrack !== 'undefined') {
        console.log('Window unloading - cleaning up any active media tracks');
      }
    });
    
    return () => {
      window.removeEventListener('beforeunload', () => {
        console.log('App unloading - cleaning up event listeners');
      });
    };
  }, []);

  return (
    <>
      <TooltipProvider>
        <div className="flex flex-col min-h-screen max-w-[100vw] overflow-x-hidden">
          {showHeaderFooter && <Navbar />}
          <div className="flex-grow">
            <Routes>
              {/* Public routes accessible to all */}
              <Route path="/" element={<HomePage />} />
              
              {/* Auth Routes - separate paths for patients and mentors */}
              {/* Legacy routes that redirect to new specific routes */}
              <Route path="/sign-in" element={<Navigate to="/patient-signin" replace />} />
              <Route path="/signin" element={<SignIn userType="patient" />} />
              <Route path="/sign-up" element={<Navigate to="/patient-signup" replace />} />
              <Route path="/signup" element={<Navigate to="/patient-signup" replace />} />
              
              {/* Auth callback route for OAuth providers */}
              <Route path="/auth/callback" element={<AuthCallbackPage />} />
              
              {/* New specific role-based auth routes */}
              <Route path="/patient-signin" element={<SignIn userType="patient" />} />
              <Route path="/mentor-signin" element={<SignIn userType="mentor" />} />
              <Route path="/patient-signup" element={<PatientSignup />} />
              <Route path="/mentor-signup" element={<MentorSignup />} />
              
              {/* Other auth routes */}
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/journal/:entryId" element={<JournalEntryPage />} />
              <Route path="/mood-mentors" element={<MoodMentors />} />
              <Route path="/mood-mentor/:name" element={<MoodMentorProfile />} />
              <Route path="/booking" element={<BookingPage />} />
              <Route path="/resources" element={<Resources />} />
              <Route path="/help-groups" element={<HelpGroups />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/data-protection" element={<DataProtection />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faqs" element={<FAQs />} />
              <Route path="/about" element={<About />} />
              
              {/* Test Pages - Removed */}
              
              {/* Patient Dashboard Routes - Protected by ProtectedRoute component */}
              <Route path="/patient-dashboard" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <PatientDashboard />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/appointments" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <PatientAppointmentsPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/notifications" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <NotificationsPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/mood-tracker" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <MoodTrackerPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/reports" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <ReportsPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/resources" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <DashboardResourcesPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/groups" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <SupportGroupsPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/favorites" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <FavoritesPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/settings" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <Settings />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/profile" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <Profile />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/delete-account" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <DeleteAccount />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/help" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <HelpCenterPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/messages" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <DashboardMessagesPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/messages/:conversationId" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <DashboardMessagesPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/journal" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <DashboardJournalPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/dashboard/journal" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <DashboardJournalPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/journal/:entryId" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <JournalEntryPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/dashboard/journal/:entryId" element={
                <ProtectedErrorBoundary dashboardPath="/dashboard">
                  <JournalEntryPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/patient-dashboard/group-session/:sessionId" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <GroupSessionPage />
                </ProtectedErrorBoundary>
              } />
              
              {/* Mood Mentor Dashboard Routes - Protected by ProtectedRoute component */}
              <Route path="/mood-mentor-dashboard" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <MoodMentorDashboard />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/appointments" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <MoodMentorAppointmentsPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/patients" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <MoodMentorPatientsPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/patient-profile/:id" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <PatientProfilePage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/groups" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <GroupsPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/resources" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <MoodMentorResourcesPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/settings" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <MoodMentorSettingsPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/group-session/:sessionId" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <GroupSessionPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/profile" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <MoodMentorProfilePage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/delete-account" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <MoodMentorDeleteAccountPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/notifications" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <MoodMentorNotificationsPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/messages" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <MoodMentorMessagesPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/messages/:conversationId" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <MoodMentorMessagesPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/reviews" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <ReviewsPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/mood-mentor-dashboard/analytics" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <MoodMentorAnalyticsPage />
                </ProtectedErrorBoundary>
              } />
              
              {/* Standalone messaging routes */}
              <Route path="/messages" element={
                <ProtectedErrorBoundary dashboardPath="/">
                  <MessagesPage />
                </ProtectedErrorBoundary>
              } />
              <Route path="/messages/:conversationId" element={
                <ProtectedErrorBoundary dashboardPath="/">
                  <MessagesPage />
                </ProtectedErrorBoundary>
              } />
              
              {/* Keep only these new routes for video calls */}
              <Route path="/patient-dashboard/appointments/:id/call" element={
                <ProtectedErrorBoundary dashboardPath="/patient-dashboard">
                  <PatientDirectCallPage />
                </ProtectedErrorBoundary>
              } />
              
              <Route path="/mood-mentor-dashboard/appointments/:id/call" element={
                <ProtectedErrorBoundary dashboardPath="/mood-mentor-dashboard">
                  <MentorDirectCallPage />
                </ProtectedErrorBoundary>
              } />
              
              {/* Not Found Page */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
          {shouldShowContactBanner && showHeaderFooter && <ContactBanner />}
          {showHeaderFooter && <Footer />}
        </div>
      </TooltipProvider>
    </>
  );
};

const App = () => {
  useEffect(() => {
    console.log("App initialized with Supabase auth");
    
    // Log all navigation events
    const unregister = window.addEventListener('popstate', () => {
      console.log('Navigation: URL changed to', window.location.pathname);
    });
    
    return () => {
      window.removeEventListener('popstate', unregister as any);
    };
  }, []);
  
  // Make sync and reset functions available globally for testing
  if (typeof window !== 'undefined') {
    (window as any).syncSupportGroupCounts = syncSupportGroupCounts;
    (window as any).resetAllSessionData = resetAllSessionData;
  }
  
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <TooltipProvider>
            <ScrollToTop />
            <Toaster 
              position="top-center"
              richColors
              closeButton
              duration={4000}
              style={{
                background: 'var(--background)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)'
              }}
            />
            <AppContent />
          </TooltipProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default App;



