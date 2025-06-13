import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ScrollingInfoStripProps {
  className?: string;
  items: Array<{
    id: string | number;
    content: React.ReactNode;
  }>;
  speed?: number;
  pauseOnHover?: boolean;
  direction?: 'left' | 'right';
  gap?: number;
}

const ScrollingInfoStrip: React.FC<ScrollingInfoStripProps> = ({
  className,
  items = [],
  speed = 15, // Slower speed for better readability
  pauseOnHover = true,
  direction = 'left',
  gap = 120, // Even more gap between items
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // If items is undefined or empty, render nothing
  if (!items || items.length === 0) {
    return null;
  }

  // We only need 3 copies to ensure continuous scrolling
  const allItems = [...items, ...items, ...items]; 
  
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-neutral-100 py-8', // Increased vertical padding
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      ref={containerRef}
    >
      {/* Fixed width container */}
      <div className="max-w-screen overflow-hidden">
        {/* Single scrolling container with animation class */}
        <div 
          className="inline-flex items-center scroll-text-animation"
          style={{
            animationDuration: '45s', // Slower animation
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            animationDirection: direction === 'right' ? 'reverse' : 'normal',
            animationPlayState: isHovering && pauseOnHover ? 'paused' : 'running',
            whiteSpace: 'nowrap',
            willChange: 'transform',
            gap: `${gap}px`,
          }}
        >
          {allItems.map((item, index) => (
            <div 
              key={`${item.id}-${index}`} 
              className="font-semibold text-gray-700 px-8 py-3 mx-8 rounded-md"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                minWidth: '200px',
                textAlign: 'left',
                boxShadow: '0 0 15px rgba(255, 255, 255, 1)', 
                transform: 'translateZ(0)', // Force GPU acceleration
                border: '1px solid rgba(0,0,0,0.05)',
                background: 'rgba(255, 255, 255, 0.75)', // Slightly different background
                backdropFilter: 'blur(8px)', // Add blur effect
                letterSpacing: '0.02em', // Improve letter spacing
              }}
            >
              {item.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScrollingInfoStrip; 