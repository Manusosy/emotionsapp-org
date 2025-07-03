import { useRef } from "react";
import HeroSection from "../components/HeroSection";
import MoodAssessment from "../components/MoodAssessment";
import SpecialtiesSection from "../components/SpecialtiesSection";
import HighlightedDoctors from "../components/HighlightedDoctors";
import WhyBookUs from "../components/WhyBookUs";
import PartnerLogos from "../components/PartnerLogos";
import ScrollingInfoStrip from "@/features/mood_mentors/components/ScrollingInfoStrip";

const MoodTracker = () => {
  const emotionsRef = useRef<HTMLDivElement>(null);
  const moodMentorsRef = useRef<HTMLDivElement>(null);

  const scrollToEmotions = () => {
    emotionsRef.current?.scrollIntoView({
      behavior: 'smooth'
    });
  };

  // Information strip items
  const infoStripItems = [
    {
      id: 1,
      content: "24/7 Professional Support"
    },
    {
      id: 2,
      content: "Personalized Care Plans"
    },
    {
      id: 3,
      content: "Certified Mood Mentors"
    },
    {
      id: 4,
      content: "Confidential Services"
    },
    {
      id: 5,
      content: "100% Satisfaction Guarantee"
    }
  ];

  return (
    <div className="bg-gradient-to-br from-brand-purple-light via-white to-brand-blue-light">
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-purple-light via-transparent to-brand-blue-light" />
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.07'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
      </div>
      
      <div className="relative z-10">
        <HeroSection 
          scrollToEmotions={scrollToEmotions} 
          emotionsRef={emotionsRef} 
          moodMentorsRef={moodMentorsRef}
        />
        <MoodAssessment emotionsRef={emotionsRef} />
        <SpecialtiesSection />
        <div ref={moodMentorsRef}>
          <HighlightedDoctors />
        </div>
        
        <div className="w-full">
          <ScrollingInfoStrip items={infoStripItems} />
        </div>
        
        <WhyBookUs />
        <PartnerLogos />
      </div>
    </div>
  );
};

export default MoodTracker;
