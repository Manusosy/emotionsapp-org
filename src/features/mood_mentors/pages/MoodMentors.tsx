import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { MapPin, ThumbsUp, MessageSquare, DollarSign, Info, Search, Calendar, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Link } from "react-router-dom"
import BookingButton from "@/features/booking/components/BookingButton"
import { moodMentorService } from "@/services"
import "../styles/MoodMentors.css"
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion"
import { slugify } from '@/utils/formatters'
import { supabase } from '@/lib/supabase'

type MoodMentor = {
  id: string
  name: string
  credentials: string
  specialty: string
  rating: number | null
  totalRatings: number
  feedback: number
  location: string
  city: string
  country: string
  isFree: boolean
  therapyTypes: string[]
  image: string
  satisfaction: number
  gender: string
  nameSlug: string
  education?: string
}

const MoodMentors = () => {
  const { scrollY } = useScroll();
  const containerRef = useRef(null);
  
  // Transform values for the gradients as user scrolls
  const backgroundOpacity = useTransform(scrollY, [0, 300], [0.8, 0.6]);
  const backgroundOpacity2 = useTransform(scrollY, [0, 300], [0.9, 0.7]);

  const [selectedGender, setSelectedGender] = useState<string[]>([])
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedDate, setSelectedDate] = useState("")
  const [availableSpecialties, setAvailableSpecialties] = useState<string[]>([
    "Depression & Anxiety",
    "Trauma & PTSD",
    "Relationship Issues",
    "Addiction & Recovery",
    "Stress Management",
    "Self-Esteem",
    "Grief",
    "Life Transitions",
    "LGBTQ+ Issues"
  ])
  const [availableCountries, setAvailableCountries] = useState<string[]>([])
  const [filteredMoodMentors, setFilteredMoodMentors] = useState<MoodMentor[]>([])
  const [loading, setLoading] = useState(true)
  const [realMoodMentors, setRealMoodMentors] = useState<MoodMentor[]>([])
  const [showFilters, setShowFilters] = useState(false)
  
  // Fetch real mood mentors from service
  useEffect(() => {
    const fetchRealMoodMentors = async () => {
      // Always try to fetch mood mentors - removed mentorsLoaded check
      try {
        console.log("Fetching mood mentors with mood mentor service...")
        const mentorsData = await moodMentorService.getMoodMentors({ limit: 50 })
        console.log("Mood mentor service response:", mentorsData)
        
        if (mentorsData && mentorsData.length > 0) {
          // Map to expected MoodMentor format with real review data
          const mappedMoodMentors = await Promise.all(mentorsData.map(async (mentor) => {
            console.log("Processing mood mentor:", mentor.fullName || mentor.id)
            
            // Get location data
            let city = "City";
            let country = "Country";
            if (mentor.location) {
              const locationParts = mentor.location.split(", ");
              if (locationParts.length >= 2) {
                [city, country] = locationParts;
              } else {
                city = mentor.location;
              }
            }
            
            // Get therapy types from multiple possible sources
            let therapyTypes = [];
            if (Array.isArray(mentor.therapyTypes) && mentor.therapyTypes.length > 0) {
              therapyTypes = mentor.therapyTypes;
            } else if (mentor.specialty) {
              therapyTypes = [mentor.specialty];
            } else {
              therapyTypes = ["Mental Health Support"];
            }
            
            // Handle image
            const image = mentor.avatarUrl || 
              "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80";
            
            // Get name from fullName
            const name = mentor.fullName || "Mood Mentor";
            
            // Generate slug if not present
            const nameSlug = mentor.nameSlug || slugify(name);
            
            // Extract education information
            let education = "";
            if (mentor.education && Array.isArray(mentor.education) && mentor.education.length > 0) {
              education = mentor.education[0].degree || "";
            }

            // Get real review statistics
            let realRating = null;
            let reviewCount = 0;
            let satisfaction = 95; // Default satisfaction

            if (mentor.userId) {
              try {
                // Use the same RPC function we created earlier
                const { data: reviewStats, error: reviewError } = await supabase.rpc('get_mentor_review_stats', {
                  mentor_uuid: mentor.userId
                });

                if (!reviewError && reviewStats && reviewStats.length > 0) {
                  const stats = reviewStats[0];
                  realRating = parseFloat(stats.average_rating || '0');
                  reviewCount = stats.total_reviews || 0;
                  
                  // Calculate satisfaction percentage based on rating (rating/5 * 100)
                  if (realRating > 0) {
                    satisfaction = Math.round((realRating / 5) * 100);
                  }
                }
              } catch (error) {
                console.warn('Error fetching review stats for mentor:', mentor.userId, error);
              }
            }
              
            // Format data into our frontend model  
            return {
              id: mentor.id || Math.random().toString(),
              name: name,
              credentials: mentor.specialty || "Mental Health Specialist",
              specialty: mentor.specialty || "Mental Health Support",
              rating: realRating,
              totalRatings: reviewCount,
              feedback: reviewCount,
              location: mentor.location || "Kigali, Rwanda",
              city: city,
              country: country,
              isFree: mentor.isFree ?? true,
              therapyTypes: therapyTypes,
              image: image,
              satisfaction: satisfaction,
              gender: mentor.gender || "Male",
              nameSlug: nameSlug,
              education: education
            }
          }))
          
          // Wait for all async operations to complete
          const mentorsWithReviews = await mappedMoodMentors;
          
          // Immediately set both real mentors and filtered mentors to show all
          setRealMoodMentors(mentorsWithReviews)
          setFilteredMoodMentors(mentorsWithReviews)
          
          // Extract unique specialties from the mentors
          const allTherapyTypes = mentorsWithReviews.flatMap(mentor => mentor.therapyTypes);
          const uniqueSpecialties = Array.from(new Set(allTherapyTypes)).filter(Boolean);
          setAvailableSpecialties(uniqueSpecialties.length > 0 ? uniqueSpecialties : availableSpecialties);
          
          // Extract unique countries
          const countries = Array.from(new Set(
            mentorsWithReviews.map(mentor => mentor.country)
          )).filter(Boolean);
          setAvailableCountries(countries.length > 0 ? countries : []);
          
          console.log("Successfully fetched real mood mentors:", mentorsWithReviews.length)
        } else {
          console.log("No mood mentors returned from service")
          setRealMoodMentors([])
          setFilteredMoodMentors([])
        }
      } catch (error) {
        console.error("Error fetching mood mentors:", error)
        setRealMoodMentors([])
        setFilteredMoodMentors([])
      } finally {
        setLoading(false)
      }
    }

    fetchRealMoodMentors()
  }, [])
  
  // Combine real and mock mood mentors, ALWAYS show real mood mentors first
  const combinedMoodMentors = () => {
    if (realMoodMentors.length > 0) {
      console.log("Using real mood mentors, count:", realMoodMentors.length)
      // Only use real mood mentors if available
      return realMoodMentors
    } else {
      console.log("No real mood mentors, using mock data")
      // Otherwise default to mock data
      // In this case, just return an empty array so the debug info shows
      return []
    }
  }

  // Extract unique countries from mood mentors
  useEffect(() => {
    if (realMoodMentors.length > 0) {
      const countries = Array.from(new Set(
        realMoodMentors.map(mentor => mentor.location.split(', ')[1])
      )).filter(Boolean);
      setAvailableCountries(countries);
    }
  }, [realMoodMentors]);

  // Apply filters in real-time
  useEffect(() => {
    let filtered = [...realMoodMentors]
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(mentor => 
        mentor.name.toLowerCase().includes(query) ||
        mentor.credentials.toLowerCase().includes(query) ||
        mentor.specialty.toLowerCase().includes(query) ||
        mentor.location.toLowerCase().includes(query) ||
        mentor.therapyTypes.some(type => type.toLowerCase().includes(query))
      )
    }
    
    // Only apply gender filter if something is selected
    if (selectedGender.length > 0) {
      filtered = filtered.filter(mentor => selectedGender.includes(mentor.gender))
    }
    
    // Only apply specialties filter if something is selected
    if (selectedSpecialties.length > 0) {
      filtered = filtered.filter(mentor => 
        selectedSpecialties.some(specialty => 
          mentor.specialty.includes(specialty) || 
          mentor.therapyTypes.some(type => type.includes(specialty))
        )
      )
    }

    // Only apply country filter if something is selected
    if (selectedCountry) {
      filtered = filtered.filter(mentor => 
        mentor.location.split(', ')[1] === selectedCountry
      )
    }
    
    setFilteredMoodMentors(filtered)
  }, [selectedGender, selectedSpecialties, selectedCountry, realMoodMentors, searchQuery])

  const toggleGender = (value: string) => {
    setSelectedGender(prev => 
      prev.includes(value) 
        ? prev.filter(g => g !== value)
        : [...prev, value]
    )
  }

  const toggleSpecialty = (value: string) => {
    setSelectedSpecialties(prev => 
      prev.includes(value)
        ? prev.filter(s => s !== value)
        : [...prev, value]
    )
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden" ref={containerRef}>
      {/* Background gradient */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-[#E7E1FF] to-[#FEFEFF]"
        style={{ opacity: backgroundOpacity }}
      ></motion.div>
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-[#D4E6FF]"
        style={{ opacity: backgroundOpacity2 }}
      ></motion.div>
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#0078FF] via-[#20c0f3] to-[#00D2FF] text-white pt-20 pb-32 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 w-96 h-96 rounded-full bg-white"></div>
          <div className="absolute right-0 bottom-0 w-80 h-80 rounded-full bg-white"></div>
          <div className="absolute left-1/3 top-1/3 w-64 h-64 rounded-full bg-white"></div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">Our Mood Mentors</h1>
          <p className="text-lg max-w-2xl mx-auto text-blue-50 mb-8">
            Our Mood Mentors are dedicated professionals providing personalized mental health support and guidance tailored to your unique needs.
          </p>
          <div className="relative max-w-xl mx-auto mb-8">
            <Input 
              type="text"
              placeholder="Search for a mood mentor..."
              className="pl-10 py-3 w-full rounded-full border-0 text-gray-800 shadow-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          </div>
        </motion.div>
        
        {/* Curved bottom edge - changed to transparent */}
        <div className="absolute bottom-0 left-0 right-0 h-24" style={{ 
          clipPath: "ellipse(75% 100% at 50% 100%)",
          background: "transparent"
        }}></div>
      </div>
      
      {/* Main Content */}
      <div className="relative z-20">
        <div className="container mx-auto px-4 -mt-16">
          <div className="flex flex-col lg:flex-row gap-8 mb-24">
            {/* Sidebar Filters */}
            <AnimatePresence>
              <motion.div 
                layout
                className={`lg:w-1/4 ${showFilters ? 'block' : 'hidden lg:block'}`}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -50, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <motion.div 
                  className="backdrop-blur-lg bg-white/60 rounded-lg p-6 shadow-md"
                  whileHover={{ boxShadow: "0 10px 25px rgba(0, 120, 255, 0.1)" }}
                >
                  <motion.div 
                    className="flex items-center justify-between mb-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-xl font-semibold">Filters</h2>
                    <motion.label 
                      className="flex items-center space-x-2"
                      whileTap={{ scale: 0.95 }}
                    >
                      <input 
                        type="radio"
                        name="all_filters"
                        checked={selectedGender.length === 0 && selectedSpecialties.length === 0 && !selectedCountry}
                        onChange={() => {
                          setSelectedGender([]);
                          setSelectedSpecialties([]);
                          setSelectedCountry("");
                        }}
                        className="rounded-full text-[#20c0f3] focus:ring-[#20c0f3]"
                      />
                      <span>All</span>
                    </motion.label>
                  </motion.div>
                  
                  {/* Gender Filter */}
                  <motion.div 
                    className="mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h3 className="text-lg font-medium mb-3">Gender</h3>
                    <div className="space-y-2">
                      <motion.label 
                        className="flex items-center space-x-2"
                        whileTap={{ scale: 0.95 }}
                      >
                        <input 
                          type="radio"
                          name="gender"
                          checked={selectedGender.includes('Male')}
                          onChange={() => setSelectedGender(['Male'])}
                          className="rounded-full text-[#20c0f3] focus:ring-[#20c0f3]"
                        />
                        <span>Male</span>
                      </motion.label>
                      <motion.label 
                        className="flex items-center space-x-2"
                        whileTap={{ scale: 0.95 }}
                      >
                        <input 
                          type="radio"
                          name="gender"
                          checked={selectedGender.includes('Female')}
                          onChange={() => setSelectedGender(['Female'])}
                          className="rounded-full text-[#20c0f3] focus:ring-[#20c0f3]"
                        />
                        <span>Female</span>
                      </motion.label>
                    </div>
                  </motion.div>

                  {/* Specialities Filter */}
                  <motion.div 
                    className="mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h3 className="text-lg font-medium mb-3">Specialities</h3>
                    <div className="space-y-2">
                      {availableSpecialties.map((specialty, index) => (
                        <motion.label 
                          key={specialty} 
                          className="flex items-center space-x-2"
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.95 }}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + (index * 0.05) }}
                        >
                          <Checkbox 
                            checked={selectedSpecialties.includes(specialty)}
                            onCheckedChange={() => toggleSpecialty(specialty)}
                            className="border-gray-300 data-[state=checked]:bg-[#20c0f3] data-[state=checked]:border-[#20c0f3]"
                          />
                          <span>{specialty}</span>
                        </motion.label>
                      ))}
                    </div>
                  </motion.div>

                  {/* Country Filter */}
                  <motion.div 
                    className="mb-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <h3 className="text-lg font-medium mb-3">Country</h3>
                    <select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-md focus:border-[#20c0f3] focus:ring-[#20c0f3]"
                    >
                      <option value="">All Countries</option>
                      {availableCountries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </motion.div>

                  {/* Search Button */}
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Button 
                      onClick={() => {}} 
                      className="w-full bg-[#20c0f3] text-white hover:bg-[#0066FF] transition-colors"
                    >
                      Search
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
            
            {/* Mood Mentors List */}
            <div className="lg:w-3/4">
              {loading ? (
                <div className="backdrop-blur-lg bg-white/60 rounded-lg shadow-md p-8 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                    <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
                  </div>
                  <p className="mt-4 text-gray-600">Loading mood mentors...</p>
                </div>
              ) : filteredMoodMentors.length > 0 ? (
                <div className="space-y-4">
                  {filteredMoodMentors.map((moodMentor, index) => (
                    <motion.div 
                      key={moodMentor.id}
                      initial={{ opacity: 0, y: 50 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: false, margin: "-100px" }}
                      transition={{ 
                        duration: 0.8, 
                        ease: "easeOut",
                        delay: 0.2
                      }}
                      whileHover={{ 
                        y: -5, 
                        boxShadow: "0 15px 30px rgba(0, 120, 255, 0.1)",
                        transition: { duration: 0.3 }
                      }}
                      className="backdrop-blur-lg bg-white/60 rounded-xl shadow-md border border-blue-50 overflow-hidden"
                    >
                      <div className="p-6 flex gap-6">
                        {/* Image */}
                        <motion.div 
                          className="flex-shrink-0"
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: false }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                          whileHover={{ scale: 1.05 }}
                        >
                          <img
                            src={moodMentor.image}
                            alt={moodMentor.name}
                            className="w-32 h-32 object-cover rounded-lg"
                          />
                        </motion.div>
                        
                        {/* Info */}
                        <div className="flex-grow">
                          <div className="flex justify-between items-start">
                            <div>
                              <motion.h3 
                                className="text-xl font-semibold text-gray-900 overflow-hidden"
                                initial={{ opacity: 0, height: 0 }}
                                whileInView={{ opacity: 1, height: "auto" }}
                                viewport={{ once: false }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                              >
                                {moodMentor.name}
                              </motion.h3>
                              <motion.p 
                                className="text-gray-600 text-sm mt-1 overflow-hidden"
                                initial={{ opacity: 0, height: 0 }}
                                whileInView={{ opacity: 1, height: "auto" }}
                                viewport={{ once: false }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                              >
                                {moodMentor.education || ""}
                              </motion.p>
                              <motion.p 
                                className="text-[#00A3FF] text-sm font-medium mt-2 overflow-hidden"
                                initial={{ opacity: 0, height: 0 }}
                                whileInView={{ opacity: 1, height: "auto" }}
                                viewport={{ once: false }}
                                transition={{ duration: 0.5, delay: 0.6 }}
                              >
                                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200" variant="outline">
                                  {moodMentor.specialty}
                                </Badge>
                              </motion.p>
                            </div>
                            
                            <div className="flex flex-col items-end">
                              <motion.div 
                                className="flex items-center"
                                initial={{ opacity: 0, scale: 0.8 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: false }}
                                transition={{ duration: 0.5, delay: 0.4 }}
                              >
                                <span className="text-lg font-semibold text-gray-900">{Math.round(moodMentor.satisfaction)}%</span>
                              </motion.div>
                              <motion.div 
                                className="text-sm text-gray-600 mt-1 flex items-center"
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: false }}
                                transition={{ duration: 0.5, delay: 0.5 }}
                              >
                                <MessageSquare className="h-4 w-4 mr-1" />
                                {moodMentor.feedback > 0 ? `${moodMentor.feedback} Reviews` : 'No reviews yet'}
                              </motion.div>
                              <motion.div 
                                className="mt-1 text-sm text-gray-600 flex items-center"
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: false }}
                                transition={{ duration: 0.5, delay: 0.6 }}
                              >
                                <span className="mr-1">Free</span>
                                <Info className="h-4 w-4 text-gray-400" />
                              </motion.div>
                            </div>
                          </div>

                          {/* Star Rating */}
                          <motion.div 
                            className="flex items-center mt-2"
                            initial={{ opacity: 0, width: 0 }}
                            whileInView={{ opacity: 1, width: "auto" }}
                            viewport={{ once: false }}
                            transition={{ duration: 0.6, delay: 0.7 }}
                          >
                            {moodMentor.rating ? (
                              <>
                                {[...Array(5)].map((_, i) => (
                                  <motion.svg 
                                    key={i} 
                                    className={`w-4 h-4 ${i < Math.round(moodMentor.rating!) ? 'text-yellow-400' : 'text-gray-300'}`}
                                    fill="currentColor" 
                                    viewBox="0 0 20 20"
                                    initial={{ opacity: 0, scale: 0 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: false }}
                                    transition={{ duration: 0.3, delay: 0.8 + (i * 0.1) }}
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </motion.svg>
                                ))}
                                <motion.span 
                                  className="text-sm text-gray-600 ml-1"
                                  initial={{ opacity: 0 }}
                                  whileInView={{ opacity: 1 }}
                                  viewport={{ once: false }}
                                  transition={{ duration: 0.3, delay: 1.3 }}
                                >
                                  {moodMentor.rating.toFixed(1)} ({moodMentor.totalRatings})
                                </motion.span>
                              </>
                            ) : (
                              <motion.span 
                                className="text-sm text-gray-500 ml-1"
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: false }}
                                transition={{ duration: 0.3, delay: 1.3 }}
                              >
                                No rating yet
                              </motion.span>
                            )}
                          </motion.div>
                          
                          <motion.div 
                            className="flex items-center mt-3 text-sm text-gray-600"
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: false }}
                            transition={{ duration: 0.5, delay: 0.9 }}
                          >
                            <MapPin className="h-4 w-4 mr-1.5" />
                            <span>{moodMentor.location}</span>
                          </motion.div>
                          
                          {/* Therapy types */}
                          <motion.div 
                            className="flex flex-wrap gap-2 mt-4"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: false }}
                            transition={{ duration: 0.6, delay: 1.0 }}
                          >
                            {moodMentor.therapyTypes.map((type, idx) => (
                              <motion.span 
                                key={idx} 
                                className="px-3 py-1 bg-gray-50 text-gray-600 text-sm rounded-full"
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: false }}
                                transition={{ duration: 0.4, delay: 1.1 + (idx * 0.1) }}
                                whileHover={{ 
                                  backgroundColor: "#e6f7ff", 
                                  color: "#0078FF",
                                  scale: 1.05
                                }}
                              >
                                {type}
                              </motion.span>
                            ))}
                          </motion.div>
                          
                          <motion.div 
                            className="flex justify-end gap-3 mt-4"
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: false }}
                            transition={{ duration: 0.6, delay: 1.2 }}
                          >
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Link 
                                to={`/mood-mentor/${moodMentor.nameSlug}`}
                                className="inline-flex items-center justify-center px-5 py-2 border border-[#20C0F3] text-[#20C0F3] text-sm font-medium rounded-lg hover:bg-[#20C0F3] hover:text-white focus:ring-2 focus:ring-[#20C0F3] focus:ring-offset-2 transition-colors duration-200"
                              >
                                VIEW PROFILE
                              </Link>
                            </motion.div>
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <BookingButton 
                                moodMentorId={moodMentor.id}
                                moodMentorName={moodMentor.name}
                                nameSlug={moodMentor.nameSlug}
                                className="px-5 py-2 bg-[#0066FF] text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors duration-200"
                                buttonText="BOOK APPOINTMENT"
                                variant="default"
                              />
                            </motion.div>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div 
                  className="backdrop-blur-lg bg-white/60 rounded-lg shadow-md p-8 text-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: [0, 10, 0] }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <Info className="h-12 w-12 mx-auto text-gray-400" />
                  </motion.div>
                  <motion.h3 
                    className="mt-4 text-lg font-semibold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    No mood mentors found
                  </motion.h3>
                  <motion.p 
                    className="mt-2 text-gray-600"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Try adjusting your filters or check back later
                  </motion.p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
        
        {/* Added spacer div */}
        <div className="h-20"></div>
      </div>
    </div>
  )
}

export default MoodMentors 