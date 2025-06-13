import React, { useState, useEffect } from "react";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCcw, MessageSquare, Eye } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/authContext";
import { ChatButton } from "@/components/messaging/ChatButton";

// Interface matching the patient_profiles table
interface PatientProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
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

// Helper function to mask email for privacy
const maskEmail = (email: string) => {
  const [username, domain] = email.split('@');
  if (username.length <= 2) return email; // Don't mask very short usernames
  
  const maskedUsername = username.substring(0, 2) + '•••••';
  return `${maskedUsername}@${domain}`;
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Starting patient fetch process...");
      
      // Query the patient_profiles table
      const { data: patientProfiles, error: profilesError } = await supabase
        .from("patient_profiles")
        .select("*");
        
      if (profilesError) {
        console.error("Error fetching from patient_profiles:", profilesError);
        throw new Error(`Failed to fetch patients: ${profilesError.message}`);
      }
      
      if (patientProfiles && patientProfiles.length > 0) {
        console.log(`Found ${patientProfiles.length} patients`);
        setPatients(patientProfiles);
      } else {
        console.log("No patients found in patient_profiles table");
        
        // Try to fetch patients from auth.users via RLS policy
        const { data: authUsers, error: authError } = await supabase
          .rpc('get_patient_users');
        
        if (authError) {
          console.error("Error fetching patient users:", authError);
        } else if (authUsers && authUsers.length > 0) {
          console.log(`Found ${authUsers.length} patients from auth users`);
          
          // Transform auth users to match PatientProfile interface
          const formattedPatients: PatientProfile[] = authUsers.map((p: {
            auth_user_id: string;
            auth_email: string;
            auth_role: string;
            auth_full_name: string | null;
            patient_profile_id: string | null;
          }) => ({
            id: p.patient_profile_id || p.auth_user_id,
            user_id: p.auth_user_id,
            full_name: p.auth_full_name || p.auth_email.split('@')[0],
            email: p.auth_email,
            created_at: new Date().toISOString()
          }));
          
          setPatients(formattedPatients);
        }
      }
    } catch (err) {
      console.error("Error fetching patients:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch patients");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartChat = (patient: PatientProfile) => {
    // In a real app, this would navigate to a chat page or open a chat modal
    console.log(`Starting chat with ${patient.full_name}`);
    alert(`Chat with ${patient.full_name} would open here`);
  };

  // Set up real-time subscription to patient_profiles table
  useEffect(() => {
    // First fetch the initial data
    fetchPatients();

    // Set up the real-time subscription
    const subscription = supabase
      .channel('patient_profiles_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'patient_profiles' 
        }, 
        (payload) => {
          console.log('Real-time INSERT received:', payload);
          
          // Add the new patient to the list without refetching everything
          if (payload.new) {
            setPatients(currentPatients => [...currentPatients, payload.new as PatientProfile]);
          } else {
            // If we don't have the full data, refresh the list
            fetchPatients();
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patient_profiles'
        },
        (payload) => {
          console.log('Real-time UPDATE received:', payload);
          
          // Update the patient in the list without refetching everything
          if (payload.new && payload.new.id) {
            setPatients(currentPatients => 
              currentPatients.map(patient => 
                patient.id === payload.new.id ? {...patient, ...payload.new} : patient
              )
            );
          } else {
            // If we don't have the full data, refresh the list
            fetchPatients();
          }
        }
      )
      .on('postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'patient_profiles'
        },
        (payload) => {
          console.log('Real-time DELETE received:', payload);
          
          // Remove the patient from the list
          if (payload.old && payload.old.id) {
            setPatients(currentPatients => 
              currentPatients.filter(patient => patient.id !== payload.old.id)
            );
          } else {
            // If we don't have the full data, refresh the list
            fetchPatients();
          }
        }
      )
      .subscribe();

    // Clean up subscription on component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Log patient data for debugging
  useEffect(() => {
    if (patients.length > 0 && user) {
      console.log("Current mood mentor ID:", user.id);
      console.log("Patient list for debugging:", patients.map(p => ({
        patient_id: p.id,
        patient_user_id: p.user_id,
        patient_name: p.full_name
      })));
    }
  }, [patients, user]);

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Patients</h1>
          <div className="flex gap-2">
            <Button onClick={fetchPatients} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="text-center py-10">Loading patients...</div>
        ) : patients.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <TableRow key={patient.id || patient.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(patient.full_name)}`} />
                          <AvatarFallback>{getInitials(patient.full_name)}</AvatarFallback>
                        </Avatar>
                        <div className="font-medium">{patient.full_name || "Unknown"}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm select-none">
                      {maskEmail(patient.email)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/mood-mentor-dashboard/patient-profile/${patient.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                        <ChatButton
                          userId={user?.id || ''}
                          targetUserId={patient.user_id}
                          userRole="mood_mentor"
                          variant="outline"
                          size="sm"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-10">
            No patients found. Please make sure the patient_profiles table exists in your Supabase database.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
} 