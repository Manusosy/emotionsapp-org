import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export interface QuestionCardProps {
  question: string;
  options: string[];
  onNext: (selectedOptionIndex: number) => void;
  questionNumber: number;
  totalQuestions: number;
}

const QuestionCard = ({
  question,
  options,
  onNext,
  questionNumber,
  totalQuestions
}: QuestionCardProps) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const progress = (questionNumber / totalQuestions) * 100;

  useEffect(() => {
    setSelectedOption(null);
  }, [question]);

  const handleOptionClick = (index: number) => {
    setSelectedOption(index);
  };

  const handleNextClick = () => {
    if (selectedOption !== null) {
      onNext(selectedOption);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={question}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#007BFF]"
            initial={{ width: `${(questionNumber - 1) / totalQuestions * 100}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
        
        <div className="text-center mb-2">
          <p className="text-xs text-gray-500 font-medium">
            Question {questionNumber} of {totalQuestions}
          </p>
        </div>
        
        <h3 className="text-lg md:text-xl font-bold text-center mb-4 text-[#001A41]">
          {question}
        </h3>
        
        <div className="space-y-2.5">
          {options.map((option, index) => (
            <motion.div
              key={option}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={`p-3 rounded-lg border transition-all cursor-pointer hover:border-[#007BFF] hover:bg-blue-50 ${
                selectedOption === index
                  ? "border-[#007BFF] bg-blue-50 shadow-sm"
                  : "border-gray-200 bg-white"
              }`}
              onClick={() => handleOptionClick(index)}
            >
              <div className="flex items-center">
                <div 
                  className={`w-5 h-5 mr-3 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    selectedOption === index 
                      ? "border-[#007BFF] bg-[#007BFF]" 
                      : "border-gray-300"
                  }`}
                >
                  {selectedOption === index && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
                <p className="text-sm text-gray-700">{option}</p>
              </div>
            </motion.div>
          ))}
        </div>
        
        <div className="pt-2">
          <Button
            onClick={handleNextClick}
            disabled={selectedOption === null}
            className="w-full bg-[#007BFF] hover:bg-blue-600 text-white"
          >
            Next Question
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default QuestionCard;
