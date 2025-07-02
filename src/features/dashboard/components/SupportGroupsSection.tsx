import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { 
  Users, 
  Calendar, 
  MapPin, 
  Clock, 
  Video, 
  ExternalLink, 
  Plus,
  ChevronRight,
  MessageCircle,
  AlertCircle,
  Activity,
  Award,
  Loader2,
  Eye
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supportGroupsService } from '@/services'
import type { SupportGroup } from '@/services/support-groups/support-groups.interface'
import { toast } from 'sonner'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { format } from 'date-fns'

const SupportGroupsSection = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [myGroups, setMyGroups] = useState<SupportGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [groupAnalytics, setGroupAnalytics] = useState<{[key: string]: any}>({})
  const [showGroupDetails, setShowGroupDetails] = useState(false)
  const [selectedGroupDetails, setSelectedGroupDetails] = useState<SupportGroup | null>(null)
  const [groupSessions, setGroupSessions] = useState<Array<{
    group: SupportGroup;
    activeSession?: {
      session: any;
      meetingUrl: string;
    };
    upcomingSessions: any[];
  }>>([])
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (user) {
      fetchMyGroups()
      fetchGroupSessions()
      
      // Set up interval to check for active sessions every 30 seconds
      const interval = setInterval(() => {
        fetchGroupSessions()
      }, 30000)
      
      setRefreshInterval(interval)
      
      return () => {
        if (interval) clearInterval(interval)
      }
    }
  }, [user])

  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [refreshInterval])

  const fetchMyGroups = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const groups = await supportGroupsService.getUserGroups(user.id)
      setMyGroups(groups)
      
      // Fetch analytics for each group
      const analytics: {[key: string]: any} = {}
      for (const group of groups) {
        try {
          const memberAnalytics = await supportGroupsService.getMemberAnalytics(group.id, user.id)
          analytics[group.id] = memberAnalytics
        } catch (error) {
          console.error(`Error fetching analytics for group ${group.id}:`, error)
        }
      }
      setGroupAnalytics(analytics)
    } catch (error) {
      console.error('Error fetching user groups:', error)
      toast.error('Failed to load your support groups')
    } finally {
      setLoading(false)
    }
  }

  const fetchGroupSessions = async () => {
    if (!user) return
    
    try {
      const sessionData = await supportGroupsService.getMemberGroupSessions(user.id)
      setGroupSessions(sessionData)
    } catch (error) {
      console.error('Error fetching group sessions:', error)
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
      default: return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const formatSchedule = (schedule: any[]) => {
    if (!schedule || schedule.length === 0) return "Schedule TBD"
    
    const firstSchedule = schedule[0]
    if (!firstSchedule.time) return "Schedule TBD"
    
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

  const getAttendanceStatus = (attendanceRate: number) => {
    if (attendanceRate >= 80) return { color: 'text-green-600', label: 'Great' }
    if (attendanceRate >= 60) return { color: 'text-[#20C0F3]', label: 'Good' }
    if (attendanceRate >= 40) return { color: 'text-yellow-600', label: 'Fair' }
    return { color: 'text-red-600', label: 'Needs Improvement' }
  }

  const handleViewGroup = (group: SupportGroup) => {
    setSelectedGroupDetails(group)
    setShowGroupDetails(true)
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
            <Users className="h-6 w-6 mr-2 text-[#20C0F3]" />
            My Support Groups
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#20C0F3]" />
            <span className="ml-2 text-gray-600">Loading your groups...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-bold text-gray-800 flex items-center">
            <Users className="h-6 w-6 mr-2 text-[#20C0F3]" />
            My Support Groups
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/patient-dashboard/groups')}
              className="border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3] hover:text-white"
            >
              <ChevronRight className="h-4 w-4 mr-1" />
              Manage Groups
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/help-groups')}
              className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Find Groups
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {myGroups.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Support Groups Yet</h3>
            <p className="text-gray-500 mb-6">
              Join a support group to connect with others who understand your journey
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => navigate('/patient-dashboard/groups')}
                className="border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3] hover:text-white"
              >
                Browse Groups
              </Button>
              <Button
                onClick={() => navigate('/help-groups')}
                className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
              >
                Explore All Groups
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {myGroups.map((group) => {
              const analytics = groupAnalytics[group.id] || {}
              const attendanceStatus = getAttendanceStatus(analytics.attendance_rate || 0)
              
              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-800">
                          {group.name}
                        </h3>
                        <Badge 
                          className={`text-xs font-medium border ${getGroupTypeColor(group.group_type)}`}
                          variant="outline"
                        >
                          {group.group_type.charAt(0).toUpperCase() + group.group_type.slice(1)}
                        </Badge>
                        {/* Show live indicator on the card */}
                        {groupSessions.some(gs => gs.group.id === group.id && gs.activeSession?.session.status === 'in_progress') && (
                          <div className="flex items-center">
                            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-xs text-green-600 ml-1">Live</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {group.description}
                      </p>
                    </div>
                    <Badge className={`text-xs ${getMeetingTypeColor(group.meeting_type)}`}>
                      {getMeetingTypeIcon(group.meeting_type)}
                      <span className="ml-1">
                        {group.meeting_type === 'in-person' ? 'In-Person' : 
                         group.meeting_type === 'online' ? 'Online' : 'Hybrid'}
                      </span>
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Schedule */}
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2 text-[#20C0F3]" />
                      {formatSchedule(group.meeting_schedule)}
                    </div>

                    {/* Member count */}
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2 text-[#20C0F3]" />
                      {group.current_participants} / {group.max_participants} members
                    </div>

                    {/* Attendance rate */}
                    {analytics.attendance_rate !== undefined && (
                      <div className="flex items-center text-sm">
                        <Activity className="h-4 w-4 mr-2 text-[#20C0F3]" />
                        <span className="text-gray-600 mr-1">Attendance:</span>
                        <span className={`font-medium ${attendanceStatus.color}`}>
                          {analytics.attendance_rate}% ({attendanceStatus.label})
                        </span>
                      </div>
                    )}

                    {/* Sessions attended */}
                    {analytics.sessions_attended !== undefined && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Award className="h-4 w-4 mr-2 text-[#20C0F3]" />
                        {analytics.sessions_attended} / {analytics.total_sessions} sessions
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <div className="flex gap-2">
                      {/* View Button */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center"
                        onClick={() => {
                          // Find if this group has an active session
                          const groupWithSession = groupSessions.find(gs => gs.group.id === group.id && gs.activeSession);
                          if (groupWithSession?.activeSession) {
                            // Navigate to the session page
                            navigate(`/patient-dashboard/group-session/${groupWithSession.activeSession.session.id}`);
                          } else {
                            // Show group details
                            handleViewGroup(group);
                          }
                        }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1.5" />
                        View
                        {/* Show green dot for live sessions */}
                        {groupSessions.some(gs => gs.group.id === group.id && gs.activeSession?.session.status === 'in_progress') && (
                          <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse ml-1.5"></span>
                        )}
                      </Button>
                      
                      {/* Chat Button - Disabled */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center opacity-60 cursor-not-allowed"
                        disabled
                        title="Coming soon"
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                        Chat
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/support-groups/${group.id}/sessions`)}
                      className="flex-1 bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Sessions
                    </Button>
                  </div>
                </motion.div>
              )
            })}

            {/* Quick stats */}
            <div className="bg-gradient-to-r from-[#20C0F3]/10 to-[#20C0F3]/5 rounded-lg p-4 mt-6">
              <h4 className="font-semibold text-gray-800 mb-3">Your Progress</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#20C0F3]">{myGroups.length}</div>
                  <div className="text-sm text-gray-600">Active Groups</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#20C0F3]">
                    {Object.values(groupAnalytics).reduce((sum, analytics: any) => 
                      sum + (analytics.sessions_attended || 0), 0
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Sessions Attended</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#20C0F3]">
                    {Math.round(
                      Object.values(groupAnalytics).reduce((sum, analytics: any, index, array) => 
                        sum + (analytics.attendance_rate || 0), 0
                      ) / Math.max(Object.keys(groupAnalytics).length, 1)
                    )}%
                  </div>
                  <div className="text-sm text-gray-600">Avg. Attendance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-[#20C0F3]">
                    {Math.round(
                      Object.values(groupAnalytics).reduce((sum, analytics: any, index, array) => 
                        sum + (analytics.engagement_score || 0), 0
                      ) / Math.max(Object.keys(groupAnalytics).length, 1)
                    )}%
                  </div>
                  <div className="text-sm text-gray-600">Engagement</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>

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

              {/* Meeting Schedule */}
              <div>
                <h4 className="font-medium mb-2">Meeting Schedule</h4>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  {formatSchedule(selectedGroupDetails.meeting_schedule)}
                </div>
              </div>

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

              {/* Your Status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center text-green-700">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  <span className="font-medium">You are a member of this group</span>
                </div>
                {groupAnalytics[selectedGroupDetails.id] && (
                  <div className="mt-2 text-sm text-green-600">
                    Your attendance rate: {groupAnalytics[selectedGroupDetails.id].attendance_rate.toFixed(1)}%
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGroupDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

export default SupportGroupsSection 