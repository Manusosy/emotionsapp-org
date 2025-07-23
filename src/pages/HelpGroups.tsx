import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { motion } from "framer-motion"
import { 
  Users, 
  CalendarDays, 
  MapPin, 
  Search, 
  Filter, 
  ChevronRight,
  BookOpen,
  MessageCircle,
  Clock,
  Tag,
  Info,
  Heart,
  ExternalLink,
  ArrowRight,
  Star,
  Video,
  MapPinIcon,
  UserPlus,
  Loader2,
  Globe,
  Home,
  X,
  Eye
} from "lucide-react"
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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth"
import { supportGroupsService } from "@/services"
import type { SupportGroup } from "@/services/support-groups/support-groups.interface"

// Form schemas
const leadershipFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  experience: z.string().min(10, "Experience must be at least 10 characters"),
  groupType: z.string().min(1, "Group type is required"),
  reason: z.string().min(20, "Reason must be at least 20 characters"),
});

const joinGroupSchema = z.object({
  personalMessage: z.string().min(10, "Personal message must be at least 10 characters").optional(),
});

const HelpGroups = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedMeetingTypes, setSelectedMeetingTypes] = useState<string[]>([])
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([])
  const [showLeadershipDialog, setShowLeadershipDialog] = useState(false)
  const [supportGroups, setSupportGroups] = useState<SupportGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<SupportGroup | null>(null)
  const [showGroupDetails, setShowGroupDetails] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)
  const [joining, setJoining] = useState(false)
  
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  }
  
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }
  
  const categories = [
    { id: "all", label: "All Groups" },
    { id: "anxiety", label: "Anxiety" },
    { id: "depression", label: "Depression" },
    { id: "grief", label: "Grief & Loss" },
    { id: "addiction", label: "Addiction Recovery" },
    { id: "trauma", label: "Trauma" },
    { id: "youth", label: "Youth Support" }
  ]

  // Form setup
  const leadershipForm = useForm<z.infer<typeof leadershipFormSchema>>({
    resolver: zodResolver(leadershipFormSchema),
    defaultValues: {
      name: "",
      email: "",
      experience: "",
      groupType: "",
      reason: "",
    },
  });

  const joinForm = useForm<z.infer<typeof joinGroupSchema>>({
    resolver: zodResolver(joinGroupSchema),
    defaultValues: {
      personalMessage: "",
    },
  });
  
  useEffect(() => {
    fetchSupportGroups()
  }, [])

  const fetchSupportGroups = async () => {
    try {
      setLoading(true)
      console.log('HelpGroups: Starting to fetch support groups...')
      
      // First, sync member counts to ensure accuracy (optional - don't fail if this errors)
      console.log('HelpGroups: Syncing group member counts...')
      try {
        await supportGroupsService.syncGroupMemberCounts()
        console.log('HelpGroups: Member count sync completed')
      } catch (syncError) {
        console.warn('HelpGroups: Member count sync failed, but continuing:', syncError)
        // Continue even if sync fails
      }
      
      console.log('HelpGroups: Fetching public support groups...')
      const groups = await supportGroupsService.getSupportGroups({
        is_public: true,
        status: 'active'
      })
      
      console.log('HelpGroups: Fetched groups:', groups)
      setSupportGroups(groups)
      
      if (groups && groups.length > 0) {
        console.log(`HelpGroups: Successfully loaded ${groups.length} support groups`)
      } else {
        console.log('HelpGroups: No support groups found')
      }
    } catch (error) {
      console.error('HelpGroups: Error fetching support groups:', error)
      console.error('HelpGroups: Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details
      })
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
      fetchSupportGroups() // Refresh data
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
    } catch (error) {
      console.error('Error joining waiting list:', error)
      toast.error('Failed to join waiting list')
    } finally {
      setJoining(false)
    }
  }

  const handleViewDetails = (group: SupportGroup) => {
    setSelectedGroup(group)
    setShowGroupDetails(true)
  }

  // Check if current user is a mentor
  const isMentor = user?.user_metadata?.role === 'mood_mentor'
  
  const filteredGroups = supportGroups.filter(group => {
    if (activeCategory !== "all" && group.group_type !== activeCategory) {
      return false;
    }
    if (searchQuery && !group.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !group.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedMeetingTypes.length > 0 && !selectedMeetingTypes.includes(group.meeting_type)) {
      return false;
    }
    if (selectedAvailability.length > 0) {
      if (selectedAvailability.includes("open") && group.current_participants >= group.max_participants) {
        return false;
      }
      if (selectedAvailability.includes("closed") && group.current_participants < group.max_participants) {
        return false;
      }
    }
    return true;
  });
  
  const getMeetingTypeIcon = (type: string) => {
    switch(type) {
      case "in-person": return <MapPinIcon className="w-4 h-4" />;
      case "online": return <Video className="w-4 h-4" />;
      case "hybrid": return <Users className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };
  
  const getMeetingTypeLabel = (type: string) => {
    switch(type) {
      case "in-person": return "In-Person";
      case "online": return "Online";
      case "hybrid": return "Hybrid";
      default: return type;
    }
  };
  
  const getMeetingTypeColor = (type: string) => {
    switch(type) {
      case "in-person": return "bg-emerald-100 text-emerald-700";
      case "online": return "bg-blue-100 text-blue-700";
      case "hybrid": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getGroupTypeColor = (type: string) => {
    switch(type) {
      case "anxiety": return "bg-[#20C0F3]/10 text-[#20C0F3] border-[#20C0F3]/20";
      case "depression": return "bg-purple-100 text-purple-700 border-purple-200";
      case "grief": return "bg-rose-100 text-rose-700 border-rose-200";
      case "addiction": return "bg-green-100 text-green-700 border-green-200";
      case "trauma": return "bg-orange-100 text-orange-700 border-orange-200";
      case "youth": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const toggleFilter = (type: string, category: 'meetingType' | 'availability') => {
    if (category === 'meetingType') {
      if (selectedMeetingTypes.includes(type)) {
        setSelectedMeetingTypes(selectedMeetingTypes.filter(t => t !== type));
      } else {
        setSelectedMeetingTypes([...selectedMeetingTypes, type]);
      }
    } else if (category === 'availability') {
      if (selectedAvailability.includes(type)) {
        setSelectedAvailability(selectedAvailability.filter(t => t !== type));
      } else {
        setSelectedAvailability([...selectedAvailability, type]);
      }
    }
  };

  const resetFilters = () => {
    setSelectedMeetingTypes([]);
    setSelectedAvailability([]);
    setShowFilters(false);
  };

  const formatSchedule = (schedule: any[]) => {
    if (!schedule || schedule.length === 0) return "Schedule TBD";
    
    const firstSchedule = schedule[0];
    if (!firstSchedule.time) return "Schedule TBD";
    
    try {
      const time = new Date(`2000-01-01T${firstSchedule.time}`).toLocaleTimeString([], { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      
      return `Every ${firstSchedule.day}, ${time}`;
    } catch {
      return "Schedule TBD";
    }
  };

  const onLeadershipSubmit = (data: z.infer<typeof leadershipFormSchema>) => {
    console.log("Leadership application:", data);
    toast.success("Application submitted successfully! We'll review your application and contact you soon.");
    setShowLeadershipDialog(false);
    leadershipForm.reset();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#0078FF] via-[#20c0f3] to-[#00D2FF] text-white pt-20 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 w-96 h-96 rounded-full bg-white"></div>
          <div className="absolute right-0 bottom-0 w-80 h-80 rounded-full bg-white"></div>
          <div className="absolute left-1/3 top-1/3 w-64 h-64 rounded-full bg-white"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">Support Groups</h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto text-blue-50 mb-8">
              Connect with others who understand what you're going through. Our support groups 
              provide a safe space to share experiences and grow together.
            </p>
            <div className="relative max-w-xl mx-auto">
              <Input 
                type="text"
                placeholder="Search for a group..."
                className="pl-10 py-3 w-full rounded-full border-0 text-gray-800 shadow-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            </div>
          </motion.div>
        </div>
        
        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gray-50" style={{ 
          clipPath: "ellipse(75% 100% at 50% 100%)" 
        }}></div>
      </div>

      {/* Main Content Section */}
      <div className="container mx-auto px-4 py-12 -mt-8 relative z-10">
        {/* Categories and Filters */}
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="mb-8"
        >
          {/* Categories */}
          <motion.div variants={fadeInUp} className="mb-6">
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "outline"}
                  className={`rounded-full px-6 py-2 transition-all ${
                    activeCategory === category.id 
                      ? "bg-[#20C0F3] hover:bg-[#1BAEE5] text-white border-[#20C0F3]" 
                      : "border-gray-300 hover:border-[#20C0F3] hover:text-[#20C0F3]"
                  }`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Filter Bar */}
          <motion.div variants={fadeInUp} className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 border-gray-300 hover:border-[#20C0F3] hover:text-[#20C0F3]"
              >
                <Filter className="h-4 w-4" />
                Filters
                {(selectedMeetingTypes.length > 0 || selectedAvailability.length > 0) && (
                  <Badge variant="secondary" className="ml-2 bg-[#20C0F3] text-white">
                    {selectedMeetingTypes.length + selectedAvailability.length}
                  </Badge>
                )}
              </Button>
              {(selectedMeetingTypes.length > 0 || selectedAvailability.length > 0) && (
                <Button variant="ghost" onClick={resetFilters} className="text-gray-500 hover:text-[#20C0F3]">
                  Clear all
                </Button>
              )}
            </div>
            <div className="text-sm text-gray-600">
              {loading ? "Loading..." : `${filteredGroups.length} groups found`}
            </div>
          </motion.div>

          {/* Filter Options */}
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white rounded-lg p-6 shadow-sm border mb-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Meeting Type Filter */}
                <div>
                  <h3 className="font-semibold mb-3 text-gray-800">Meeting Type</h3>
                  <div className="flex flex-wrap gap-2">
                    {['online', 'in-person', 'hybrid'].map((type) => (
                      <Button
                        key={type}
                        variant={selectedMeetingTypes.includes(type) ? "default" : "outline"}
                        size="sm"
                        className={`rounded-full ${
                          selectedMeetingTypes.includes(type)
                            ? "bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                            : "border-gray-300 hover:border-[#20C0F3] hover:text-[#20C0F3]"
                        }`}
                        onClick={() => toggleFilter(type, 'meetingType')}
                      >
                        {getMeetingTypeIcon(type)}
                        <span className="ml-2">{getMeetingTypeLabel(type)}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Availability Filter */}
                <div>
                  <h3 className="font-semibold mb-3 text-gray-800">Availability</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'open', label: 'Open Spots' },
                      { id: 'closed', label: 'Full Groups' }
                    ].map((option) => (
                      <Button
                        key={option.id}
                        variant={selectedAvailability.includes(option.id) ? "default" : "outline"}
                        size="sm"
                        className={`rounded-full ${
                          selectedAvailability.includes(option.id)
                            ? "bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                            : "border-gray-300 hover:border-[#20C0F3] hover:text-[#20C0F3]"
                        }`}
                        onClick={() => toggleFilter(option.id, 'availability')}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Groups Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#20C0F3]" />
            <span className="ml-2 text-gray-600">Loading support groups...</span>
          </div>
        ) : filteredGroups.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No groups found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your filters or search terms</p>
            <Button 
              onClick={resetFilters}
              className="bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
            >
              Clear Filters
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredGroups.map((group, index) => (
              <motion.div
                key={group.id}
                variants={fadeInUp}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="h-full border-0 shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge 
                        className={`text-xs font-medium border ${getGroupTypeColor(group.group_type)}`}
                        variant="outline"
                      >
                        {group.group_type.charAt(0).toUpperCase() + group.group_type.slice(1)}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Badge className={`text-xs ${getMeetingTypeColor(group.meeting_type)}`}>
                          {getMeetingTypeIcon(group.meeting_type)}
                          <span className="ml-1">{getMeetingTypeLabel(group.meeting_type)}</span>
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-800 group-hover:text-[#20C0F3] transition-colors">
                      {group.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 line-clamp-2">
                      {group.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pb-4">
                    <div className="space-y-3">
                      {/* Facilitator */}
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
                      
                      {/* Schedule */}
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="h-4 w-4 mr-2 text-[#20C0F3]" />
                        {formatSchedule(group.meeting_schedule)}
                      </div>
                      
                      {/* Location */}
                      {group.meeting_type === 'in-person' && group.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 text-[#20C0F3]" />
                          {group.location}
                        </div>
                      )}
                      
                      {/* Participants */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="h-4 w-4 mr-2 text-[#20C0F3]" />
                          {group.current_participants} / {group.max_participants} members
                        </div>
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-[#20C0F3] h-2 rounded-full transition-all"
                            style={{ 
                              width: `${(group.current_participants / group.max_participants) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-0 pb-4">
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(group)}
                        className="flex-1 border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3] hover:text-white"
                      >
                        <Info className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center opacity-60 cursor-not-allowed"
                        disabled
                        title="Coming soon"
                      >
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                        Chat
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleJoinGroup(group)}
                        disabled={joining || group.current_participants >= group.max_participants}
                        className="flex-1 bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                      >
                        {joining ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : group.current_participants >= group.max_participants ? (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Join Waitlist
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Join Group
                          </>
                        )}
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Leader Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 items-center">
              <div className="p-8 md:p-12 relative text-left">
                <div className="absolute top-0 left-0 h-1 w-24 bg-[#20c0f3]"></div>
                <h2 className="text-3xl md:text-4xl font-bold text-[#001A41] mb-4 text-left font-jakarta">Start Your Own Support Group</h2>
                <p className="text-gray-600 mb-8 text-left">
                  Are you a Mood Mentor looking to create a safe space for people to connect and heal? 
                  We provide the platform, resources, and guidance to help you lead a meaningful support group.
                </p>
                <div className="space-y-5">
                  <div className="flex items-start">
                    <div className="bg-[#20c0f3]/10 rounded-lg p-2 mr-4">
                      <Users className="h-6 w-6 text-[#20c0f3]" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-gray-800 font-medium text-left">Community Building</h3>
                      <p className="text-gray-500 text-sm text-left">Create meaningful connections around shared experiences</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-[#20c0f3]/10 rounded-lg p-2 mr-4">
                      <BookOpen className="h-6 w-6 text-[#20c0f3]" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-gray-800 font-medium text-left">Facilitation Resources</h3>
                      <p className="text-gray-500 text-sm text-left">Access training, materials, and ongoing support</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="bg-[#20c0f3]/10 rounded-lg p-2 mr-4">
                      <Tag className="h-6 w-6 text-[#20c0f3]" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-gray-800 font-medium text-left">Customizable Framework</h3>
                      <p className="text-gray-500 text-sm text-left">Create a group that meets the specific needs of your community</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 mt-8">
                  <Button 
                    className="bg-[#20c0f3] hover:bg-[#0bb2e8] text-white shadow-md"
                    onClick={() => setShowLeadershipDialog(true)}
                  >
                    Apply to Lead a Group <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  {user && (
                    <Button 
                      variant="outline"
                      className="border-[#20c0f3] text-[#20c0f3] hover:bg-[#20c0f3] hover:text-white"
                      onClick={() => navigate('/mood-mentor-dashboard/groups')}
                    >
                      My Groups Dashboard
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="hidden md:block h-full">
                <img 
                  src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?q=80&w=1740&auto=format&fit=crop" 
                  alt="Support group meeting" 
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Group Details Dialog */}
      <Dialog open={showGroupDetails} onOpenChange={setShowGroupDetails}>
        <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#001A41] text-left">
              {selectedGroup?.name}
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-left">
              Detailed information about this support group
            </DialogDescription>
          </DialogHeader>
          
          {selectedGroup && (
            <div className="space-y-6">
              {/* Group Type and Meeting Type */}
              <div className="flex gap-2">
                <Badge className={`${getGroupTypeColor(selectedGroup.group_type)} border`}>
                  {selectedGroup.group_type.charAt(0).toUpperCase() + selectedGroup.group_type.slice(1)}
                </Badge>
                <Badge className={getMeetingTypeColor(selectedGroup.meeting_type)}>
                  {getMeetingTypeIcon(selectedGroup.meeting_type)}
                  <span className="ml-1">{getMeetingTypeLabel(selectedGroup.meeting_type)}</span>
                </Badge>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold mb-2 text-gray-800">About This Group</h3>
                <p className="text-gray-600">{selectedGroup.description}</p>
              </div>

              {/* Schedule */}
              <div>
                <h3 className="font-semibold mb-2 text-gray-800">Meeting Schedule</h3>
                <div className="flex items-center text-gray-600">
                  <Clock className="h-4 w-4 mr-2 text-[#20C0F3]" />
                  {formatSchedule(selectedGroup.meeting_schedule)}
                </div>
              </div>

              {/* Location */}
              {(selectedGroup.meeting_type === 'in-person' || selectedGroup.meeting_type === 'hybrid') && selectedGroup.location && (
                <div>
                  <h3 className="font-semibold mb-2 text-gray-800">Location</h3>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="h-4 w-4 mr-2 text-[#20C0F3]" />
                    {selectedGroup.location}
                  </div>
                </div>
              )}

              {/* Group Capacity */}
              <div>
                <h3 className="font-semibold mb-2 text-gray-800">Group Size</h3>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">
                    {selectedGroup.current_participants} / {selectedGroup.max_participants} members
                  </span>
                  <span className="text-sm text-gray-500">
                    {selectedGroup.max_participants - selectedGroup.current_participants} spots available
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-[#20C0F3] h-3 rounded-full transition-all"
                    style={{ 
                      width: `${(selectedGroup.current_participants / selectedGroup.max_participants) * 100}%` 
                    }}
                  ></div>
                </div>
              </div>

              {/* Group Rules */}
              {selectedGroup.group_rules && (
                <div>
                  <h3 className="font-semibold mb-2 text-gray-800">Group Guidelines</h3>
                  <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                    {selectedGroup.group_rules}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => handleJoinGroup(selectedGroup)}
                  disabled={joining || selectedGroup.current_participants >= selectedGroup.max_participants}
                  className="flex-1 bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                >
                  {joining ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : selectedGroup.current_participants >= selectedGroup.max_participants ? (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join Waitlist
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Join Group
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowGroupDetails(false)}
                  className="border-gray-300"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Join Waiting List Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent className="sm:max-w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#001A41]">Join Waiting List</DialogTitle>
            <DialogDescription>
              This group is currently full. You can join the waiting list and we'll notify you when a spot opens up.
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
                        rows={4}
                      />
                    </FormControl>
                    <FormDescription>
                      A personal message can help us prioritize waiting list members
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={joining}
                  className="flex-1 bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                >
                  {joining ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Join Waiting List
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowJoinDialog(false)}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Leadership Application Dialog */}
      <Dialog open={showLeadershipDialog} onOpenChange={setShowLeadershipDialog}>
        <DialogContent className="sm:max-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#001A41] text-left font-jakarta">Apply to Lead a Support Group</DialogTitle>
            <DialogDescription className="text-gray-600 text-left">
              Complete this form to apply to become a support group leader. We'll review your application and contact you soon.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...leadershipForm}>
            <form onSubmit={leadershipForm.handleSubmit(onLeadershipSubmit)} className="space-y-4 text-left">
              <FormField
                control={leadershipForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel className="text-left">Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={leadershipForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel className="text-left">Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your.email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={leadershipForm.control}
                name="experience"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel className="text-left">Relevant Experience</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your experience with mental health, counseling, or group facilitation..."
                        {...field}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={leadershipForm.control}
                name="groupType"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel className="text-left">Preferred Group Type</FormLabel>
                    <FormControl>
                      <select 
                        {...field}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#20C0F3] focus:border-transparent"
                      >
                        <option value="">Select a group type</option>
                        <option value="anxiety">Anxiety Support</option>
                        <option value="depression">Depression Support</option>
                        <option value="grief">Grief & Loss</option>
                        <option value="addiction">Addiction Recovery</option>
                        <option value="trauma">Trauma Support</option>
                        <option value="youth">Youth Support</option>
                      </select>
                    </FormControl>
                    <FormDescription className="text-left">Specify the focus of your proposed support group</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={leadershipForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel className="text-left">Why do you want to lead a support group?</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Why do you want to lead a support group? What do you hope to achieve?"
                        {...field}
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1 bg-[#20C0F3] hover:bg-[#1BAEE5] text-white"
                >
                  Submit Application
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowLeadershipDialog(false)}
                  className="border-gray-300"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default HelpGroups 