import { motion } from "framer-motion";
import { ArrowRight, MapPin, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefObject, useState } from "react";
import { useNavigate } from "react-router-dom";
import BreathingExercise from "@/components/BreathingExercise";

type HeroSectionProps = {
  scrollToEmotions: () => void;
  emotionsRef: RefObject<HTMLDivElement>;
  moodMentorsRef?: RefObject<HTMLDivElement>;
};

const HeroSection = ({ scrollToEmotions, emotionsRef, moodMentorsRef }: HeroSectionProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const scrollToMoodMentors = () => {
    moodMentorsRef?.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const query = searchQuery.trim().toLowerCase();
    
    // Intelligent routing based on search terms
    if (query.includes('mentor') || query.includes('therapist') || query.includes('counselor') || query.includes('doctor')) {
      navigate(`/mood-mentors?search=${encodeURIComponent(searchQuery)}`);
    } else if (query.includes('group') || query.includes('support') || query.includes('community')) {
      navigate(`/support-groups?search=${encodeURIComponent(searchQuery)}`);
    } else if (query.includes('appointment') || query.includes('booking') || query.includes('schedule')) {
      navigate(`/booking?search=${encodeURIComponent(searchQuery)}`);
    } else if (query.includes('resource') || query.includes('article') || query.includes('help') || query.includes('guide')) {
      navigate(`/resources?search=${encodeURIComponent(searchQuery)}`);
    } else if (query.includes('review') || query.includes('rating') || query.includes('feedback')) {
      navigate(`/reviews?search=${encodeURIComponent(searchQuery)}`);
    } else if (query.includes('about') || query.includes('contact') || query.includes('team')) {
      if (query.includes('about')) navigate('/about');
      else if (query.includes('contact')) navigate('/contact');
      else navigate(`/mood-mentors?search=${encodeURIComponent(searchQuery)}`);
    } else {
      // Default to comprehensive search on mood mentors page
      navigate(`/mood-mentors?search=${encodeURIComponent(searchQuery)}`);
    }
  };
  return (
    <div className="pt-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-bl from-[#d5e7fe] to-[#e3f0ff]" />
      
      <div className="absolute inset-0" style={{
        backgroundImage: `
          linear-gradient(to right, rgba(59, 130, 246, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(59, 130, 246, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        mask: 'linear-gradient(to bottom, transparent, white, white, transparent)'
      }} />
      
      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 py-12">
          <div className="flex flex-col justify-start text-left space-y-6">
            <div className="relative">
              <motion.div 
                className="mb-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="bg-white/90 backdrop-blur-sm shadow-md py-2 px-4 rounded-full inline-flex items-center w-auto max-w-[260px]">
                  <div className="flex -space-x-2 mr-4">
                    <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                      <img src="/lovable-uploads/a299cbd8-711d-4138-b99d-eec11582bf18.png" alt="Mood Mentor" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                      <img src="/lovable-uploads/557ff7f5-9815-4228-b935-0fb6a858cc65.png" alt="Mood Mentor" className="w-full h-full object-cover" />
                    </div>
                    <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                      <img src="/lovable-uploads/c830a369-efad-44e6-b333-658dd7ebfd60.png" alt="Mood Mentor" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="font-jakarta font-bold text-[#001A41] text-sm whitespace-nowrap">5K+ Appointments</div>
                    <div className="flex items-center">
                      {Array(5).fill(0).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-orange-500 text-orange-500" />
                      ))}
                      <span className="ml-1 text-gray-600 text-xs">5.0 Ratings</span>
                    </div>
                  </div>
                </div>
              </motion.div>
              
              <div className="absolute -left-4 -top-4 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
              
              <h1 className="font-jakarta text-5xl md:text-6xl font-bold text-[#001A41] mb-6 relative text-left">
                Welcome to{" "}
                <span className="text-blue-500 relative inline-block">
                  Emotions
                  <div className="absolute -bottom-2 left-0 w-full h-1 bg-blue-500/20 rounded-full" />
                </span>
              </h1>
              <p className="font-jakarta text-xl text-gray-600 mb-8 text-left">
                You are worthy of happiness & peace of mind and we are here to support you reach the goal.
              </p>
              <div className="flex flex-wrap items-start gap-6">
                <Button 
                  size="lg" 
                  onClick={scrollToMoodMentors}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-jakarta text-lg px-8 shadow-lg shadow-blue-500/25 transform transition-all duration-200 hover:scale-105"
                >
                  Start Consultation
                </Button>
                <button onClick={scrollToEmotions} className="group flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-all duration-200 font-jakarta">
                  Assess Your Mental Health
                  <ArrowRight className="w-5 h-5 transform transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            <div className="mt-6 bg-white/90 backdrop-blur-lg shadow-xl p-3 border border-blue-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search anything - mentors, groups, resources, pages..." 
                    className="w-full pl-12 pr-4 py-4 text-base rounded-xl border-0 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all font-jakarta placeholder-gray-500"
                  />
                </div>
                <Button 
                  onClick={handleSearch}
                  disabled={!searchQuery.trim()}
                  className="px-8 py-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 font-jakarta font-medium disabled:transform-none disabled:shadow-md"
                >
                  Search
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3 px-1">
                <span className="text-xs text-gray-500 font-jakarta">Popular searches:</span>
                <button 
                  onClick={() => {setSearchQuery("anxiety support"); handleSearch();}}
                  className="text-xs text-blue-600 hover:text-blue-700 font-jakarta hover:underline"
                >
                  anxiety support
                </button>
                <span className="text-xs text-gray-300">•</span>
                <button 
                  onClick={() => {setSearchQuery("therapy groups"); handleSearch();}}
                  className="text-xs text-blue-600 hover:text-blue-700 font-jakarta hover:underline"
                >
                  therapy groups
                </button>
                <span className="text-xs text-gray-300">•</span>
                <button 
                  onClick={() => {setSearchQuery("mental health resources"); handleSearch();}}
                  className="text-xs text-blue-600 hover:text-blue-700 font-jakarta hover:underline"
                >
                  resources
                </button>
              </div>
            </div>
          </div>

          <div className="block relative order-first sm:order-last">
            <div className="flex items-center justify-center">
              <motion.div
                className="relative w-full max-w-[380px] mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.8,
                  delay: 0.3,
                  ease: "easeOut"
                }}
              >
                <BreathingExercise />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
