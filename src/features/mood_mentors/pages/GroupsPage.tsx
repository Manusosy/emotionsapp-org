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
import { 
  Users, 
  MoreVertical, 
  Calendar, 
  MessageSquare, 
  Settings, 
  Plus,
  Video,
  MapPin,
  Clock,
  UserPlus,
  Edit,
  Trash2,
  ArrowLeft
} from "lucide-react";
import { AuthContext } from "@/contexts/authContext";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supportGroupsService, SupportGroup, CreateGroupData } from '@/services/support-groups/support-groups.service';
import GroupManagement from '@/features/mood_mentors/components/GroupManagement';

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

const meetingTypes = [
  { value: 'online', label: 'Online' },
  { value: 'in-person', label: 'In-Person' },
  { value: 'hybrid', label: 'Hybrid' }
] as const;

const createGroupSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  group_type: z.enum(groupTypes),
  meeting_type: z.enum(['online', 'in-person', 'hybrid']),
  max_participants: z.coerce.number().min(2, 'Minimum 2 participants').max(50, 'Maximum 50 participants'),
  location: z.string().optional(),
  meeting_day: z.string().min(1, 'Please select a day'),
  meeting_time: z.string().min(1, 'Please select a time'),
});

type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

export default function GroupsPage() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const [groups, setGroups] = useState<SupportGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<SupportGroup | null>(null);
  const [showGroupManagement, setShowGroupManagement] = useState(false);

  const form = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      group_type: 'anxiety',
      meeting_type: 'online',
      max_participants: 20,
      location: '',
      meeting_day: '',
      meeting_time: '',
    },
  });

  useEffect(() => {
    if (user) {
    fetchGroups();
    }
  }, [user]);

  async function fetchGroups() {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const data = await supportGroupsService.getMentorGroups(user.id);
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to fetch groups');
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmit(values: CreateGroupFormValues) {
    if (!user) return;

    try {
      const groupData: CreateGroupData = {
        name: values.name,
        description: values.description,
        group_type: values.group_type,
        meeting_type: values.meeting_type,
        max_participants: values.max_participants,
        location: values.location || undefined,
        meeting_schedule: [{
          day: values.meeting_day,
          time: values.meeting_time,
          frequency: 'weekly'
        }]
      };

      await supportGroupsService.createGroup(user.id, groupData);
      toast.success('Group created successfully');
      setIsCreateOpen(false);
      form.reset();
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create group');
    }
  }

  const handleStartMeeting = async (group: SupportGroup) => {
    if (group.current_participants === 0) {
      toast.error('Cannot start meeting - no members in the group yet');
      return;
    }

    if (group.room_url) {
      window.open(group.room_url, '_blank');
    } else {
      toast.error('No meeting room configured for this group');
    }
  };

  const canStartMeeting = (group: SupportGroup) => {
    return group.current_participants > 0;
  };

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const memberText = group.current_participants === 0 
      ? "no members" 
      : `${group.current_participants} member${group.current_participants === 1 ? '' : 's'}`;

    const confirmMessage = `Are you sure you want to delete "${group.name}"?\n\nThis group currently has ${memberText}.\n\nThis action will permanently delete:\n• The support group\n• All member records\n• All session history\n• All attendance records\n\nThis cannot be undone.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await supportGroupsService.deleteGroup(groupId);
      toast.success(`"${group.name}" has been permanently deleted`);
      fetchGroups();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete group');
    }
  };

  const handleManageGroup = (group: SupportGroup) => {
    setSelectedGroup(group);
    setShowGroupManagement(true);
  };

  const handleCloseGroupManagement = () => {
    setShowGroupManagement(false);
    setSelectedGroup(null);
    fetchGroups(); // Refresh groups data when closing management view
  };

  const getMeetingTypeIcon = (type: string) => {
    switch(type) {
      case "in-person": return <MapPin className="w-4 h-4" />;
      case "online": return <Video className="w-4 h-4" />;
      case "hybrid": return <Users className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const formatSchedule = (schedule: { day: string; time: string; frequency?: string }[]) => {
    if (!schedule || schedule.length === 0) return "Schedule TBD";
    
    const firstSchedule = schedule[0];
    const time = new Date(`2000-01-01T${firstSchedule.time}`).toLocaleTimeString([], { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    
    return `Every ${firstSchedule.day}, ${time}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {showGroupManagement && selectedGroup ? (
          <GroupManagement
            group={selectedGroup}
            onClose={handleCloseGroupManagement}
          />
        ) : (
          <>
        <div className="flex justify-between items-center">
          <div>
                <h1 className="text-2xl font-bold text-gray-900">Support Groups</h1>
                <p className="text-gray-600">Manage your support groups and sessions</p>
          </div>
              <Button 
                onClick={() => setIsCreateOpen(true)}
                className="bg-[#20c0f3] hover:bg-[#0bb2e8] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Group
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <div className="bg-gray-100 inline-flex p-4 rounded-full mb-4">
                      <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-medium mb-2">No support groups yet</h3>
                    <p className="text-gray-500 mb-6">Create your first group to get started with community support.</p>
                    <Button 
                      onClick={() => setIsCreateOpen(true)}
                      className="bg-[#20c0f3] hover:bg-[#0bb2e8] text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Group
                    </Button>
                  </div>
                ) : (
                  groups.map((group) => (
                    <Card key={group.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">{group.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {getMeetingTypeIcon(group.meeting_type)}
                                <span className="ml-1">{group.meeting_type}</span>
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {group.group_type}
                              </Badge>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleStartMeeting(group)}
                                disabled={!canStartMeeting(group)}
                                className={!canStartMeeting(group) ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                <Video className="h-4 w-4 mr-2" />
                                {canStartMeeting(group) ? "Start Meeting" : "No Members - Cannot Start"}
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Add Members
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Group
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteGroup(group.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                          {group.description}
                        </p>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-sm text-gray-600">
                            <Clock className="h-4 w-4 mr-2" />
                            {formatSchedule(group.meeting_schedule)}
                          </div>
                          {group.location && (
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="h-4 w-4 mr-2" />
                              {group.location}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-600">
                              {group.current_participants} / {group.max_participants}
                            </span>
                          </div>
                          <div className="w-24">
                            <Progress 
                              value={(group.current_participants / group.max_participants) * 100}
                              className="h-2"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleManageGroup(group)}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Manage
                          </Button>
                          <Button 
                            size="sm" 
                            className={`flex-1 ${canStartMeeting(group) 
                              ? "bg-[#20c0f3] hover:bg-[#0bb2e8] text-white" 
                              : "bg-gray-300 text-gray-500 cursor-not-allowed"
                            }`}
                            onClick={() => handleStartMeeting(group)}
                            disabled={!canStartMeeting(group)}
                            title={!canStartMeeting(group) ? "No members in group - cannot start meeting" : "Start meeting with group members"}
                          >
                            <Video className="h-4 w-4 mr-1" />
                            {canStartMeeting(group) ? "Meet" : "No Members"}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                  <DialogTitle>Create New Support Group</DialogTitle>
              </DialogHeader>
                
              <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Anxiety Support Circle" {...field} />
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
                            <Textarea 
                              placeholder="Describe the purpose and goals of this support group..."
                              className="min-h-[100px]"
                              {...field} 
                            />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                    <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="group_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
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
                        name="meeting_type"
                    render={({ field }) => (
                      <FormItem>
                            <FormLabel>Meeting Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select meeting type" />
                                </SelectTrigger>
                        </FormControl>
                              <SelectContent>
                                {meetingTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    </div>

                  <FormField
                    control={form.control}
                    name="max_participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Participants</FormLabel>
                        <FormControl>
                            <Input type="number" min="2" max="50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Community Center, Kigali" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="meeting_day"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meeting Day</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                  <SelectTrigger>
                                  <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                              </FormControl>
                  <SelectContent>
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                  <SelectItem key={day} value={day}>
                                    {day}
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
                        name="meeting_time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Meeting Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                />
              </div>

            <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
                      <Button type="submit" className="bg-[#20c0f3] hover:bg-[#0bb2e8] text-white">
                        Create Group
              </Button>
            </DialogFooter>
                  </form>
                </Form>
          </DialogContent>
        </Dialog>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 


