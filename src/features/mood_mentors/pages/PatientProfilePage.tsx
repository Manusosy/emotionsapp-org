import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, ArrowLeft, Phone, Mail, MapPin, Calendar, Info, AlertCircle, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/authContext";
import { ChatButton } from "@/components/messaging/ChatButton";

// Interface matching the patient_profiles table
interface PatientProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say' | null;
  location: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  name_slug: string | null;
  emergency_contact: string | null;
  health_conditions: string[] | null;
  is_profile_complete: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper function to get initials from a name
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatientProfile = async () => {
      if (!id) {
        setError("No patient ID provided");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("patient_profiles")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          setPatient(data as PatientProfile);
        } else {
          setError("Patient not found");
        }
      } catch (err) {
        console.error("Error fetching patient profile:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch patient profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPatientProfile();
  }, [id]);

  const handleStartChat = () => {
    if (patient) {
      // In a real app, this would navigate to a chat page or open a chat modal
      console.log(`Starting chat with ${patient.full_name}`);
      alert(`Chat with ${patient.full_name} would open here`);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const renderProfileInfo = () => {
    if (!patient) return null;

    return (
      <div className="space-y-8">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Basic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Full Name</p>
                <p className="font-medium">{patient.full_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{patient.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-medium">{patient.phone_number || "Not provided"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">{patient.date_of_birth ? formatDate(patient.date_of_birth) : "Not provided"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium">{patient.gender || "Not specified"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={patient.is_active ? "success" : "destructive"}>
                  {patient.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Location */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Contact & Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-medium">{patient.address || "Not provided"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">City</p>
                <p className="font-medium">{patient.city || "Not provided"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">State</p>
                <p className="font-medium">{patient.state || "Not provided"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pincode</p>
                <p className="font-medium">{patient.pincode || "Not provided"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Emergency Contact</p>
                <p className="font-medium">{patient.emergency_contact || "Not provided"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Health Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Health Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Health Conditions</p>
                {patient.health_conditions && patient.health_conditions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {patient.health_conditions.map((condition, index) => (
                      <Badge key={index} variant="outline">{condition}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No health conditions specified</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Bio / Notes</p>
                <p className="font-medium">{patient.bio || "No bio provided"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">User ID</p>
                <p className="font-mono text-xs">{patient.user_id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Profile ID</p>
                <p className="font-mono text-xs">{patient.id}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Profile Completion</p>
                <Badge variant={patient.is_profile_complete ? "success" : "secondary"}>
                  {patient.is_profile_complete ? "Complete" : "Incomplete"}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">{formatDate(patient.created_at)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">{formatDate(patient.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleGoBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Patient Profile</h1>
          </div>
          {patient && (
            <div className="flex gap-2">
              <ChatButton
                userId={user?.id || ''}
                targetUserId={patient.user_id}
                userRole="mood_mentor"
                variant="outline"
              />
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4">Loading patient profile...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Error Loading Profile
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button variant="outline" onClick={handleGoBack}>Go Back</Button>
            </CardFooter>
          </Card>
        ) : patient ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Patient Summary */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader className="text-center">
                  <div className="flex justify-center mb-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={patient.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(patient.full_name)}`} />
                      <AvatarFallback className="text-2xl">{getInitials(patient.full_name)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle className="text-2xl">{patient.full_name}</CardTitle>
                  <CardDescription className="flex items-center justify-center gap-1">
                    <Mail className="h-4 w-4" />
                    {patient.email}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {patient.phone_number && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{patient.phone_number}</span>
                      </div>
                    )}
                    {(patient.city || patient.state) && (
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{[patient.city, patient.state].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                    {patient.date_of_birth && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{formatDate(patient.date_of_birth)}</span>
                      </div>
                    )}
                    {patient.gender && (
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{patient.gender}</span>
                      </div>
                    )}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={patient.is_active ? "success" : "destructive"}>
                        {patient.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Profile</span>
                      <Badge variant={patient.is_profile_complete ? "success" : "secondary"}>
                        {patient.is_profile_complete ? "Complete" : "Incomplete"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Detailed Information */}
            <div className="lg:col-span-2">
              <Tabs defaultValue="profile">
                <TabsList className="mb-4">
                  <TabsTrigger value="profile">Profile Details</TabsTrigger>
                  <TabsTrigger value="sessions">Sessions</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
                
                <TabsContent value="profile">
                  {renderProfileInfo()}
                </TabsContent>
                
                <TabsContent value="sessions">
                  <Card>
                    <CardHeader>
                      <CardTitle>Session History</CardTitle>
                      <CardDescription>
                        View past and upcoming sessions with this patient.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-center text-muted-foreground py-8">
                        No sessions found for this patient.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="notes">
                  <Card>
                    <CardHeader>
                      <CardTitle>Patient Notes</CardTitle>
                      <CardDescription>
                        Clinical notes and observations.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-center text-muted-foreground py-8">
                        No notes have been added for this patient.
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="text-center py-10">
            <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold">No Patient Found</h2>
            <p className="text-muted-foreground mt-2">The patient profile you're looking for doesn't exist.</p>
            <Button variant="outline" className="mt-4" onClick={handleGoBack}>Go Back</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 