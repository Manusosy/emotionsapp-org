import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/authContext';
import { toast } from 'sonner';

export default function Navbar() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, signOut, userRole } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  // User role checks
  const isMentor = userRole === 'mood_mentor';
  const isPatient = !isMentor;

  // Close mobile menu on location change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Debug output for auth state
  useEffect(() => {
    console.log('Navbar auth state:', { 
      isAuthenticated, 
      userRole
    });
  }, [isAuthenticated, userRole]);

  // Cleanup function for a complete signout
  const performCompleteSignout = async () => {
    try {
      setIsSigningOut(true);
      document.body.classList.add('signing-out');
      
      try {
        await signOut(); // Rely on AuthContext signOut
      } catch (error) {
        console.error("Background signout error:", error);
      }
      
      console.log('Navbar: signOut complete. Redirecting to home.');
      window.location.href = '/'; // Hard redirect after signOut
      
    } catch (error) {
      console.error("Complete signout failed:", error);
      
      // Emergency fallback if something goes wrong
      toast.error("Something went wrong during sign out. Please refresh the page.");
      
      // Force a page reload as last resort
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleSignout = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Prevent double-clicks
    if (isSigningOut) return;
    
    console.log("Starting signout from navbar...");
    performCompleteSignout();
  };

  // Handle dashboard navigation with proper role checks
  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    let targetPath = '/patient-signin';
    
    if (isAuthenticated && userRole) {
      if (userRole === 'mood_mentor') {
        targetPath = '/mood-mentor-dashboard';
      } else if (userRole === 'patient') {
        targetPath = '/patient-dashboard';
      } else {
        console.log('Navbar: Unknown user role, redirecting to default signin');
        targetPath = '/patient-signin'; // Default fallback
      }
      console.log(`Navbar: User is authenticated with role ${userRole}, navigating to ${targetPath}`);
    } else {
      console.log('Navbar: User not authenticated or no role, redirecting to signin');
      targetPath = '/patient-signin';
    }
    
    console.log(`Navbar: Navigating to ${targetPath}`);
    // navigate(targetPath); // Prefer soft navigation if possible
    window.location.href = targetPath; // Kept hard navigation as per original logic, but soft is usually better
  };

  // Enhanced navigation handler that closes menu and handles navigation
  const handleNavigation = useCallback((path: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    setMobileMenuOpen(false);
    navigate(path);
  }, [navigate]);

  // Toggle menu state
  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  // Determine profile target path based on user role
  const getProfilePath = () => {
    if (isMentor) {
      return '/mood-mentor-dashboard/profile'; // Mentor dashboard profile
    } else {
      return '/patient-dashboard/profile'; // Patient dashboard profile
    }
  };

  return (
    <nav className="bg-[#0078FF] text-white relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link 
            to="/" 
            onClick={(e) => handleNavigation('/', e)} 
            className="flex items-center"
          >
            <img 
              src="/assets/emotions-app-logo.png" 
              alt="Emotions Logo" 
              className="h-7 md:h-9 relative"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center">
            <div className="flex items-center space-x-1 bg-blue-600/30 backdrop-blur-sm rounded-full px-2 py-1.5">
              <Link to="/" className="text-white/90 hover:text-white px-4 py-1.5 rounded-full transition-all hover:bg-[#fda802] text-sm font-medium">
                Home
              </Link>
              <Link to="/journal" className="text-white/90 hover:text-white px-4 py-1.5 rounded-full transition-all hover:bg-[#fda802] text-sm font-medium">
                Journal
              </Link>
              <Link to="/mood-mentors" className="text-white/90 hover:text-white px-4 py-1.5 rounded-full transition-all hover:bg-[#fda802] text-sm font-medium">
                Mood Mentors
              </Link>
              <Link to="/resources" className="text-white/90 hover:text-white px-4 py-1.5 rounded-full transition-all hover:bg-[#fda802] text-sm font-medium">
                Resource Center
              </Link>
              <Link to="/help-groups" className="text-white/90 hover:text-white px-4 py-1.5 rounded-full transition-all hover:bg-[#fda802] text-sm font-medium">
                Help Groups
              </Link>
            </div>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-2">
            {isAuthenticated ? (
              <>
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-[#fda802] rounded-full px-6 font-medium transition-all"
                  onClick={handleDashboardClick}
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
                <Button 
                  id="signout-button"
                  variant="ghost" 
                  onClick={handleSignout}
                  disabled={isSigningOut}
                  className="text-white hover:bg-[#fda802] rounded-full px-6 font-medium transition-all"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isSigningOut ? 'Signing out...' : 'Sign out'}
                </Button>
              </>
            ) : (
              <>
                <Link to="/patient-signin">
                  <Button 
                    variant="ghost" 
                    className="text-white hover:bg-[#fda802] rounded-full px-6 font-medium transition-all"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/patient-signup">
                  <Button 
                    className="bg-white text-[#0078FF] hover:bg-[#fda802] hover:text-white rounded-full px-6 font-medium shadow-sm shadow-blue-600/20 transition-all"
                  >
                    Signup
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Auth Buttons */}
          <div className="flex md:hidden items-center space-x-4 mr-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleDashboardClick}
                  className="text-white hover:bg-[#fda802] rounded-full font-medium transition-all flex items-center"
                >
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  <span className="text-xs">Dashboard</span>
                </Button>
                <Button 
                  id="signout-button-mobile"
                  variant="ghost" 
                  size="sm"
                  onClick={handleSignout}
                  disabled={isSigningOut}
                  className="text-white hover:bg-[#fda802] rounded-full font-medium transition-all flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  <span className="text-xs">{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
                </Button>
              </div>
            ) : (
              <>
                <a 
                  href="/patient-signin" 
                  className="text-white hover:text-blue-100 font-medium px-3 py-1.5 text-base transition-colors"
                  onClick={(e) => handleNavigation("/patient-signin", e)}
                >
                  Sign In
                </a>
                <a 
                  href="/patient-signup" 
                  onClick={(e) => handleNavigation("/patient-signup", e)}
                >
                  <Button 
                    size="sm"
                    className="bg-white text-[#0078FF] hover:bg-[#fda802] hover:text-white rounded-full px-5 py-1 font-medium shadow-sm shadow-blue-600/20 transition-all"
                  >
                    Signup
                  </Button>
                </a>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-blue-600/50 transition-colors"
            onClick={toggleMobileMenu}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            <a href="/" className="block px-4 py-2 hover:bg-[#fda802] rounded-lg transition-colors" onClick={(e) => handleNavigation("/", e)}>
              Home
            </a>
            <a href="/journal" className="block px-4 py-2 hover:bg-[#fda802] rounded-lg transition-colors" onClick={(e) => handleNavigation("/journal", e)}>
              Journal
            </a>
            <a href="/mood-mentors" className="block px-4 py-2 hover:bg-[#fda802] rounded-lg transition-colors" onClick={(e) => handleNavigation("/mood-mentors", e)}>
              Mood Mentors
            </a>
            <a href="/resources" className="block px-4 py-2 hover:bg-[#fda802] rounded-lg transition-colors" onClick={(e) => handleNavigation("/resources", e)}>
              Resource Center
            </a>
            <a href="/help-groups" className="block px-4 py-2 hover:bg-[#fda802] rounded-lg transition-colors" onClick={(e) => handleNavigation("/help-groups", e)}>
              Help Groups
            </a>
            
            {/* Mobile Menu Auth Buttons */}
            <div className="py-2 border-t border-blue-600/20">
              {isAuthenticated ? (
                <>
                  <button 
                    className="w-full text-left px-4 py-2 hover:bg-[#fda802] rounded-lg transition-colors"
                    onClick={handleDashboardClick}
                  >
                    <span className="flex items-center">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </span>
                  </button>
                  <button 
                    onClick={handleSignout}
                    disabled={isSigningOut}
                    className="w-full text-left px-4 py-2 hover:bg-[#fda802] rounded-lg transition-colors"
                  >
                    <span className="flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      {isSigningOut ? 'Signing out...' : 'Sign out'}
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <a href="/patient-signin" className="block px-4 py-2 hover:bg-[#fda802] rounded-lg transition-colors" onClick={(e) => handleNavigation("/patient-signin", e)}>
                    Sign In
                  </a>
                  <a href="/patient-signup" className="block px-4 py-2 hover:bg-[#fda802] rounded-lg transition-colors" onClick={(e) => handleNavigation("/patient-signup", e)}>
                    Signup
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
