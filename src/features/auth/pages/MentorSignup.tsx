import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import AuthLayout from "../components/AuthLayout";
import { mentorCountries } from "../utils/mentor-countries";
import { UserPlus, Eye, EyeOff, Mail, Key, AlertCircle } from "lucide-react";
import { UserRole } from "@/types/user";
import { AuthContext } from "@/contexts/authContext";
import { supabase } from "@/lib/supabase";

const roleInfo = {
  mood_mentor: {
    title: "Mood Mentor",
    description: "Join our network of mental health advocates dedicated to providing support and raising awareness.",
  }
};

const specialties = [
  { id: "anxiety", name: "Anxiety" },
  { id: "depression", name: "Depression" },
  { id: "stress", name: "Stress Management" },
  { id: "grief", name: "Grief Counseling" },
  { id: "trauma", name: "Trauma Recovery" },
  { id: "relationships", name: "Relationship Counseling" },
  { id: "addiction", name: "Addiction Support" },
  { id: "general", name: "General Mental Health" },
  { id: "youth", name: "Youth Counseling" },
  { id: "career", name: "Career Counseling" },
];

type ValidationErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  country?: string;
  gender?: string;
  specialty?: string;
  terms?: string;
};

export default function MentorSignup() {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("Auth context must be used within AuthProvider");
  const { signUp } = auth;
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    country: "",
    gender: "",
    specialty: "",
    role: "mood_mentor" as UserRole,
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    // Validate email
    if (!formData.email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
      isValid = false;
    }

    // Validate password
    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    // Validate country
    if (!formData.country) {
      newErrors.country = "Country is required";
      isValid = false;
    } else {
      // Ensure country is in the allowed list
      const isAllowedCountry = mentorCountries.some(country => country.code === formData.country);
      if (!isAllowedCountry) {
        newErrors.country = "Mood Mentor positions are only available in Kenya, Uganda, Rwanda, Sierra Leone, and Ghana";
        isValid = false;
      }
    }

    // Validate gender - required for mentors
    if (!formData.gender) {
      newErrors.gender = "Gender is required for mood mentors";
      isValid = false;
    }
    
    // Validate specialty - required for mentors
    if (!formData.specialty) {
      newErrors.specialty = "Specialty is required for mood mentors";
      isValid = false;
    }

    // Validate terms agreement
    if (!agreedToTerms) {
      newErrors.terms = "You must agree to the terms and privacy policy";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    try {
      // Register the user
      const { user, error } = await signUp({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: 'mood_mentor',
        country: formData.country,
        gender: formData.gender
      });

      if (error) {
        // Handle specific error cases
        if (error.includes('already registered')) {
          toast.error("This email is already registered. Please sign in instead.");
          setErrors({
            ...errors,
            email: "Email already registered"
          });
        } else {
          toast.error(error);
        }
        setIsLoading(false);
        return;
      }

      if (user) {
        toast.success("Account created successfully! Please check your email to verify your account.");
        setIsLoading(false); // Add this line to reset loading state
        // Navigate to email confirmation instructions page
        navigate('/auth/email-sent', { 
          state: { 
            email: formData.email,
            userType: 'mentor'
          } 
        });
      } else {
        toast.error("Failed to create account. Please try again.");
        setIsLoading(false);
      }
    } catch (error: any) {
      toast.error(error.message || "Error creating account");
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setIsLoading(true);
      // Get the current domain (works for both localhost and production)
      const domain = window.location.origin;
      
      // Explicitly set userType=mentor and isSignUp=true to ensure proper role assignment
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${domain}/auth/callback?userType=mentor&isSignUp=true`,
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
      toast.error("Failed to sign up with Google");
      console.error("Google sign-up error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout formType="mentor">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">Create a Mood Mentor Account</h1>
        <p className="text-sm text-muted-foreground mt-1">Join our network of mental health professionals dedicated to providing support and raising awareness.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) {
                    setErrors({ ...errors, email: undefined });
                  }
                }}
                required
                disabled={isLoading}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password) {
                    setErrors({ ...errors, password: undefined });
                  }
                }}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                className={`pl-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  if (errors.confirmPassword) {
                    setErrors({ ...errors, confirmPassword: undefined });
                  }
                }}
                required
                disabled={isLoading}
              />
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-red-500">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={(value) => {
                  setFormData({ ...formData, gender: value });
                  if (errors.gender) {
                    setErrors({ ...errors, gender: undefined });
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger id="gender" className={errors.gender ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-xs text-red-500">{errors.gender}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="country">Country</Label>
              <Select
                value={formData.country}
                onValueChange={(value) => {
                  setFormData({ ...formData, country: value });
                  if (errors.country) {
                    setErrors({ ...errors, country: undefined });
                  }
                }}
                disabled={isLoading}
              >
                <SelectTrigger id="country" className={errors.country ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {mentorCountries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && (
                <p className="text-xs text-red-500">{errors.country}</p>
              )}
              <p className="text-xs text-amber-600 flex items-center mt-1">
                <AlertCircle className="h-3 w-3 mr-1" />
                Mood Mentor positions are only available in selected countries
              </p>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="specialty">Primary Specialty</Label>
            <Select
              value={formData.specialty}
              onValueChange={(value) => {
                setFormData({ ...formData, specialty: value });
                if (errors.specialty) {
                  setErrors({ ...errors, specialty: undefined });
                }
              }}
              disabled={isLoading}
            >
              <SelectTrigger id="specialty" className={errors.specialty ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select your primary specialty" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty.id} value={specialty.id}>
                    {specialty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.specialty && (
              <p className="text-xs text-red-500">{errors.specialty}</p>
            )}
          </div>

          <div className="flex items-start space-x-2 pt-2">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => {
                setAgreedToTerms(checked as boolean);
                if (errors.terms) {
                  setErrors({ ...errors, terms: undefined });
                }
              }}
              disabled={isLoading}
              className={errors.terms ? 'border-red-500' : ''}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I agree to the{" "}
                <Link to="/terms-of-service" className="text-primary hover:underline" target="_blank">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy-policy" className="text-primary hover:underline" target="_blank">
                  Privacy Policy
                </Link>
              </label>
              {errors.terms && (
                <p className="text-xs text-red-500">{errors.terms}</p>
              )}
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </Button>

        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/mentor-signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Are you a patient?{" "}
            <Link to="/patient-signup" className="text-primary hover:underline">
              Create a Patient account
            </Link>
          </p>
        </div>
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
          onClick={handleGoogleSignup}
          disabled={isLoading}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="w-5 h-5" 
          />
          Sign up with Google
        </Button>
      </div>
    </AuthLayout>
  );
} 