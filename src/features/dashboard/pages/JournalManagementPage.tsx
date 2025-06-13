import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthContext } from "@/contexts/authContext";
import { dataService } from "@/services";
import { JournalEntry, JournalResponse } from "@/types/journal.types";
import { Loader2, Share2, Eye, PenLine } from "lucide-react";

export default function JournalManagementPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadJournalEntries();
  }, []);

  const loadJournalEntries = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const response: JournalResponse = await dataService.getJournalEntries(user.id);
      
      if (response.error) {
        console.error("Error loading journal entries:", response.error);
        return;
      }
      
      setEntries(response.data || []);
    } catch (error) {
      console.error("Error in loadJournalEntries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewEntry = () => {
    navigate("/journal/new");
  };

  const handleViewEntry = (entryId: string) => {
    navigate(`/patient-dashboard/journal/${entryId}`);
  };

  const handleShareEntry = (entryId: string) => {
    navigate(`/patient-dashboard/journal/${entryId}/share`);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Journal Management</h1>
        <Button onClick={handleNewEntry}>
          <PenLine className="w-4 h-4 mr-2" />
          Write New Entry
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">No journal entries yet</p>
            <Button onClick={handleNewEntry}>Start Journaling</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{entry.title || "Untitled Entry"}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(entry.created_at).toLocaleDateString()}
                </p>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm line-clamp-3">{entry.content}</p>
              </CardContent>
              <div className="p-4 pt-0 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleViewEntry(entry.id)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleShareEntry(entry.id)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 