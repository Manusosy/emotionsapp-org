import { Editor } from "@tiptap/react";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Strikethrough, 
  Underline,
  Heading2,
  Undo,
  Redo,
  Highlighter,
  ChevronDown,
  SmilePlus
} from "lucide-react";
// Supabase import removed
import { Button } from "@/components/ui/button";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Color options for highlighting
const highlightColors = [
  { name: 'Yellow', color: '#fef08a' },
  { name: 'Blue', color: '#dbeafe' },
  { name: 'Green', color: '#dcfce7' },
  { name: 'Orange', color: '#fed7aa' },
  { name: 'Pink', color: '#fbcfe8' },
  { name: 'Gray', color: '#d1d5db' },
];

// Mood options with emojis and descriptive labels
const moodOptions: Array<{mood: string, emoji: string, label: string, color: string}> = [
  { 
    mood: 'Happy', 
    emoji: '😊', 
    label: 'Feeling Joyful', 
    color: '#fde68a' 
  },
  { 
    mood: 'Calm', 
    emoji: '😌', 
    label: 'Feeling Peaceful', 
    color: '#93c5fd' 
  },
  { 
    mood: 'Sad', 
    emoji: '😔', 
    label: 'Feeling Down', 
    color: '#bfdbfe' 
  },
  { 
    mood: 'Angry', 
    emoji: '😤', 
    label: 'Feeling Frustrated', 
    color: '#fca5a5' 
  },
  { 
    mood: 'Worried', 
    emoji: '😟', 
    label: 'Feeling Anxious', 
    color: '#d8b4fe' 
  }
];

interface JournalToolbarProps {
  editor: Editor | null;
  onMoodSelect?: (mood: string) => void;
  selectedMood?: string | null;
}

export default function JournalToolbar({ 
  editor,
  onMoodSelect,
  selectedMood
}: JournalToolbarProps) {
  if (!editor) {
    return null;
  }

  // Find the selected mood option if any
  const selectedMoodOption = selectedMood ? 
    moodOptions.find(option => option.mood === selectedMood) : 
    null;

  const setHighlight = (color: string) => {
    editor.chain().focus().toggleMark('highlight', { color }).run();
  };

  return (
    <div className="border border-input bg-transparent rounded-md mb-4">
      <div className="flex flex-wrap items-center divide-x divide-border">
        <div className="flex flex-wrap items-center p-1 gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn("p-2 h-8 w-8", editor.isActive('bold') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn("p-2 h-8 w-8", editor.isActive('italic') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn("p-2 h-8 w-8", editor.isActive('heading', { level: 2 }) && "bg-muted")}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn("p-2 h-8 w-8", editor.isActive('bulletList') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={cn("p-2 h-8 w-8", editor.isActive('orderedList') && "bg-muted")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost"
                size="sm"
                className={cn("p-2 h-8 gap-1 flex items-center", editor.isActive('highlight') && "bg-muted")}
              >
                <Highlighter className="h-4 w-4" />
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="grid grid-cols-3 gap-1">
                {highlightColors.map((highlightColor) => (
                  <button
                    key={highlightColor.name}
                    onClick={() => setHighlight(highlightColor.color)}
                    className={cn(
                      "w-8 h-8 rounded border border-input flex items-center justify-center",
                      editor.isActive('highlight', { color: highlightColor.color }) && 'ring-2 ring-offset-1 ring-primary'
                    )}
                    title={highlightColor.name}
                  >
                    <div 
                      className="w-6 h-6 rounded" 
                      style={{ backgroundColor: highlightColor.color }} 
                    />
                  </button>
                ))}
              </div>
              <div className="mt-2 border-t pt-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => editor.chain().focus().unsetMark('highlight').run()}
                >
                  Remove highlight
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="flex flex-wrap items-center p-1 gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-8 w-8"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="p-2 h-8 w-8"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center p-1 ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant={selectedMood ? "default" : "outline"} 
                size="sm"
                className="flex items-center gap-1 min-w-32 justify-between"
                style={selectedMoodOption ? {
                  backgroundColor: `${selectedMoodOption.color}20`,
                  borderColor: selectedMoodOption.color,
                  color: 'inherit'
                } : {}}
              >
                <div className="flex items-center gap-1">
                  {selectedMoodOption ? (
                    <span className="text-base">{selectedMoodOption.emoji}</span>
                  ) : (
                    <SmilePlus className="h-4 w-4" />
                  )}
                  <span>{selectedMoodOption ? selectedMoodOption.label : "How are you feeling?"}</span>
                </div>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3">
              <h3 className="mb-3 text-sm font-medium">How are you feeling today?</h3>
              <div className="space-y-1">
                {moodOptions.map((option) => (
                  <Button
                    key={option.mood}
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-full justify-start h-9 mb-1",
                      selectedMood === option.mood && "border-2"
                    )}
                    style={{
                      backgroundColor: selectedMood === option.mood ? `${option.color}20` : undefined,
                      borderColor: selectedMood === option.mood ? option.color : undefined
                    }}
                    onClick={() => onMoodSelect(option.mood)}
                  >
                    <span className="text-lg mr-2">{option.emoji}</span>
                    <span>{option.label}</span>
                  </Button>
                ))}
                {selectedMood && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground mt-2 border-t"
                    onClick={() => onMoodSelect(null)}
                  >
                    Clear selection
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}



