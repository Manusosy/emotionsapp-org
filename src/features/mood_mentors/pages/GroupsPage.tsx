import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '@/services';
import React, { useState, useEffect, useContext } from "react";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, MoreVertical, Calendar, MessageSquare, Settings } from "lucide-react";
import { AuthContext } from "@/contexts/authContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
// Supabase import removed
import { Label } from '@/components/ui/label';

interface SupportGroup {
  id: string;
  name: string;
  description: string;
  schedule: Array<{
    day: string;
    time: string;
  }>;
  max_participants: number;
  current_participants: number;
  status: 'active' | 'inactive';
  category: string;
  created_at: string;
}

const groupTypes = [
  'anxiety',
  'depression',
  'stress',
  'relationships',
  'grief',
  'addiction',
  'trauma',
  'other'
] as const;

const createGroupSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  group_type: z.enum(groupTypes),
  meeting_schedule: z.string().min(3, 'Schedule is required'),
  max_participants: z.string().transform(Number).pipe(
    z.number().min(2, 'Minimum 2 participants').max(50, 'Maximum 50 participants')
  ),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

export default function GroupsPage() {
  const { user } = useContext(AuthContext);
  const [groups, setGroups] = useState<SupportGroup[]>([
    {
      id: "1",
      name: "Anxiety Support",
      description: "Weekly support group for managing anxiety and stress",
      schedule: [
        { day: "Monday", time: "7:00 PM" },
        { day: "Thursday", time: "6:00 PM" }
      ],
      max_participants: 15,
      current_participants: 8,
      status: 'active',
      category: 'anxiety',
      created_at: new Date().toISOString()
    },
    {
      id: "2",
      name: "Depression Recovery",
      description: "A safe space to discuss depression and recovery strategies",
      schedule: [
        { day: "Wednesday", time: "5:30 PM" }
      ],
      max_participants: 12,
      current_participants: 5,
      status: 'active',
      category: 'depression',
      created_at: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SupportGroup | null>(null);
  const [patients, setPatients] = useState<any[]>([
    { id: "p1", first_name: "John", last_name: "Doe", email: "john@example.com" },
    { id: "p2", first_name: "Jane", last_name: "Smith", email: "jane@example.com" },
    { id: "p3", first_name: "Alice", last_name: "Johnson", email: "alice@example.com" }
  ]);

  const form = useForm({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      group_type: 'anxiety',
      meeting_schedule: '',
      max_participants: '20',
    },
  });

  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [patientNotes, setPatientNotes] = useState("");

  useEffect(() => {
    fetchGroups();
    fetchPatients();
  }, [user]);

  async function fetchGroups() {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('support_groups')
      .select(`
        *,
        group_members (
          id,
          user_id,
          status,
          notes,
          users (
            full_name,
            email
          )
        )
      `)
      .eq('mood_mentor_id', user.id);

    if (error) {
      toast.error('Failed to fetch groups');
      return;
    }

    setGroups(data || []);
  }

  async function fetchPatients() {
    const { data, error } = await supabase
      .from('patient_profiles')
      .select(`
        id,
        first_name,
        last_name,
        email
      `);

    if (error) {
      toast.error('Failed to fetch patients');
      return;
    }

    setPatients(data || []);
  }

  async function onSubmit(values: CreateGroupFormValues) {
    try {
      const { error } = await supabase
        .from('support_groups')
        .insert({
          ...values,
          mood_mentor_id: user?.id,
          status: 'active',
        });

      if (error) throw error;

      toast.success('Group created successfully');
      setIsCreateOpen(false);
      form.reset();
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create group');
    }
  }

  async function addPatientToGroup(groupId: string, patientId: string, notes: string = '') {
    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: patientId,
          added_by: user?.id,
          notes,
          status: 'active',
        });

      if (error) throw error;

      toast.success('Patient added to group');
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add patient to group');
    }
  }

  const handleCreateGroup = () => {
    setIsCreateOpen(true);
  };

  const handleEditGroup = (groupId: string) => {
    window.location.href = `/mood-mentor-dashboard/groups/${groupId}/edit`;
  };

  const handleViewParticipants = (groupId: string) => {
    window.location.href = `/mood-mentor-dashboard/groups/${groupId}/participants`;
  };

  const handleMessageGroup = (groupId: string) => {
    window.location.href = `/mood-mentor-dashboard/groups/${groupId}/messages`;
  };

  const handleAddPatientClick = (groupId: string) => {
    setSelectedGroupId(groupId);
    setIsAddPatientOpen(true);
  };

  const handleAddPatient = async () => {
    if (!selectedGroupId || !selectedPatient) {
      toast.error("Please select a patient");
      return;
    }

    await addPatientToGroup(selectedGroupId, selectedPatient, patientNotes);
    setIsAddPatientOpen(false);
    setSelectedPatient("");
    setPatientNotes("");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Support Groups</h1>
            <p className="text-muted-foreground">Manage your support groups and sessions</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-[#0078FF] text-white hover:bg-blue-700"
              >
                + Create New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Support Group</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data: CreateGroupFormValues) => onSubmit(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="group_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select group type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {groupTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="meeting_schedule"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Schedule</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Every Monday at 2 PM" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="max_participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Participants</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min="2" max="50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">Create Group</Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No support groups found. Create your first group to get started.
            </div>
          ) : (
            groups.map((group) => (
              <Card key={group.id} className="overflow-hidden">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{group.name}</h3>
                      <span className="inline-block px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 mt-2">
                        {group.category}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditGroup(group.id)}>
                          <Settings className="mr-2 h-4 w-4" />
                          Edit Group
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAddPatientClick(group.id)}>
                          <Users className="mr-2 h-4 w-4" />
                          Add Patient
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewParticipants(group.id)}>
                          <Users className="mr-2 h-4 w-4" />
                          View Participants
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMessageGroup(group.id)}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Message All
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {group.description}
                  </p>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Participants</span>
                        <span className="font-medium">
                          {group.current_participants}/{group.max_participants}
                        </span>
                      </div>
                      <Progress 
                        value={(group.current_participants / group.max_participants) * 100} 
                        className="h-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">Schedule</div>
                      {group.schedule.map((schedule, index) => (
                        <div 
                          key={index}
                          className="flex items-center text-sm"
                        >
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{schedule.day} at {schedule.time}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          group.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {group.status}
                        </span>
                        <Button 
                          variant="outline"
                          onClick={() => handleViewParticipants(group.id)}
                          className="text-sm"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <Dialog open={isAddPatientOpen} onOpenChange={setIsAddPatientOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Patient to Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Patient</Label>
                <Select onValueChange={setSelectedPatient} value={selectedPatient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.first_name} {patient.last_name} - {patient.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="Add any notes about the patient's participation..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddPatientOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddPatient}>
                Add to Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 


