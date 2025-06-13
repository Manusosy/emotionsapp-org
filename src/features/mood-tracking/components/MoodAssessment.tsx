import { AnimatePresence, motion } from "framer-motion";
import { useState, RefObject } from "react";
import EmotionButton from "./EmotionButton";
import QuestionCard from "./QuestionCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Book, Heart, LifeBuoy, FileText, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Emotion data
const emotions = [{
  name: "Happy",
  icon: "😊",
  color: "hover:shadow-yellow-500/20"
}, {
  name: "Calm",
  icon: "😌",
  color: "hover:shadow-green-500/20"
}, {
  name: "Sad",
  icon: "😢",
  color: "hover:shadow-blue-500/20"
}, {
  name: "Angry",
  icon: "😠",
  color: "hover:shadow-red-500/20"
}, {
  name: "Worried",
  icon: "😰",
  color: "hover:shadow-purple-500/20"
}];

// Assessment questions
const questions = [{
  text: "Are you feeling nervous, anxious, or on edge?",
  options: [{
    text: "Not at all",
    points: 0
  }, {
    text: "I have had this feeling for some 1-2 days",
    points: 1
  }, {
    text: "I have had this feeling for 3-4 days",
    points: 2
  }, {
    text: "I have had this feeling for 4-5 days",
    points: 3
  }]
}, {
  text: "Do you struggle to control your worries?",
  options: [{
    text: "Not at all",
    points: 0
  }, {
    text: "I have been struggling for some 1-2 days",
    points: 1
  }, {
    text: "I have been struggling for 3-4 days",
    points: 2
  }, {
    text: "I have been struggling for 4-5 days",
    points: 3
  }]
}];

type MoodAssessmentProps = {
  emotionsRef: RefObject<HTMLDivElement>;
};

const MoodAssessment = ({ emotionsRef }: MoodAssessmentProps) => {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const navigate = useNavigate();

  // Function to map emotion and score to a mood_score on a scale of 1-10
  const getMoodScore = (emotion: string | null, score: number): number => {
    // Maximum possible score from questions (2 questions x max 3 points each)
    const MAX_ASSESSMENT_SCORE = 6;
    
    // Base score from emotion type (on a scale of 1-10)
    let baseScore = 5; // Neutral default
    
    switch (emotion?.toLowerCase()) {
      case 'happy':
        baseScore = 8;
        break;
      case 'calm':
        baseScore = 7;
        break;
      case 'sad':
        baseScore = 3;
        break;
      case 'angry':
        baseScore = 2;
        break;
      case 'worried':
        baseScore = 4;
        break;
    }
    
    // Convert assessment score to a factor between 0 and 1
    // Higher assessment score = more negative emotional state
    const scoreFactor = score / MAX_ASSESSMENT_SCORE;
    
    // For happy/calm emotions: higher assessment score reduces base score
    // For sad/angry/worried emotions: higher assessment score increases their intensity
    let adjustedScore;
    if (baseScore >= 5) {
      // Happy/calm emotions get reduced by negative assessment
      adjustedScore = baseScore - (scoreFactor * 3);
    } else {
      // Negative emotions get intensified by negative assessment
      adjustedScore = baseScore - (scoreFactor * 1);
    }
    
    // Ensure score is between 1-10
    return Math.max(1, Math.min(10, Math.round(adjustedScore)));
  };

  // Function to get mood result based on score
  const getMoodResult = (emotion: string | null): string => {
    if (!emotion) return "Neutral";
    
    switch (emotion.toLowerCase()) {
      case 'happy':
        return "Happy";
      case 'calm':
        return "Calm";
      case 'sad':
        return "Sad";
      case 'angry':
        return "Angry";
      case 'worried':
        return "Worried";
      default:
        return "Neutral";
    }
  };

  const handleEmotionSelect = (emotion: string) => {
    if (selectedEmotion === emotion) {
      setShowQuestions(true);
    } else {
      setSelectedEmotion(emotion);
    }
  };

  const handleClickOutside = () => {
    setSelectedEmotion(null);
  };

  const handleAnswerSelect = (points: number) => {
    setScore(prev => prev + points);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const resetAll = () => {
    setSelectedEmotion(null);
    setShowQuestions(false);
    setCurrentQuestion(0);
    setScore(0);
    setShowResults(false);
  };

  const navigateToJournal = () => {
    navigate("/journal");
  };

  const navigateToResources = () => {
    navigate("/resources");
  };

  const navigateToMoodMentors = () => {
    navigate("/mood-mentors");
  };

  const navigateToHelpGroups = () => {
    navigate("/help-groups");
  };

  return (
    <div className="relative py-10 bg-[#EBF5FF]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-purple-light/10 via-transparent to-brand-blue-light/10" />
      
      <div className="container mx-auto px-4">
        <div ref={emotionsRef} className="max-w-4xl mx-auto relative z-20">
          <div className="relative">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-purple-light rounded-full blur-3xl opacity-10" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-brand-blue-light rounded-full blur-3xl opacity-10" />
            
            <motion.div 
              className="flex justify-center mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-[#007BFF] text-white py-1.5 px-6 rounded-full font-medium text-xs flex items-center shadow-md">
                <span className="w-1.5 h-1.5 bg-white rounded-full mr-2"></span>
                <span>Start Assessment</span>
                <span className="w-1.5 h-1.5 bg-white rounded-full ml-2"></span>
              </div>
            </motion.div>
            
            <div className="relative bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <h2 className="font-jakarta text-2xl md:text-3xl font-bold text-[#001A41] leading-tight">
                    How Are You Feeling <span className="text-[#007BFF]">Right Now?</span>
                  </h2>
                  <p className="text-sm md:text-base text-gray-600 font-jakarta font-light">
                    Select your current mood by clicking one of the emojis below
                  </p>
                </div>

                <AnimatePresence mode="wait">
                  {!showQuestions && (
                    <div className="flex justify-center mt-6">
                      <div className="grid grid-cols-5 gap-6 max-w-3xl w-full">
                      {emotions.map(emotion => (
                        <EmotionButton
                          key={emotion.name}
                          emotion={emotion}
                          selected={selectedEmotion === emotion.name}
                          onClick={() => handleEmotionSelect(emotion.name)}
                            onClickOutside={handleClickOutside}
                        />
                      ))}
                      </div>
                    </div>
                  )}

                  {showQuestions && !showResults && (
                    <QuestionCard
                      question={questions[currentQuestion].text}
                      options={questions[currentQuestion].options.map(option => option.text)}
                      onNext={(index) => handleAnswerSelect(questions[currentQuestion].options[index].points)}
                      questionNumber={currentQuestion + 1}
                      totalQuestions={questions.length}
                    />
                  )}

                  {showResults && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-8"
                    >
                      <div className="p-6 rounded-2xl bg-white shadow-lg border border-[#20C0F3]/20">
                        <div className="flex justify-center mb-6">
                          <div className="w-14 h-14 bg-gradient-to-r from-[#0078FF] to-[#20C0F3] rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Heart className="h-7 w-7 text-white" />
                          </div>
                        </div>
                        
                        <h2 className="text-xl font-bold text-center bg-gradient-to-r from-[#0078FF] via-[#20C0F3] to-[#00D2FF] bg-clip-text text-transparent mb-4">
                          Your Assessment Results
                        </h2>
                        
                        {score <= 3 ? (
                          <div className="space-y-6">
                            <div className="py-3 px-4 bg-green-50 rounded-lg border-l-4 border-green-400">
                              <p className="text-green-800 font-medium">
                                You're doing great! Your assessment indicates minimal mental health concerns.
                              </p>
                            </div>
                            
                            <p className="text-gray-700">
                              It appears you're managing your emotions well. Journaling can help maintain this positive state and provide insights into your emotional patterns.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                <div className="flex items-center mb-3">
                                  <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-3">
                                    <FileText className="h-5 w-5 text-[#20C0F3]" />
                                  </div>
                                  <h3 className="font-semibold text-gray-800">Journal Your Feelings</h3>
                                </div>
                                <p className="text-gray-600 text-sm mb-4">
                                  Document your thoughts and emotions to track patterns over time.
                                </p>
                                <Button 
                                  onClick={navigateToJournal} 
                                  className="w-full bg-gradient-to-r from-[#0078FF] to-[#20C0F3] hover:from-[#0062CC] hover:to-[#1AB6E8] text-white shadow-md hover:shadow-lg transition-all"
                                >
                                  Go to Journal
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                <div className="flex items-center mb-3">
                                  <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-3">
                                    <Book className="h-5 w-5 text-[#20C0F3]" />
                                  </div>
                                  <h3 className="font-semibold text-gray-800">Explore Resources</h3>
                                </div>
                                <p className="text-gray-600 text-sm mb-4">
                                  Discover articles and tools to enhance your mental wellbeing.
                                </p>
                                <Button 
                                  onClick={navigateToResources} 
                                  variant="outline" 
                                  className="w-full border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3]/5 hover:text-[#0078FF]"
                                >
                                  Browse Resources
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="py-3 px-4 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                              <p className="text-amber-800 font-medium">
                                Your assessment indicates you may be experiencing some mental health challenges.
                              </p>
                            </div>
                            
                            <p className="text-gray-700">
                              It's important to address these feelings. Consider connecting with a mood mentor, joining support groups, or using our journaling tool to process your emotions.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                <div className="flex items-center mb-3">
                                  <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-3">
                                    <Users className="h-5 w-5 text-[#20C0F3]" />
                                  </div>
                                  <h3 className="font-semibold text-gray-800">Talk to a Mood Mentor</h3>
                                </div>
                                <p className="text-gray-600 text-sm mb-4">
                                  Connect with a trusted mood mentor for personalized support.
                                </p>
                                <Button 
                                  onClick={navigateToMoodMentors} 
                                  className="w-full bg-gradient-to-r from-[#0078FF] to-[#20C0F3] hover:from-[#0062CC] hover:to-[#1AB6E8] text-white shadow-md hover:shadow-lg transition-all"
                                >
                                  Find a Mood Mentor
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                                <div className="flex items-center mb-3">
                                  <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-3">
                                    <FileText className="h-5 w-5 text-[#20C0F3]" />
                                  </div>
                                  <h3 className="font-semibold text-gray-800">Journal Your Feelings</h3>
                                </div>
                                <p className="text-gray-600 text-sm mb-4">
                                  Express and process your emotions through guided journaling.
                                </p>
                                <Button 
                                  onClick={navigateToJournal} 
                                  variant="outline" 
                                  className="w-full border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3]/5 hover:text-[#0078FF]"
                                >
                                  Go to Journal
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="col-span-1 md:col-span-2 bg-gray-50 p-5 rounded-xl border border-gray-100">
                                <div className="flex items-center mb-3">
                                  <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-3">
                                    <Heart className="h-5 w-5 text-[#20C0F3]" />
                                  </div>
                                  <h3 className="font-semibold text-gray-800">Join Support Groups</h3>
                                </div>
                                <p className="text-gray-600 text-sm mb-4">
                                  Connect with others who share similar experiences in a supportive environment.
                                </p>
                                <Button 
                                  onClick={navigateToHelpGroups}
                                  className="w-full bg-[#0078FF]/10 hover:bg-[#0078FF]/20 text-[#0078FF] font-medium"
                                >
                                  Explore Support Groups
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        onClick={resetAll}
                        variant="outline"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 transform transition-all duration-200 hover:scale-105 text-sm"
                      >
                        Start Over
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoodAssessment;



