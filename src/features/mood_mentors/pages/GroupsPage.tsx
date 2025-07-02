import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion } from 'framer-motion'
import { 
  Users, 
  Calendar, 
  MapPin, 
  Clock, 
  Video, 
  Plus,
  Settings,
  UserCheck,
  BarChart3,
  MessageSquare,
  FileText,
  Search,
  Filter,
  ChevronRight,
  Edit,
  Trash2,
  Mail,
  Phone,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  UserPlus,
  Timer,
  Target,
  TrendingUp,
  Award,
  Activity,
  Bell,
  Download,
  Play,
  MoreHorizontal
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supportGroupsService } from '@/services'
import type { SupportGroup, GroupMember, GroupAnalytics, GroupWaitingList, MemberWithProfile, SessionWithAttendance } from '@/services/support-groups/support-groups.interface'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { format } from 'date-fns'
import DashboardLayout from '@/features/dashboard/components/DashboardLayout'
import TodaysSessionsTable from "../components/TodaysSessionsTable"

// Form schemas
const createGroupSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  group_type: z.enum(["anxiety", "depression", "grief", "addiction", "trauma", "youth", "stress"]),
  meeting_type: z.enum(["online", "in-person", "hybrid"]),
  max_participants: z.number().min(5).max(20),
  meeting_day: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
  meeting_time: z.string().min(1, "Meeting time is required"),
  meeting_frequency: z.enum(["weekly", "bi-weekly", "monthly"]),
  group_rules: z.string().min(10, "Group rules must be at least 10 characters"),
  location: z.string().optional(),
  is_public: z.boolean().default(true),
})

const sessionSchema = z.object({
  title: z.string().min(2, "Session title must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  session_date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  session_type: z.enum(["regular", "workshop", "crisis", "celebration"]),
})

const GroupsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("overview")
  const [myGroups, setMyGroups] = useState<SupportGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<SupportGroup | null>(null)
  const [groupMembers, setGroupMembers] = useState<MemberWithProfile[]>([])
  const [groupSessions, setGroupSessions] = useState<SessionWithAttendance[]>([])
  const [waitingList, setWaitingList] = useState<GroupWaitingList[]>([])
  const [groupAnalytics, setGroupAnalytics] = useState<GroupAnalytics | null>(null)
  const [recentActivities, setRecentActivities] = useState<Array<{
    id: string;
    type: 'new_member' | 'session_completed' | 'session_scheduled' | 'member_left';
    message: string;
    timestamp: string;
    icon: string;
  }>>([])
  const [upcomingSessions, setUpcomingSessions] = useState<SessionWithAttendance[]>([])
  const [startingSession, setStartingSession] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showCreateSession, setShowCreateSession] = useState(false)
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const [showEditGroup, setShowEditGroup] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMemberDetails, setShowMemberDetails] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)

  // Form setup
  const createGroupForm = useForm<z.infer<typeof createGroupSchema>>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      group_type: "anxiety",
      meeting_type: "online",
      max_participants: 15,
      meeting_day: "wednesday",
      meeting_time: "19:00",
      meeting_frequency: "weekly",
      group_rules: "",
      location: "",
      is_public: true,
    },
  })

  const sessionForm = useForm<z.infer<typeof sessionSchema>>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      title: "",
      description: "",
      session_date: "",
      start_time: "",
      end_time: "",
      session_type: "regular",
    },
  })

  useEffect(() => {
    if (user?.id) {
      fetchMyGroups()
    }
  }, [user])

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupData()
    }
  }, [selectedGroup])

  const fetchMyGroups = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // First, sync member counts to ensure accuracy
      await supportGroupsService.syncGroupMemberCounts()
      
      console.log('Fetching groups for mentor:', user.id)
      
      const groups = await supportGroupsService.getSupportGroups({
        mentor_id: user.id,
        status: 'active'
      })
      
      console.log('Fetched groups:', groups)
      setMyGroups(groups)
      
      // Auto-select first group if none selected
      if (groups.length > 0 && !selectedGroup) {
        setSelectedGroup(groups[0])
      }
    } catch (error) {
      console.error('Database error:', error)
      setMyGroups([])
      
      // Show error message for real database issues
      if (error && typeof error === 'object' && ('code' in error || 'message' in error)) {
        toast.error('Failed to load groups. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchGroupData = async () => {
    if (!selectedGroup) return

    try {
      const [members, analytics, waiting, sessions, activities, upcoming] = await Promise.all([
        supportGroupsService.getGroupMembers(selectedGroup.id),
        supportGroupsService.getGroupAnalytics(selectedGroup.id),
        supportGroupsService.getWaitingList(selectedGroup.id),
        supportGroupsService.getGroupSessions(selectedGroup.id),
        supportGroupsService.getGroupRecentActivity(selectedGroup.id),
        supportGroupsService.getUpcomingSessions(selectedGroup.id)
      ])
      
      setGroupMembers(members)
      setGroupAnalytics(analytics)
      setWaitingList(waiting)
      setGroupSessions(sessions)
      setRecentActivities(activities)
      setUpcomingSessions(upcoming)
    } catch (error) {
      console.error('Error fetching group data:', error)
      toast.error('Failed to load group data')
    }
  }

  const handleCreateGroup = async (data: z.infer<typeof createGroupSchema>) => {
    if (!user) {
      toast.error('User not authenticated')
      return
    }

    try {
      setCreatingGroup(true)
      console.log('Creating group with form data:', data)
      console.log('Current user:', user)
      
      const groupData = {
        name: data.name.trim(),
        description: data.description.trim(),
        group_type: data.group_type,
        meeting_type: data.meeting_type,
        max_participants: data.max_participants,
        mentor_id: user.id,
        status: 'active' as const,
        meeting_schedule: [{ 
          day: data.meeting_day.charAt(0).toUpperCase() + data.meeting_day.slice(1), // Capitalize first letter to match sample data
          time: data.meeting_time
          // Note: frequency is stored separately, not in meeting_schedule for database compatibility
        }],
        group_rules: data.group_rules?.trim() || '',
        location: data.location?.trim() || null,
        is_public: data.is_public,
        meeting_link: null // Explicitly set to null since we removed this field
      }
      
      console.log('Sending group data to service:', groupData)
      
      // Validate required fields
      if (!groupData.name || !groupData.description || !groupData.mentor_id) {
        throw new Error('Missing required fields')
      }
      
      const newGroup = await supportGroupsService.createSupportGroup(groupData)
      console.log('Group created successfully:', newGroup)
      
      toast.success('Group created successfully!')
      setShowCreateGroup(false)
      createGroupForm.reset()
      await fetchMyGroups()
      setSelectedGroup(newGroup)
    } catch (error) {
      console.error('Error creating group:', error)
      
      let errorMessage = 'Unknown error occurred'
      if (error instanceof Error) {
        errorMessage = error.message
      } else if (typeof error === 'object' && error !== null) {
        if ('message' in error) {
          errorMessage = String(error.message)
        } else if ('details' in error) {
          errorMessage = String(error.details)
        } else {
          errorMessage = JSON.stringify(error)
        }
      }
      
      console.error('Detailed error:', errorMessage)
      toast.error(`Failed to create group: ${errorMessage}`)
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return

    try {
      setDeletingGroup(true)
      await supportGroupsService.deleteSupportGroup(selectedGroup.id)
      toast.success('Group deleted successfully!')
      setShowDeleteConfirm(false)
      setShowGroupSettings(false)
      await fetchMyGroups()
      setSelectedGroup(null)
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error('Failed to delete group')
    } finally {
      setDeletingGroup(false)
    }
  }

  const handleCreateSession = async (data: z.infer<typeof sessionSchema>) => {
    if (!selectedGroup) return

    try {
      setCreatingSession(true)
      await supportGroupsService.createGroupSession({
        group_id: selectedGroup.id,
        title: data.title,
        description: data.description,
        session_date: data.session_date,
        start_time: data.start_time,
        end_time: data.end_time,
        session_type: data.session_type,
        status: 'scheduled'
      })
      
      toast.success('Session scheduled successfully!')
      setShowCreateSession(false)
      sessionForm.reset()
      fetchGroupData() // Refresh data
    } catch (error) {
      console.error('Error creating session:', error)
      toast.error('Failed to schedule session')
    } finally {
      setCreatingSession(false)
    }
  }

  const handleApproveWaitingList = async (applicationId: string) => {
    try {
      await supportGroupsService.processWaitingListApplication(applicationId, 'approved')
      toast.success('Application approved!')
      fetchGroupData() // Refresh data
    } catch (error) {
      console.error('Error approving application:', error)
      toast.error('Failed to approve application')
    }
  }

  const handleRejectWaitingList = async (applicationId: string) => {
    try {
      await supportGroupsService.processWaitingListApplication(applicationId, 'rejected')
      toast.success('Application rejected')
      fetchGroupData() // Refresh data
    } catch (error) {
      console.error('Error rejecting application:', error)
      toast.error('Failed to reject application')
    }
  }

  const handleStartSession = async (sessionId: string) => {
    try {
      setStartingSession(sessionId)
      const result = await supportGroupsService.startSession(sessionId)
      
      if (result.error) {
        toast.error(`Failed to start session: ${result.error}`)
        return
      }

      if (result.data) {
        toast.success('Session started successfully!')
        // Navigate to the in-app session page instead of opening a new tab
        navigate(`/mood-mentor-dashboard/group-session/${sessionId}`)
        // Refresh data to show updated session status
        fetchGroupData()
      }
    } catch (error) {
      console.error('Error starting session:', error)
      toast.error('Failed to start session')
    } finally {
      setStartingSession(null)
    }
  }

  const handleEndSession = async (sessionId: string) => {
    try {
      const result = await supportGroupsService.endSession(sessionId)
      
      if (result.error) {
        toast.error(`Failed to end session: ${result.error}`)
        return
      }

      toast.success('Session ended successfully!')
      fetchGroupData() // Refresh data
    } catch (error) {
      console.error('Error ending session:', error)
      toast.error('Failed to end session')
    }
  }

  const getGroupTypeColor = (type: string) => {
    switch(type) {
      case "anxiety": return "bg-[#20C0F3]/10 text-[#20C0F3] border-[#20C0F3]/20"
      case "depression": return "bg-purple-100 text-purple-700 border-purple-200"
      case "grief": return "bg-rose-100 text-rose-700 border-rose-200"
      case "addiction": return "bg-green-100 text-green-700 border-green-200"
      case "trauma": return "bg-orange-100 text-orange-700 border-orange-200"
      case "youth": return "bg-indigo-100 text-indigo-700 border-indigo-200"
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getMeetingTypeIcon = (type: string) => {
    switch(type) {
      case "in-person": return <MapPin className="w-4 h-4" />
      case "online": return <Video className="w-4 h-4" />
      case "hybrid": return <Users className="w-4 h-4" />
      default: return <Users className="w-4 h-4" />
    }
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return "text-green-600"
    if (rate >= 60) return "text-[#20C0F3]"
    if (rate >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  const filteredGroups = myGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#20C0F3] mx-auto mb-4" />
            <p className="text-gray-600">Loading groups...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Support Groups</h1>
              <p className="text-gray-600 mt-2">Create and manage your own support groups for your patients</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-[#20C0F3] rounded-full"></div>
                <p className="text-sm text-gray-500">
                  These are groups you've created. Patients can discover all public groups on the Help Groups page.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCreateGroup(true)}
                className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Group
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Groups Sidebar */}
            <div className="lg:col-span-1">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-5 w-5 mr-2 text-[#20C0F3]" />
                    Your Groups ({myGroups.length})
                  </CardTitle>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search groups..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {filteredGroups.length === 0 ? (
                    <div className="p-6 text-center">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 mb-2">
                        {myGroups.length === 0 ? "You haven't created any groups yet" : "No groups match your search"}
                      </p>
                      {myGroups.length === 0 && (
                        <p className="text-sm text-gray-400">Create your first group to start helping patients</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 p-3">
                      {filteredGroups.map((group) => (
                        <motion.div
                          key={group.id}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => setSelectedGroup(group)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedGroup?.id === group.id 
                              ? 'bg-[#20C0F3]/10 border-[#20C0F3]/30' 
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-sm line-clamp-1">{group.name}</h3>
                            <Badge 
                              className={`text-xs ${getGroupTypeColor(group.group_type)}`}
                              variant="outline"
                            >
                              {group.group_type}
                            </Badge>
                          </div>
                          <div className="flex items-center text-xs text-gray-500 space-x-3">
                            <div className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {group.current_participants}/{group.max_participants}
                            </div>
                            <div className="flex items-center">
                              {getMeetingTypeIcon(group.meeting_type)}
                              <span className="ml-1 capitalize">{group.meeting_type}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {selectedGroup ? (
                <div className="space-y-6">
                  {/* Group Header */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-gray-900">{selectedGroup.name}</h2>
                            <Badge 
                              className={`${getGroupTypeColor(selectedGroup.group_type)}`}
                              variant="outline"
                            >
                              {selectedGroup.group_type.charAt(0).toUpperCase() + selectedGroup.group_type.slice(1)}
                            </Badge>
                            <div className="flex items-center text-sm text-gray-500">
                              {getMeetingTypeIcon(selectedGroup.meeting_type)}
                              <span className="ml-1 capitalize">{selectedGroup.meeting_type}</span>
                            </div>
                          </div>
                          <p className="text-gray-600">{selectedGroup.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowGroupSettings(true)}
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Settings
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => setShowCreateSession(true)}
                            className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                          >
                            <Calendar className="h-4 w-4 mr-1" />
                            Schedule Session
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Today's Sessions Section */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Play className="w-5 h-5 mr-2 text-[#20C0F3]" />
                        Today's Sessions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <TodaysSessionsTable 
                        groupId={selectedGroup.id}
                        groupName={selectedGroup.name}
                        memberCount={selectedGroup.current_participants}
                        onSessionStarted={() => {
                          // Refresh group data when session is started
                          fetchGroupData();
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Group Stats */}
                  {groupAnalytics && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Total Members</p>
                              <p className="text-2xl font-bold text-gray-900">{groupAnalytics.totalMembers}</p>
                            </div>
                            <Users className="h-8 w-8 text-[#20C0F3]" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Avg Attendance</p>
                              <p className={`text-2xl font-bold ${getAttendanceColor(groupAnalytics.averageAttendance)}`}>
                                {groupAnalytics.averageAttendance.toFixed(1)}%
                              </p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-[#20C0F3]" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                              <p className="text-2xl font-bold text-gray-900">{groupAnalytics.totalSessions}</p>
                            </div>
                            <Calendar className="h-8 w-8 text-[#20C0F3]" />
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-600">Engagement Score</p>
                              <p className="text-2xl font-bold text-gray-900">{groupAnalytics.memberEngagement.toFixed(1)}</p>
                            </div>
                            <Activity className="h-8 w-8 text-[#20C0F3]" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Tabs Content */}
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="members">Members</TabsTrigger>
                      <TabsTrigger value="sessions">Sessions</TabsTrigger>
                      <TabsTrigger value="waiting">Waiting List</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Recent Activity</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {recentActivities.length > 0 ? (
                              <div className="space-y-4">
                                {recentActivities.map((activity) => {
                                  const IconComponent = activity.icon === 'UserPlus' ? UserPlus : Calendar;
                                  const iconColor = activity.type === 'new_member' ? 'text-green-600' : 'text-[#20C0F3]';
                                  
                                  return (
                                    <div key={activity.id} className="flex items-center space-x-3 text-sm">
                                      <IconComponent className={`h-4 w-4 ${iconColor}`} />
                                      <span>{activity.message}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">No recent activity</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Upcoming Sessions</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {upcomingSessions.length > 0 ? (
                              <div className="space-y-3">
                                {upcomingSessions.map((session) => {
                                  const sessionDate = new Date(session.session_date);
                                  const isToday = sessionDate.toDateString() === new Date().toDateString();
                                  const isTomorrow = sessionDate.toDateString() === new Date(Date.now() + 24*60*60*1000).toDateString();
                                  
                                  let dateText = sessionDate.toLocaleDateString('en-US', { 
                                    weekday: 'long', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  });
                                  
                                  if (isToday) dateText = 'Today';
                                  else if (isTomorrow) dateText = 'Tomorrow';
                                  
                                  const timeText = session.start_time;
                                  const canStart = isToday && session.status === 'scheduled';
                                  const isInProgress = session.status === 'in_progress';
                                  
                                  return (
                                    <div key={session.id} className="p-3 bg-gray-50 rounded-lg">
                                      <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                          <h4 className="font-medium text-sm">{session.title}</h4>
                                          <p className="text-xs text-gray-600">{dateText}, {timeText}</p>
                                          {session.description && (
                                            <p className="text-xs text-gray-500 mt-1">{session.description}</p>
                                          )}
                                        </div>
                                        <div className="flex gap-1 ml-2">
                                          {isInProgress && session.meeting_link && (
                                            <Button 
                                              size="sm" 
                                              variant="outline"
                                              onClick={() => window.open(session.meeting_link, '_blank')}
                                              className="text-xs h-7"
                                            >
                                              <Video className="h-3 w-3 mr-1" />
                                              Join
                                            </Button>
                                          )}
                                          {canStart && (
                                            <Button 
                                              size="sm"
                                              onClick={() => handleStartSession(session.id)}
                                              disabled={startingSession === session.id}
                                              className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white text-xs h-7"
                                            >
                                              {startingSession === session.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <>
                                                  <Play className="h-3 w-3 mr-1" />
                                                  Start
                                                </>
                                              )}
                                            </Button>
                                          )}
                                          {isInProgress && (
                                            <Button 
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleEndSession(session.id)}
                                              className="text-xs h-7"
                                            >
                                              End
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-500 text-sm">No upcoming sessions</p>
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowCreateSession(true)}
                                  className="mt-2 text-xs"
                                >
                                  Schedule First Session
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="members" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Group Members ({groupMembers.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Attendance</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {groupMembers.map((member) => (
                                <TableRow key={member.id}>
                                  <TableCell>
                                    <div className="flex items-center space-x-3">
                                      <div className="h-8 w-8 bg-[#20C0F3]/10 rounded-full flex items-center justify-center">
                                        <Users className="h-4 w-4 text-[#20C0F3]" />
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">
                                          {member.user_profile?.full_name || 'Unknown User'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {member.user_profile?.email}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {format(new Date(member.joined_at), 'MMM d, yyyy')}
                                  </TableCell>
                                  <TableCell>
                                    <span className={`text-sm font-medium ${getAttendanceColor(member.attendance_rate || 0)}`}>
                                      {(member.attendance_rate || 0).toFixed(1)}%
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {member.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedMember(member)
                                          setShowMemberDetails(true)
                                        }}
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="outline">
                                        <Mail className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="sessions" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-lg">Group Sessions ({groupSessions.length})</CardTitle>
                            <Button 
                              size="sm"
                              onClick={() => setShowCreateSession(true)}
                              className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Schedule Session
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {groupSessions.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Session</TableHead>
                                  <TableHead>Date & Time</TableHead>
                                  <TableHead>Type</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {groupSessions.map((session) => {
                                  const sessionDate = new Date(session.session_date);
                                  const isToday = sessionDate.toDateString() === new Date().toDateString();
                                  const canStart = isToday && session.status === 'scheduled';
                                  const isInProgress = session.status === 'in_progress';
                                  
                                  return (
                                    <TableRow key={session.id}>
                                      <TableCell>
                                        <div>
                                          <p className="font-medium text-sm">{session.title}</p>
                                          {session.description && (
                                            <p className="text-xs text-gray-500">{session.description}</p>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        <div>
                                          <p>{sessionDate.toLocaleDateString('en-US', { 
                                            weekday: 'short',
                                            month: 'short', 
                                            day: 'numeric',
                                            year: 'numeric'
                                          })}</p>
                                          <p className="text-xs text-gray-500">
                                            {session.start_time} - {session.end_time}
                                          </p>
                                        </div>
                                      </TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="text-xs">
                                          {session.session_type}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <Badge 
                                          variant={
                                            session.status === 'completed' ? 'default' :
                                            session.status === 'in_progress' ? 'destructive' :
                                            session.status === 'scheduled' ? 'secondary' : 'outline'
                                          }
                                          className="text-xs"
                                        >
                                          {session.status}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center space-x-2">
                                          {isInProgress && session.meeting_link && (
                                            <Button 
                                              size="sm" 
                                              variant="outline"
                                              onClick={() => window.open(session.meeting_link, '_blank')}
                                            >
                                              <Video className="h-3 w-3 mr-1" />
                                              Join
                                            </Button>
                                          )}
                                          {canStart && (
                                            <Button 
                                              size="sm"
                                              onClick={() => handleStartSession(session.id)}
                                              disabled={startingSession === session.id}
                                              className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                                            >
                                              {startingSession === session.id ? (
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                              ) : (
                                                <>
                                                  <Play className="h-3 w-3 mr-1" />
                                                  Start
                                                </>
                                              )}
                                            </Button>
                                          )}
                                          {isInProgress && (
                                            <Button 
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleEndSession(session.id)}
                                            >
                                              End
                                            </Button>
                                          )}
                                          <Button size="sm" variant="outline">
                                            <MoreHorizontal className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-8">
                              <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500">No sessions scheduled</p>
                              <p className="text-sm text-gray-400">Create your first group session</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="waiting" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Waiting List ({waitingList.length})</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {waitingList.length === 0 ? (
                            <div className="text-center py-8">
                              <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500">No pending applications</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {waitingList.map((application) => (
                                <div key={application.id} className="p-4 border rounded-lg">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <h4 className="font-medium text-sm">New Application</h4>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Applied {format(new Date(application.applied_at), 'MMM d, yyyy')}
                                      </p>
                                      {application.personal_message && (
                                        <p className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                                          "{application.personal_message}"
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-2 ml-4">
                                      <Button
                                        size="sm"
                                        onClick={() => handleApproveWaitingList(application.id)}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleRejectWaitingList(application.id)}
                                        className="text-red-600 border-red-600 hover:bg-red-50"
                                      >
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Reject
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              ) : (
                <Card className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    {myGroups.length === 0 ? (
                      <>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Create Your First Support Group</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto">
                          Start building a community for your patients by creating your first support group. 
                          You'll be able to manage members, schedule sessions, and track engagement.
                        </p>
                        <Button
                          onClick={() => setShowCreateGroup(true)}
                          className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Your First Group
                        </Button>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Group Selected</h3>
                        <p className="text-gray-500 mb-6">
                          Select one of your groups from the sidebar to view details and manage members
                        </p>
                      </>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Create Group Dialog */}
        <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
          <DialogContent className="sm:max-w-[700px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Create New Support Group</DialogTitle>
              <DialogDescription>
                Create your own support group where you can invite patients, schedule sessions, and facilitate meaningful connections.
              </DialogDescription>
            </DialogHeader>
            <Form {...createGroupForm}>
              <form onSubmit={createGroupForm.handleSubmit(handleCreateGroup)} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={createGroupForm.control}
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
                    control={createGroupForm.control}
                    name="max_participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Participants</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="5" 
                            max="20" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={createGroupForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the purpose and goals of this support group..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={createGroupForm.control}
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
                            <SelectItem value="anxiety">Anxiety</SelectItem>
                            <SelectItem value="depression">Depression</SelectItem>
                            <SelectItem value="grief">Grief & Loss</SelectItem>
                            <SelectItem value="addiction">Addiction Recovery</SelectItem>
                            <SelectItem value="trauma">Trauma</SelectItem>
                            <SelectItem value="youth">Youth Support</SelectItem>
                            <SelectItem value="stress">Stress Management</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createGroupForm.control}
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
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="in-person">In-Person</SelectItem>
                            <SelectItem value="hybrid">Hybrid</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={createGroupForm.control}
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
                            <SelectItem value="monday">Monday</SelectItem>
                            <SelectItem value="tuesday">Tuesday</SelectItem>
                            <SelectItem value="wednesday">Wednesday</SelectItem>
                            <SelectItem value="thursday">Thursday</SelectItem>
                            <SelectItem value="friday">Friday</SelectItem>
                            <SelectItem value="saturday">Saturday</SelectItem>
                            <SelectItem value="sunday">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createGroupForm.control}
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
                  <FormField
                    control={createGroupForm.control}
                    name="meeting_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Conditional Fields based on Meeting Type */}
                {createGroupForm.watch("meeting_type") === "in-person" && (
                  <FormField
                    control={createGroupForm.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Community Center, Room 101" {...field} />
                        </FormControl>
                        <FormDescription>
                          Provide the physical address or location details
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={createGroupForm.control}
                  name="group_rules"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Rules</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Set guidelines for group behavior and participation..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setShowCreateGroup(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={creatingGroup}
                    className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white w-full sm:w-auto"
                  >
                    {creatingGroup ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Group'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Create Session Dialog */}
        <Dialog open={showCreateSession} onOpenChange={setShowCreateSession}>
          <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Schedule New Session</DialogTitle>
              <DialogDescription>
                Schedule a new session for {selectedGroup?.name}
              </DialogDescription>
            </DialogHeader>
            <Form {...sessionForm}>
              <form onSubmit={sessionForm.handleSubmit(handleCreateSession)} className="space-y-4 mt-4">
                <FormField
                  control={sessionForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Weekly Check-in" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={sessionForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what will be covered in this session..."
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <FormField
                    control={sessionForm.control}
                    name="session_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={sessionForm.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={sessionForm.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={sessionForm.control}
                  name="session_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Session Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select session type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="regular">Regular Session</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="crisis">Crisis Support</SelectItem>
                          <SelectItem value="celebration">Celebration</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                  <Button type="button" variant="outline" onClick={() => setShowCreateSession(false)} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={creatingSession}
                    className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white w-full sm:w-auto"
                  >
                    {creatingSession ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      'Schedule Session'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Group Settings Dialog */}
        <Dialog open={showGroupSettings} onOpenChange={setShowGroupSettings}>
          <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Group Settings</DialogTitle>
              <DialogDescription>
                Manage settings for {selectedGroup?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Group Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Group Type:</span>
                    <p className="mt-1">{selectedGroup?.group_type}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Meeting Type:</span>
                    <p className="mt-1 capitalize">{selectedGroup?.meeting_type}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Max Participants:</span>
                    <p className="mt-1">{selectedGroup?.max_participants}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Current Members:</span>
                    <p className="mt-1">{selectedGroup?.current_participants}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => {
                      setShowGroupSettings(false)
                      setShowEditGroup(true)
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Group Details
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => {
                      setShowGroupSettings(false)
                      // Add member management functionality here
                      setActiveTab('members')
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Members
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => {
                      setShowGroupSettings(false)
                      setShowCreateSession(true)
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Session
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-red-600">Danger Zone</h3>
                <Button 
                  variant="destructive" 
                  className="w-full justify-start"
                  onClick={() => {
                    setShowGroupSettings(false)
                    setShowDeleteConfirm(true)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowGroupSettings(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-red-600">Delete Group</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{selectedGroup?.name}"? This action cannot be undone.
                All group data, sessions, and member information will be permanently removed.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-1">This will permanently:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Delete the group and all its data</li>
                      <li>Remove all members from the group</li>
                      <li>Delete all session records and attendance</li>
                      <li>Clear waiting list applications</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteGroup}
                disabled={deletingGroup}
              >
                {deletingGroup ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Group
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Group Dialog */}
        <Dialog open={showEditGroup} onOpenChange={setShowEditGroup}>
          <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Edit Group</DialogTitle>
              <DialogDescription>
                Update the details for {selectedGroup?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-gray-600">
                Edit group functionality will be implemented in a future update. 
                For now, you can manage members and schedule sessions using the available options.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditGroup(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default GroupsPage 