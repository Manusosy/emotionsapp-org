import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
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
  Search,
  Filter,
  ExternalLink,
  MessageCircle,
  Activity,
  Award,
  Loader2,
  Plus,
  ArrowLeft,
  Eye,
  ChevronRight,
  Star,
  Globe,
  Home,
  UserPlus,
  CheckCircle,
  Heart,
  UserMinus,
  Settings,
  TrendingUp,
  Calendar as CalendarIcon,
  Users2,
  MoreVertical,
  Play,
  AlertTriangle
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supportGroupsService } from '@/services'
import type { SupportGroup, GroupMember, GroupAnalytics } from '@/services/support-groups/support-groups.interface'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { format, differenceInDays, isToday, isTomorrow, isPast, addDays, isThisWeek } from 'date-fns'

// Form schema for joining groups
const joinGroupSchema = z.object({
  personalMessage: z.string().min(10, "Personal message must be at least 10 characters").optional(),
})

const SupportGroupsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("my-groups")
  const [myGroups, setMyGroups] = useState<SupportGroup[]>([])
  const [availableGroups, setAvailableGroups] = useState<SupportGroup[]>([])
  const [groupAnalytics, setGroupAnalytics] = useState<{[key: string]: any}>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedMeetingType, setSelectedMeetingType] = useState("all")
  const [selectedGroup, setSelectedGroup] = useState<SupportGroup | null>(null)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [joining, setJoining] = useState(false)
  const [showMemberDetails, setShowMemberDetails] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [creatingSession, setCreatingSession] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [showGroupDetails, setShowGroupDetails] = useState(false)
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<SupportGroup | null>(null)
  const [favoriteGroups, setFavoriteGroups] = useState<Set<string>>(new Set())
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [groupToLeave, setGroupToLeave] = useState<SupportGroup | null>(null)
  const [leavingGroup, setLeavingGroup] = useState(false)
  const [activeGroupSessions, setActiveGroupSessions] = useState<Array<{
    group: SupportGroup;
    activeSession?: {
      session: GroupSession;
      meetingUrl: string;
    };
    upcomingSessions: GroupSession[];
  }>>([])
  const [loadingActiveSessions, setLoadingActiveSessions] = useState(false)

  // Form setup
  const joinForm = useForm<z.infer<typeof joinGroupSchema>>({
    resolver: zodResolver(joinGroupSchema),
    defaultValues: {
      personalMessage: "",
    },
  })

  const categories = [
    { id: "all", label: "All Categories" },
    { id: "anxiety", label: "Anxiety" },
    { id: "depression", label: "Depression" },
    { id: "grief", label: "Grief & Loss" },
    { id: "addiction", label: "Addiction Recovery" },
    { id: "trauma", label: "Trauma" },
    { id: "youth", label: "Youth Support" },
    { id: "stress", label: "Stress Management" }
  ]

  const meetingTypes = [
    { id: "all", label: "All Types" },
    { id: "online", label: "Online" },
    { id: "in-person", label: "In-Person" },
    { id: "hybrid", label: "Hybrid" }
  ]

  useEffect(() => {
    if (user) {
      fetchGroupData()
      fetchActiveGroupSessions()
      loadFavorites()
    }
  }, [user])

  const fetchGroupData = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // First, sync member counts to ensure accuracy
      await supportGroupsService.syncGroupMemberCounts()
      
      // Fetch user's groups and available groups in parallel
      const [userGroups, publicGroups] = await Promise.all([
        supportGroupsService.getUserGroups(user.id),
        supportGroupsService.getSupportGroups({
          is_public: true,
          status: 'active'
        })
      ])
      
      setMyGroups(userGroups)
      setAvailableGroups(publicGroups)
      
      // Fetch analytics for user's groups
      const analytics: {[key: string]: any} = {}
      for (const group of userGroups) {
        try {
          const memberAnalytics = await supportGroupsService.getMemberAnalytics(group.id, user.id)
          analytics[group.id] = memberAnalytics
        } catch (error) {
          console.error(`Error fetching analytics for group ${group.id}:`, error)
        }
      }
      setGroupAnalytics(analytics)
    } catch (error) {
      console.error('Error fetching group data:', error)
      toast.error('Failed to load support groups')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGroup = async (group: SupportGroup) => {
    if (!user) {
      toast.error('Please log in to join a group')
      return
    }

    // Check eligibility
    const eligibility = await supportGroupsService.canUserJoinGroup(group.id, user.id)
    
    if (!eligibility.canJoin) {
      if (eligibility.reason === 'Group is full') {
        // Offer to join waiting list
        setSelectedGroup(group)
        setShowJoinDialog(true)
        return
      } else {
        toast.error(eligibility.reason || 'Unable to join group')
        return
      }
    }

    try {
      setJoining(true)
      await supportGroupsService.addMemberToGroup(group.id, user.id)
      toast.success('Successfully joined the group!')
      fetchGroupData() // Refresh data
    } catch (error) {
      console.error('Error joining group:', error)
      toast.error('Failed to join group')
    } finally {
      setJoining(false)
    }
  }

  const handleJoinWaitingList = async (data: z.infer<typeof joinGroupSchema>) => {
    if (!selectedGroup || !user) return

    try {
      setJoining(true)
      await supportGroupsService.addToWaitingList(
        selectedGroup.id, 
        user.id, 
        data.personalMessage
      )
      toast.success('Added to waiting list! You\'ll be notified when a spot opens up.')
      setShowJoinDialog(false)
      joinForm.reset()
      fetchGroupData() // Refresh data
    } catch (error) {
      console.error('Error joining waiting list:', error)
      toast.error('Failed to join waiting list')
    } finally {
      setJoining(false)
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

  const getMeetingTypeColor = (type: string) => {
    switch(type) {
      case "in-person": return "bg-emerald-100 text-emerald-700"
      case "online": return "bg-blue-100 text-blue-700"
      case "hybrid": return "bg-purple-100 text-purple-700"
      default: return "bg-gray-100 text-gray-700"
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
      case "stress": return "bg-teal-100 text-teal-700 border-teal-200"
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const formatSchedule = (schedule: any[]) => {
    if (!schedule || schedule.length === 0) return "Schedule TBD"
    
    const firstSchedule = schedule[0]
    if (!firstSchedule || !firstSchedule.time) return "Schedule TBD"
    
    try {
      const time = new Date(`2000-01-01T${firstSchedule.time}`).toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      })
      
      return `Every ${firstSchedule.day}, ${time}`
    } catch {
      return "Schedule TBD"
    }
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return "text-green-600"
    if (rate >= 60) return "text-[#20C0F3]"
    if (rate >= 40) return "text-yellow-600"
    return "text-red-600"
  }

  const getNextSessionCountdown = (schedule: any[]) => {
    if (!schedule || schedule.length === 0) return null
    
    const now = new Date()
    const today = now.getDay() // 0 = Sunday, 1 = Monday, etc.
    
    // Find the next scheduled session
    let nextSession = null
    let minDays = 8 // More than a week
    
    schedule.forEach(item => {
      if (item.day_of_week !== undefined) {
        const scheduledDay = item.day_of_week === 0 ? 7 : item.day_of_week // Convert Sunday from 0 to 7
        let daysUntil = scheduledDay - today
        
        if (daysUntil <= 0) {
          daysUntil += 7 // Next week
        }
        
        if (daysUntil < minDays) {
          minDays = daysUntil
          nextSession = item
        }
      }
    })
    
    if (!nextSession) return null
    
    if (minDays === 1) return "Tomorrow"
    if (minDays === 2) return "In 2 days"
    if (minDays === 3) return "In 3 days"
    if (minDays === 4) return "In 4 days"
    if (minDays === 5) return "In 5 days"
    if (minDays === 6) return "In 6 days"
    if (minDays === 7) return "Next week"
    
    return `In ${minDays} days`
  }

  const getAvailableGroups = () => {
    const userGroupIds = myGroups.map(g => g.id)
    return availableGroups.filter(group => {
      // Filter out groups user is already in
      if (userGroupIds.includes(group.id)) return false
      
      // Apply search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        if (!group.name.toLowerCase().includes(searchLower) && 
            !group.description.toLowerCase().includes(searchLower)) {
          return false
        }
      }
      
      // Apply category filter
      if (selectedCategory !== "all" && group.group_type !== selectedCategory) {
        return false
      }
      
      // Apply meeting type filter
      if (selectedMeetingType !== "all" && group.meeting_type !== selectedMeetingType) {
        return false
      }
      
      return true
    })
  }

  const handleViewGroup = (group: SupportGroup) => {
    setSelectedGroupDetails(group)
    setShowGroupDetails(true)
  }

  const loadFavorites = () => {
    const savedFavorites = localStorage.getItem(`favorites_${user?.id}`)
    if (savedFavorites) {
      setFavoriteGroups(new Set(JSON.parse(savedFavorites)))
    }
  }

  const toggleFavorite = (groupId: string) => {
    const newFavorites = new Set(favoriteGroups)
    if (newFavorites.has(groupId)) {
      newFavorites.delete(groupId)
      toast.success('Removed from favorites')
    } else {
      newFavorites.add(groupId)
      toast.success('Added to favorites')
    }
    setFavoriteGroups(newFavorites)
    localStorage.setItem(`favorites_${user?.id}`, JSON.stringify([...newFavorites]))
  }

  const handleLeaveGroup = async () => {
    if (!groupToLeave || !user) return

    try {
      setLeavingGroup(true)
      await supportGroupsService.removeMemberFromGroup(groupToLeave.id, user.id)
      toast.success('Successfully left the group')
      setShowLeaveDialog(false)
      setGroupToLeave(null)
      fetchGroupData() // Refresh data
    } catch (error) {
      console.error('Error leaving group:', error)
      toast.error('Failed to leave group')
    } finally {
      setLeavingGroup(false)
    }
  }

  const fetchActiveGroupSessions = async () => {
    if (!user) return
    
    try {
      setLoadingActiveSessions(true)
      const sessions = await supportGroupsService.getMemberGroupSessions(user.id)
      setActiveGroupSessions(sessions)
    } catch (error) {
      console.error('Error fetching active sessions:', error)
    } finally {
      setLoadingActiveSessions(false)
    }
  }

  const handleJoinSession = async (sessionData: { session: GroupSession; meetingUrl: string }) => {
    try {
      // Track the session join
      await supportGroupsService.trackSessionJoin(sessionData.session.id, user!.id)
      
      // Navigate to the group session page
      navigate(`/patient-dashboard/group-session/${sessionData.session.id}`)
    } catch (error) {
      console.error('Error joining session:', error)
      toast.error('Failed to join session')
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Support Groups</h1>
            <p className="text-gray-600 mt-2">
              Connect with others on similar journeys and find the support you need
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setActiveTab("my-groups")}
              className={`flex-1 sm:flex-none ${activeTab === "my-groups" ? "bg-[#20C0F3] text-white border-[#20C0F3]" : ""}`}
            >
              <Users className="w-4 h-4 mr-2" />
              My Groups
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab("discover")}
              className={`flex-1 sm:flex-none ${activeTab === "discover" ? "bg-[#20C0F3] text-white border-[#20C0F3]" : ""}`}
            >
              <Search className="w-4 h-4 mr-2" />
              Discover
            </Button>
          </div>
        </div>

        {/* Error handling with better UX */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#20C0F3]" />
            <span className="ml-2 text-gray-600">Loading support groups...</span>
          </div>
        )}

        {/* Active & Upcoming Sessions Section */}
        {!loading && activeGroupSessions.length > 0 && (
          <div className="space-y-4">
            {/* Live Sessions */}
            {activeGroupSessions.some(gs => gs.activeSession) && (
              <Card className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center text-green-800">
                    <Play className="w-5 h-5 mr-2" />
                    Live Sessions Available
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activeGroupSessions
                      .filter(gs => gs.activeSession)
                      .map((groupSession) => (
                        <div key={groupSession.group.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg border border-green-200 shadow-sm gap-3">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="relative flex-shrink-0">
                              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
                              <div className="absolute inset-0 h-3 w-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{groupSession.group.name}</h4>
                              <p className="text-sm text-gray-600">Session in progress</p>
                              <div className="flex items-center mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {groupSession.group.group_type}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleJoinSession(groupSession.activeSession!)}
                            className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                            size="sm"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Join Now
                          </Button>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Sessions - Only show if no active sessions */}
            {!activeGroupSessions.some(gs => gs.activeSession) && myGroups.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center text-blue-800">
                    <CalendarIcon className="w-5 h-5 mr-2" />
                    Upcoming Sessions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {myGroups.slice(0, 3).map((group) => {
                      const countdown = getNextSessionCountdown(group.meeting_schedule)
                      return (
                        <div key={group.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white rounded-lg border border-blue-200 shadow-sm gap-3">
                          <div className="flex items-center space-x-3 min-w-0 flex-1">
                            <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Users className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-gray-900 truncate">{group.name}</h4>
                              <p className="text-sm text-gray-600 truncate">{formatSchedule(group.meeting_schedule)}</p>
                              {countdown && (
                                <div className="flex items-center mt-1">
                                  <Clock className="w-3 h-3 mr-1 text-blue-600" />
                                  <span className="text-xs text-blue-600 font-medium">{countdown}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewGroup(group)}
                            className="border-blue-300 text-blue-600 hover:bg-blue-50 w-full sm:w-auto"
                          >
                            View Details
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {!loading && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my-groups">My Groups ({myGroups.length})</TabsTrigger>
              <TabsTrigger value="discover">Discover Groups ({availableGroups.length})</TabsTrigger>
            </TabsList>

            {/* My Groups Tab */}
            <TabsContent value="my-groups" className="space-y-6">
              {/* Quick Stats */}
              {myGroups.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-[#20C0F3]">{myGroups.length}</div>
                    <div className="text-sm text-gray-600">Groups Joined</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-green-600">
                      {activeGroupSessions.filter(gs => gs.activeSession).length}
                    </div>
                    <div className="text-sm text-gray-600">Live Sessions</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-purple-600">{favoriteGroups.size}</div>
                    <div className="text-sm text-gray-600">Favorites</div>
                  </Card>
                  <Card className="text-center p-4">
                    <div className="text-2xl font-bold text-orange-600">
                      {activeGroupSessions.reduce((total, gs) => total + (gs.upcomingSessions?.length || 0), 0)}
                    </div>
                    <div className="text-sm text-gray-600">Upcoming</div>
                  </Card>
                </div>
              )}

              {myGroups.length === 0 ? (
                <Card className="text-center p-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Groups Yet</h3>
                  <p className="text-gray-500 mb-6">
                    Join a support group to connect with others who understand your journey
                  </p>
                  <Button
                    onClick={() => setActiveTab("discover")}
                    className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                  >
                    Discover Support Groups
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {myGroups
                    .sort((a, b) => {
                      // Sort favorites first
                      const aFav = favoriteGroups.has(a.id)
                      const bFav = favoriteGroups.has(b.id)
                      if (aFav && !bFav) return -1
                      if (!aFav && bFav) return 1
                      return 0
                    })
                    .map((group) => {
                    const analytics = groupAnalytics[group.id] || {}
                    
                    return (
                      <motion.div
                        key={group.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group"
                      >
                        <Card className="h-full hover:shadow-lg transition-all duration-200 border-l-4 relative" 
                              style={{ borderLeftColor: group.group_type === 'anxiety' ? '#20C0F3' : undefined }}>
                          {/* Live Session Indicator */}
                          {activeGroupSessions.some(gs => gs.group.id === group.id && gs.activeSession) && (
                            <div className="absolute top-2 right-2 flex items-center">
                              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-1"></div>
                              <span className="text-xs text-green-600 font-medium">LIVE</span>
                            </div>
                          )}
                          
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2">
                                <Badge 
                                  className={`text-xs font-medium border ${getGroupTypeColor(group.group_type)}`}
                                  variant="outline"
                                >
                                  {group.group_type.charAt(0).toUpperCase() + group.group_type.slice(1)}
                                </Badge>
                                <Badge 
                                  className={`text-xs font-medium ${getMeetingTypeColor(group.meeting_type)}`}
                                  variant="outline"
                                >
                                  {getMeetingTypeIcon(group.meeting_type)}
                                  <span className="ml-1 capitalize">{group.meeting_type}</span>
                                </Badge>
                              </div>
                              {favoriteGroups.has(group.id) && (
                                <div className="flex items-center">
                                  <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                                </div>
                              )}
                            </div>
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {group.description}
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center text-gray-500">
                                <Users className="w-4 h-4 mr-1" />
                                {group.current_participants}/{group.max_participants} members
                              </div>
                              <div className="flex items-center text-gray-500">
                                <Clock className="w-4 h-4 mr-1" />
                                {formatSchedule(group.meeting_schedule)}
                              </div>
                            </div>
                            
                            {analytics.attendance_rate !== undefined && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">Your Attendance</span>
                                  <span className={`font-medium ${getAttendanceColor(analytics.attendance_rate)}`}>
                                    {analytics.attendance_rate.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-[#20C0F3] h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${analytics.attendance_rate}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            

                            
                            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                              <div className="space-y-1">
                                <div className="text-xs text-gray-500">
                                  Joined {format(new Date(group.created_at), 'MMM yyyy')}
                                </div>
                                {/* Next session countdown */}
                                {(() => {
                                  const countdown = getNextSessionCountdown(group.meeting_schedule)
                                  return countdown && (
                                    <div className="flex items-center text-xs text-blue-600">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Next session: {countdown}
                                    </div>
                                  )
                                })()}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="flex items-center flex-1 sm:flex-none"
                                  onClick={() => handleViewGroup(group)}
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                                  <span className="hidden sm:inline">View</span>
                                  <span className="sm:hidden">Details</span>
                                </Button>
                                
                                {/* Actions Dropdown */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                      <MoreVertical className="h-4 w-4" />
                                      <span className="sr-only">Open menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        toggleFavorite(group.id)
                                      }}
                                      className="flex items-center"
                                    >
                                      <Heart className={`h-4 w-4 mr-2 ${favoriteGroups.has(group.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                                      {favoriteGroups.has(group.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled
                                      className="flex items-center opacity-60"
                                    >
                                      <MessageCircle className="h-4 w-4 mr-2" />
                                      Chat (Coming Soon)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      disabled
                                      className="flex items-center opacity-60"
                                    >
                                      <Settings className="h-4 w-4 mr-2" />
                                      Notifications
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setGroupToLeave(group)
                                        setShowLeaveDialog(true)
                                      }}
                                      className="flex items-center text-red-600"
                                    >
                                      <UserMinus className="h-4 w-4 mr-2" />
                                      Leave Group
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            {/* Discover Groups Tab */}
            <TabsContent value="discover" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Find Support Groups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search groups..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select value={selectedMeetingType} onValueChange={setSelectedMeetingType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Meeting Types" />
                      </SelectTrigger>
                      <SelectContent>
                        {meetingTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Available Groups */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {getAvailableGroups().map((group) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group"
                  >
                    <Card className="h-full hover:shadow-lg transition-all duration-200">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={`text-xs font-medium border ${getGroupTypeColor(group.group_type)}`}
                              variant="outline"
                            >
                              {group.group_type.charAt(0).toUpperCase() + group.group_type.slice(1)}
                            </Badge>
                            <Badge 
                              className={`text-xs font-medium ${getMeetingTypeColor(group.meeting_type)}`}
                              variant="outline"
                            >
                              {getMeetingTypeIcon(group.meeting_type)}
                              <span className="ml-1 capitalize">{group.meeting_type}</span>
                            </Badge>
                          </div>
                        </div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <p className="text-sm text-gray-600 line-clamp-3">
                          {group.description}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          {/* Facilitator Info */}
                          <div className="flex items-center text-sm text-gray-600">
                            <div className="h-6 w-6 bg-[#20C0F3]/20 rounded-full flex items-center justify-center mr-2">
                              <span className="text-xs font-medium text-[#20C0F3]">
                                {group.mentor_name?.charAt(0).toUpperCase() || 'M'}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Facilitated by {group.mentor_name || 'Professional Mentor'}</span>
                              {group.mentor_specialty && (
                                <div className="text-xs text-gray-500">{group.mentor_specialty}</div>
                              )}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center text-gray-500">
                              <Users className="w-4 h-4 mr-1" />
                              {group.current_participants}/{group.max_participants} members
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Clock className="w-4 h-4 mr-1" />
                              {formatSchedule(group.meeting_schedule)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <Button 
                            className="w-full bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                            onClick={() => handleJoinGroup(group)}
                            disabled={joining}
                          >
                            {joining ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Joining...
                              </>
                            ) : group.current_participants >= group.max_participants ? (
                              <>
                                <UserPlus className="h-4 w-4 mr-2" />
                                Join Waiting List
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4 mr-2" />
                                Join Group
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {getAvailableGroups().length === 0 && (
                <Card className="text-center p-12">
                  <Filter className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No Groups Found</h3>
                  <p className="text-gray-500 mb-6">
                    Try adjusting your filters or search terms
                  </p>
                  <Button
                    onClick={() => {
                      setSearchQuery("")
                      setSelectedCategory("all")
                      setSelectedMeetingType("all")
                    }}
                    variant="outline"
                  >
                    Clear Filters
                  </Button>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Join Waiting List Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Join Waiting List</DialogTitle>
            <DialogDescription>
              This group is currently full. Join the waiting list and you'll be notified when a spot becomes available.
            </DialogDescription>
          </DialogHeader>
          <Form {...joinForm}>
            <form onSubmit={joinForm.handleSubmit(handleJoinWaitingList)} className="space-y-4">
              <FormField
                control={joinForm.control}
                name="personalMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal Message (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us why you'd like to join this group..."
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      This helps group leaders understand your interest and prioritize applications.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowJoinDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={joining}
                  className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                >
                  {joining ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    'Join Waiting List'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Group Details Dialog */}
      <Dialog open={showGroupDetails} onOpenChange={setShowGroupDetails}>
        <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedGroupDetails?.name}</DialogTitle>
            <DialogDescription>
              Group details and information
            </DialogDescription>
          </DialogHeader>
          {selectedGroupDetails && (
            <div className="space-y-6">
              {/* Group Type and Meeting Type */}
              <div className="flex items-center gap-2">
                <Badge 
                  className={`text-xs font-medium border ${getGroupTypeColor(selectedGroupDetails.group_type)}`}
                  variant="outline"
                >
                  {selectedGroupDetails.group_type.charAt(0).toUpperCase() + selectedGroupDetails.group_type.slice(1)}
                </Badge>
                <Badge 
                  className={`text-xs font-medium ${getMeetingTypeColor(selectedGroupDetails.meeting_type)}`}
                  variant="outline"
                >
                  {getMeetingTypeIcon(selectedGroupDetails.meeting_type)}
                  <span className="ml-1 capitalize">{selectedGroupDetails.meeting_type}</span>
                </Badge>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-medium mb-2">About This Group</h4>
                <p className="text-gray-600">{selectedGroupDetails.description}</p>
              </div>

              {/* Facilitator */}
              <div>
                <h4 className="font-medium mb-2">Facilitated By</h4>
                <div className="flex items-center text-sm">
                  <div className="h-8 w-8 bg-[#20C0F3]/20 rounded-full flex items-center justify-center mr-3">
                    <span className="text-sm font-medium text-[#20C0F3]">
                      {selectedGroupDetails.mentor_name?.charAt(0).toUpperCase() || 'M'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{selectedGroupDetails.mentor_name || 'Professional Mentor'}</div>
                    {selectedGroupDetails.mentor_specialty && (
                      <div className="text-xs text-gray-500">{selectedGroupDetails.mentor_specialty}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Meeting Schedule */}
              <div>
                <h4 className="font-medium mb-2">Meeting Schedule</h4>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  {formatSchedule(selectedGroupDetails.meeting_schedule)}
                </div>
              </div>

              {/* Location (if in-person) */}
              {selectedGroupDetails.meeting_type === 'in-person' && selectedGroupDetails.location && (
                <div>
                  <h4 className="font-medium mb-2">Location</h4>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {selectedGroupDetails.location}
                  </div>
                </div>
              )}

              {/* Members */}
              <div>
                <h4 className="font-medium mb-2">Group Size</h4>
                <div className="flex items-center text-sm text-gray-600">
                  <Users className="w-4 h-4 mr-2" />
                  {selectedGroupDetails.current_participants} / {selectedGroupDetails.max_participants} members
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-[#20C0F3] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(selectedGroupDetails.current_participants / selectedGroupDetails.max_participants) * 100}%` }}
                  />
                </div>
              </div>

              {/* Group Rules */}
              {selectedGroupDetails.group_rules && (
                <div>
                  <h4 className="font-medium mb-2">Group Guidelines</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedGroupDetails.group_rules}</p>
                </div>
              )}

              {/* Active Session Status */}
              {activeGroupSessions.find(gs => gs.group.id === selectedGroupDetails.id)?.activeSession && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-green-700">
                      <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                      <span className="font-medium">Live session in progress</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        const sessionData = activeGroupSessions.find(gs => gs.group.id === selectedGroupDetails.id)?.activeSession
                        if (sessionData) {
                          handleJoinSession(sessionData)
                          setShowGroupDetails(false)
                        }
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Join Now
                    </Button>
                  </div>
                </div>
              )}

              {/* Upcoming Sessions */}
              {activeGroupSessions.find(gs => gs.group.id === selectedGroupDetails.id)?.upcomingSessions?.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Upcoming Sessions</h4>
                  <div className="space-y-2">
                    {activeGroupSessions
                      .find(gs => gs.group.id === selectedGroupDetails.id)
                      ?.upcomingSessions.slice(0, 3)
                      .map((session, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center text-sm">
                            <CalendarIcon className="w-4 h-4 mr-2 text-gray-500" />
                            <span>{format(new Date(session.scheduled_at), 'MMM d, yyyy - h:mm a')}</span>
                          </div>
                          {session.title && (
                            <span className="text-xs text-gray-600">{session.title}</span>
                          )}
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Your Status */}
              {myGroups.some(g => g.id === selectedGroupDetails.id) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center text-blue-700">
                      <CheckCircle className="w-5 h-5 mr-2" />
                      <span className="font-medium">You are a member of this group</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(selectedGroupDetails.id)
                      }}
                      className="flex items-center"
                    >
                      <Heart 
                        className={`h-3.5 w-3.5 mr-1 ${favoriteGroups.has(selectedGroupDetails.id) 
                          ? 'fill-red-500 text-red-500' 
                          : 'text-gray-400'
                        }`} 
                      />
                      {favoriteGroups.has(selectedGroupDetails.id) ? 'Favorited' : 'Add to Favorites'}
                    </Button>
                  </div>
                  {groupAnalytics[selectedGroupDetails.id] && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-blue-600 font-medium">
                            {groupAnalytics[selectedGroupDetails.id].attendance_rate.toFixed(1)}%
                          </div>
                          <div className="text-gray-600">Attendance Rate</div>
                        </div>
                        <div>
                          <div className="text-blue-600 font-medium">
                            {groupAnalytics[selectedGroupDetails.id].sessions_attended}/{groupAnalytics[selectedGroupDetails.id].total_sessions}
                          </div>
                          <div className="text-gray-600">Sessions Attended</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Group Dialog */}
      <Dialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Leave Group
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to leave "{groupToLeave?.name}"? You'll lose access to group sessions and your participation history.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium mb-1">This action cannot be undone.</p>
                <p>You'll need to request to rejoin if you change your mind.</p>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowLeaveDialog(false)
                setGroupToLeave(null)
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleLeaveGroup}
              disabled={leavingGroup}
            >
              {leavingGroup ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Leaving...
                </>
              ) : (
                'Leave Group'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

export default SupportGroupsPage 