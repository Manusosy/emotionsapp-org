import { dataService, patientService } from '../../../services';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/authContext';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { getDeviceInfo, getFormattedDeviceInfo } from '@/utils/device-detection';
import { toast } from '@/components/ui/use-toast';
import { PatientProfile } from '@/services/patient/patient.interface';
import { UserActivity } from '@/services/patient/patient.interface';
import ensureStorageBucketsExist from '@/utils/storage-setup';
import uploadImage from '@/utils/image-service';
import FallbackAvatar from '@/components/ui/fallback-avatar';

// Avatar error component to handle upload failures
const AvatarErrorState = ({ error, onRetry }: { error: string, onRetry: () => void }) => {
  return (
    <div className="relative h-24 w-24 bg-red-50 border border-red-200 rounded-full flex flex-col items-center justify-center text-red-500">
      <span className="text-2xl mb-1">⚠️</span>
      <button 
        onClick={onRetry}
        className="text-xs font-medium px-2 py-1 bg-white hover:bg-red-50 border border-red-300 rounded-md text-red-600 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

// Define the schema for patient profile form
const patientFormSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phoneNumber: z.string().min(10, 'Please enter a valid phone number').or(z.string().length(0)),
  gender: z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say'], {
    required_error: "Please select a gender",
  }),
  dateOfBirth: z.string().optional(),
  location: z.string().min(1, 'Please select your country'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  avatarUrl: z.string().optional(),
  bio: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientFormSchema>;

// Define gender options - matching the options in the database
const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Non-binary', label: 'Non-binary' },
  { value: 'Prefer not to say', label: 'Prefer not to say' }
];

// Storage troubleshooting component
const StorageTroubleshootingMessage = ({ onTryFix }: { onTryFix: () => void }) => (
  <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-4 flex flex-col gap-2">
    <div className="flex items-center">
      <span className="text-xl mr-2">ℹ️</span>
      <h3 className="font-semibold">Storage configuration issue detected</h3>
    </div>
    <p className="text-sm ml-7">
      We detected that your storage buckets might not be properly configured, which can prevent 
      uploading profile pictures.
    </p>
    <div className="ml-7 mt-1">
      <button
        onClick={onTryFix}
        className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        Attempt to fix
      </button>
    </div>
  </div>
);

// Add a URL input option component
const ExternalUrlInput = ({ 
  value, 
  onChange, 
  onSubmit 
}: { 
  value: string; 
  onChange: (url: string) => void; 
  onSubmit: () => void 
}) => {
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter image URL"
          className="flex-1 p-1 text-xs border border-gray-300 rounded"
        />
        <button
          onClick={onSubmit}
          className="bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700"
        >
          Use
        </button>
      </div>
    </div>
  );
};

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [currentDeviceInfo, setCurrentDeviceInfo] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [hasUpdatedDeviceInfo, setHasUpdatedDeviceInfo] = useState(false);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const { user, updateUser, updateUserMetadata } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showStorageFix, setShowStorageFix] = useState(false);
  const [fixingStorage, setFixingStorage] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Pre-load form data with empty values to reduce flickering
  const defaultValues: PatientFormValues = {
    fullName: '',
    phoneNumber: '',
    gender: 'Prefer not to say',
    dateOfBirth: '',
    location: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    avatarUrl: '',
    bio: '',
  };

  const { register, handleSubmit, formState: { errors }, setValue, watch, control } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues,
    // Don't validate on mount to reduce initial load time
    mode: 'onSubmit'
  });

  // Load user profile data only once
  useEffect(() => {
    const loadPatientProfile = async () => {
      // Skip if we've already initialized to prevent blinking
      if (hasInitialized) return;
      
      try {
        if (!user?.id) return;
        
        // Immediately set default values to prevent form field flickering
        Object.keys(defaultValues).forEach(key => {
          setValue(key as keyof PatientFormValues, defaultValues[key as keyof PatientFormValues]);
        });
        
        // Get user metadata for fallback values
        const metadata = user.user_metadata as any || {};
        
        // Load profile data using patientService
        const response = await patientService.getPatientById(user.id);
        
        if (response.success && response.data) {
          const profileData = response.data;
          
          // Set values from profile data
          setValue('fullName', profileData.fullName || metadata.name || '');
          setValue('phoneNumber', profileData.phoneNumber || '');
          setValue('gender', (profileData.gender || 'Prefer not to say') as 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say');
          setValue('dateOfBirth', profileData.dateOfBirth || '');
          setValue('location', profileData.location || metadata.country || '');
          setValue('address', profileData.address || '');
          setValue('city', profileData.city || '');
          setValue('state', profileData.state || '');
          setValue('pincode', profileData.pincode || '');
          setValue('avatarUrl', profileData.avatarUrl || metadata.avatarUrl || '');
          setValue('bio', profileData.bio || '');
        } else {
          // Use user metadata as fallback
          setValue('fullName', metadata.name || '');
          setValue('location', metadata.country || '');
          setValue('gender', (metadata.gender || 'Prefer not to say') as 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say');
          setValue('avatarUrl', metadata.avatarUrl || '');
        }
        
        // Mark as initialized to prevent repeat loading
        setHasInitialized(true);
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        // Remove loading state immediately
        setLoading(false);
      }
    };

    // If we have user data, load profile immediately
    if (user?.id) {
      loadPatientProfile();
    } else {
      // If no user yet, wait a bit and check again
      const timer = setTimeout(() => {
        if (user?.id && !hasInitialized) {
          loadPatientProfile();
        } else {
          // Give up and show the form without data after a short timeout
          setLoading(false);
        }
      }, 200); // Reduced timeout
      
      return () => clearTimeout(timer);
    }
  }, [user, setValue, watch, hasInitialized, defaultValues]);

  useEffect(() => {
    // Update device information when component mounts, but only after main data loads
    const updateDeviceInfo = async () => {
      // Skip if already updated to prevent rerenders
      if (hasUpdatedDeviceInfo) return;
      
      // Get current device info synchronously for UI
      const deviceInfo = getDeviceInfo();
      // Set device info immediately for UI
      setCurrentDeviceInfo(`${deviceInfo.os} • ${deviceInfo.deviceType} • ${deviceInfo.browser}`);
      setHasUpdatedDeviceInfo(true);
      
      // Do the API call asynchronously in the background later
      if (user?.id) {
        setTimeout(() => {
          updateUserMetadata({
            current_session: {
              device_type: deviceInfo.deviceType,
              browser: deviceInfo.browser,
              os: deviceInfo.os,
              last_login: new Date().toISOString(),
              user_agent: deviceInfo.fullUserAgent
            }
          }).catch(err => {
            console.error('Non-critical error updating device metadata:', err);
          });
        }, 1000); // Delay by 1 second to prioritize UI rendering
      }
    };
    
    // Only run after main loading is done
    if (!loading && user?.id) {
      updateDeviceInfo();
    }
  }, [user, hasUpdatedDeviceInfo, loading, currentDeviceInfo]);

  // Load user activity data
  useEffect(() => {
    const loadUserActivity = async () => {
      if (!user?.id) return;
      
      try {
        setLoadingActivities(true);
        const { data: activities, error } = await patientService.getUserActivity(user.id, 5);
        
        if (error) {
          console.error("Error loading user activity:", error);
        } else if (activities) {
          setUserActivities(activities);
        }
      } catch (error) {
        console.error("Error in user activity loading:", error);
      } finally {
        setLoadingActivities(false);
      }
    };
    
    if (user?.id) {
      loadUserActivity();
    }
  }, [user]);

  const handleAvatarUpload = async (file: File) => {
    if (!user?.id) return;
    
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 2MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setAvatarError(null); // Clear any previous errors
    try {
      console.log("Starting profile image upload...");
      
      // Use the new image service that handles multiple upload methods
      const result = await uploadImage(file, user.id);
      
      if (result.success && result.url) {
        // Update the form with the new avatar URL
        setValue('avatarUrl', result.url);
        
        // Display appropriate success message based on the source
        toast({
          title: "Success",
          description: result.source === 'external' 
            ? "Profile picture uploaded to external service successfully" 
            : "Profile picture updated successfully",
        });
        
        // Record the activity
        await patientService.recordUserActivity({
          activityType: 'profile_update',
          description: 'Updated profile picture',
          timestamp: new Date().toISOString(),
          metadata: {
            source: result.source,
            fileSize: file.size
          }
        });
        
        // Refresh the activity list to show the new profile picture update activity
        const { data: activities } = await patientService.getUserActivity(user.id, 5);
        if (activities) {
          setUserActivities(activities);
        }
      } else {
        console.error("Upload failed:", result.error);
        setAvatarError(result.error || 'Failed to upload image');
        throw new Error(result.error || 'Failed to upload image');
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      
      // More descriptive error message
      let errorMsg = "Failed to upload profile picture";
      
      if (error.message && error.message.includes("Bucket not found")) {
        errorMsg = "Storage bucket not found. Please try the external URL option below.";
        // Show URL input option as fallback
        setShowUrlInput(true);
      } else if (error.message && error.message.includes("storage")) {
        errorMsg = "Storage issue: " + error.message;
        // Show URL input option as fallback
        setShowUrlInput(true);
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setAvatarError(errorMsg);
      
      toast({
        title: "Upload Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  // Function to open the file picker for retry
  const handleRetryUpload = () => {
    setAvatarError(null);
    // Automatically click the hidden file input
    document.getElementById('profile-upload')?.click();
  };

  // Handler for using external URL
  const handleUseExternalUrl = () => {
    if (!externalUrl || !externalUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive"
      });
      return;
    }
    
    // Basic URL validation
    try {
      new URL(externalUrl);
    } catch (e) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive"
      });
      return;
    }
    
    // Set the avatar URL
    setValue('avatarUrl', externalUrl);
    setAvatarError(null);
    setShowUrlInput(false);
    setExternalUrl('');
    
    toast({
      title: "Success",
      description: "Profile picture URL set successfully",
    });
  };

  const onSubmit = async (data: PatientFormValues) => {
    if (!user?.id) return;
    
    setIsUpdating(true);
    setSaveSuccess(false);
    setSaveError(false);
    setErrorMessage('');
    
    try {
      // Update profile using patientService
      const updateResult = await patientService.updatePatientProfile({
        userId: user.id,
        email: user.email || '',
        fullName: data.fullName,
        phoneNumber: data.phoneNumber,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth || '',
        bio: data.bio || '',
        location: data.location,
        address: data.address || '',
        city: data.city || '',
        state: data.state || '', 
        pincode: data.pincode || '',
        avatarUrl: data.avatarUrl || '',
      });

      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to update profile');
      }

      // Record this activity
      await patientService.recordUserActivity({
        activityType: 'profile_update',
        description: 'Updated profile information',
        deviceInfo: currentDeviceInfo || getFormattedDeviceInfo(),
        timestamp: new Date().toISOString(),
        metadata: {
          updatedFields: Object.keys(data).filter(key => !!data[key as keyof PatientFormValues])
        }
      });

      // Refresh the activity list
      const { data: activities } = await patientService.getUserActivity(user.id, 5);
      if (activities) {
        setUserActivities(activities);
      }

      // Success notification
      setSaveSuccess(true);
      
      // Success notification will auto-hide after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setSaveSuccess(false);
      setSaveError(true);
      setErrorMessage(error.message || 'There was an error saving your changes.');
      setTimeout(() => setSaveError(false), 5000);
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper function to format activity timestamp
  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    if (diffHour < 24) return `${diffHour} hr ago`;
    if (diffDay < 7) return `${diffDay} days ago`;
    
    return format(date, 'MMM d, yyyy');
  };
  
  // Helper function to get activity icon
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return '🔐'; // Lock
      case 'profile_update': return '👤'; // Person
      case 'assessment': return '📊'; // Chart
      case 'appointment': return '📅'; // Calendar
      case 'journal': return '📓'; // Notebook
      case 'message': return '💬'; // Chat
      case 'session': return '⏱️'; // Timer
      default: return '📋'; // Clipboard
    }
  };

  // If we detect a storage error, show the storage fix option
  useEffect(() => {
    if (avatarError && 
        (avatarError.includes('Bucket not found') || 
         avatarError.includes('storage') || 
         avatarError.includes('bucket'))) {
      setShowStorageFix(true);
    }
  }, [avatarError]);
  
  // Function to attempt fixing storage buckets
  const attemptStorageFix = async () => {
    setFixingStorage(true);
    try {
      const result = await ensureStorageBucketsExist();
      
      if (result.success) {
        toast({
          title: "Success",
          description: "Storage buckets have been configured! Please try uploading again.",
        });
        
        // Clear the error so user can try again
        setAvatarError(null);
        setShowStorageFix(false);
      } else {
        // Still failed
        toast({
          title: "Configuration Failed",
          description: "Unable to configure storage buckets. Please contact support.",
          variant: "destructive"
        });
        
        console.error("Storage configuration errors:", result.errors);
      }
    } catch (error) {
      console.error("Error fixing storage:", error);
      toast({
        title: "Error",
        description: "An error occurred while configuring storage.",
        variant: "destructive"
      });
    } finally {
      setFixingStorage(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10 px-4">
          <div className="flex flex-col items-center justify-center">
            <p className="text-[#20C0F3] font-medium mb-2">Please wait...</p>
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-[#20C0F3] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-[#20C0F3] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-[#20C0F3] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        {saveSuccess && (
          <div className="bg-green-100 border border-green-300 text-green-700 px-4 py-3 rounded mb-4">
            Changes saved successfully
          </div>
        )}
        
        {saveError && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-semibold">There was an error saving your changes.</p>
            {errorMessage && <p className="text-sm mt-1">{errorMessage}</p>}
            <p className="text-sm mt-1">Please try again or contact support if the issue persists.</p>
          </div>
        )}
        
        {showStorageFix && (
          <StorageTroubleshootingMessage onTryFix={attemptStorageFix} />
        )}
        
        {fixingStorage && (
          <div className="bg-blue-100 border border-blue-300 text-blue-700 px-4 py-3 rounded mb-4 flex items-center">
            <div className="mr-3 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            Configuring storage buckets... Please wait.
          </div>
        )}
        
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="shadow-md border-none rounded-xl">
              <CardHeader className="border-b">
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Avatar Upload Section */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8">
                    <div className="relative cursor-pointer">
                      {avatarError ? (
                        <AvatarErrorState error={avatarError} onRetry={handleRetryUpload} />
                      ) : (
                        <FallbackAvatar
                          src={watch('avatarUrl')}
                          name={watch('fullName') || 'User'}
                          className="h-24 w-24 cursor-pointer"
                        />
                      )}
                      <label htmlFor="profile-upload" className="absolute inset-0 cursor-pointer">
                        <span className="sr-only">Upload profile picture</span>
                      </label>
                      <Input
                        id="profile-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleAvatarUpload(e.target.files[0]);
                          }
                        }}
                        disabled={uploading}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10 w-24 h-24"
                      />
                      {uploading && (
                        <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center">
                          <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Profile Picture</h3>
                      <p className="text-sm text-slate-500">
                        Click on the avatar to update your profile picture
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Recommended: Square image, at least 300x300 pixels
                      </p>
                      {avatarError && (
                        <p className="text-xs text-red-600 mt-1 max-w-[220px]">
                          Error: {avatarError}
                        </p>
                      )}
                      {showUrlInput && (
                        <div className="mt-2">
                          <p className="text-xs text-blue-600">Alternative: Use a public image URL</p>
                          <ExternalUrlInput 
                            value={externalUrl} 
                            onChange={setExternalUrl}
                            onSubmit={handleUseExternalUrl}
                          />
                        </div>
                      )}
                      {!avatarError && watch('avatarUrl') && (
                        <p className="text-xs text-green-600 mt-1">
                          Avatar URL: {watch('avatarUrl').substring(0, 30)}...
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Personal Details Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="fullName">Full Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="fullName"
                        {...register('fullName')}
                        className="mt-1"
                      />
                      {errors.fullName && (
                        <p className="text-red-500 text-sm mt-1">{String(errors.fullName.message)}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phoneNumber">Phone Number <span className="text-red-500">*</span></Label>
                      <Input
                        id="phoneNumber"
                        {...register('phoneNumber')}
                        className="mt-1"
                      />
                      {errors.phoneNumber && (
                        <p className="text-red-500 text-sm mt-1">{String(errors.phoneNumber.message)}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="dateOfBirth">Date of Birth</Label>
                      <Input
                        id="dateOfBirth"
                        type="date"
                        {...register('dateOfBirth')}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
                      <Select 
                        onValueChange={(value) => setValue('gender', value as any)} 
                        defaultValue={watch('gender')}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {GENDER_OPTIONS.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.gender && (
                        <p className="text-red-500 text-sm mt-1">{String(errors.gender.message)}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="location">Country <span className="text-red-500">*</span></Label>
                      <Input
                        id="location"
                        {...register('location')}
                        className="mt-1"
                      />
                      {errors.location && (
                        <p className="text-red-500 text-sm mt-1">{String(errors.location.message)}</p>
                      )}
                    </div>
                  </div>

                  {/* About Me Section */}
                  <div className="mt-6">
                    <Label htmlFor="bio">About Me</Label>
                    <Textarea
                      id="bio"
                      {...register('bio')}
                      className="mt-1"
                      rows={4}
                      placeholder="Share a little about yourself, your interests, or why you're using this platform"
                    />
                  </div>

                  {/* Address Section */}
                  <div className="mt-6">
                    <h3 className="text-lg font-medium mb-4">Address Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label htmlFor="address">Street Address</Label>
                        <Input
                          id="address"
                          {...register('address')}
                          className="mt-1"
                          placeholder="Enter your street address"
                        />
                      </div>

                      <div>
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          {...register('city')}
                          className="mt-1"
                          placeholder="Enter your city"
                        />
                      </div>

                      <div>
                        <Label htmlFor="state">State/Province</Label>
                        <Input
                          id="state"
                          {...register('state')}
                          className="mt-1"
                          placeholder="Enter your state or province"
                        />
                      </div>

                      <div>
                        <Label htmlFor="pincode">Postal/ZIP Code</Label>
                        <Input
                          id="pincode"
                          {...register('pincode')}
                          className="mt-1"
                          placeholder="Enter your postal or ZIP code"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 mt-8">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(-1)}
                      disabled={isUpdating}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="bg-[#20C0F3] text-white hover:bg-[#20C0F3]/90"
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="account">
            <Card className="shadow-md border-none rounded-xl mb-6">
              <CardHeader className="border-b">
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="mt-1 bg-slate-50"
                      />
                      <p className="text-xs text-slate-500 mt-1">Contact support to change your email</p>
                    </div>

                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value="••••••••"
                        disabled
                        className="mt-1 bg-slate-50"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        <Button 
                          variant="link" 
                          className="p-0 h-auto text-xs"
                          onClick={() => navigate('/forgot-password')}
                        >
                          Reset your password
                        </Button>
                      </p>
                    </div>
                  </div>
                  
                  <div className="pt-6 mt-6 border-t">
                    <h3 className="text-lg font-medium mb-2">Account Activity</h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Recent activity in your account
                    </p>
                    
                    <div className="space-y-3">
                      {loadingActivities ? (
                        // Loading state for activities
                        <>
                          <Skeleton className="h-16 w-full rounded-lg" />
                          <Skeleton className="h-16 w-full rounded-lg" />
                          <Skeleton className="h-16 w-full rounded-lg" />
                        </>
                      ) : userActivities.length > 0 ? (
                        // Show user activities
                        userActivities.map((activity) => (
                          <div key={activity.id} className="flex justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl">{getActivityIcon(activity.activityType)}</div>
                              <div>
                                <p className="font-medium">{activity.description}</p>
                                {activity.deviceInfo && (
                                  <p className="text-sm text-slate-500">{activity.deviceInfo}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-right flex flex-col justify-between">
                              <p>{format(new Date(activity.timestamp), 'MMM d, yyyy')}</p>
                              <p className="text-slate-500">{formatActivityTime(activity.timestamp)}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        // Fallback if no activities
                        <div className="flex justify-center p-4 rounded-lg bg-slate-50">
                          <p className="text-slate-500">No recent activity found</p>
                        </div>
                      )}
                      
                      {/* Current session - always show this */}
                      <div className="flex justify-between p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">🔐</div>
                          <div>
                            <p className="font-medium">Current session</p>
                            <p className="text-sm text-slate-500">
                              {currentDeviceInfo || getFormattedDeviceInfo()}
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-right">
                          <p>
                            {format(new Date(), 'MMM d, yyyy')}
                          </p>
                          <p className="text-green-600">Active now</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Danger Zone - only in account tab */}
            <Card className="border-red-200 shadow-md rounded-xl">
              <CardHeader className="border-b border-red-100">
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-medium">Delete Account</h3>
                      <p className="text-sm text-slate-500">
                        Permanently delete your account and all of your data. This action cannot be undone.
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      onClick={() => navigate(`/patient-dashboard/delete-account`)}
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="shadow-md border-none rounded-xl">
              <CardHeader className="border-b">
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-slate-500">Receive email about your account activity</p>
                    </div>
                    <div>
                      <input type="checkbox" id="email-notifications" className="mr-2" defaultChecked />
                      <Label htmlFor="email-notifications" className="inline-block">Enable</Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h4 className="font-medium">Appointment Reminders</h4>
                      <p className="text-sm text-slate-500">Get notified about upcoming appointments</p>
                    </div>
                    <div>
                      <input type="checkbox" id="appointment-notifications" className="mr-2" defaultChecked />
                      <Label htmlFor="appointment-notifications" className="inline-block">Enable</Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between border-b pb-4">
                    <div>
                      <h4 className="font-medium">Mood Tracking Reminders</h4>
                      <p className="text-sm text-slate-500">Receive reminders to track your mood</p>
                    </div>
                    <div>
                      <input type="checkbox" id="mood-tracking-notifications" className="mr-2" defaultChecked />
                      <Label htmlFor="mood-tracking-notifications" className="inline-block">Enable</Label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Marketing Communications</h4>
                      <p className="text-sm text-slate-500">Receive updates about new features and promotions</p>
                    </div>
                    <div>
                      <input type="checkbox" id="marketing-notifications" className="mr-2" />
                      <Label htmlFor="marketing-notifications" className="inline-block">Enable</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 


