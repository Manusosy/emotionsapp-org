import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthContext } from "@/contexts/authContext";
import { dataService } from "@/services";
import { JournalEntry, ShareJournalResponse } from "@/types/journal.types";
import { Loader2, Copy, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function JournalSharePage() {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

  useEffect(() => {
    loadJournalEntry();
  }, [entryId]);

  const loadJournalEntry = async () => {
    if (!user?.id || !entryId) return;
    
    try {
      setIsLoading(true);
      const response = await dataService.getJournalEntry(entryId);
      
      if (response.error) {
        console.error("Error loading journal entry:", response.error);
        toast.error("Failed to load journal entry");
        return;
      }
      
      if (response.data) {
        setEntry(response.data);
        if (response.data.share_code) {
          setShareCode(response.data.share_code);
        }
      }
    } catch (error) {
      console.error("Error in loadJournalEntry:", error);
      toast.error("An error occurred while loading the entry");
    } finally {
      setIsLoading(false);
    }
  };

  const generateShareCode = async () => {
    if (!entryId) return;
    
    try {
      setIsGeneratingCode(true);
      const response: ShareJournalResponse = await dataService.generateShareCode(entryId);
      
      if (response.error) {
        console.error("Error generating share code:", response.error);
        toast.error("Failed to generate share code");
        return;
      }
      
      if (response.data?.share_code) {
        setShareCode(response.data.share_code);
        toast.success("Share code generated successfully");
      }
    } catch (error) {
      console.error("Error in generateShareCode:", error);
      toast.error("An error occurred while generating the share code");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const copyShareLink = () => {
    if (!shareCode) return;
    
    const shareLink = `${window.location.origin}/journal/shared/${shareCode}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      toast.success("Share link copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy share link");
    });
  };

  const handleBack = () => {
    navigate("/patient-dashboard/journal");
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
            <p className="text-muted-foreground mb-4">Entry not found</p>
            <Button onClick={handleBack}>Back to Journal</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Button variant="ghost" onClick={handleBack} className="mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Journal
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Share Journal Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Entry Details</h3>
              <p className="text-sm text-muted-foreground">
                Title: {entry.title || "Untitled Entry"}
              </p>
              <p className="text-sm text-muted-foreground">
                Created: {new Date(entry.created_at).toLocaleDateString()}
              </p>
            </div>

            {shareCode ? (
              <div className="space-y-2">
                <h3 className="font-medium">Share Link</h3>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={`${window.location.origin}/journal/shared/${shareCode}`}
                  />
                  <Button onClick={copyShareLink}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Anyone with this link can view this journal entry
                </p>
              </div>
            ) : (
              <div>
                <Button 
                  onClick={generateShareCode}
                  disabled={isGeneratingCode}
                >
                  {isGeneratingCode && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate Share Link
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 