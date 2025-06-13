import { useState, useEffect, useRef, useContext } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AuthContext } from "@/contexts/authContext";
import { toast } from "sonner";
import { Activity, ArrowRight, Brain, HeartPulse, Sparkles, X } from "lucide-react";
import { stressAssessmentService } from "@/services/stress/stress-assessment.service";
import { QuestionResponse, StressAssessment } from "@/types/stress-assessment.types";
import { dataService } from "@/services";
import { EventBus } from "@/App";
import "./styles.css";

interface StressAssessmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StressAssessmentModal({ open, onOpenChange }: StressAssessmentModalProps) {
  const { user } = useContext(AuthContext);
  const [responses, setResponses] = useState<QuestionResponse[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [assessment, setAssessment] = useState<StressAssessment | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [displayScore, setDisplayScore] = useState<number | null>(null);
  const isMountedRef = useRef(true);
  const instanceIdRef = useRef(Date.now()); // Unique ID for this instance to track state changes
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  // Handle dialog close event to reset state
  const handleDialogOpenChange = (newOpenState: boolean) => {
    // If dialog is closing, reset state
    if (!newOpenState) {
      // Reset submitting state immediately to prevent stuck UI
      setIsSubmitting(false);
      // Call the parent's onOpenChange
      onOpenChange(newOpenState);
    } else {
      // Just propagate the open state
      onOpenChange(newOpenState);
    }
  };
  
  // Initialize assessment when modal becomes effectively open (via prop)
  useEffect(() => {
    if (open) {
      // Reset all state when opening
      setCurrentStep(0);
      setIsComplete(false);
      setIsSubmitting(false); // Ensure submitting is reset
      setDisplayScore(null);
      instanceIdRef.current = Date.now(); // Update instance ID to track this session
      
      const defaultResponses = stressAssessmentService.getQuestions().map(q => ({
        id: q.id,
        type: q.type,
        score: 3, // Default score for slider (1-5 range, so 3 is middle)
        timestamp: new Date()
      }));
      
      setResponses(defaultResponses);
      if (user?.id) { // Ensure user ID before processing
        updateAssessment(defaultResponses);
      }
    }
  }, [open, user?.id]); // Add user?.id as dependency for updateAssessment
  
  // Update assessment based on responses
  const updateAssessment = (currentResponses: QuestionResponse[]) => {
    if (!user?.id) return;
    const newAssessment = stressAssessmentService.processAssessment(user.id, currentResponses);
    setAssessment(newAssessment);
  };
  
  // Handle score changes
  const handleScoreChange = (questionId: number, questionType: string, value: number) => {
    const updatedResponses = responses.map(response => 
      response.id === questionId 
        ? { ...response, score: value, timestamp: new Date() }
        : response
    );
    
    setResponses(updatedResponses);
    updateAssessment(updatedResponses);
    setDisplayScore(value);
  };
  
  // Navigation handlers
  const handleComplete = () => setIsComplete(true);
  
  const handleNext = () => {
    if (currentStep < stressAssessmentService.getQuestionsCount() - 1) {
      setCurrentStep(prev => prev + 1);
      setDisplayScore(null);
    } else {
      handleComplete();
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setDisplayScore(null);
    }
  };
  
  // Submit assessment
  const handleSubmit = async () => {
    if (!user?.id || !assessment) {
      toast.error("Unable to save assessment. Please try again.");
      return;
    }
    
    // Capture the current instance ID to ensure we're still in the same session
    const currentInstanceId = instanceIdRef.current;
    
    setIsSubmitting(true); // Set submitting true immediately
    try {
      console.log("Submitting assessment with user ID:", user.id);
      console.log("Assessment structure being sent:", JSON.stringify(assessment, null, 2));
      
      // Ensure the responses have proper serializable format
      const preparedAssessment = {
        ...assessment,
        // Convert Date objects to ISO strings
        createdAt: assessment.createdAt ? assessment.createdAt.toISOString() : new Date().toISOString(),
        // Ensure responses are serializable (Date objects converted to strings)
        responses: assessment.responses.map(r => ({
          ...r,
          timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : r.timestamp
        }))
      };
      
      console.log("Prepared assessment for saving:", preparedAssessment);
      const { error } = await dataService.saveStressAssessment(preparedAssessment);
      
      // Check if we're still in the same modal instance
      if (currentInstanceId !== instanceIdRef.current) {
        console.log("Modal instance changed during save, aborting state updates");
        return;
      }
      
      if (error) {
        console.error("handleSubmit: Error received from saveStressAssessment:", error);
        toast.error(error.message || "Failed to save assessment. Please try again.");
        // Reset submitting state
        setIsSubmitting(false);
      } else {
        toast.success("Assessment saved successfully!");
        console.log("Assessment saved successfully");
        
        // Use EventBus.forceRefresh instead of emit to ensure complete data refresh
        EventBus.forceRefresh('dashboard-reload-needed', { 
          source: 'stress-assessment',
          timestamp: Date.now(),
          assessmentId: assessment.id
        });
        
        // Reset state before closing
        setIsSubmitting(false);
        
        // Close the dialog after successful save
        handleDialogOpenChange(false);
      }
    } catch (error) {
      // This catch block is now more for unexpected errors during the try, 
      // as service errors are handled by checking the returned error object.
      console.error("handleSubmit: Unexpected error during save attempt:", error);
      toast.error("An unexpected error occurred. Please try again.");
      
      // Check if we're still in the same modal instance
      if (currentInstanceId === instanceIdRef.current && isMountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };
  
  // Get current question, ensure it's valid before accessing properties
  const questions = stressAssessmentService.getQuestions();
  const currentQuestion = questions[currentStep];

  if (!currentQuestion && open && !isComplete) {
    // This can happen briefly if questions array is empty or currentStep is out of bounds
    // Or if the effect to initialize responses hasn't run yet after modal opens
    return (
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent>Loading assessment...</DialogContent>
      </Dialog>
    );
  }
  
  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Stress Assessment</DialogTitle>
        </DialogHeader>
        
        {!isComplete ? (
          // Question form
          <div className="mt-4 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">
                Question {currentStep + 1} of {stressAssessmentService.getQuestionsCount()}
              </span>
              <span className="text-sm font-medium">Stress Check</span>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-6">{currentQuestion?.text}</h3>
              
              <div className="space-y-8">
                <div className="relative pt-2">
                  <div className="flex justify-between mb-2 text-sm">
                    <span>Not at all</span>
                    <span>Very much</span>
                  </div>
                  
                  <Slider
                    value={[responses[currentStep]?.score || 3]}
                    min={1}
                    max={5}
                    step={0.1}
                    onValueChange={(value) => 
                      handleScoreChange(currentQuestion.id, currentQuestion.type, value[0])
                    }
                    className="cursor-grab active:cursor-grabbing"
                  />
                  
                  {displayScore !== null && (
                    <div 
                      className="absolute top-0 left-0 transform -translate-y-full -translate-x-1/2 px-2 py-1 bg-white rounded-md shadow-sm text-xs"
                      style={{ 
                        left: `${((displayScore - 1) / 4) * 100}%`,
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {displayScore.toFixed(1)}
                    </div>
                  )}
                  
                  <div className="flex justify-between px-1 mt-1">
                    {[1, 2, 3, 4, 5].map(num => (
                      <span key={num} className="w-4 text-center text-xs">{num}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline" 
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              
              <Button 
                onClick={handleNext}
                className="bg-[#20C0F3] hover:bg-[#1ba8d5]"
              >
                {currentStep < stressAssessmentService.getQuestionsCount() - 1 ? "Next" : "Complete"}
              </Button>
            </div>
          </div>
        ) : (
          // Results view
          <div className="space-y-6 py-4">
            {assessment && (
              <>
                <div className="text-center">
                  <div className="relative w-32 h-32 mx-auto">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke="#eee" 
                        strokeWidth="10"
                      />
                      <circle 
                        cx="50" 
                        cy="50" 
                        r="45" 
                        fill="none" 
                        stroke={stressAssessmentService.getCategoryByStatus(assessment.status)?.color} 
                        strokeWidth="10"
                        strokeDasharray={`${assessment.healthPercentage * 2.83} 283`}
                        transform="rotate(-90 50 50)"
                        className="transition-all duration-1000 ease-out"
                      />
                      <text 
                        x="50" 
                        y="55" 
                        fontFamily="sans-serif" 
                        fontSize="16" 
                        textAnchor="middle" 
                        fill={stressAssessmentService.getCategoryByStatus(assessment.status)?.color}
                        fontWeight="bold"
                      >
                        {Math.round(assessment.healthPercentage)}%
                      </text>
                    </svg>
                  </div>
                  
                  <h3 className="text-xl font-bold mt-4" style={{
                    color: stressAssessmentService.getCategoryByStatus(assessment.status)?.color
                  }}>
                    {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                  </h3>
                  
                  <p className="text-slate-600 mt-2">
                    Stress level: <span className="font-semibold">{assessment.normalizedScore.toFixed(1)}/10</span>
                  </p>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center">
                    <Sparkles className="w-4 h-4 mr-2 text-blue-500" />
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {stressAssessmentService.getRecommendations(assessment).map((rec, index) => (
                      <li key={index} className="text-sm text-slate-700 flex items-start">
                        <ArrowRight className="w-4 h-4 mr-2 mt-0.5 text-blue-500" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button 
                    variant="outline" 
                    className="w-1/2"
                    onClick={() => handleDialogOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    Close
                  </Button>
                  
                  <Button 
                    className="w-1/2 bg-[#20C0F3] hover:bg-[#1ba8d5]"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Save Results"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 


