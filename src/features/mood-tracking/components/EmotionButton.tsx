import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";

interface EmotionButtonProps {
  emotion: {
    name: string;
    icon: string;
    color: string;
  };
  selected?: boolean;
  onClick: () => void;
  onClickOutside?: () => void;
}

const EmotionButton = ({ 
  emotion, 
  selected, 
  onClick,
  onClickOutside 
}: EmotionButtonProps) => {
  const popupRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Handle clicking outside the popup
    const handleClickOutside = (event: MouseEvent) => {
      if (selected && 
          popupRef.current && 
          !popupRef.current.contains(event.target as Node) &&
          // Check that the click wasn't on the button itself
          !(event.target as Element).closest(`[data-emotion="${emotion.name}"]`)) {
        onClickOutside?.();
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selected, emotion.name, onClickOutside]);

  const messages = {
    "Happy": "Awesome! Being happy is a good thing and we are glad that you are happy. Now, let's extend your happiness. Cool?",
    "Calm": "Great! Staying calm gives you mental clarity & helps you think straight. You are doing good, no pressure. Now, lets, assess the calmness and provide you support to keep going.",
    "Sad": "Heey, we are sorry for your current state and we are here to support you feel better. Help us in asessing your situation further by taking a quick mental test. Sound cool?",
    "Angry": "Please Calm down. Relax. Take a deep breath. Don't allow anger to win over you. Now, let's take care of that by reducing it to zero. Cool? Begin the test.",
    "Worried": "Have you heard of the word, \"Hakuna Matata?\" It means No Worries. Now read that again. Hakuna Matata. Sing it allitle more as we go onto the quick check up. Sound cool?",
  };

  // Get emotion-specific colors for glow and shadow effects
  const getEmotionColor = () => {
    switch(emotion.name) {
      case "Happy": return { shadow: "shadow-yellow-300/30", glow: "rgba(253, 224, 71, 0.4)" };
      case "Calm": return { shadow: "shadow-green-300/30", glow: "rgba(134, 239, 172, 0.4)" };
      case "Sad": return { shadow: "shadow-blue-300/30", glow: "rgba(147, 197, 253, 0.4)" };
      case "Angry": return { shadow: "shadow-red-300/30", glow: "rgba(252, 165, 165, 0.4)" };
      case "Worried": return { shadow: "shadow-purple-300/30", glow: "rgba(216, 180, 254, 0.4)" };
      default: return { shadow: "shadow-blue-300/30", glow: "rgba(147, 197, 253, 0.4)" };
    }
  };

  const emotionColor = getEmotionColor();

  return (
    <div className="relative flex flex-col items-center">
      <motion.div
        whileHover={{ scale: 1.05, y: -3 }}
        animate={{ scale: selected ? 1.05 : 1 }}
        whileTap={{ scale: 0.95 }}
        className="relative z-10 w-full"
      >
        <Button
          onClick={onClick}
          data-emotion={emotion.name}
          className={cn(
            "relative overflow-hidden transition-all duration-300 group",
            "h-24 w-full rounded-xl", 
            "bg-white shadow-sm",
            selected ? [
              "border-2 border-[#17c4f6]",
              "bg-[#17c4f6] text-white",
            ] : [
              "border border-gray-200",
              "hover:border-[#007BFF]/20",
              "hover:bg-[#007BFF]/5",
            ],
          )}
          style={{
            boxShadow: selected ? "0 2px 10px rgba(23, 196, 246, 0.3)" : "0 2px 4px rgba(0,0,0,0.05)"
          }}
        >
          <div className="relative z-10 flex flex-col items-center justify-center space-y-2">
            <motion.span 
              className="text-3xl sm:text-4xl transition-all duration-300"
              animate={{ 
                scale: selected ? 1.1 : 1,
                y: selected ? -1 : 0 
              }}
              whileHover={{ y: -1 }}
              style={{
                filter: selected ? 'drop-shadow(0 1px 3px rgba(255,255,255,0.5))' : 'drop-shadow(0 1px 2px rgba(0,0,0,0.08))'
              }}
            >
              {emotion.icon}
            </motion.span>
            <span className={cn(
              "text-sm font-medium",
              selected ? "text-white" : "text-gray-700"
            )}>
              {emotion.name}
            </span>
          </div>
        </Button>
      </motion.div>

      <AnimatePresence>
        {selected && (
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full z-20 mt-3 w-52 sm:w-60"
          >
            <div className="relative">
              <div 
                className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-[#17c4f6] rotate-45 shadow-sm"
              />
              <div className="relative overflow-hidden rounded-xl bg-[#17c4f6] p-[1.5px]">
                <div className="relative bg-white/95 backdrop-blur-xl p-3 rounded-xl">
                  <div className="space-y-3">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      {messages[emotion.name as keyof typeof messages]}
                    </p>
                    <div className="flex justify-end">
                      <Button 
                        onClick={onClick}
                        className="rounded-full bg-[#17c4f6] text-white hover:shadow-sm hover:bg-[#007BFF] transition-all duration-300 text-xs py-1 px-3 h-auto"
                        size="sm"
                      >
                        Continue
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmotionButton;
