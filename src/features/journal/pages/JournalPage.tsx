import { useCallback, useEffect, useState, useRef, useContext } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Typewriter from 'typewriter-effect/dist/core';
import { Card } from "@/components/ui/card";
import JournalSidebar from "../components/JournalSidebar";
import JournalToolbar from "../components/JournalToolbar";
import { supabase } from '@/lib/supabase';
import { useToast } from "@/components/ui/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LockKeyhole, BookOpen, LineChart, Edit, ArrowRight, Shield, Sparkles, FileText, AlertCircle, Calendar } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/authContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MoodType } from "@/types/mood";

const AUTOSAVE_DELAY = 2000; // 2 seconds

// Title suggestions for the typing animation
const TITLE_SUGGESTIONS = [
  "Enter your title here...",
  "How are you feeling today?",
  "What's on your mind?",
  "Reflect on your day...",
  "Write about your emotions...",
  "Document your journey...",
];

// Journal prompts for clickable suggestions
const JOURNAL_PROMPTS = [
  "Three things I'm grateful for today...",
  "What are my biggest challenges right now?",
  "Today's wins and accomplishments...",
  "How did I take care of myself today?",
  "My feelings about a recent interaction...",
  "What would make today better?",
  "My goals for the next week...",
  "A difficult emotion I'm processing...",
  "What brought me joy today?",
  "Something I need to let go of...",
];

interface UserProfile {
  role?: string;
  // Add other profile fields as needed
}

interface JournalEntry {
  user_id: string;
  title: string;
  content: string;
  mood: string;
  is_private: boolean;
  is_shared: boolean;
  tags: string[];
  tomorrows_intention: string;
  created_at: string;
  updated_at: string;
}

const JournalEditor = ({ 
  onBackToWelcome, 
  onSaveAttempt = () => true
}: { 
  onBackToWelcome: () => void, 
  onSaveAttempt?: () => boolean 
}) => {
  const [title, setTitle] = useState("");
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [tomorrowsIntention, setTomorrowsIntention] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showPrompts, setShowPrompts] = useState(false);
  const [showMoodReminder, setShowMoodReminder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const formattedDate = () => {
    const date = new Date();
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear();
    const weekday = date.toLocaleString('en-US', { weekday: 'short' });
    return `${weekday}, ${month} ${day}, ${year}`;
  };
  
  const todayDate = formattedDate();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const { toast } = useToast();

  // Initialize typewriter effect
  useEffect(() => {
    const typewriterEl = document.getElementById('title-typewriter');
    if (!typewriterEl) return;
    
    // Initialize a new Typewriter instance directly
    const tw = new Typewriter(typewriterEl, {
      loop: true,
      delay: 75,
      deleteSpeed: 30,
    });
    
    // Add typing animation for each suggestion
    TITLE_SUGGESTIONS.forEach((suggestion) => {
      tw.typeString(suggestion).pauseFor(2000).deleteAll();
    });
    
    tw.start();
    
    // Hide typewriter when input has value
    if (title) {
      typewriterEl.style.opacity = '0';
    }
    
    return () => {
      // Stop typewriter when component unmounts
      try {
        tw.stop();
      } catch (e) {
        console.error("Error stopping typewriter:", e);
      }
    };
  }, [title]);

  useEffect(() => {
    if (isMobile) {
      setShowSidebar(false);
    } else {
      setShowSidebar(true);
    }
  }, [isMobile]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg m-5 focus:outline-none min-h-[200px]",
      },
    },
    onUpdate: ({ editor }) => {
      // Show mood reminder if the user has written content but hasn't selected a mood
      const hasContent = editor.getText().trim().length > 0 || title.trim().length > 0;
      setShowMoodReminder(hasContent && !selectedMood);
    }
  });

  // Handle prompt selection
  const handlePromptSelect = (prompt: string) => {
    setTitle(prompt);
    
    // Focus editor after selecting a prompt
    if (editor) {
      setTimeout(() => {
        editor.commands.focus();
      }, 100);
    }
    
    // Hide typewriter
    const typewriterEl = document.getElementById('title-typewriter');
    if (typewriterEl) {
      typewriterEl.style.opacity = '0';
    }
  };

  // Add custom styles for the editor
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .ProseMirror ul {
        list-style-type: disc;
        padding-left: 1.2em;
      }
      
      .ProseMirror ol {
        list-style-type: decimal;
        padding-left: 1.2em;
      }
      
      .ProseMirror mark {
        border-radius: 0.25em;
        padding: 0 0.1em;
      }
      
      /* Default yellow highlight */
      .ProseMirror mark {
        background-color: #fef08a;
      }
      
      /* Color-specific highlights */
      .ProseMirror mark[style*="#fef08a"] {
        background-color: #fef08a !important;
      }
      
      .ProseMirror mark[style*="#dbeafe"] {
        background-color: #dbeafe !important;
      }
      
      .ProseMirror mark[style*="#dcfce7"] {
        background-color: #dcfce7 !important;
      }
      
      .ProseMirror mark[style*="#fed7aa"] {
        background-color: #fed7aa !important;
      }
      
      .ProseMirror mark[style*="#fbcfe8"] {
        background-color: #fbcfe8 !important;
      }
      
      .ProseMirror mark[style*="#d1d5db"] {
        background-color: #d1d5db !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Hide mood reminder when a mood is selected
  useEffect(() => {
    if (selectedMood) {
      setShowMoodReminder(false);
    } else if (editor) {
      // Re-check if we should show the reminder
      const hasContent = editor.getText().trim().length > 0 || title.trim().length > 0;
      setShowMoodReminder(hasContent);
    }
  }, [selectedMood, editor, title]);

  const saveEntry = useCallback(async () => {
    if (!editor) return;

    const content = editor.getHTML();
    if (!content.trim() && !title.trim()) {
      return; // Don't save empty entries
    }
    
    // Check if user can save (is authenticated)
    const canSave = onSaveAttempt();
    if (!canSave) {
      return; // Don't proceed if user isn't authenticated
    }

    setIsSaving(true);

    try {
      if (!user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to save journal entries. Please sign in.",
          variant: "destructive",
        });
        return;
      }

      // Create journal entry data
      const entryData = {
        user_id: user.id,
        title: title.trim() || "Untitled Entry",
        content: content,
        mood: selectedMood || 'neutral',
        is_private: true,
        is_shared: false,
        tags: [],
        tomorrows_intention: tomorrowsIntention,
        updated_at: new Date().toISOString()
      };
      
      // Check if we already have an entry from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: existingEntries, error: fetchError } = await supabase
        .from('journal_entries')
        .select('id, created_at')
        .eq('user_id', user.id)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        console.error("Error checking for existing entries:", fetchError);
        throw fetchError;
      }
      
      try {
        let result;
        
        if (existingEntries && existingEntries.length > 0) {
          // Update the most recent entry from today
          const mostRecentEntry = existingEntries[0];
          
          result = await supabase
            .from('journal_entries')
            .update(entryData)
            .eq('id', mostRecentEntry.id)
            .select();
            
          toast({
            title: "Entry updated",
            description: "Your journal entry has been updated successfully.",
          });
        } else {
          // Create a new entry if none exists for today
          entryData.created_at = new Date().toISOString(); // Only set created_at for new entries
          
          result = await supabase
            .from('journal_entries')
            .insert(entryData)
            .select();
            
          toast({
            title: "Entry saved",
            description: "Your journal entry has been saved successfully.",
          });
        }
        
        if (result.error) throw result.error;
        
        setLastSaved(new Date());
        
        // If the user is not on dashboard, suggest viewing in dashboard
        if (!window.location.pathname.includes('dashboard')) {
          toast({
            title: "Entry saved to dashboard",
            description: "You can view all your journal entries in your dashboard.",
            action: (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/dashboard/journal')}
              >
                Go to Dashboard
              </Button>
            )
          });
        }
      } catch (error) {
        console.error("Error saving journal entry:", error);
        toast({
          title: "Error saving entry",
          description: "There was a problem saving your journal entry. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error saving journal entry:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save your journal entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [editor, title, selectedMood, tomorrowsIntention, toast, onSaveAttempt, user, navigate]);

  // Handle mood selection
  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
  };

  // Autosave functionality
  useEffect(() => {
    if (!editor) return;
    
    const content = editor.getText().trim();
    if (!content && !title.trim()) return;

    const timeoutId = setTimeout(saveEntry, AUTOSAVE_DELAY);
    return () => clearTimeout(timeoutId);
  }, [editor, title, selectedMood, tomorrowsIntention, saveEntry]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-24 pb-8">
        <div className="flex justify-between items-center mb-6">
          <button 
            onClick={onBackToWelcome}
            className="text-primary hover:text-primary/80 flex items-center gap-2 font-medium text-left"
          >
            <ArrowRight className="h-4 w-4 rotate-180" />
            Back to Welcome
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {isMobile && (
            <button 
              onClick={() => setShowSidebar(!showSidebar)} 
              className="mb-4 px-4 py-2 bg-primary/10 rounded-lg text-primary text-sm font-medium text-left"
            >
              {showSidebar ? "Hide Sidebar" : "Show Sidebar"}
            </button>
          )}
          
          {showSidebar && (
            <div className={`${isMobile ? 'w-full' : 'w-full md:w-72 lg:w-80'} mb-6 md:mb-0`}>
              <JournalSidebar onPromptSelect={handlePromptSelect} />
            </div>
          )}
          
          <div className="flex-1">
            <Card className="p-4 sm:p-6 text-left">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 w-full">
                <div className="relative mb-2 sm:mb-0 w-full sm:w-4/5" style={{ minHeight: "2.5rem" }}>
                  <div style={{ 
                    position: "absolute", 
                    top: 0, 
                    left: 0,
                    width: "100%",
                    fontSize: "1.4rem",
                    lineHeight: "2.5rem",
                    color: "rgba(100, 116, 139, 0.6)",
                    pointerEvents: "none",
                    fontWeight: "bold",
                    textAlign: "left"
                  }} id="title-typewriter"></div>
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      // Hide typewriter when user types
                      const typewriterEl = document.getElementById('title-typewriter');
                      if (typewriterEl) {
                        typewriterEl.style.opacity = e.target.value ? '0' : '1';
                      }
                    }}
                    className="w-full text-xl sm:text-2xl font-bold bg-transparent border-none outline-none z-10 relative text-left"
                    style={{ minHeight: "100%" }}
                    placeholder=""
                  />
                </div>
                
                <div className="text-sm text-muted-foreground flex items-center gap-1 sm:ml-auto">
                  <Calendar className="h-3.5 w-3.5 mr-0.5" />
                  <span className="text-xs whitespace-nowrap">{todayDate}</span>
                </div>
              </div>
              
              <JournalToolbar editor={editor} onMoodSelect={handleMoodSelect} selectedMood={selectedMood} />
              
              {showMoodReminder && (
                <div className="my-2 p-3 rounded-md bg-amber-50 border border-amber-200 flex items-center gap-2 text-sm text-amber-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p>How are you feeling today? Select a mood to categorize your journal entry.</p>
                </div>
              )}
              
              <EditorContent editor={editor} className="min-h-[40vh]" />
              
              <div className="mt-4 text-left">
                <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-400">
                  <h3 className="font-medium text-amber-800 mb-2 text-sm text-left">Tomorrow's intention:</h3>
                  <textarea
                    placeholder="I will..."
                    value={tomorrowsIntention}
                    onChange={(e) => setTomorrowsIntention(e.target.value)}
                    className="w-full bg-amber-50 border border-amber-200 rounded p-2 text-amber-800 placeholder:text-amber-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 text-left"
                    rows={2}
                  />
                </div>
              </div>
              
              {lastSaved && (
                <div className="mt-3 text-xs text-muted-foreground text-left">
                  {isSaving ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    <>Last saved: {lastSaved.toLocaleTimeString()}</>
                  )}
                </div>
              )}
              {!lastSaved && isSaving && (
                <div className="mt-3 text-xs text-muted-foreground text-left flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const JournalWelcome = ({ onStartJournaling }: { onStartJournaling: () => void }) => {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with curved bottom */}
      <div className="bg-gradient-to-r from-[#0078FF] via-[#20C0F3] to-[#00D2FF] text-white pt-16 pb-24 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <motion.div 
            className="absolute top-[10%] right-[15%] w-56 h-56 rounded-full bg-white/10"
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 3, 0],
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity,
              repeatType: "reverse" 
            }}
          />
          <motion.div 
            className="absolute bottom-[10%] left-[10%] w-40 h-40 rounded-full bg-white/10"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, -3, 0],
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity,
              repeatType: "reverse",
              delay: 0.5 
            }}
          />
        </div>
        
        {/* Content */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 mb-8 lg:mb-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="text-left"
              >
                <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4 text-white">Your Journal.<br />Your Journey.</h1>
                <p className="text-lg max-w-md text-blue-50 mb-8 leading-relaxed">
                  Document your thoughts, track your emotional growth, and discover patterns in your mental wellbeing journey.
                </p>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button 
                    onClick={onStartJournaling}
                    className="bg-white text-[#20C0F3] font-semibold px-8 py-3 rounded-full shadow-md hover:shadow-lg transition-all flex items-center group"
                  >
                    Start Writing
                    <motion.span
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <Edit className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
                    </motion.span>
                  </button>
                </motion.div>
              </motion.div>
            </div>
            
            <div className="lg:w-1/2 relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative"
              >
                <img 
                  src="https://images.unsplash.com/photo-1517842645767-c639042777db?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Journal" 
                  className="rounded-lg shadow-lg max-w-md mx-auto"
                />
                <div className="absolute -top-4 -right-4 bg-[#20C0F3] rounded-full p-3 shadow-md">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                  >
                    <Edit className="h-6 w-6 text-white" />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
        
        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white" style={{ 
          clipPath: "ellipse(75% 100% at 50% 100%)" 
        }}></div>
      </div>

      {/* Features Section with Visual Elements */}
      <div className="container mx-auto px-4 -mt-10 relative z-10 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl p-6 overflow-hidden shadow-md hover:shadow-lg transition-all border border-gray-100 text-left"
            onClick={onStartJournaling}
            style={{ cursor: 'pointer' }}
          >
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-br from-[#0078FF] to-[#20C0F3] p-3 rounded-full mr-4">
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <BookOpen className="h-5 w-5 text-white" />
                </motion.div>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Guided Reflection</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Our intelligent prompts help you explore your emotions and thoughts with purpose.
            </p>
            <button 
              onClick={onStartJournaling} 
              className="text-[#20C0F3] font-medium text-sm flex items-center hover:text-[#0078FF] transition-colors"
            >
              <span>Try a prompt</span>
              <ArrowRight className="ml-1 h-3 w-3" />
            </button>
          </motion.div>

          {/* Feature 2 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-xl p-6 overflow-hidden shadow-md hover:shadow-lg transition-all border border-gray-100 text-left"
            onClick={onStartJournaling}
            style={{ cursor: 'pointer' }}
          >
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-br from-[#20C0F3] to-[#00D2FF] p-3 rounded-full mr-4">
                <motion.div
                  animate={{ 
                    rotate: [0, 5, 0, -5, 0],
                  }}
                  transition={{ duration: 5, repeat: Infinity }}
                >
                  <Shield className="h-5 w-5 text-white" />
                </motion.div>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Private & Secure</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              End-to-end encryption ensures your thoughts remain private and accessible only to you.
            </p>
            <button 
              onClick={onStartJournaling} 
              className="text-[#20C0F3] font-medium text-sm flex items-center hover:text-[#0078FF] transition-colors"
            >
              <span>Start journaling</span>
              <ArrowRight className="ml-1 h-3 w-3" />
            </button>
          </motion.div>

          {/* Feature 3 */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-xl p-6 overflow-hidden shadow-md hover:shadow-lg transition-all border border-gray-100 text-left"
            onClick={onStartJournaling}
            style={{ cursor: 'pointer' }}
          >
            <div className="flex items-center mb-4">
              <div className="bg-gradient-to-br from-[#0078FF] to-[#20C0F3] p-3 rounded-full mr-4">
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <LineChart className="h-5 w-5 text-white" />
                </motion.div>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Track Progress</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Visualize your emotional patterns and growth with intuitive tracking tools.
            </p>
            <button 
              onClick={onStartJournaling} 
              className="text-[#20C0F3] font-medium text-sm flex items-center hover:text-[#0078FF] transition-colors"
            >
              <span>See analytics</span>
              <ArrowRight className="ml-1 h-3 w-3" />
            </button>
          </motion.div>
        </div>
      </div>

      {/* Sample Journal Entry */}
      <div className="container mx-auto px-4 py-8 mb-16">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-left mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">See Your Thoughts Come to Life</h2>
          <p className="text-gray-600 max-w-2xl">
            Express yourself freely and document your personal growth journey
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row items-start gap-12 max-w-5xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:w-1/2"
          >
            <div className="relative">
              <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-[#20C0F3] relative z-10 text-left">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-[#0078FF]">Tuesday, July 12, 2023</h3>
                  <span className="px-3 py-1 bg-blue-100 text-[#20C0F3] rounded-full text-xs font-medium">Feeling Hopeful</span>
                </div>
                
                <p className="text-gray-700 mb-4 text-sm">
                  Today was better than yesterday. I started the morning with a 10-minute meditation, which helped clear my mind. Work was still stressful, but I managed to take breaks and practice deep breathing when I felt overwhelmed.
                </p>
                
                <p className="text-gray-700 mb-5 text-sm">
                  I'm proud that I reached out to a friend when I was feeling down instead of isolating myself. Our conversation reminded me that I'm not alone in these struggles.
                </p>
                
                <div className="mb-5 bg-blue-50 rounded-lg p-4 border-l-3 border-[#20C0F3]">
                  <h4 className="font-bold text-gray-800 mb-2 text-sm">Things I'm grateful for today:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm text-gray-700">
                      <div className="mr-2 bg-[#20C0F3]/20 p-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[#20C0F3]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      My supportive friend Sarah
                    </li>
                    <li className="flex items-center text-sm text-gray-700">
                      <div className="mr-2 bg-[#20C0F3]/20 p-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[#20C0F3]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      The beautiful weather during my lunch break
                    </li>
                    <li className="flex items-center text-sm text-gray-700">
                      <div className="mr-2 bg-[#20C0F3]/20 p-1 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-[#20C0F3]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      Finding this mental health community
                    </li>
                  </ul>
                </div>
                
                <div className="bg-amber-50 p-3 rounded-lg border-l-3 border-amber-400">
                  <p className="text-amber-800 font-medium text-sm">Tomorrow's intention: <span className="font-bold">I will be gentle with myself if things don't go perfectly.</span></p>
                </div>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:w-1/2 text-left"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Express Yourself</h2>
            <p className="text-gray-600 mb-2">
              Our journal provides a structured yet flexible way to document your thoughts, feelings, and growth.
            </p>
            <p className="text-amber-600 text-sm mb-6">
              {!isAuthenticated && "You can try journaling without an account, but you'll need to sign in as a patient to save your entries."}
            </p>
            
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-3 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#20C0F3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Mood Tracking</h3>
                  <p className="text-gray-600 text-sm">Record how you feel each day and track your emotional patterns over time.</p>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-3 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#20C0F3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Custom Templates</h3>
                  <p className="text-gray-600 text-sm">Choose from gratitude journals, reflection journals, and more.</p>
                </div>
              </li>
              
              <li className="flex items-start">
                <div className="bg-[#20C0F3]/10 p-2 rounded-full mr-3 mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#20C0F3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">Insight Reports</h3>
                  <p className="text-gray-600 text-sm">Get personalized insights about your emotional patterns and triggers.</p>
                </div>
              </li>
            </ul>
            
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              className="text-left"
            >
              <button 
                onClick={onStartJournaling}
                className="bg-[#20C0F3] text-white font-medium px-8 py-3 rounded-full shadow-md hover:bg-[#0078FF] transition-colors flex items-center"
              >
                <Edit className="mr-2 h-4 w-4" />
                Begin Your Journey
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const JournalPage = () => {
  const navigate = useNavigate();
  const [showJournalEditor, setShowJournalEditor] = useState(false);
  const [isMentor, setIsMentor] = useState(false);
  const [showMentorAlert, setShowMentorAlert] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const { user, isAuthenticated } = useAuth();
  
  // Check user role only if authenticated - but allow access regardless
  useEffect(() => {
    const checkUserRole = async () => {
      // Only check role if authenticated
      if (isAuthenticated && user) {
        try {
          const isMoodMentor = user.user_metadata?.role === 'mood_mentor';
          
          if (isMoodMentor) {
            setIsMentor(true);
            setShowMentorAlert(true);
          }
        } catch (error) {
          console.error("Error checking user role:", error);
          toast.error("Failed to verify user access");
        }
      }
    };
    
    checkUserRole();
  }, [user, isAuthenticated]);

  // Modify saveEntry to check for authentication
  const handleSaveAttempt = () => {
    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return false; // Indicate that save can't proceed
    }
    return true; // Allow save to proceed
  };

  // If user is a mentor, show alert and restrict access
  if (isMentor) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <AlertDialog open={showMentorAlert} onOpenChange={setShowMentorAlert}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Feature Not Available</AlertDialogTitle>
              <AlertDialogDescription>
                The journaling feature is designed for patients only. As a mood mentor, you don't have access to create journal entries.
                Instead, you can view patient journal entries when they choose to share them with you.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => navigate('/mood-mentor-dashboard')}>
                Return to Dashboard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <>
      {showJournalEditor ? (
        <>
          <JournalEditor 
            onBackToWelcome={() => setShowJournalEditor(false)} 
            onSaveAttempt={handleSaveAttempt}
          />
          
          {/* Authentication prompt dialog */}
          <AlertDialog open={showAuthPrompt} onOpenChange={setShowAuthPrompt}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign in to Save Your Journal</AlertDialogTitle>
                <AlertDialogDescription>
                  You need to sign in as a patient to save your journal entries. Would you like to sign in now?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAuthPrompt(false)}
                >
                  Continue Without Saving
                </Button>
                <Button 
                  onClick={() => navigate('/patient-signin', { 
                    state: { from: '/journal', returnToJournal: true } 
                  })}
                >
                  Sign In
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <JournalWelcome onStartJournaling={() => setShowJournalEditor(true)} />
      )}
    </>
  );
};

export default JournalPage;



