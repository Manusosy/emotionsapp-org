import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MoodResultsProps {
  selectedEmotion: string;
  score: number;
  onReset: () => void;
}

const MoodResults = ({ selectedEmotion, score, onReset }: MoodResultsProps) => {
  const navigate = useNavigate();

  // Function to determine feedback based on score
  const getFeedback = () => {
    if (selectedEmotion === "Happy") {
      return {
        title: "You're Doing Great!",
        message: "Your responses indicate a positive emotional state. Keep up the good habits that support your mental wellbeing!",
        action: "Explore ways to maintain this positive state"
      };
    } else if (selectedEmotion === "Sad" || selectedEmotion === "Angry") {
      if (score <= 3) {
        return {
          title: "Mild Emotional Challenge",
          message: "You seem to be experiencing some difficulty, but it appears manageable. Consider some self-care activities.",
          action: "Discover self-care strategies"
        };
      } else if (score <= 6) {
        return {
          title: "Moderate Emotional Challenge",
          message: "Your responses suggest you're going through a tough time. It might be helpful to talk to someone about how you're feeling.",
          action: "Connect with a mood mentor"
        };
      } else {
        return {
          title: "Significant Emotional Challenge",
          message: "Your responses indicate you may be experiencing significant distress. We recommend reaching out for professional support.",
          action: "Book a consultation now"
        };
      }
    } else if (selectedEmotion === "Anxious") {
      if (score <= 3) {
        return {
          title: "Mild Anxiety",
          message: "You're experiencing some anxiety, but it seems manageable. Breathing exercises might help reduce these feelings.",
          action: "Learn anxiety management techniques"
        };
      } else if (score <= 6) {
        return {
          title: "Moderate Anxiety",
          message: "Your responses suggest moderate anxiety levels. Talking to someone and learning coping strategies could be beneficial.",
          action: "Explore anxiety coping strategies"
        };
      } else {
        return {
          title: "Significant Anxiety",
          message: "Your responses indicate significant anxiety. Professional support can provide relief and strategies to manage these feelings.",
          action: "Book a consultation now"
        };
      }
    } else {
      return {
        title: "Thank You for Sharing",
        message: "Based on your responses, we've prepared some personalized insights. Remember, it's normal for emotions to fluctuate.",
        action: "Explore our resources"
      };
    }
  };

  const feedback = getFeedback();

  const handleBookConsultation = () => {
    navigate("/booking");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="w-full max-w-3xl mx-auto"
      >
        <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <div className="text-center mb-6">
            <div className="inline-block p-3 rounded-full bg-blue-50 mb-4">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[#007BFF]">
                <span className="text-2xl text-white">
                  {selectedEmotion === "Happy" ? "😊" : 
                   selectedEmotion === "Sad" ? "😔" : 
                   selectedEmotion === "Angry" ? "😠" : 
                   selectedEmotion === "Anxious" ? "😰" : "🙂"}
                </span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-[#001A41] mb-2">{feedback.title}</h3>
            <p className="text-gray-600 max-w-md mx-auto">{feedback.message}</p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h4 className="font-medium text-[#001A41] mb-2">What's next?</h4>
              <p className="text-sm text-gray-600">
                Based on your assessment, we recommend taking action to support your emotional wellbeing.
                {score > 3 && selectedEmotion !== "Happy" && " Our mood mentors are here to help."}
              </p>
            </div>

            <Button 
              onClick={handleBookConsultation}
              className="w-full bg-[#007BFF] hover:bg-blue-600 text-white"
            >
              {feedback.action}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <Button 
              onClick={onReset} 
              variant="outline"
              className="w-full border-gray-200 hover:bg-gray-50 text-gray-700"
            >
              Take assessment again
              <RefreshCw className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MoodResults; 