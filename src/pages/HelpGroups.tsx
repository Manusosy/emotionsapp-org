import { useState } from "react"
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
  Star
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

type HelpGroup = {
  id: string;
  name: string;
  description: string;
  category: string;
  meetingType: "in-person" | "online" | "hybrid";
  schedule: string;
  location?: string;
  facilitator: {
    name: string;
    role: string;
    avatar: string;
  };
  memberCount: number;
  topics: string[];
  nextMeeting?: string;
  isOpen: boolean;
}

const HelpGroups = () => {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null)
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null)
  const [selectedMeetingTypes, setSelectedMeetingTypes] = useState<string[]>([])
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>([])
  const [topicFilter, setTopicFilter] = useState("")
  const [showLeadershipDialog, setShowLeadershipDialog] = useState(false)
  
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
  
  const helpGroups: HelpGroup[] = [
    {
      id: "1",
      name: "Anxiety Management Circle",
      description: "A supportive group focused on practical strategies to manage anxiety and panic disorders through mindfulness and cognitive behavioral techniques.",
      category: "anxiety",
      meetingType: "hybrid",
      schedule: "Every Tuesday, 6:00 PM - 7:30 PM",
      location: "Community Center, Kigali",
      facilitator: {
        name: "Dr. Marie Uwase",
        role: "Clinical Psychologist",
        avatar: "https://randomuser.me/api/portraits/women/32.jpg"
      },
      memberCount: 18,
      topics: ["Panic attacks", "Social anxiety", "Mindfulness", "Breathing techniques"],
      nextMeeting: "Tuesday, May 3rd",
      isOpen: true
    },
    {
      id: "2",
      name: "Healing Together",
      description: "A compassionate space for those experiencing depression to connect, share experiences, and learn effective coping mechanisms.",
      category: "depression",
      meetingType: "online",
      schedule: "Every Saturday, 10:00 AM - 11:30 AM",
      facilitator: {
        name: "Jean-Paul Mugabo",
        role: "Mental Health Counselor",
        avatar: "https://randomuser.me/api/portraits/men/45.jpg"
      },
      memberCount: 24,
      topics: ["Depression management", "Self-care", "Mood tracking", "Cognitive restructuring"],
      nextMeeting: "Saturday, May 7th",
      isOpen: true
    },
    {
      id: "3",
      name: "Grief Companions",
      description: "A gentle group for those navigating the complex journey of grief and loss, offering understanding and healing through shared experiences.",
      category: "grief",
      meetingType: "in-person",
      schedule: "Every other Thursday, 5:30 PM - 7:00 PM",
      location: "Healing Center, Musanze",
      facilitator: {
        name: "Claire Mukamana",
        role: "Grief Counselor",
        avatar: "https://randomuser.me/api/portraits/women/65.jpg"
      },
      memberCount: 15,
      topics: ["Bereavement", "Complex grief", "Coping skills", "Memorial activities"],
      nextMeeting: "Thursday, May 5th",
      isOpen: true
    },
    {
      id: "4",
      name: "Youth Resilience Network",
      description: "A vibrant community for young people 15-24 to build emotional resilience, discuss challenges, and develop positive mental health habits.",
      category: "youth",
      meetingType: "hybrid",
      schedule: "Every Monday, 4:00 PM - 5:30 PM",
      location: "Youth Center, Rubavu",
      facilitator: {
        name: "Eric Mugisha",
        role: "Youth Counselor",
        avatar: "https://randomuser.me/api/portraits/men/22.jpg"
      },
      memberCount: 32,
      topics: ["Teen stress", "Academic pressure", "Peer relationships", "Identity"],
      nextMeeting: "Monday, May 2nd",
      isOpen: true
    },
    {
      id: "5",
      name: "Trauma Recovery Path",
      description: "A structured, trauma-informed group providing education, coping skills, and peer support for those healing from traumatic experiences.",
      category: "trauma",
      meetingType: "in-person",
      schedule: "Every Wednesday, 6:00 PM - 7:30 PM",
      location: "Wellness Institute, Kigali",
      facilitator: {
        name: "Dr. Samuel Nkusi",
        role: "Trauma Specialist",
        avatar: "https://randomuser.me/api/portraits/men/36.jpg"
      },
      memberCount: 12,
      topics: ["PTSD", "Safety skills", "Emotional regulation", "Trauma narratives"],
      nextMeeting: "Wednesday, May 4th",
      isOpen: false
    },
    {
      id: "6",
      name: "Recovery Together",
      description: "A compassionate and confidential community for individuals on their addiction recovery journey. We focus on holistic healing approaches, practical coping strategies, and building a supportive network for sustainable recovery.",
      category: "addiction",
      meetingType: "hybrid",
      schedule: "Every Thursday, 5:00 PM - 6:30 PM",
      location: "Wellness Center, Kigali",
      facilitator: {
        name: "Agnes Uwineza",
        role: "Addiction Recovery Specialist",
        avatar: "https://randomuser.me/api/portraits/women/75.jpg"
      },
      memberCount: 26,
      topics: ["Substance abuse", "Relapse prevention", "Building support systems", "Mindfulness for recovery"],
      nextMeeting: "Thursday, May 12th",
      isOpen: true
    }
  ]
  
  const filteredGroups = helpGroups.filter(group => {
    if (activeCategory !== "all" && group.category !== activeCategory) {
      return false;
    }
    if (searchQuery && !group.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !group.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedMeetingTypes.length > 0 && !selectedMeetingTypes.includes(group.meetingType)) {
      return false;
    }
    if (selectedAvailability.length > 0) {
      if (selectedAvailability.includes("open") && !group.isOpen) {
        return false;
      }
      if (selectedAvailability.includes("closed") && group.isOpen) {
        return false;
      }
    }
    if (topicFilter && !group.topics.some(topic => 
      topic.toLowerCase().includes(topicFilter.toLowerCase()))) {
      return false;
    }
    return true;
  });
  
  const getMeetingTypeIcon = (type: string) => {
    switch(type) {
      case "in-person": return <MapPin className="w-4 h-4" />;
      case "online": return <MessageCircle className="w-4 h-4" />;
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
    setTopicFilter("");
    setShowFilters(false);
  };

  // Define schema for the leadership application form
  const leadershipFormSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    email: z.string().email({ message: "Please enter a valid email address." }),
    phone: z.string().min(10, { message: "Please enter a valid phone number." }),
    experience: z.string().min(20, { message: "Please describe your experience in at least 20 characters." }),
    groupType: z.string().min(2, { message: "Please specify what type of group you want to lead." }),
    motivation: z.string().min(20, { message: "Please describe your motivation in at least 20 characters." }),
  });

  // Create the form
  const leadershipForm = useForm<z.infer<typeof leadershipFormSchema>>({
    resolver: zodResolver(leadershipFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      experience: "",
      groupType: "",
      motivation: "",
    },
  });

  // Handle form submission
  const onLeadershipSubmit = (data: z.infer<typeof leadershipFormSchema>) => {
    // In a real application, this would send the data to the server
    console.log("Leadership application data:", data);
    
    // Show success toast
    toast.success("Your application has been submitted! We'll contact you soon.");
    
    // Close the dialog
    setShowLeadershipDialog(false);
    
    // Reset the form
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
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">Help Groups</h1>
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
      <div className="py-8 container mx-auto px-4">
        {/* Filter Bar */}
        <div className="mb-8 -mt-8 bg-white rounded-xl shadow-md p-2 max-w-5xl mx-auto">
          <Tabs defaultValue="all" onValueChange={setActiveCategory} className="w-full">
            <TabsList className="bg-gray-50 p-1 rounded-lg overflow-x-auto flex flex-nowrap">
              {categories.map(category => (
                <TabsTrigger 
                  key={category.id} 
                  value={category.id} 
                  className="rounded-md py-2 px-4 whitespace-nowrap data-[state=active]:bg-white data-[state=active]:text-[#20c0f3] data-[state=active]:shadow-sm"
                >
                  {category.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        {/* Advanced Filters (collapsible) */}
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-8 bg-white p-6 rounded-xl shadow-md max-w-5xl mx-auto text-left"
          >
            <h3 className="text-lg font-medium mb-4 flex items-center text-left font-jakarta text-[#001A41]">
              <Filter className="h-5 w-5 mr-2 text-[#20c0f3]" />
              Advanced Filters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="text-left">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Meeting Type</label>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant="outline" 
                    className={`cursor-pointer px-3 py-1 ${
                      selectedMeetingTypes.includes("online") 
                        ? "bg-blue-50 text-[#20c0f3] border-[#20c0f3]" 
                        : "hover:bg-blue-50 hover:text-[#20c0f3] hover:border-[#20c0f3]"
                    }`}
                    onClick={() => toggleFilter("online", 'meetingType')}
                  >
                    Online
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`cursor-pointer px-3 py-1 ${
                      selectedMeetingTypes.includes("in-person") 
                        ? "bg-blue-50 text-[#20c0f3] border-[#20c0f3]" 
                        : "hover:bg-blue-50 hover:text-[#20c0f3] hover:border-[#20c0f3]"
                    }`}
                    onClick={() => toggleFilter("in-person", 'meetingType')}
                  >
                    In-Person
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`cursor-pointer px-3 py-1 ${
                      selectedMeetingTypes.includes("hybrid") 
                        ? "bg-blue-50 text-[#20c0f3] border-[#20c0f3]" 
                        : "hover:bg-blue-50 hover:text-[#20c0f3] hover:border-[#20c0f3]"
                    }`}
                    onClick={() => toggleFilter("hybrid", 'meetingType')}
                  >
                    Hybrid
                  </Badge>
                </div>
              </div>
              <div className="text-left">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Availability</label>
                <div className="flex flex-wrap gap-2">
                  <Badge 
                    variant="outline" 
                    className={`cursor-pointer px-3 py-1 ${
                      selectedAvailability.includes("open") 
                        ? "bg-blue-50 text-[#20c0f3] border-[#20c0f3]" 
                        : "hover:bg-blue-50 hover:text-[#20c0f3] hover:border-[#20c0f3]"
                    }`}
                    onClick={() => toggleFilter("open", 'availability')}
                  >
                    Open Groups
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={`cursor-pointer px-3 py-1 ${
                      selectedAvailability.includes("closed") 
                        ? "bg-blue-50 text-[#20c0f3] border-[#20c0f3]" 
                        : "hover:bg-blue-50 hover:text-[#20c0f3] hover:border-[#20c0f3]"
                    }`}
                    onClick={() => toggleFilter("closed", 'availability')}
                  >
                    Closed Groups
                  </Badge>
                </div>
              </div>
              <div className="text-left">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">Topics</label>
                <Input 
                  type="text" 
                  placeholder="Search topics..." 
                  className="text-sm bg-gray-50 border-0"
                  value={topicFilter}
                  onChange={(e) => setTopicFilter(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="mr-2 text-gray-500"
                onClick={resetFilters}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                className="bg-[#20c0f3] hover:bg-[#0bb2e8] text-white"
                onClick={() => setShowFilters(false)}
              >
                Apply Filters
              </Button>
            </div>
          </motion.div>
        )}
        
        {/* Group Listings */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 gap-6 max-w-5xl mx-auto"
        >
          {filteredGroups.map(group => (
            <motion.div
              key={group.id}
              variants={fadeInUp}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="h-full"
              onMouseEnter={() => setHoveredGroupId(group.id)}
              onMouseLeave={() => setHoveredGroupId(null)}
              onClick={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
            >
              <Card className="h-full bg-white border-none shadow-md hover:shadow-lg transition-all overflow-hidden">
                <div className="md:flex">
                  {/* Left Column - Group Details */}
                  <div className="md:w-3/4 p-0">
                    <CardHeader className="pb-2 relative">
                      <div className="absolute -left-2 top-6 h-8 w-2 bg-[#20c0f3] rounded-r-md"></div>
                      <div className="ml-2">
                        <CardTitle className="text-2xl font-bold text-gray-800 text-left">{group.name}</CardTitle>
                        <div className="flex flex-wrap gap-2 my-2">
                          <Badge className={`${getMeetingTypeColor(group.meetingType)} border-0`}>
                            {getMeetingTypeIcon(group.meetingType)}
                            <span className="ml-1">{getMeetingTypeLabel(group.meetingType)}</span>
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-700 border-0">
                            <Users className="w-3 h-3 mr-1" /> {group.memberCount} members
                          </Badge>
                          {group.isOpen ? (
                            <Badge className="bg-green-100 text-green-700 border-0">Open</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-0">Closed</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="py-3">
                      <CardDescription className="text-gray-600 mb-4 text-base leading-relaxed text-left">
                        {group.description}
                      </CardDescription>
                      
                      <div className="space-y-2 mb-5">
                        <div className="flex items-start text-sm text-left">
                          <div className="bg-blue-50 p-1.5 rounded-full mr-3">
                            <CalendarDays className="h-4 w-4 text-[#20c0f3]" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-700 text-left">{group.schedule}</p>
                            {group.nextMeeting && (
                              <p className="text-sm text-[#20c0f3] text-left">Next meeting: {group.nextMeeting}</p>
                            )}
                          </div>
                        </div>
                        
                        {group.location && (
                          <div className="flex items-start text-sm text-left">
                            <div className="bg-blue-50 p-1.5 rounded-full mr-3">
                              <MapPin className="h-4 w-4 text-[#20c0f3]" />
                            </div>
                            <span className="text-gray-700 text-left">{group.location}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {group.topics.map((topic, index) => (
                          <Badge key={index} variant="outline" className="bg-gray-50 text-gray-700 border-0 text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </div>
                  
                  {/* Right Column - Facilitator & Actions */}
                  <div className="md:w-1/4 border-l border-gray-100 bg-gray-50 p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm uppercase text-gray-500 font-medium mb-3 text-center font-jakarta">Facilitator</h4>
                      <div className="flex flex-col items-center text-center mb-6">
                        <Avatar className="h-16 w-16 mb-2 border-2 border-white shadow-md">
                          <AvatarImage src={group.facilitator.avatar} alt={group.facilitator.name} />
                          <AvatarFallback>{group.facilitator.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <p className="font-medium text-gray-800">{group.facilitator.name}</p>
                        <p className="text-xs text-gray-500">{group.facilitator.role}</p>
                        
                        <div className="flex items-center mt-2">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <Star className="h-3 w-3 fill-gray-200 text-gray-200" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-auto">
                      <Button variant="outline" className="w-full border-gray-200 text-gray-700 hover:text-[#20c0f3] hover:border-[#20c0f3]">
                        <Info className="mr-2 h-4 w-4" /> Details
                      </Button>
                      <Button className="w-full bg-[#20c0f3] hover:bg-[#0bb2e8] text-white">
                        Join Group
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
        
        {filteredGroups.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <div className="bg-gray-100 inline-flex p-4 rounded-full mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium mb-2">No groups found</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search or filter to find what you're looking for.</p>
            <Button onClick={() => {setSearchQuery(""); setActiveCategory("all")}} className="bg-[#20c0f3] hover:bg-[#0bb2e8] text-white">
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* Create Group Call-to-Action */}
      <div className="py-16 bg-gray-100">
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
                <Button 
                  className="mt-8 bg-[#20c0f3] hover:bg-[#0bb2e8] text-white shadow-md"
                  onClick={() => setShowLeadershipDialog(true)}
                >
                  Apply to Lead a Group <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
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

      {/* Add the dialog component at the end of the component (before the last closing tag) */}
      <Dialog open={showLeadershipDialog} onOpenChange={setShowLeadershipDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={leadershipForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="text-left">
                      <FormLabel className="text-left">Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Your email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={leadershipForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem className="text-left">
                      <FormLabel className="text-left">Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Your phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={leadershipForm.control}
                name="groupType"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel className="text-left">What type of group would you like to lead?</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Anxiety support, Grief companions, etc." {...field} />
                    </FormControl>
                    <FormDescription className="text-left">Specify the focus of your proposed support group</FormDescription>
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
                        placeholder="Please describe your experience in mental health support, facilitation, or related fields..." 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={leadershipForm.control}
                name="motivation"
                render={({ field }) => (
                  <FormItem className="text-left">
                    <FormLabel className="text-left">Motivation</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Why do you want to lead a support group? What do you hope to achieve?" 
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-6">
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="bg-[#20c0f3] hover:bg-[#0bb2e8] text-white">Submit Application</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default HelpGroups 