import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/authContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AnimatePresence, motion } from "framer-motion";
import EmotionButton from "@/features/mood-tracking/components/EmotionButton";
import QuestionCard from "@/features/mood-tracking/components/QuestionCard";
import { ArrowRight, Heart } from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Emotion data
const emotions = [{
  name: "Happy",
  icon: "😊",
  color: "hover:shadow-yellow-500/20",
  type: "happy"
}, {
  name: "Calm",
  icon: "😌",
  color: "hover:shadow-green-500/20",
  type: "calm"
}, {
  name: "Sad",
  icon: "😢",
  color: "hover:shadow-blue-500/20",
  type: "sad"
}, {
  name: "Angry",
  icon: "😠",
  color: "hover:shadow-red-500/20",
  type: "angry"
}, {
  name: "Worried",
  icon: "😰",
  color: "hover:shadow-purple-500/20",
  type: "worried"
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

const DashboardMoodAssessment = () => {
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
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

  const saveMoodEntry = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to save your assessment');
      return;
    }

    if (!selectedEmotion) {
      toast.error('Please select an emotion before saving');
      return;
    }

    try {
      setIsSaving(true);
      
      // Find the emotion data
      const selectedEmotionData = emotions.find(e => e.name === selectedEmotion);
      if (!selectedEmotionData) {
        throw new Error("Selected emotion data not found");
      }

      // Calculate mood score
      const moodScore = getMoodScore(selectedEmotion, score);
      
      // Prepare save data with timestamps
      const entryData = {
        user_id: user.id,
        mood: moodScore,
        mood_type: selectedEmotionData.type,
        assessment_result: selectedEmotion,
        assessment_score: score,
        notes: `Assessment score: ${score}`,
        tags: [
          selectedEmotionData.type,
          score >= 4 ? 'high-concern' : 
          score >= 2 ? 'moderate-concern' : 'low-concern'
        ],
        activities: ['emotion-check', 'quick-assessment'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Insert directly into Supabase
      const { data, error } = await supabase
        .from('mood_entries')
        .insert(entryData)
        .select('id')
        .single();
      
      if (error) {
        throw error;
      }

      // Success - show toast
      toast.success("Mood assessment saved successfully!");
      
      // Store in sessionStorage for components that might load later
      sessionStorage.setItem('last_mood_assessment', JSON.stringify({
        id: data.id,
        moodScore,
        moodType: selectedEmotionData.type,
        timestamp: new Date().toISOString(),
        saved: true
      }));

      // Dispatch events to update UI components
      window.dispatchEvent(new CustomEvent('mood-assessment-completed'));
      window.dispatchEvent(new CustomEvent('dashboard-reload-needed'));

      // Reset the form
      resetAll();

    } catch (error) {
      console.error('Error saving mood assessment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save assessment';
      toast.error(`Error saving assessment: ${errorMessage}`);
    } finally {
      setIsSaving(false);
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
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">How are you feeling?</h2>
      
      <AnimatePresence mode="wait">
        {!showQuestions && (
          <div className="grid grid-cols-5 gap-3">
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
            className="space-y-6"
          >
            <div className="p-4 rounded-xl bg-white shadow-sm border border-[#20C0F3]/20">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-[#0078FF] to-[#20C0F3] rounded-full flex items-center justify-center shadow-md shadow-blue-500/20 mr-4">
                  <Heart className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-[#0078FF] via-[#20C0F3] to-[#00D2FF] bg-clip-text text-transparent">
                  Assessment Results
                </h3>
              </div>

              {score <= 3 ? (
                <div className="space-y-4">
                  <div className="py-2 px-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <p className="text-green-800 text-sm font-medium">
                      You're doing great! Your assessment indicates minimal mental health concerns.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={navigateToJournal} 
                      className="w-full bg-gradient-to-r from-[#0078FF] to-[#20C0F3] hover:from-[#0062CC] hover:to-[#1AB6E8] text-white text-sm"
                    >
                      Journal Now
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    
                    <Button 
                      onClick={navigateToResources} 
                      variant="outline" 
                      className="w-full border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3]/5 hover:text-[#0078FF] text-sm"
                    >
                      View Resources
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="py-2 px-3 bg-amber-50 rounded-lg border-l-4 border-amber-400">
                    <p className="text-amber-800 text-sm font-medium">
                      Your assessment indicates you may be experiencing some mental health challenges.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={navigateToMoodMentors} 
                      className="w-full bg-gradient-to-r from-[#0078FF] to-[#20C0F3] hover:from-[#0062CC] hover:to-[#1AB6E8] text-white text-sm"
                    >
                      Find a Mentor
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    
                    <Button 
                      onClick={navigateToHelpGroups} 
                      variant="outline" 
                      className="w-full border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3]/5 hover:text-[#0078FF] text-sm"
                    >
                      Join Support Group
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex justify-between">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={resetAll}
                  disabled={isSaving}
                >
                  Start Over
                </Button>
                
                <Button
                  onClick={saveMoodEntry}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-[#0078FF] to-[#20C0F3] hover:from-[#0062CC] hover:to-[#1AB6E8] text-white"
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : "Save Assessment"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardMoodAssessment; 