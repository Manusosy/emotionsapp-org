import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/lib/supabase';
import { cn } from "@/lib/utils";
import { Sparkles, Calendar } from "lucide-react";
import { useAuth } from '@/contexts/authContext';
import DOMPurify from 'dompurify';

type JournalEntry = {
  id: string;
  title: string;
  content: string;
  mood?: string | number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  tomorrows_intention?: string;
};

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

interface JournalSidebarProps {
  onPromptSelect?: (prompt: string) => void;
}

const JournalSidebar = ({ onPromptSelect }: JournalSidebarProps = {}) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchEntries = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('journal_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        if (data) setEntries(data);
      } catch (error) {
        console.error("Error fetching entries:", error);
        setEntries([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
    const intervalId = setInterval(fetchEntries, 60000);

    return () => {
      clearInterval(intervalId);
    };
  }, [user]);

  const handlePromptClick = (prompt: string) => {
    if (onPromptSelect) {
      onPromptSelect(prompt);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatShortDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="w-full p-3 md:p-4 flex flex-col gap-4 h-[500px] md:h-[calc(100vh-120px)] md:sticky md:top-24">
        <div>
          <h3 className="font-semibold mb-2 md:mb-3 text-base text-left">
            Not sure what to write? Try these:
          </h3>
          <ScrollArea className="h-40 md:h-56">
            {JOURNAL_PROMPTS.map((prompt, index) => (
              <div 
                key={index} 
                className="mb-2 px-2 py-1.5 md:px-3 md:py-2 rounded-lg hover:bg-accent hover:text-foreground transition-colors cursor-pointer flex items-start text-left"
                onClick={() => handlePromptClick(prompt)}
              >
                <span className="inline-block w-5 h-5 rounded-full bg-primary/10 text-primary mr-2 flex-shrink-0 text-xs flex items-center justify-center">
                  {index + 1}
                </span>
                <p className="text-xs md:text-sm">
                  {prompt}
                </p>
              </div>
            ))}
          </ScrollArea>
        </div>
        <div className="flex-1 overflow-hidden">
          <h3 className="font-semibold mb-2 md:mb-3 text-base text-left">
            Past Entries
          </h3>
          <ScrollArea className="h-[calc(100%-2rem)]">
            {isLoading ? (
              <p className="text-xs md:text-sm text-muted-foreground px-2 text-left">Loading entries...</p>
            ) : entries.length === 0 ? (
              <p className="text-xs md:text-sm text-muted-foreground px-2 text-left">No entries yet</p>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <Card 
                    key={entry.id} 
                    className={cn(
                      "p-2 md:p-3 cursor-pointer hover:bg-accent transition-colors text-left",
                      selectedEntry?.id === entry.id && "bg-accent/50 border-primary"
                    )}
                    onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate text-xs md:text-sm">
                        {entry.title || "Untitled"}
                      </p>
                      {entry.mood && (
                        <span className="text-[10px] md:text-xs px-1.5 py-0.5 bg-primary/10 rounded-full">
                          {entry.mood}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center mt-1 text-[10px] md:text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {formatShortDate(entry.created_at)}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </Card>

      {selectedEntry && (
        <Card className="w-full p-4 mt-2 text-left">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">{selectedEntry.title || "Untitled"}</h2>
            {selectedEntry.mood && (
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary/10">
                {selectedEntry.mood}
              </span>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground mb-3 flex items-center">
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            {formatDate(selectedEntry.created_at)}
          </div>
          
          <div 
            className="prose prose-sm max-w-none mb-4 text-sm"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(selectedEntry.content || "", {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                ALLOWED_ATTR: []
              }) 
            }}
          />
          
          {selectedEntry.tomorrows_intention && (
            <div className="bg-amber-50 p-3 rounded-lg border-l-3 border-amber-400 mt-3 text-left">
              <div className="flex items-center gap-1 text-amber-800 font-medium text-xs mb-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Tomorrow's intention:</span>
              </div>
              <p className="text-amber-800 text-sm font-medium">
                {selectedEntry.tomorrows_intention}
              </p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default JournalSidebar;



