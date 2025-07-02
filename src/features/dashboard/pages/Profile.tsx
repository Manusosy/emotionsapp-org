import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '@/services'
import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Supabase import removed
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Settings,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Home,
  Building2,
  BadgeHelp,
  Clock,
  Shield,
  Edit,
  Pencil,
  Users,
  FileText,
  Bell,
  Key
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import FallbackAvatar from "@/components/ui/fallback-avatar";
import { AuthContext } from "@/contexts/authContext";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PatientProfile } from "@/services/patient/patient.interface";
import { UserWithMetadata } from "@/services/auth/auth.service";

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext) as { user: UserWithMetadata | null };
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("personal");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        if (!user) {
          return;
        }

        // Use the patient service to fetch the profile
        const response = await patientService.getPatientById(user.id);
        
        if (response.success && response.data) {
          // Use the profile data from the service
          setProfile(response.data);
        } else {
          // If no profile exists yet, create a default one from user metadata
          // Get user metadata with type assertion to access properties safely
          const metadata = user.user_metadata as any || {};
          
          // Create a default profile
          const defaultProfile: PatientProfile = {
            id: '',
            userId: user.id,
            fullName: metadata.name || user.email?.split('@')[0] || 'Patient',
            email: user.email || '',
            location: metadata.country || '',
            gender: metadata.gender || '',
            avatarUrl: metadata.avatarUrl || '',
            phoneNumber: '',
            createdAt: user.created_at || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Save this default profile to the database
          const saveResult = await patientService.updatePatientProfile(defaultProfile);
          
          if (saveResult.success && saveResult.data) {
            setProfile(saveResult.data);
          } else if (saveResult.error) {
            // Only show error if there was an actual error from the service
            console.error('Error saving profile:', saveResult.error);
            toast.error("Failed to save profile data");
            // Still use the default profile for display
            setProfile(defaultProfile);
          } else {
            // No error but no data either - just use the default
            setProfile(defaultProfile);
          }
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        // Only show user-facing error for unexpected exceptions
        toast.error("Error loading profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-5xl mx-auto space-y-8">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-[200px] w-full rounded-xl" />
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Profile</h1>
            <p className="text-muted-foreground mt-1">View and manage your personal information</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => navigate('/patient-dashboard/appointments')}
              className="border-blue-200 text-blue-600"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
            <Button 
              onClick={() => navigate('/patient-dashboard/settings')}
              className="bg-[#20C0F3] hover:bg-[#20C0F3]/90 text-white"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </div>

        {profile ? (
          <div className="space-y-8">
            {/* Basic Info Card */}
            <Card className="overflow-hidden border-none shadow-md rounded-xl">
              <div className="bg-gradient-to-r from-[#20C0F3]/90 to-[#20C0F3]/70 h-32 relative">
                <div className="absolute -bottom-16 left-8">
                  <FallbackAvatar
                    src={profile.avatarUrl}
                    name={profile.fullName}
                    className="h-32 w-32 border-4 border-white shadow-md"
                  />
                </div>
              </div>
              <CardContent className="pt-20 pb-6 px-8">
                <div className="flex flex-col md:flex-row md:justify-between md:items-end">
                  <div>
                    <h2 className="text-2xl font-bold">
                      {profile.fullName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="bg-[#20C0F3]/10 border-[#20C0F3]/20 text-[#20C0F3] font-medium">
                        <BadgeHelp className="h-3.5 w-3.5 mr-1" />
                        {profile.nameSlug || 'Patient'}
                      </Badge>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0">
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      Member since {format(new Date(profile.createdAt), 'MMMM yyyy')}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="bg-[#20C0F3]/10 p-2 rounded-full">
                      <Mail className="h-5 w-5 text-[#20C0F3]" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{profile.email}</p>
                    </div>
                  </div>
                  
                  {profile.phoneNumber && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="bg-[#20C0F3]/10 p-2 rounded-full">
                        <Phone className="h-5 w-5 text-[#20C0F3]" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{profile.phoneNumber}</p>
                      </div>
                    </div>
                  )}
                  
                  {profile.dateOfBirth && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="bg-[#20C0F3]/10 p-2 rounded-full">
                        <Calendar className="h-5 w-5 text-[#20C0F3]" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">
                          {format(new Date(profile.dateOfBirth), 'PP')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {profile.gender && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="bg-[#20C0F3]/10 p-2 rounded-full">
                        <User className="h-5 w-5 text-[#20C0F3]" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium capitalize">{profile.gender}</p>
                      </div>
                    </div>
                  )}
                  
                  {profile.location && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="bg-[#20C0F3]/10 p-2 rounded-full">
                        <MapPin className="h-5 w-5 text-[#20C0F3]" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Country</p>
                        <p className="font-medium">{profile.location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tabs for various profile sections */}
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-slate-100 p-1">
                <TabsTrigger value="personal" className="rounded-md data-[state=active]:bg-white">
                  <User className="h-4 w-4 mr-2" />
                  Personal Details
                </TabsTrigger>
                <TabsTrigger value="address" className="rounded-md data-[state=active]:bg-white">
                  <Home className="h-4 w-4 mr-2" />
                  Address
                </TabsTrigger>
                <TabsTrigger value="account" className="rounded-md data-[state=active]:bg-white">
                  <Shield className="h-4 w-4 mr-2" />
                  Account
                </TabsTrigger>
                <TabsTrigger value="privacy" className="rounded-md data-[state=active]:bg-white">
                  <Key className="h-4 w-4 mr-2" />
                  Privacy
                </TabsTrigger>
              </TabsList>

              {/* Personal Details Tab */}
              <TabsContent value="personal">
                <Card className="shadow-md border-none rounded-xl">
                  <CardHeader className="border-b">
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center">
                        <User className="h-5 w-5 mr-2 text-[#20C0F3]" />
                        Personal Details
                      </CardTitle>
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/patient-dashboard/settings')}
                        className="text-sm"
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Full Name</p>
                        <p className="font-medium">{profile.fullName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{profile.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{profile.phoneNumber || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                        <p className="font-medium">
                          {profile.dateOfBirth 
                            ? format(new Date(profile.dateOfBirth), 'PP') 
                            : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium capitalize">{profile.gender || 'Not specified'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Country</p>
                        <p className="font-medium">{profile.location || 'Not specified'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Address Tab */}
              <TabsContent value="address">
                <Card className="shadow-md border-none rounded-xl">
                  <CardHeader className="border-b">
                    <div className="flex justify-between items-center">
                      <CardTitle className="flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-[#20C0F3]" />
                        Address Information
                      </CardTitle>
                      <Button 
                        size="sm"
                        variant="ghost" 
                        onClick={() => navigate('/patient-dashboard/settings')}
                        className="text-[#20C0F3]"
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="py-6">
                    {(profile.address || profile.city || profile.state || profile.pincode) ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                        {profile.address && (
                          <div>
                            <h3 className="text-sm font-medium text-slate-500">Street Address</h3>
                            <p className="mt-1">{profile.address}</p>
                          </div>
                        )}
                        {profile.city && (
                          <div>
                            <h3 className="text-sm font-medium text-slate-500">City</h3>
                            <p className="mt-1">{profile.city}</p>
                          </div>
                        )}
                        {profile.state && (
                          <div>
                            <h3 className="text-sm font-medium text-slate-500">State</h3>
                            <p className="mt-1">{profile.state}</p>
                          </div>
                        )}
                        {profile.pincode && (
                          <div>
                            <h3 className="text-sm font-medium text-slate-500">Pincode</h3>
                            <p className="mt-1">{profile.pincode}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <MapPin className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <h3 className="text-lg font-medium mb-1">No address information</h3>
                        <p className="text-slate-500 mb-4 max-w-md mx-auto">
                          You haven't added your address information yet. Adding your address helps us provide better location-based services.
                        </p>
                        <Button 
                          onClick={() => navigate('/patient-dashboard/settings')}
                          className="bg-[#20C0F3] hover:bg-[#20C0F3]/90 text-white"
                        >
                          Add Address
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Account Tab */}
              <TabsContent value="account">
                <Card className="shadow-md border-none rounded-xl">
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center">
                      <Shield className="h-5 w-5 mr-2 text-[#20C0F3]" />
                      Account Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50">
                        <div className="bg-[#20C0F3]/10 p-2 rounded-full">
                          <Clock className="h-5 w-5 text-[#20C0F3]" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Member Since</p>
                          <p className="font-medium">{format(new Date(profile.createdAt), 'PPP')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50">
                        <div className="bg-green-100 p-2 rounded-full">
                          <Shield className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Account Status</p>
                          <p className="font-medium">Active</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50">
                        <div className="bg-[#20C0F3]/10 p-2 rounded-full">
                          <BadgeHelp className="h-5 w-5 text-[#20C0F3]" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Patient ID</p>
                          <p className="font-medium">{profile.nameSlug || 'Patient'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50">
                        <div className="bg-[#20C0F3]/10 p-2 rounded-full">
                          <Bell className="h-5 w-5 text-[#20C0F3]" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Notifications</p>
                          <p className="font-medium">Enabled</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t">
                      <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <Calendar className="h-4 w-4 text-blue-500" />
                          </div>
                          <div>
                            <p className="font-medium">Last appointment</p>
                            <p className="text-sm text-slate-500">2 weeks ago</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                          <div className="bg-purple-100 p-2 rounded-full">
                            <Users className="h-4 w-4 text-purple-500" />
                          </div>
                          <div>
                            <p className="font-medium">Community engagement</p>
                            <p className="text-sm text-slate-500">Participated in 2 community discussions</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                          <div className="bg-amber-100 p-2 rounded-full">
                            <FileText className="h-4 w-4 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-medium">Resource downloads</p>
                            <p className="text-sm text-slate-500">Downloaded 5 mental health resources</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Privacy Tab */}
              <TabsContent value="privacy">
                <Card className="shadow-md border-none rounded-xl">
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center">
                      <Key className="h-5 w-5 mr-2 text-[#20C0F3]" />
                      Privacy Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                        <div>
                          <h3 className="font-medium">Profile Visibility</h3>
                          <p className="text-sm text-slate-500">Control who can see your profile information</p>
                        </div>
                        <div>
                          <select className="border rounded px-3 py-1.5 text-sm">
                            <option>Only me</option>
                            <option selected>My care team</option>
                            <option>Community members</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                        <div>
                          <h3 className="font-medium">Data Sharing</h3>
                          <p className="text-sm text-slate-500">Control how your health data is shared</p>
                        </div>
                        <div>
                          <select className="border rounded px-3 py-1.5 text-sm">
                            <option>Don't share</option>
                            <option selected>Share with my care team only</option>
                            <option>Share anonymized data for research</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                        <div>
                          <h3 className="font-medium">Two-Factor Authentication</h3>
                          <p className="text-sm text-slate-500">Add an extra layer of security to your account</p>
                        </div>
                        <div>
                          <Button variant="outline" size="sm">
                            Enable
                          </Button>
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <h3 className="text-lg font-medium mb-4">Data & Privacy</h3>
                        <div className="flex flex-col gap-4">
                          <Button variant="link" className="justify-start p-0 h-auto text-left w-fit">
                            Download your data
                          </Button>
                          <Button variant="link" className="justify-start p-0 h-auto text-left w-fit">
                            View privacy policy
                          </Button>
                          <Button variant="link" className="justify-start p-0 h-auto text-left w-fit">
                            Cookie preferences
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Profile data could not be loaded.</p>
            <Button 
              onClick={() => navigate('/patient-dashboard/settings')}
              className="mt-4"
            >
              Set Up Profile
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}



