import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Download, MapPin, Search, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefObject } from "react";

type HeroSectionProps = {
  scrollToEmotions: () => void;
  emotionsRef: RefObject<HTMLDivElement>;
};

const HeroSection = ({ scrollToEmotions, emotionsRef }: HeroSectionProps) => {
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
                <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white font-jakarta text-lg px-8 shadow-lg shadow-blue-500/25 transform transition-all duration-200 hover:scale-105">
                  Start Consultation
                </Button>
                <button onClick={scrollToEmotions} className="group flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-all duration-200 font-jakarta">
                  Assess Your Mental Health
                  <ArrowRight className="w-5 h-5 transform transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            <div className="mt-6 bg-white/80 backdrop-blur-lg shadow-lg p-4 border border-blue-100 rounded-2xl">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Search mood mentors, groups, support..." 
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:border-blue-500 focus:outline-none transition-colors font-jakarta"
                  />
                </div>
                <div className="flex-1 min-w-[160px] relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Location" 
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:border-blue-500 focus:outline-none transition-colors font-jakarta"
                  />
                </div>
                <Button className="min-w-[100px] bg-blue-500 hover:bg-blue-600 text-white px-6 rounded-xl shadow-lg shadow-blue-500/20 transform transition-all duration-200 hover:scale-105 font-jakarta text-sm">
                  Search
                </Button>
              </div>
            </div>
          </div>

          <div className="block relative order-first sm:order-last">
            <div className="flex items-center justify-center">
              <motion.div
                className="relative w-full max-w-[380px] mx-auto"
                initial={{ opacity: 0.8 }}
                animate={{ 
                  opacity: 1,
                  y: [0, -10, 0],
                  scale: [1, 1.02, 1]
                }}
                transition={{ 
                  duration: 5,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut"
                }}
              >
                <img src="/lovable-uploads/7d02b0da-dd91-4635-8bc4-6df39dffd0f1.png" alt="Emotions App" className="w-full h-auto object-contain mx-auto drop-shadow-2xl relative z-10" />
              </motion.div>
              
              <motion.div 
                className="absolute top-1/4 right-[5%] sm:right-[15%] bg-transparent text-white backdrop-blur-md rounded-xl shadow-xl p-2 z-20"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ 
                  duration: 0.8,
                  delay: 0.5,
                  ease: "easeOut" 
                }}
                whileHover={{ 
                  scale: 1.05,
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                  transition: { duration: 0.2 }
                }}
              >
                <a 
                  href="https://play.google.com/store/apps/details?id=com.moracha.moods" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex flex-col items-center"
                >
                  <img 
                    src="/lovable-uploads/2cfcf00b-42c4-4eb2-a637-f0a074aeb1ac.png" 
                    alt="Get it on Google Play" 
                    className="h-10 w-auto"
                  />
                </a>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
