import React from 'react';

interface HeroSectionProps {
  title: string;
  subtitle?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({ title, subtitle }) => {
  return (
    <div className="relative bg-[#20C0F3] text-white py-16 overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-white"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-white"></div>
        <div className="absolute right-1/4 bottom-10 w-40 h-40 rounded-full bg-white"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{title}</h1>
          {subtitle && (
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
          
          {/* Progress steps are rendered in the parent component */}
        </div>
      </div>
      
      {/* Wave shape at the bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" className="w-full h-auto">
          <path 
            fill="#fff" 
            fillOpacity="1" 
            d="M0,64L80,58.7C160,53,320,43,480,42.7C640,43,800,53,960,53.3C1120,53,1280,43,1360,37.3L1440,32L1440,80L1360,80C1280,80,1120,80,960,80C800,80,640,80,480,80C320,80,160,80,80,80L0,80Z"
          ></path>
        </svg>
      </div>
    </div>
  );
};

export default HeroSection; 