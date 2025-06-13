import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '@/services'
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "@/contexts/authContext";
import { supabase } from "@/lib/supabase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { HeartHandshake, BookOpen, Heart, Activity, BrainCircuit } from "lucide-react";

interface WelcomeDialogProps {
  forceShow?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * WelcomeDialog component displays an introduction dialog for new users
 * with information about the app's features and capabilities.
 */
export const WelcomeDialog = ({ forceShow = false, isOpen: controlledIsOpen, onClose }: WelcomeDialogProps) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  
  // Internal function to reset welcome dialog state
  const resetWelcomeDialog = () => {
    // Remove the welcome dialog shown flag from localStorage
    localStorage.removeItem('welcome_dialog_shown');
    // Force show the dialog
    setIsOpen(true);
  };
  
  useEffect(() => {
    // If isOpen is controlled externally, use that value
    if (controlledIsOpen !== undefined) {
      setIsOpen(controlledIsOpen);
      return;
    }
    
    // If forceShow is true, show the dialog regardless of localStorage
    if (forceShow) {
      setIsOpen(true);
      return;
    }
    
    // Check if the welcome dialog has been shown before
    const hasShownWelcomeDialog = localStorage.getItem('welcome_dialog_shown');
    
    // Only show the welcome dialog if it hasn't been shown before and user is logged in
    if (!hasShownWelcomeDialog && user) {
      setIsOpen(true);
    }
  }, [forceShow, user, controlledIsOpen]);
  
  const handleClose = () => {
    setIsOpen(false);
    
    // Mark the welcome dialog as shown in localStorage
    localStorage.setItem('welcome_dialog_shown', 'true');
    
    // Call the onClose callback if provided
    if (onClose) {
      onClose();
    }
  };
  
  const handleGetStarted = () => {
    handleClose();
  };
  
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl">Welcome to EmotionsApp</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Your personal mental health companion. Here's what you can do with our app:
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-5 w-5 text-blue-500" />
              <h3 className="font-medium">Mood Tracking</h3>
            </div>
            <p className="text-sm text-slate-600">
              Log your daily mood and emotions to identify patterns and triggers that affect your mental wellbeing.
            </p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-blue-500" />
              <h3 className="font-medium">Journaling</h3>
            </div>
            <p className="text-sm text-slate-600">
              Express your thoughts and feelings through our guided journaling experience.
            </p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <h3 className="font-medium">Stress Assessments</h3>
            </div>
            <p className="text-sm text-slate-600">
              Take regular assessments to measure your stress levels and receive personalized recommendations.
            </p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <HeartHandshake className="h-5 w-5 text-blue-500" />
              <h3 className="font-medium">Connect with Mentors</h3>
            </div>
            <p className="text-sm text-slate-600">
              Book appointments with mental health professionals for guidance and support.
            </p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg md:col-span-2">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="h-5 w-5 text-blue-500" />
              <h3 className="font-medium">Personalized Insights</h3>
            </div>
            <p className="text-sm text-slate-600">
              Receive data-driven insights about your emotional patterns and practical suggestions to improve your mental health.
            </p>
          </div>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleClose}>Close</AlertDialogCancel>
          <AlertDialogAction onClick={handleGetStarted}>Get Started</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};


