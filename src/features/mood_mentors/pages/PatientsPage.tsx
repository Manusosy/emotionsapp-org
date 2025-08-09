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
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, MessageSquare, Eye, Users, Plus, UserPlus, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/authContext";
import { ChatButton } from "@/components/messaging/ChatButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from "sonner";
// Support groups service removed - will be reimplemented

// Define a temporary placeholder interface
interface SupportGroup {
  id: string;
  name: string;
  description: string;
}

// Interface matching the patient_profiles table
interface PatientProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  groups?: GroupMembership[];
}

interface GroupMembership {
  id: string;
  group_id: string;
  status: string;
  joined_at: string;
  group: {
    id: string;
    name: string;
    group_type: string;
  };
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
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientProfile | null>(null);
  const [isAddToGroupOpen, setIsAddToGroupOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const { user } = useAuth();

  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log("Starting patient fetch process...");
      
      // First, get all patient profiles
      const { data: patientProfiles, error: profilesError } = await supabase
        .from("patient_profiles")
        .select('*');
        
      if (profilesError) {
        console.error("Error fetching from patient_profiles:", profilesError);
        throw new Error(`Failed to fetch patients: ${profilesError.message}`);
      }
      
      if (patientProfiles && patientProfiles.length > 0) {
        console.log(`Found ${patientProfiles.length} patients`);
        
        // Get all group memberships for these patients
        const patientUserIds = patientProfiles.map(p => p.user_id);
        
        const { data: groupMemberships, error: membershipsError } = await supabase
          .from("group_members")
          .select(`
            id,
            group_id,
            user_id,
            status,
            joined_at,
            support_groups (
              id,
              name,
              group_type
            )
          `)
          .in('user_id', patientUserIds)
          .eq('status', 'active');
        
        if (membershipsError) {
          console.error("Error fetching group memberships:", membershipsError);
          // Continue without group data
        }
        
        // Map group memberships by user_id
        const membershipsByUser = new Map<string, any[]>();
        if (groupMemberships) {
          groupMemberships.forEach(membership => {
            if (!membershipsByUser.has(membership.user_id)) {
              membershipsByUser.set(membership.user_id, []);
            }
            membershipsByUser.get(membership.user_id)!.push({
              id: membership.id,
              group_id: membership.group_id,
              status: membership.status,
              joined_at: membership.joined_at,
              group: membership.support_groups
            });
          });
        }
        
        // Transform the data to match our interface
        const transformedPatients = patientProfiles.map(patient => ({
          ...patient,
          groups: membershipsByUser.get(patient.user_id) || []
        }));
        
        setPatients(transformedPatients);
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
            created_at: new Date().toISOString(),
            groups: []
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

  const fetchSupportGroups = async () => {
    if (!user) return;
    
    try {
      // Support groups functionality temporarily disabled
      setSupportGroups([]);
    } catch (error) {
      console.error('Error fetching support groups:', error);
    }
  };

  const handleAddToGroup = async () => {
    toast.info('Support groups functionality coming soon!');
    setIsAddToGroupOpen(false);
    setSelectedPatient(null);
    setSelectedGroupId("");
  };

  const handleRemoveFromGroup = async (patientId: string, groupId: string, patientName: string) => {
    toast.info('Support groups functionality coming soon!');
  };

  const openAddToGroupDialog = (patient: PatientProfile) => {
    setSelectedPatient(patient);
    setIsAddToGroupOpen(true);
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
    fetchSupportGroups();

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
          fetchPatients(); // Refresh to get group memberships
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
          fetchPatients(); // Refresh to get updated group memberships
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
            fetchPatients();
          }
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members'
        },
        () => {
          // Refresh patient list when group memberships change
          fetchPatients();
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
        patient_name: p.full_name,
        group_count: p.groups?.length || 0
      })));
    }
  }, [patients, user]);

  // Get available groups for a patient (excluding groups they're already in)
  const getAvailableGroups = (patient: PatientProfile) => {
    const patientGroupIds = patient.groups?.map(g => g.group_id) || [];
    return supportGroups.filter(group => !patientGroupIds.includes(group.id));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Patients</h1>
            <p className="text-muted-foreground">Manage your patient relationships</p>
          </div>
          <Button onClick={fetchPatients} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {/* Mobile loading cards */}
            <div className="block md:hidden space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gray-200"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop loading */}
            <div className="hidden md:block text-center py-10">Loading patients...</div>
          </div>
        ) : patients.length > 0 ? (
          <>
            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
              {patients.map((patient) => (
                <div key={patient.id || patient.user_id} className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-4">
                    {/* Patient Info Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(patient.full_name)}`} />
                        <AvatarFallback>{getInitials(patient.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{patient.full_name || "Unknown"}</div>
                        <div className="text-sm text-gray-500 font-mono truncate">{maskEmail(patient.email)}</div>
                      </div>
                    </div>
                    
                    {/* Support Groups */}
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">Support Groups</div>
                      <div className="flex flex-wrap gap-1">
                        {patient.groups && patient.groups.length > 0 ? (
                          patient.groups.map((membership) => (
                            <Badge 
                              key={membership.id} 
                              variant="secondary" 
                              className="text-xs flex items-center gap-1"
                            >
                              <Users className="h-3 w-3" />
                              {membership.group.name}
                              <button
                                onClick={() => handleRemoveFromGroup(
                                  patient.user_id, 
                                  membership.group_id, 
                                  patient.full_name
                                )}
                                className="ml-1 hover:text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">No groups assigned</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 pt-3 border-t border-gray-100">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => openAddToGroupDialog(patient)}
                          disabled={getAvailableGroups(patient).length === 0}
                          className="flex-1"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add to Group
                        </Button>
                        <Button variant="outline" size="sm" asChild className="flex-1">
                          <Link to={`/mood-mentor-dashboard/patient-profile/${patient.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Profile
                          </Link>
                        </Button>
                      </div>
                      <ChatButton
                        userId={user?.id || ''}
                        targetUserId={patient.user_id}
                        userRole="mood_mentor"
                        variant="default"
                        size="sm"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-md border shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Support Groups</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id || patient.user_id} className="hover:bg-gray-50">
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
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {patient.groups && patient.groups.length > 0 ? (
                            patient.groups.map((membership) => (
                              <Badge 
                                key={membership.id} 
                                variant="secondary" 
                                className="text-xs flex items-center gap-1"
                              >
                                <Users className="h-3 w-3" />
                                {membership.group.name}
                                <button
                                  onClick={() => handleRemoveFromGroup(
                                    patient.user_id, 
                                    membership.group_id, 
                                    patient.full_name
                                  )}
                                  className="ml-1 hover:text-red-500"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">No groups</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openAddToGroupDialog(patient)}
                            disabled={getAvailableGroups(patient).length === 0}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Add to Group
                          </Button>
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
          </>
        ) : (
          <div className="text-center py-10 bg-white rounded-lg border">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No patients found</h3>
            <p className="text-gray-500">
              No patients have been assigned to you yet, or the patient_profiles table may need to be set up.
            </p>
          </div>
        )}

        {/* Add to Group Dialog */}
        <Dialog open={isAddToGroupOpen} onOpenChange={setIsAddToGroupOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Patient to Support Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedPatient && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(selectedPatient.full_name)}`} />
                      <AvatarFallback>{getInitials(selectedPatient.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{selectedPatient.full_name}</div>
                      <div className="text-sm text-gray-500">{maskEmail(selectedPatient.email)}</div>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Support Group</label>
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a support group" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedPatient && getAvailableGroups(selectedPatient).map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{group.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddToGroupOpen(false);
                  setSelectedPatient(null);
                  setSelectedGroupId("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleAddToGroup}
                disabled={!selectedGroupId}
              >
                Add to Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 