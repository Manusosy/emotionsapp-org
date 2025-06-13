import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// Specialty data
const specialties = [{
  name: "PTSD",
  icon: "/lovable-uploads/68d1da8b-70cc-414e-bc9d-51a4a1438acd.png",
  image: "/lovable-uploads/3674ff71-726e-42be-bbb9-923cea2c495a.png"
}, {
  name: "Depression",
  icon: "/lovable-uploads/bfeb1421-a870-46bd-b98a-207047eb9cc2.png",
  image: "/lovable-uploads/1372b2aa-77ad-4606-a7ff-2760f12cf32b.png"
}, {
  name: "Anxiety",
  icon: "/lovable-uploads/ba887d9b-207d-4f77-af74-b4667cb3dec5.png", 
  image: "/lovable-uploads/44e95b5d-abbe-4927-9345-7e7c30a38c33.png", 
}, {
  name: "Child Therapy",
  icon: "/lovable-uploads/b7234e4d-134d-43ab-89f5-3eab15c35234.png",
  image: "/lovable-uploads/db586508-592d-4bf0-94e9-2383b4d1a793.png"
}, {
  name: "Psychiatry",
  icon: "/lovable-uploads/128f0051-09ac-47e1-8624-17a1b5d1cf06.png",
  image: "/lovable-uploads/f428e17b-f67c-4522-85b3-dd03cb459e88.png"
}, {
  name: "Addiction",
  icon: "/lovable-uploads/8a9bae53-f765-4b67-a8d8-e174e64498ae.png",
  image: "/lovable-uploads/c43ab3cf-f60b-4435-b278-b3bb00048be1.png"
}, {
  name: "Trauma",
  icon: "/lovable-uploads/a41715a1-999d-45cf-b69e-31ce48f3d957.png",
  image: "/lovable-uploads/30ff3bc0-2074-435c-a0aa-dadea491d57f.png"
}, {
  name: "Couples",
  icon: "/lovable-uploads/2a796d0c-278c-4678-bb4c-ac6ecaf24b16.png",
  image: "/lovable-uploads/46d693eb-04a8-4821-8fe5-e121d3aca14b.png"
}];

const SpecialtiesSection = () => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const scrollLeft = () => {
    if (containerRef.current) {
      const newPosition = Math.max(0, scrollPosition - 300);
      containerRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      setScrollPosition(newPosition);
    }
  };
  
  const scrollRight = () => {
    if (containerRef.current) {
      const maxScroll = containerRef.current.scrollWidth - containerRef.current.clientWidth;
      const newPosition = Math.min(maxScroll, scrollPosition + 300);
      containerRef.current.scrollTo({
        left: newPosition,
        behavior: 'smooth'
      });
      setScrollPosition(newPosition);
    }
  };
  
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-start">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-full mb-6 mx-auto"
          >
            <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
            <span className="font-medium text-sm">Top Specialties</span>
            <span className="w-2 h-2 bg-white rounded-full ml-2"></span>
          </motion.div>
          
          <motion.h2 
            className="text-3xl md:text-4xl font-bold text-[#001A41] mb-12 text-center w-full" 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Highlighting Our Top Specialties
          </motion.h2>
          
          <div className="relative w-full">
            <div 
              ref={containerRef} 
              className="flex overflow-x-auto pb-6 hide-scrollbar gap-5" 
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {specialties.map((specialty, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
                  viewport={{ once: true }}
                  className="flex-shrink-0 w-[180px]" // Updated width to match image
                >
                  <Card className="relative h-[230px] rounded-2xl overflow-hidden"> {/* Updated height and border radius */}
                    <img 
                      src={specialty.image} 
                      alt={specialty.name} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-20 h-20 flex items-center justify-center bg-white rounded-full shadow-md"> {/* Updated size */}
                        <img 
                          src={specialty.icon} 
                          alt={specialty.name} 
                          className="w-10 h-10 object-contain" // Updated size
                        />
                      </div>
                    </div>
                  </Card>
                  <div className="mt-4 text-left">
                    <h3 className="text-lg font-semibold text-[#001A41]">{specialty.name}</h3>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="flex justify-center mt-8 gap-3">
              <Button 
                onClick={scrollLeft} 
                className="w-10 h-10 p-0 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                <ChevronLeft size={20} />
              </Button>
              <Button 
                onClick={scrollRight} 
                className="w-10 h-10 p-0 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
              >
                <ChevronRight size={20} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SpecialtiesSection;
