import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "@/hooks/use-auth";
import { Mail, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface SignInProps {
  userType: 'patient' | 'mentor';
}

export default function SignIn({ userType }: SignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const { signIn, isAuthenticated, user, getDashboardUrlForRole } = useAuth();
  const userRole = user?.user_metadata?.role;
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirectTo');
  
  // Get state from location or use query params
  const state = location.state as { 
    from?: string, 
    returnToJournal?: boolean,
    message?: string,
    email?: string,
    confirmationSuccess?: boolean 
  } | null;
  
  const returnToJournal = state?.returnToJournal;
  const signupMessage = state?.message;
  const signupEmail = state?.email;
  const confirmationSuccess = state?.confirmationSuccess;

  useEffect(() => {
    if (confirmationSuccess) {
      setSuccessMessage("Email confirmed successfully! Please sign in to continue.");
      
      // If we have an email from the confirmation, pre-fill it
      if (signupEmail) {
        setEmail(signupEmail);
      }
      
      // Clear the success state from history so refreshing doesn't show it again
      window.history.replaceState(
        {}, 
        document.title,
        window.location.pathname
      );
    }
  }, [confirmationSuccess, signupEmail]);

  // If already authenticated, redirect to appropriate destination
  if (isAuthenticated) {
    // If coming from journal with returnToJournal flag, go back to journal
    if (returnToJournal) {
      return <Navigate to="/journal" replace />;
    }
    
    // Otherwise use normal redirect logic
    const fromPath = state?.from;
    const dashboardUrl = getDashboardUrlForRole(userRole);
    return <Navigate to={redirectTo || fromPath || dashboardUrl} replace />;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // First, check if there's a user with this email to provide a better error message
      const { data: authData, error: checkError } = await supabase
        .from(userType === 'mentor' ? 'mood_mentor_profiles' : 'patient_profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      // If we couldn't find the user in the right profile table, they might be using the wrong signin form
      if (!authData && !checkError) {
        const otherType = userType === 'mentor' ? 'patient' : 'mentor';
        const { data: otherAuthData } = await supabase
          .from(otherType === 'mentor' ? 'mood_mentor_profiles' : 'patient_profiles')
          .select('id')
          .eq('email', email)
          .maybeSingle();
          
        if (otherAuthData) {
          const errorMessage = userType === 'mentor' 
            ? "This email is registered as a patient. Please use the Patient sign in."
            : "This email is registered as a mood mentor. Please use the Mentor sign in.";
          setError(errorMessage);
          toast.error(errorMessage);
          return;
        }
      }
      
      // Proceed with the actual sign in attempt
      const response = await signIn({ email, password });
      
      if (response.error) {
        // Handle specific error cases
        if (response.error.includes('Invalid login credentials')) {
          setError("Incorrect email or password. Please try again.");
        } else if (response.error.includes('Email not confirmed')) {
          setError("Please verify your email address before signing in.");
        } else {
          setError(response.error);
        }
        toast.error(response.error);
        return;
      }
      
      if (response.user) {
        // Check if user role matches the expected type
        const expectedRole = userType === 'mentor' ? 'mood_mentor' : 'patient';
        const userRole = response.user.user_metadata?.role;
        
        if (userRole !== expectedRole) {
          const errorMessage = userType === 'mentor' 
            ? "This login is only for Mood Mentors. Please use the Patient login if you're a patient."
            : "This login is only for Patients. Please use the Mood Mentor login if you're a mentor.";
          setError(errorMessage);
          toast.error(errorMessage);
          
          // Sign out the user since they're using the wrong form
          await supabase.auth.signOut();
          return;
        }
        
        toast.success("Signed in successfully!");
        
        // Handle navigation based on returnToJournal flag
        if (returnToJournal) {
          navigate('/journal', { replace: true });
        }
        // Component will otherwise re-render and redirect due to isAuthenticated changing
      } else {
        const unknownErrorMsg = "Sign in attempt completed with no user and no error.";
        setError(unknownErrorMsg);
        toast.error("An unexpected issue occurred during sign in.");
      }
    } catch (error: any) {
      const errorMsg = error.message || "An unexpected server error occurred.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      // Get the current domain (works for both localhost and production)
      const domain = window.location.origin;
      
      // Explicitly set userType and isSignUp=false to ensure proper role checking
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${domain}/auth/callback?userType=${userType}&isSignUp=false`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) {
        toast.error(error.message);
      }
    } catch (error: any) {
      toast.error("Failed to sign in with Google");
      console.error("Google sign-in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const title = userType === 'mentor' ? 'Mood Mentor Sign In' : 'Patient Sign In';
  const subtitle = userType === 'mentor' 
    ? 'Enter your credentials below to access your Mentor dashboard'
    : 'Enter your credentials below to access your personal dashboard';

  return (
    <AuthLayout
      title={title}
      subtitle={subtitle}
      formType={userType}
    >
      {successMessage && (
        <div className="mb-4 p-4 bg-emerald-50 text-emerald-700 rounded-md text-sm border border-emerald-200">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Success!</p>
              <p>{successMessage}</p>
            </div>
          </div>
        </div>
      )}
      
      {signupMessage && !successMessage && (
        <div className="mb-4 p-4 bg-blue-50 text-blue-700 rounded-md text-sm border border-blue-200">
          <div className="flex items-start space-x-2">
            <Mail className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Email Confirmation Required</p>
              <p className="mt-1">{signupMessage}</p>
              {signupEmail && (
                <p className="mt-1 text-blue-600">
                  Check your inbox at <strong>{signupEmail}</strong>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <form className="space-y-6 w-full" onSubmit={handleSignIn}>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="pl-10"
              required
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="pl-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          size="lg"
          disabled={isLoading || !email || !password}
        >
          {isLoading ? "Signing In..." : "Sign In"}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link to={userType === 'mentor' ? "/mentor-signup" : "/patient-signup"} className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
        
        <p className="text-center text-sm text-gray-600">
          {userType === 'mentor' ? 'Are you a Patient?' : 'Are you a Mood Mentor?'}{" "}
          <Link to={userType === 'mentor' ? "/patient-signin" : "/mentor-signin"} className="text-blue-600 hover:underline">
            Sign in here
          </Link>
        </p>
      </form>
      
      <div className="mt-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with</span>
          </div>
        </div>
        
        <Button 
          type="button" 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 py-5"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="w-5 h-5" 
          />
          Sign in with Google
        </Button>
      </div>
    </AuthLayout>
  );
}