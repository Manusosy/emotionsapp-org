import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Search, Calendar, Tag, Filter, SlidersHorizontal } from "lucide-react";
import { supabase } from '@/lib/supabase';
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { AuthContext } from "@/contexts/authContext";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  tomorrows_intention?: string;
}

export default function JournalArchive() {
  const navigate = useNavigate();
  const { user: userData } = useContext(AuthContext);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Mock data for demo purposes
  const mockEntries: JournalEntry[] = [
    {
      id: "entry-1",
      title: "Finally Making Progress",
      content: "<p>I'm starting to see improvements in my anxiety levels after consistent practice of mindfulness.</p>",
      mood: 8,
      tags: ["progress", "mindfulness", "anxiety"],
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: "user-1"
    },
    {
      id: "entry-2",
      title: "Difficult Day at Work",
      content: "<p>Struggled with a panic attack during a meeting, but managed to use my breathing techniques.</p>",
      mood: 4,
      tags: ["work", "panic", "coping"],
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: "user-1"
    },
    {
      id: "entry-3",
      title: "Weekend Self-Care",
      content: "<p>Spent the day focusing on self-care activities that help me manage stress.</p>",
      mood: 9,
      tags: ["self-care", "relaxation", "weekend"],
      created_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: "user-1"
    },
    {
      id: "entry-4",
      title: "Therapy Session Insights",
      content: "<p>My therapist suggested a new approach to handling work-related anxiety.</p>",
      mood: 7,
      tags: ["therapy", "work", "techniques"],
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: "user-1"
    },
    {
      id: "entry-5",
      title: "Sleep Troubles",
      content: "<p>Having difficulty sleeping. Need to practice better sleep hygiene.</p>",
      mood: 3,
      tags: ["sleep", "insomnia", "health"],
      created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      user_id: "user-1"
    },
  ];

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!userData) {
          // If not authenticated, use mock data for demo
          setEntries(mockEntries);
          setFilteredEntries(mockEntries);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("journal_entries")
          .select("*")
          .eq("user_id", userData.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setEntries(data as JournalEntry[]);
          setFilteredEntries(data as JournalEntry[]);
        } else {
          // Use mock data if no entries found
          setEntries(mockEntries);
          setFilteredEntries(mockEntries);
        }
      } catch (err: any) {
        console.error("Error fetching journal entries:", err);
        setError(err.message || "Failed to load journal entries");
        
        // Fallback to mock data
        setEntries(mockEntries);
        setFilteredEntries(mockEntries);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEntries();
  }, [userData]);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    let filtered = [...entries];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(entry => 
        entry.title.toLowerCase().includes(term) || 
        entry.content.toLowerCase().includes(term) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(term))
      );
    }

    // Apply mood filter
    if (moodFilter !== "all") {
      const [min, max] = moodFilter.split("-").map(Number);
      filtered = filtered.filter(entry => entry.mood >= min && entry.mood <= max);
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let dateThreshold = new Date();
      
      switch (dateFilter) {
        case "week":
          dateThreshold = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          dateThreshold = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "quarter":
          dateThreshold = new Date(now.setMonth(now.getMonth() - 3));
          break;
        case "year":
          dateThreshold = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
      }
      
      filtered = filtered.filter(entry => new Date(entry.created_at) >= dateThreshold);
    }

    setFilteredEntries(filtered);
  }, [searchTerm, moodFilter, dateFilter, entries]);

  // Format the entry preview (shortened content without HTML tags)
  const formatPreview = (content: string) => {
    // Remove HTML tags
    const textOnly = content.replace(/<[^>]*>/g, "");
    // Shorten to about 100 characters
    return textOnly.length > 100 ? textOnly.substring(0, 100) + "..." : textOnly;
  };

  // Helper to get human readable date
  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Journal Archive</CardTitle>
              <CardDescription>Browse and search your past journal entries</CardDescription>
            </div>
            <Button variant="outline" onClick={() => navigate("/patient-dashboard/journal")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Journal
            </Button>
          </CardHeader>
          <CardContent>
            {/* Search and filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search entries..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-row gap-2">
                <div className="w-40">
                  <Select
                    value={moodFilter}
                    onValueChange={setMoodFilter}
                  >
                    <SelectTrigger>
                      <span className="flex items-center">
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Mood" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Moods</SelectItem>
                      <SelectItem value="1-3">Low (1-3)</SelectItem>
                      <SelectItem value="4-6">Medium (4-6)</SelectItem>
                      <SelectItem value="7-10">High (7-10)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="w-40">
                  <Select
                    value={dateFilter}
                    onValueChange={setDateFilter}
                  >
                    <SelectTrigger>
                      <span className="flex items-center">
                        <Calendar className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Date" />
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="week">Past Week</SelectItem>
                      <SelectItem value="month">Past Month</SelectItem>
                      <SelectItem value="quarter">Past 3 Months</SelectItem>
                      <SelectItem value="year">Past Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="py-4">
                      <div className="space-y-3">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <div className="flex justify-between">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredEntries.length > 0 ? (
              <div className="space-y-4">
                {filteredEntries.map((entry) => (
                  <Card 
                    key={entry.id} 
                    className="hover:border-primary cursor-pointer transition-all"
                    onClick={() => navigate(`/patient-dashboard/journal/${entry.id}`)}
                  >
                    <CardContent className="py-4">
                      <div className="mb-2 flex justify-between items-start">
                        <h3 className="font-medium text-lg">{entry.title}</h3>
                        <div className="flex items-center">
                          <Badge variant={entry.mood >= 7 ? "success" : entry.mood >= 4 ? "outline" : "destructive"}>
                            Mood: {entry.mood}/10
                          </Badge>
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-3">{formatPreview(entry.content)}</p>
                      <div className="flex justify-between items-center">
                        <div className="flex flex-wrap gap-1">
                          {entry.tags?.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {entry.tags && entry.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">+{entry.tags.length - 3}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(entry.created_at)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-2">No journal entries found matching your filters</p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setMoodFilter("all");
                    setDateFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate("/patient-dashboard/journal")}>
              Back to Journal
            </Button>
            <Button onClick={() => navigate("/patient-dashboard/journal/new")}>
              Create New Entry
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
} 


