import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dataService } from "@/services";
import { JournalEntry } from "@/types/journal.types";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function SharedJournalPage() {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSharedEntry();
  }, [shareCode]);

  const loadSharedEntry = async () => {
    if (!shareCode) return;
    
    try {
      setIsLoading(true);
      const response = await dataService.getSharedEntry(shareCode);
      
      if (response.error) {
        console.error("Error loading shared entry:", response.error);
        toast.error("Failed to load journal entry");
        return;
      }
      
      if (response.data) {
        setEntry(response.data);
      }
    } catch (error) {
      console.error("Error in loadSharedEntry:", error);
      toast.error("An error occurred while loading the entry");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">Entry not found or no longer shared</p>
            <Button onClick={handleBack}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Button variant="ghost" onClick={handleBack} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Go Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{entry.title || "Untitled Entry"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {new Date(entry.created_at).toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{entry.content}</p>
          </div>
          {entry.mood && (
            <div className="mt-4">
              <p className="text-sm font-medium">Mood</p>
              <p className="text-sm text-muted-foreground">{entry.mood}</p>
            </div>
          )}
          {entry.tags && entry.tags.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium">Tags</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {entry.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs rounded-full bg-secondary text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 