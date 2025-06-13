import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/authContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Upload, UserCheck, Medal, Briefcase, GraduationCap, Languages, MapPin, ChevronDown, Check, Info, AlertCircle, RefreshCw, Settings, Loader2, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { mentorCountries } from '@/features/auth/utils/mentor-countries';
import { supabase } from '@/lib/supabase';
import { moodMentorService } from '@/services';
import { slugify } from '@/utils/formatters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authService } from '@/services/auth/auth.service';

// User from authentication context
interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  country?: string;
  gender?: string;
  role?: string;
  phone_number?: string;
  specialty?: string;
  };
}

// The main profile interface using camelCase for the UI, matching the MoodMentorUI interface
interface MentorProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  bio: string;
  specialty: string;
  hourlyRate: number;
  avatarUrl: string;
  isFree: boolean;
  availabilityStatus: 'available' | 'unavailable' | 'busy';
  gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
  languages: string[];
  education: Array<{degree: string, institution: string, year: string}>;
  experience: Array<{title: string, place: string, duration: string}>;
  therapyTypes: string[];
  specialties: string[];
  sessionDuration: '30 Min' | '45 Min' | '60 Min' | '90 Min';
  location: string;
  nameSlug: string;
  phoneNumber: string;
  isProfileComplete: boolean;
  isActive: boolean;
}

export default function ProfilePage() {
  const { user } = useAuth() as { user: AuthUser | null };
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [attemptingTabChange, setAttemptingTabChange] = useState<string | null>(null);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const phoneInitialized = useRef(false);
  
  // Country code mapping for phone prefixes
  const countryPhonePrefixes: Record<string, string> = {
    'Rwanda': '+250',
    'Sierra Leone': '+232',
    'Ghana': '+233',
    'Kenya': '+254',
    'Uganda': '+256'
  };
  
  // Create a sorted list of countries based on their phone codes
  const sortedCountries = mentorCountries
    .map(country => ({
      name: country.name,
      code: countryPhonePrefixes[country.name]?.replace('+', '') || '0'
    }))
    .sort((a, b) => parseInt(a.code) - parseInt(b.code))
    .map(country => country.name);

  // Update the countryOptions to use the sorted list
  const countryOptions = sortedCountries;

  // Default empty profile
  const defaultProfile: MentorProfile = {
    id: '',
    userId: '',
    fullName: '',
    email: '',
    bio: '',
    specialty: '',
    therapyTypes: [],
    specialties: [],
    avatarUrl: '',
    education: [{ degree: '', institution: '', year: '' }],
    experience: [{ title: '', place: '', duration: '' }],
    languages: [],
    location: '',
    phoneNumber: '',
    hourlyRate: 0,
    isProfileComplete: false,
    isFree: true,
    availabilityStatus: 'available',
    gender: 'Prefer not to say',
    nameSlug: '',
    sessionDuration: '30 Min',
    isActive: true
  };

  // Initialize profile state with default values
  const [profile, setProfile] = useState<MentorProfile>(defaultProfile);

  // Gender options
  const genderOptions = [
    'Male',
    'Female',
    'Non-binary',
    'Prefer not to say'
  ];

  // Languages options - prioritizing languages from allowed countries
  const languageOptions = [
    // Primary languages for the selected countries
    'English', 'Swahili', 'Kinyarwanda', 'Luganda', 'Twi', 'Ga', 'Krio', 'Mende',

    // Kenyan languages
    'Kikuyu', 'Luo', 'Luhya', 'Kalenjin', 'Kamba', 'Kisii', 'Meru',
    
    // Rwandan languages
    'Kirundi', 'French',
    
    // Ugandan languages
    'Acholi', 'Ateso', 'Lugbara', 'Runyankole', 'Lusoga',
    
    // Sierra Leonean languages
    'Temne', 'Limba', 'Kuranko', 'Susu',
    
    // Ghanaian languages
    'Ewe', 'Dagaare', 'Dagbani', 'Akan', 'Fante',
    
    // Other languages
    'Arabic', 'Amharic', 'Hausa', 'Yoruba', 'Igbo',
    'Oromo', 'Somali', 'Tigrinya', 'Berber', 'Wolof', 'Shona', 'Lingala',
    'Fulfulde', 'Edo', 'Ibibio', 'Efik', 'Kanuri', 'Tiv',
    'Zulu', 'Xhosa', 'Afrikaans'
  ];

  // Therapy types options
  const therapyOptions = [
    'Cognitive Behavioral Therapy (CBT)',
    'Dialectical Behavior Therapy (DBT)',
    'Psychodynamic Therapy',
    'Interpersonal Therapy',
    'Humanistic Therapy',
    'Mindfulness-Based Therapy',
    'Exposure Therapy',
    'Group Therapy',
    'Family Therapy',
    'Art Therapy'
  ];

  // Specialty options
  const specialtyOptions = [
    'Depression & Anxiety',
    'Trauma & PTSD',
    'Relationship Issues',
    'Addiction & Recovery',
    'Stress Management',
    'Self-Esteem',
    'Grief',
    'Life Transitions',
    'LGBTQ+ Issues'
  ];

  // Simplified validation function
  const validateProfile = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Required fields validation
    if (!profile.fullName?.trim()) {
      errors.push('Full name is required');
    }

    if (!profile.specialty?.trim()) {
      errors.push('Specialty is required');
    }

    if (!profile.bio?.trim()) {
      errors.push('Bio is required');
    }
    
    if (!profile.location?.trim()) {
      errors.push('Location is required');
    }
    
    if (!profile.gender) {
      errors.push('Gender is required');
    }
    
    if (!profile.phoneNumber?.trim()) {
      errors.push('Phone number is required');
    }

    if (profile.therapyTypes?.length === 0) {
      errors.push('At least one therapy type is required');
    }

    if (profile.languages?.length === 0) {
      errors.push('At least one language is required');
    }
    
    // Validate hourly rate if not a free mentor
    if (!profile.isFree && (!profile.hourlyRate || profile.hourlyRate <= 0)) {
      errors.push('Please set a valid hourly rate greater than 0');
    }
    
    // Add a console log to help debug validation
    if (process.env.NODE_ENV === 'development') {
      console.log('Validation errors:', errors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  // Update isFormValid to use the new validation
  const isFormValid = (): boolean => {
    const { isValid } = validateProfile();
    return isValid;
  };

  // Define fetchProfileData outside useEffect so it can be called manually
  const fetchProfileData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      setHasUnsavedChanges(false); // Reset unsaved changes when fetching fresh data
      
      console.log("Fetching profile for user ID:", user.id);
      
      // Get server data
      const response = await moodMentorService.getMoodMentorById(user.id);
      console.log("Profile fetch response:", response);
      
      // Get the country from user metadata for phone prefix
      const countryName = user.user_metadata?.country ? 
        mentorCountries.find(c => c.code === user.user_metadata?.country)?.name || '' : '';
      const phonePrefix = countryPhonePrefixes[countryName] || '';
      
      // Format gender value properly
      const formatGender = (gender?: string): 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say' => {
        if (!gender) return 'Prefer not to say';
        
        switch(gender.toLowerCase()) {
          case 'male': return 'Male';
          case 'female': return 'Female';
          case 'non-binary': return 'Non-binary';
          default: return 'Prefer not to say';
        }
      };
      
      // Get user metadata from auth context
      const userMetadata = {
        fullName: user.user_metadata?.name || user.user_metadata?.full_name || 
                 `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim(),
        email: user.email || '',
        location: countryName,
        gender: formatGender(user.user_metadata?.gender),
        avatarUrl: user.user_metadata?.avatar_url || '',
        phoneNumber: user.user_metadata?.phone_number || phonePrefix,
        specialty: user.user_metadata?.specialty || '',
      };
      
      if (response.success && response.data) {
        // The response is already in camelCase format from our service
        const profileData = response.data;
        
        // Merge with any missing data from user metadata
        const completeProfile = {
          ...profileData,
          fullName: profileData.fullName || userMetadata.fullName,
          email: profileData.email || userMetadata.email,
          gender: profileData.gender || userMetadata.gender as any,
          location: profileData.location || userMetadata.location,
          avatarUrl: profileData.avatarUrl || userMetadata.avatarUrl,
          phoneNumber: profileData.phoneNumber || userMetadata.phoneNumber,
          specialty: profileData.specialty || userMetadata.specialty,
        };
        
        setProfile(completeProfile);
        
        // If there's an avatar, set the preview
        if (completeProfile.avatarUrl) {
          setAvatarPreview(completeProfile.avatarUrl);
        }
        
      } else {
        console.log("No profile found, creating new profile from user metadata");
        // Create new profile from user metadata
        setProfile({
          ...defaultProfile,
          userId: user.id,
          fullName: userMetadata.fullName,
          email: userMetadata.email,
          gender: userMetadata.gender,
          location: userMetadata.location,
          avatarUrl: userMetadata.avatarUrl,
          phoneNumber: userMetadata.phoneNumber,
          specialty: userMetadata.specialty,
          nameSlug: userMetadata.fullName
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, ''),
        });
        
        if (userMetadata.avatarUrl) {
          setAvatarPreview(userMetadata.avatarUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error('Failed to load profile data');
      
      // Even if there's an error, try to set up a basic profile with user metadata
      if (user) {
        const basicProfile = {
          ...defaultProfile,
          userId: user.id,
          fullName: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Mood Mentor',
          email: user.email || '',
        };
        setProfile(basicProfile);
      }
    } finally {
      // Always set loading to false to prevent infinite loading state
      setIsLoading(false);
    }
  };

  // Handle avatar upload and update avatar preview
  const handleSaveProfile = async () => {
    const { isValid, errors } = validateProfile();
    
    if (!isValid) {
      // Show all validation errors
      errors.forEach(error => {
        toast.error(error);
      });
      return;
    }

    if (!user?.id) {
      toast.error('User ID is missing. Please try logging in again.');
      return;
    }
    
    // Save current form state to restore in case of error
    const currentProfileState = { ...profile };
    const currentAvatarPreview = avatarPreview;
    
    setIsSaving(true);
    
    try {
      // Create a copy of the profile to modify
      const profileToUpdate = { ...profile };
      
      // Generate nameSlug if it doesn't exist
      if (!profileToUpdate.nameSlug) {
        profileToUpdate.nameSlug = slugify(profileToUpdate.fullName);
      }
      
      // Set profile as complete
      profileToUpdate.isProfileComplete = true;
      
      // Handle avatar upload if there's a new file
      let avatarUrl = profileToUpdate.avatarUrl || '';
      let uploadSuccessful = false;
      
      if (avatarFile) {
        try {
          const uploadResult = await moodMentorService.uploadProfileImage(user.id, avatarFile);
          
          if (uploadResult.success && uploadResult.url) {
            uploadSuccessful = true;
            avatarUrl = uploadResult.url;
            console.log('Successfully uploaded avatar with URL:', avatarUrl);
            
            // Update user metadata with the new avatar URL
            try {
              await authService.updateUserMetadata({
                avatar_url: avatarUrl,
                full_name: profileToUpdate.fullName
              });
              console.log('Updated user metadata with avatar URL');
            } catch (metadataError) {
              console.warn('Failed to update user metadata, but continuing:', metadataError);
            }
          } else {
            // If upload fails but we have an existing avatar URL, keep using it
            uploadSuccessful = false;
            if (!avatarUrl) {
              // Only show warning if we don't have a fallback avatar
              toast.warning('Profile picture upload failed, but your profile will still be saved.');
            }
            console.error('Avatar upload failed:', uploadResult.error);
          }
        } catch (uploadError) {
          uploadSuccessful = false;
          // If upload fails but we have an existing avatar URL, keep using it
          if (!avatarUrl) {
            // Only show warning if we don't have a fallback avatar
            toast.warning('Profile picture upload failed, but your profile will still be saved.');
          }
          console.error('Exception during avatar upload:', uploadError);
        }
      } else if (!avatarUrl && user.user_metadata?.avatar_url) {
        // If we don't have an avatar in the profile but one exists in user metadata, use that
        avatarUrl = user.user_metadata.avatar_url;
      }
      
      // Create a copy of the profile with the userId and avatar fields updated
      const profileToSave = {
        ...profileToUpdate,
        userId: user.id,
        avatarUrl: avatarUrl || profileToUpdate.avatarUrl // Use existing URL as fallback
      };
      
      console.log('Saving profile with avatar URL:', profileToSave.avatarUrl);
      
      // Save the profile - the service handles converting to snake_case
      const response = await moodMentorService.updateMoodMentorProfile(profileToSave);
      
      if (response.success && response.data) {
        // If we successfully saved the profile but didn't already update the metadata above (in the avatar upload case),
        // make sure the user metadata is updated to match the profile
        if (!uploadSuccessful) {
          try {
            await authService.updateUserMetadata({
              avatar_url: profileToSave.avatarUrl,
              full_name: profileToSave.fullName
            });
            console.log('Updated user metadata to match profile');
          } catch (metadataError) {
            console.warn('Failed to update user metadata after profile save:', metadataError);
          }
        }
        
        toast.success('Profile saved successfully!');
        
        // Update the state with the saved profile
        // Need to ensure all required fields are present
        const updatedProfile: MentorProfile = {
          ...profileToUpdate, // Keep existing data
          ...(response.data as any), // Override with response data
          // Ensure these required fields are present
          phoneNumber: response.data.phoneNumber || profileToUpdate.phoneNumber,
          isActive: response.data.isActive ?? profileToUpdate.isActive,
          // Maintain arrays which might not be returned fully
          languages: response.data.languages || profileToUpdate.languages || [],
          therapyTypes: response.data.therapyTypes || profileToUpdate.therapyTypes || [],
          specialties: response.data.specialties || profileToUpdate.specialties || [],
          education: response.data.education || profileToUpdate.education || [],
          experience: response.data.experience || profileToUpdate.experience || [],
          // Ensure avatar URL is preserved properly
          avatarUrl: response.data.avatarUrl || profileToSave.avatarUrl
        };
        
        // First update the profile
        setProfile(updatedProfile);
        
        // Update avatar preview if needed
        if (uploadSuccessful && updatedProfile.avatarUrl) {
          setAvatarPreview(updatedProfile.avatarUrl);
        } else if (updatedProfile.avatarUrl && (!avatarPreview || avatarFile)) {
          // If upload wasn't successful but we have an avatar URL, use it
          setAvatarPreview(updatedProfile.avatarUrl);
        }
        
        // Clear the avatar file
        setAvatarFile(null);
        
        // Reset unsaved changes flag
        setHasUnsavedChanges(false);
        
        // Exit edit mode if we're currently in it
        if (isEditMode) {
          setIsEditMode(false);
        }
      } else {
        // Restore profile state to what it was before submitting
        setProfile(currentProfileState);
        setAvatarPreview(currentAvatarPreview);
        
        throw new Error(response.error || 'Failed to save profile');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
      
      // Ensure we keep the profile state as it was
      setProfile(currentProfileState);
      setAvatarPreview(currentAvatarPreview);
    } finally {
      setIsSaving(false);
    }
  };

  // Modify the handleInputChange function to track changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    setHasUnsavedChanges(true);
    
    // Create a copy of the profile with the new value
    const updatedProfile = { ...profile, [name]: value };
      
      // Generate name_slug when full_name changes
      if (name === 'fullName') {
      updatedProfile.nameSlug = slugify(value);
    }
    
    setProfile(updatedProfile);
  };

  // Handle select value changes
  const handleSelectChange = (name: string, value: string | boolean) => {
    setHasUnsavedChanges(true);
    if (typeof value === 'boolean') {
      setProfile(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setProfile(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Modify the handleArraySelectChange function to track changes
  const handleArraySelectChange = (name: string, value: string) => {
    setProfile(prev => {
      const currentArray = prev[name as keyof MentorProfile] as string[] || [];
      
      // Clone the array to ensure React state updates properly
      let newArray = [...currentArray];
      
      // Toggle the value (add if not present, remove if present)
      if (newArray.includes(value)) {
        newArray = newArray.filter(item => item !== value);
      } else {
        newArray.push(value);
      }
      
      // Debug log in development mode only
      if (process.env.NODE_ENV === 'development' && name === 'therapyTypes') {
        console.log(`Updated therapyTypes array: [${newArray.join(', ')}]`);
      }
      
      // Create copy of state with the updated array
      return { 
          ...prev, 
        [name]: newArray 
        };
    });
    
    // Mark that we have unsaved changes
    setHasUnsavedChanges(true);
  };

  // Handle avatar change
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add education field
  const addEducation = () => {
    setProfile(prev => ({
      ...prev,
      education: [...(prev.education || []), { degree: '', institution: '', year: '' }]
    }));
  };

  // Update education field
  const updateEducation = (index: number, field: string, value: string) => {
    setProfile(prev => {
      const updatedEducation = [...(prev.education || [])];
      updatedEducation[index] = { 
        ...updatedEducation[index], 
        [field]: value 
      };
      return { ...prev, education: updatedEducation };
    });
  };

  // Remove education field
  const removeEducation = (index: number) => {
    setProfile(prev => {
      const updatedEducation = [...(prev.education || [])];
      updatedEducation.splice(index, 1);
      return { ...prev, education: updatedEducation };
    });
  };

  // Add experience field
  const addExperience = () => {
    setProfile(prev => ({
      ...prev,
      experience: [...(prev.experience || []), { title: '', place: '', duration: '' }]
    }));
  };

  // Update experience field
  const updateExperience = (index: number, field: string, value: string) => {
    setProfile(prev => {
      const updatedExperience = [...(prev.experience || [])];
      updatedExperience[index] = { 
        ...updatedExperience[index], 
        [field]: value 
      };
      return { ...prev, experience: updatedExperience };
    });
  };

  // Remove experience field
  const removeExperience = (index: number) => {
    setProfile(prev => {
      const updatedExperience = [...(prev.experience || [])];
      updatedExperience.splice(index, 1);
      return { ...prev, experience: updatedExperience };
    });
  };

  // Create a handler for country change
  const handleCountryChange = (country: string) => {
    setProfile(prev => {
      // Get prefix for the selected country
      const prefix = countryPhonePrefixes[country] || '';

      // Normalize existing phone number by removing all whitespace
      const currentPhone = (prev.phoneNumber || '').replace(/\s+/g, '');
      
      // Determine if we should update the phone number
      let phoneNumber = currentPhone;
      
      // If phone is empty or equals another country's prefix, replace it
      const isPhoneEmpty = !currentPhone || currentPhone === '';
      const isCurrentlyJustAPrefix = Object.values(countryPhonePrefixes).some(p => 
        currentPhone === p || currentPhone === p.replace('+', '')
      );
      
      if (isPhoneEmpty || isCurrentlyJustAPrefix) {
        phoneNumber = prefix;
        // Remove console.log for production
        // console.log(`Applied country prefix ${prefix} for ${country}`);
      }

      return {
        ...prev,
        location: country,
        phoneNumber
      };
    });
  };
  
  // Add an explicit function to automatically prefill phone number with country code
  const prefillPhoneWithCountryCode = () => {
    if (!profile.location || profile.phoneNumber) return; // Don't override if already set
    
    const prefix = countryPhonePrefixes[profile.location] || '';
    if (prefix) {
      setProfile(prev => ({
        ...prev,
        phoneNumber: prefix
      }));
      
      // Remove console.log for production
      // console.log(`Automatically added country prefix ${prefix} for ${profile.location}`);
    }
  };
  
  // Fix the problematic useEffect that causes infinite loop
  useEffect(() => {
    // Only run this effect if we haven't initialized the phone yet
    if (!phoneInitialized.current) {
      // Mark as initialized immediately to prevent any possibility of re-runs
      phoneInitialized.current = true;
      
      if (profile.location && !profile.phoneNumber) {
        const prefix = countryPhonePrefixes[profile.location] || '';
        if (prefix) {
          setProfile(prev => {
            // Only update if the phone number is still empty
            if (prev.phoneNumber) return prev;
              
            return {
              ...prev,
              phoneNumber: prefix
            };
          });
        }
      }
    }
  }, [profile.location]); // Only depend on location

  // Add a function to check if a tab is complete
  const isTabComplete = (tabName: string): boolean => {
    switch (tabName) {
      case 'personal':
        return !!(profile.fullName && profile.email && profile.gender && 
                 profile.location && profile.phoneNumber && profile.bio);
      case 'professional':
        return !!(profile.specialty && profile.therapyTypes?.length && 
                 profile.languages?.length && profile.availabilityStatus);
      case 'qualifications':
        return !!(profile.education?.length && profile.education.every(edu => 
                 edu.degree && edu.institution && edu.year) && 
                 profile.experience?.length && profile.experience.every(exp => 
                 exp.title && exp.place && exp.duration));
      default:
        return false;
    }
  };

  // Add visual indicator of tab completion
  const getTabCompletionState = (tabName: string) => {
    const complete = isTabComplete(tabName);
    return {
      label: complete ? `${tabName.charAt(0).toUpperCase() + tabName.slice(1)} ✓` : tabName.charAt(0).toUpperCase() + tabName.slice(1),
      className: complete ? 'text-green-600 font-medium' : ''
    };
  };

  // Add a custom tab change handler
  const handleTabChange = (newTab: string) => {
    // If we have unsaved changes, show a confirmation prompt
    if (hasUnsavedChanges) {
      setAttemptingTabChange(newTab);
      
      // Ask the user if they want to save changes
      if (window.confirm('You have unsaved changes. Would you like to save before switching tabs?')) {
        // Save changes first, then change tab
        handleSaveProfile().then(() => {
          setActiveTab(newTab);
          setAttemptingTabChange(null);
          setHasUnsavedChanges(false);
        });
      } else {
        // Discard changes and switch tabs
        setActiveTab(newTab);
        setAttemptingTabChange(null);
        setHasUnsavedChanges(false);
      }
    } else {
      // No unsaved changes, just switch tabs
      setActiveTab(newTab);
    }
  };

  // Add this function after the other helper functions in the component
  const checkPermissions = async () => {
    if (!user?.id) {
      toast.error('User ID is missing. Please log in again.');
      return;
    }
    
    try {
      // Perform a read test
      const readResponse = await moodMentorService.getMoodMentorById(user.id);
      
      if (!readResponse.success) {
        toast.error(`Read permission error: ${readResponse.error || 'Unknown error'}`);
      } else {
        toast.success('You have read permission for profiles');
      }
      
      // Perform a write test (temporary update)
      const writeResponse = await moodMentorService.updateMoodMentorProfile({
        userId: user.id,
        isActive: true
      });
      
      if (!writeResponse.success) {
        toast.error(`Write permission error: ${writeResponse.error || 'Unknown error'}`);
        
        if (writeResponse.error?.includes('permission denied')) {
          toast.error('Permission denied - check Row Level Security policy');
        }
      } else {
        toast.success('You have write permission for profiles');
      }
    } catch (error: any) {
      toast.error(`Permission check failed: ${error.message}`);
    }
  };

  // Add a unified error handler function
  const handleError = (error: any, context: string, detailMessage?: string): string => {
    const errorMessage = error?.message || 'An unknown error occurred';
    
    // Display error to user
    toast.error(`${context}: ${errorMessage}`);
    
    // Add to debug log with more details
    console.error(`${context} Error: ${errorMessage}`, detailMessage || error?.stack);
    
    return errorMessage;
  };

  // Add a debug function to check user ID and profile relationship
  const debugProfileIdRelationship = async () => {
    if (!user?.id) {
      toast.error('No user ID available');
      return;
    }

    try {
      toast.info('Checking profile ID relationship...');
      console.log('Auth user ID:', user.id);

      // First check by user_id
      const { data: userData, error: userError } = await supabase
        .from('mood_mentor_profiles')
        .select('id, user_id, full_name, created_at')
        .eq('user_id', user.id);

      if (userError) {
        console.error('Error querying by user_id:', userError);
      }

      if (userData && userData.length > 0) {
        console.log('Found profile(s) by user_id:', userData);
        toast.success(`Found ${userData.length} profile(s) by user ID`);
      } else {
        console.log('No profiles found by user_id');
        toast.warning('No profiles found by user ID');
        
        // Try to find any profile that might match this user
        const { data: nameData, error: nameError } = await supabase
          .from('mood_mentor_profiles')
          .select('id, user_id, full_name, created_at')
          .ilike('full_name', `%${user.user_metadata?.full_name || user.user_metadata?.name || ''}%`);
          
        if (nameError) {
          console.error('Error querying by name:', nameError);
        }
        
        if (nameData && nameData.length > 0) {
          console.log('Found potential matching profile(s) by name:', nameData);
          toast.info(`Found ${nameData.length} potential profile(s) by name`);
          
          // Offer to fix the relationship
          if (window.confirm(`Found a profile with ID ${nameData[0].id} that might belong to you. Would you like to link it to your account?`)) {
            const { error: updateError } = await supabase
              .from('mood_mentor_profiles')
              .update({ user_id: user.id })
              .eq('id', nameData[0].id);
              
            if (updateError) {
              console.error('Error updating profile:', updateError);
              toast.error('Failed to update profile relationship');
            } else {
              toast.success('Successfully linked profile to your account');
              // Refresh the profile data
              fetchProfileData();
            }
          }
        } else {
          toast.error('No matching profiles found');
        }
      }
    } catch (error) {
      console.error('Debug error:', error);
      toast.error('Error checking profile relationship');
    }
  };

  // Use a useEffect to fetch profile data when component mounts
  useEffect(() => {
    if (user?.id) {
      fetchProfileData();
    } else {
      // If no user, set loading to false to prevent infinite loading
      setIsLoading(false);
    }
  }, [user?.id]); // Only depend on user.id, not the entire user object

  // Toggle edit mode with confirmation
  const toggleEditMode = () => {
    // If we're exiting edit mode and have unsaved changes, confirm
    if (isEditMode && hasUnsavedChanges) {
      const shouldSave = window.confirm('You have unsaved changes. Would you like to save them?');
      
      if (shouldSave) {
        // Save changes and then turn off edit mode
        handleSaveProfile().then(() => {
          // setIsEditMode is handled in handleSaveProfile
        }).catch(() => {
          // If saving fails, keep edit mode on
        });
      } else {
        // Reset to the last saved state by re-fetching
        fetchProfileData();
        setHasUnsavedChanges(false);
        setIsEditMode(false);
      }
    } else {
      // If we're starting to edit a new profile that's not complete, 
      // we should automatically set it to edit mode without toggle
      if (!isEditMode && !profile.isProfileComplete) {
        setIsEditMode(true);
      } else {
        // Toggle edit mode normally for completed profiles
        setIsEditMode(!isEditMode);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
            <p className="text-sm text-muted-foreground">
              Manage your profile information and visibility
            </p>
            </div>
          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Button 
                  onClick={toggleEditMode}
                  variant="outline" 
                  disabled={isLoading || isSaving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={isLoading || isSaving || !isFormValid()}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button 
                  onClick={toggleEditMode} 
                  disabled={isLoading || isSaving}
                >
                  Edit Profile
                </Button>
              </>
            )}
          </div>
        </div>
        
        <Card className="mt-6">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          )}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full md:w-auto grid-cols-3">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="professional">Professional</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            
            <TabsContent value="personal" className="space-y-4">
              <CardHeader>
                <CardTitle className="text-xl">Personal Information</CardTitle>
                <CardDescription>
                  Update your personal information and contact details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="flex flex-col items-center sm:flex-row sm:items-start gap-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                        <AvatarImage 
                          src={avatarPreview || profile.avatarUrl || '/avatars/default-avatar.png'} 
                          alt={profile.fullName}
                        />
                        <AvatarFallback>
                          {profile.fullName?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                      {isEditMode && (
                        <div className="absolute -bottom-2 -right-2">
                          <label
                            htmlFor="avatar-upload"
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary shadow-sm hover:bg-primary/90"
                          >
                            <Upload className="h-4 w-4 text-primary-foreground" />
                            <span className="sr-only">Upload new photo</span>
                            <input
                              id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                              onChange={handleAvatarChange}
                      />
                          </label>
                    </div>
                      )}
                    </div>
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className="text-2xl font-semibold">{profile.fullName}</h3>
                      <div className="text-sm text-muted-foreground">{profile.email}</div>
                      <div className="flex items-center gap-2 text-sm">
                        <Badge 
                          variant={profile.isProfileComplete ? "default" : "outline"} 
                          className="mt-1"
                        >
                          {profile.isProfileComplete ? (
                            <><UserCheck className="mr-1 h-3 w-3" /> Verified</>
                          ) : (
                            'Incomplete'
                          )}
                        </Badge>
                        {profile.specialty && (
                          <Badge 
                            variant="secondary" 
                            className="mt-1"
                          >
                            <Medal className="mr-1 h-3 w-3" />
                            {profile.specialty}
                          </Badge>
                        )}
                      </div>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                        value={profile.fullName}
                      onChange={handleInputChange}
                        disabled={!isEditMode || isLoading}
                      placeholder="Your full name"
                    />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                        value={profile.email}
                        disabled={true} // Email can't be changed here
                        placeholder="Your email address"
                      />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        value={profile.phoneNumber}
                        onChange={handleInputChange}
                        disabled={!isEditMode || isLoading}
                        placeholder="e.g. +234 800 123 4567"
                      />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                    <Select
                        value={profile.gender}
                      onValueChange={(value) => handleSelectChange('gender', value)}
                        disabled={!isEditMode || isLoading}
                    >
                        <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                          {genderOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                  <Select
                        value={profile.location}
                        onValueChange={(value) => handleCountryChange(value)}
                        disabled={!isEditMode || isLoading}
                      >
                        <SelectTrigger id="location">
                          <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                          {countryOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                      <Label htmlFor="languages">Languages Spoken</Label>
                      <div className="relative">
                        <DropdownMenu
                          open={isLanguageDropdownOpen}
                          onOpenChange={setIsLanguageDropdownOpen}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={!isEditMode || isLoading}
                              className="w-full justify-between font-normal"
                            >
                              {profile.languages && profile.languages.length > 0
                                ? `${profile.languages.length} Selected`
                                : "Select languages"}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-full max-h-[calc(var(--radix-dropdown-menu-content-available-height))] overflow-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-1">
                              {languageOptions.map((language) => (
                                <div 
                                  key={language} 
                                  className="flex items-center space-x-2 px-2 py-1 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
                                  onClick={() => handleArraySelectChange('languages', language)}
                                >
                                  <div className={`h-4 w-4 border rounded-sm ${
                                    profile.languages?.includes(language) ? 'bg-primary border-primary flex items-center justify-center' : 'border-input'
                                  }`}>
                                    {profile.languages?.includes(language) && (
                                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                                  <span>{language}</span>
                </div>
                              ))}
                        </div>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {profile.languages?.map((language) => (
                          <Badge key={language} variant="secondary" className="flex items-center gap-1">
                            <Languages className="h-3 w-3" />
                            {language}
                              {isEditMode && (
                                <button
                                type="button"
                                className="h-3 w-3 rounded-full"
                                onClick={() => handleArraySelectChange('languages', language)}
                              >
                                <X className="h-3 w-3" />
                                </button>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={profile.bio}
                      onChange={handleInputChange}
                      disabled={!isEditMode || isLoading}
                      placeholder="Tell patients a bit about yourself..."
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </CardContent>
          </TabsContent>
          
            <TabsContent value="professional" className="space-y-4">
              <CardHeader>
                <CardTitle className="text-xl">Professional Information</CardTitle>
                <CardDescription>
                  Add your professional credentials, experience and specialties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="specialty">Primary Specialty</Label>
                      <Input
                        id="specialty"
                        name="specialty"
                        value={profile.specialty}
                        onChange={handleInputChange}
                        disabled={!isEditMode || isLoading}
                        placeholder="e.g. Clinical Psychologist"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sessionDuration">Typical Session Duration</Label>
                      <Select
                        value={profile.sessionDuration}
                        onValueChange={(value) => handleSelectChange('sessionDuration', value)}
                        disabled={!isEditMode || isLoading}
                      >
                        <SelectTrigger id="sessionDuration">
                          <SelectValue placeholder="Select session length" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30 Min">30 Minutes</SelectItem>
                          <SelectItem value="45 Min">45 Minutes</SelectItem>
                          <SelectItem value="60 Min">60 Minutes</SelectItem>
                          <SelectItem value="90 Min">90 Minutes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Education Section */}
                  <div className="space-y-2">
                  <div className="flex items-center justify-between">
                      <Label>Education</Label>
                      {isEditMode && (
                    <Button
                          type="button"
                      variant="outline"
                      size="sm"
                          onClick={addEducation}
                          disabled={isLoading}
                    >
                      Add Education
                    </Button>
                      )}
                  </div>
                    <div className="space-y-3">
                    {profile.education?.map((edu, index) => (
                        <div key={index} className="grid gap-3 rounded-lg border p-3">
                          <div className="grid gap-2 md:grid-cols-3">
                            <div className="space-y-1">
                              <Label htmlFor={`edu-degree-${index}`}>Degree</Label>
                              <Input
                                id={`edu-degree-${index}`}
                                value={edu.degree}
                                onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                                disabled={!isEditMode || isLoading}
                                placeholder="e.g. Ph.D in Psychology"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`edu-institution-${index}`}>Institution</Label>
                              <Input
                                id={`edu-institution-${index}`}
                                value={edu.institution}
                                onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                                disabled={!isEditMode || isLoading}
                                placeholder="e.g. University of Nairobi"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`edu-year-${index}`}>Year</Label>
                              <Input
                                id={`edu-year-${index}`}
                                value={edu.year}
                                onChange={(e) => updateEducation(index, 'year', e.target.value)}
                                disabled={!isEditMode || isLoading}
                                placeholder="e.g. 2018"
                              />
                            </div>
                          </div>
                          {isEditMode && (
                                <Button
                              type="button"
                                  variant="destructive"
                                  size="sm"
                              className="w-auto self-end"
                              onClick={() => removeEducation(index)}
                              disabled={isLoading || profile.education.length <= 1}
                                >
                                  Remove
                                </Button>
                            )}
                          </div>
                    ))}
                  </div>
                </div>

                  {/* Work Experience Section */}
                  <div className="space-y-2">
                  <div className="flex items-center justify-between">
                      <Label>Work Experience</Label>
                      {isEditMode && (
                    <Button
                          type="button"
                      variant="outline"
                      size="sm"
                          onClick={addExperience}
                          disabled={isLoading}
                    >
                      Add Experience
                    </Button>
                      )}
                  </div>
                    <div className="space-y-3">
                    {profile.experience?.map((exp, index) => (
                        <div key={index} className="grid gap-3 rounded-lg border p-3">
                          <div className="grid gap-2 md:grid-cols-3">
                            <div className="space-y-1">
                              <Label htmlFor={`exp-title-${index}`}>Title</Label>
                              <Input
                                id={`exp-title-${index}`}
                                value={exp.title}
                                onChange={(e) => updateExperience(index, 'title', e.target.value)}
                                disabled={!isEditMode || isLoading}
                                placeholder="e.g. Clinical Psychologist"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`exp-place-${index}`}>Place</Label>
                              <Input
                                id={`exp-place-${index}`}
                                value={exp.place}
                                onChange={(e) => updateExperience(index, 'place', e.target.value)}
                                disabled={!isEditMode || isLoading}
                                placeholder="e.g. Nairobi Hospital"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`exp-duration-${index}`}>Duration</Label>
                              <Input
                                id={`exp-duration-${index}`}
                                value={exp.duration}
                                onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                                disabled={!isEditMode || isLoading}
                                placeholder="e.g. 2018-Present"
                              />
                            </div>
                          </div>
                          {isEditMode && (
                                <Button
                              type="button"
                                  variant="destructive"
                                  size="sm"
                              className="w-auto self-end"
                              onClick={() => removeExperience(index)}
                              disabled={isLoading || profile.experience.length <= 1}
                                >
                                  Remove
                                </Button>
                            )}
                          </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Therapy Types</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {therapyOptions.map((therapy) => (
                        <div 
                          key={therapy} 
                          className={`flex items-center space-x-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            profile.therapyTypes?.includes(therapy) 
                              ? 'border-primary bg-primary/10'
                              : 'border-input hover:bg-accent hover:text-accent-foreground'
                          } ${!isEditMode && 'pointer-events-none'}`}
                          onClick={() => isEditMode && handleArraySelectChange('therapyTypes', therapy)}
                        >
                          {therapy}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
          </TabsContent>
          
            <TabsContent value="settings" className="space-y-4">
              <CardHeader>
                <CardTitle className="text-xl">Settings</CardTitle>
                <CardDescription>
                  Manage your account settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  {/* Account Status */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Account Status</h3>
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">Availability Status</div>
                        <div className="text-sm text-muted-foreground">
                          Set your status to control whether patients can book sessions with you
                        </div>
                      </div>
                      <div>
                        <Select
                          value={profile.availabilityStatus}
                          onValueChange={(value) => handleSelectChange('availabilityStatus', value)}
                          disabled={!isEditMode || isLoading}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                            <SelectItem value="busy">Busy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">Account Active</div>
                        <div className="text-sm text-muted-foreground">
                          Enable or disable your account visibility on the platform
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          className={`px-3 py-1 rounded-md ${
                            profile.isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                          onClick={() => isEditMode && handleSelectChange('isActive', true)}
                          disabled={!isEditMode || isLoading}
                        >
                          Active
                        </button>
                        <button
                          className={`px-3 py-1 rounded-md ${
                            !profile.isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                          onClick={() => isEditMode && handleSelectChange('isActive', false)}
                          disabled={!isEditMode || isLoading}
                        >
                          Inactive
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Payment Settings */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Payment Settings</h3>
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">Free Consultation</div>
                        <div className="text-sm text-muted-foreground">
                          Offer free initial consultations to patients
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          className={`px-3 py-1 rounded-md ${
                            profile.isFree
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                          onClick={() => isEditMode && handleSelectChange('isFree', true)}
                          disabled={!isEditMode || isLoading}
                        >
                          Yes
                        </button>
                        <button
                          className={`px-3 py-1 rounded-md ${
                            !profile.isFree
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                          onClick={() => isEditMode && handleSelectChange('isFree', false)}
                          disabled={!isEditMode || isLoading}
                        >
                          No
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border p-4 rounded-lg">
                      <div className="space-y-0.5">
                        <div className="text-sm font-medium">Hourly Rate</div>
                        <div className="text-sm text-muted-foreground">
                          The fee you charge per hour (USD)
                        </div>
                      </div>
                      <div className="w-24">
                        <Input
                          type="number"
                          name="hourlyRate"
                          value={profile.hourlyRate}
                          onChange={handleInputChange}
                          disabled={!isEditMode || isLoading || profile.isFree}
                          min="0"
                          max="500"
                          className="text-right"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Privacy */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Privacy Settings</h3>
                    <div className="text-sm text-muted-foreground mb-2">
                      Control what information is visible on your public profile
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="show-email"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={true}
                          disabled={true}
                        />
                        <label htmlFor="show-email" className="text-sm font-medium">
                          Show name on public profile (required)
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="show-phone"
                          className="h-4 w-4 rounded border-gray-300"
                          checked={false}
                          disabled={true}
                        />
                        <label htmlFor="show-phone" className="text-sm font-medium">
                          Show phone number on public profile (controlled by admin)
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {/* Account Management */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Account Management</h3>
                    <div className="text-sm text-muted-foreground mb-2">
                      Manage your account on the platform
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="destructive" disabled={true} className="w-auto">
                        Request Account Deletion
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={debugProfileIdRelationship} 
                        className="w-auto"
                      >
                        Fix Profile Data
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Note: Account deletion requests are processed by administrators. Please contact support for immediate assistance.
                    </div>
                  </div>
                </div>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}