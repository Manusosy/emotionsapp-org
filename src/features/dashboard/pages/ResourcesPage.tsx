import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../../components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Search, 
  BookOpen, 
  Video, 
  Headphones, 
  Users, 
  FileText, 
  Calendar, 
  ExternalLink,
  Bookmark,
  BookmarkPlus,
  Share2,
  Download,
  ChevronRight,
  Clock3,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/authContext";
import { dataService } from "@/services";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Resource type definition
interface Resource {
  id: string;
  title: string;
  type: 'article' | 'video' | 'podcast' | 'document' | 'group' | 'workshop';
  category: string;
  author: string;
  author_role?: string;
  author_avatar?: string;
  date?: string;
  read_time?: string;
  duration?: string;
  description: string;
  thumbnail_url?: string;
  url: string;
  file_url?: string;
  tags?: string[];
  featured?: boolean;
  downloads?: number;
  shares?: number;
  mood_mentor_id?: string;
  created_at: string;
  updated_at?: string;
  is_favorite?: boolean;
}

export default function ResourcesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [savedResources, setSavedResources] = useState<string[]>([]);
  const [hoveredResourceId, setHoveredResourceId] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
  }, [user]);

  const loadResources = async () => {
    try {
      setIsLoading(true);
      
      if (!user) {
        setResources([]);
        setIsLoading(false);
        return;
      }
      
      // Get resources with favorite status
      const { data, error } = await supabase.rpc('get_resources_with_favorite_status', {
        p_user_id: user.id
      });
      
      if (error) {
        console.error('Error loading resources:', error);
        toast.error('Failed to load resources');
        return;
      }
      
      // Only set resources if we got data back from the database
      setResources(data || []);
      
      // Update savedResources state based on favorites
      if (data) {
        const favoriteIds = data
          .filter((resource: Resource) => resource.is_favorite)
          .map((resource: Resource) => resource.id);
        setSavedResources(favoriteIds);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load resources');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter resources based on search and active tab
  const filteredResources = resources.filter((resource: Resource) => {
    // Check if search query matches
    const matchesSearch = searchQuery === "" || 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      resource.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check if tab matches
    const matchesTab = activeTab === "all" || 
      (activeTab === "articles" && resource.type === "article") ||
      (activeTab === "videos" && resource.type === "video") ||
      (activeTab === "podcasts" && resource.type === "podcast") ||
      (activeTab === "groups" && resource.type === "group") ||
      (activeTab === "workshops" && resource.type === "workshop") ||
      (activeTab === "documents" && resource.type === "document") ||
      (activeTab === "saved" && resource.is_favorite);
    
    return matchesSearch && matchesTab;
  });

  // Get featured resources
  const featuredResources = resources.filter((resource: Resource) => resource.featured);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already applied through the filter
  };

  const handleSaveResource = useCallback(async (resourceId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering parent click events
    }
    
    if (!user) {
      toast.error("Please sign in to save resources");
      return;
    }
    
    try {
      const isFavorite = savedResources.includes(resourceId);
      
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from('resource_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('resource_id', resourceId);
          
        if (error) throw error;
        
        setSavedResources(prev => prev.filter(id => id !== resourceId));
        
        // Update the resource in the local state
        setResources(prev => 
          prev.map(resource => 
            resource.id === resourceId 
              ? { ...resource, is_favorite: false } 
              : resource
          )
        );
        
        toast.success("Resource removed from your saved items");
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('resource_favorites')
          .insert({
            user_id: user.id,
            resource_id: resourceId
          });
          
        if (error) throw error;
        
        setSavedResources(prev => [...prev, resourceId]);
        
        // Update the resource in the local state
        setResources(prev => 
          prev.map(resource => 
            resource.id === resourceId 
              ? { ...resource, is_favorite: true } 
              : resource
          )
        );
        
        toast.success("Resource saved to your collection");
      }
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error("Failed to update saved resources");
    }
  }, [savedResources, user]);

  const handleShareResource = useCallback((resource: Resource, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering parent click events
    }
    
    // In a real app, this would open a share dialog
    try {
      navigator.clipboard.writeText(`Check out this resource: ${resource.title} - ${window.location.origin}${resource.url}`);
      toast("Resource link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy", error);
      toast.error("Failed to copy link to clipboard");
    }
  }, []);

  const handleDownloadResource = useCallback((resource: Resource, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering parent click events
    }
    
    // In a real app, this would trigger a download
    toast(`Downloading ${resource.title}`);
  }, []);

  const handleResourceClick = useCallback((url: string) => {
    navigate(url);
  }, [navigate]);

  // Get the icon for the resource type
  const getResourceIcon = (type: string) => {
    switch (type) {
      case "article":
        return <FileText className="h-5 w-5" />;
      case "document":
        return <FileText className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "podcast":
        return <Headphones className="h-5 w-5" />;
      case "group":
        return <Users className="h-5 w-5" />;
      case "workshop":
        return <Calendar className="h-5 w-5" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (type: string) => {
    switch (type) {
      case "article":
        return "bg-blue-100 text-blue-800";
      case "document":
        return "bg-amber-100 text-amber-800";
      case "video":
        return "bg-red-100 text-red-800";
      case "podcast":
        return "bg-purple-100 text-purple-800";
      case "group":
        return "bg-green-100 text-green-800";
      case "workshop":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Resource list component
  const ResourceList = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    
    if (filteredResources.length === 0) {
      return (
        <Card className="p-6 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">No resources found</h3>
          <p className="text-slate-500 mb-4">
            {searchQuery 
              ? "Try a different search term or category" 
              : activeTab === "saved"
                ? "You haven't saved any resources yet"
                : "Resources will be added by Mood Mentors soon"}
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {filteredResources.map(resource => (
          <Card 
            key={resource.id} 
            className="hover:shadow-md transition overflow-hidden cursor-pointer"
            onClick={() => handleResourceClick(resource.url)}
          >
            <div className="flex flex-col md:flex-row">
              <div className="md:w-1/4 h-48 md:h-auto relative">
                <img
                  src={resource.thumbnail_url || "https://placehold.co/400x300?text=Resource+Image"}
                  alt={resource.title}
                  className="object-cover h-full w-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://placehold.co/400x300?text=Resource+Image";
                  }}
                  loading="lazy"
                />
                <div className="absolute top-3 left-3">
                  <Badge className={getCategoryColor(resource.type)}>
                    <div className="flex items-center gap-1">
                      {getResourceIcon(resource.type)}
                      <span>{resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}</span>
                    </div>
                  </Badge>
                </div>
              </div>
              <div className="p-5 md:w-3/4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium mb-1">{resource.title}</h3>
                    <p className="text-sm text-slate-500 mb-2">
                      {resource.type === 'article' || resource.type === 'document' ? `${resource.read_time} • ` : 
                      resource.type === 'video' || resource.type === 'podcast' || resource.type === 'workshop' ? `${resource.duration} • ` : 
                      ''}
                      {resource.date}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => handleSaveResource(resource.id, e)}
                      type="button"
                    >
                      {resource.is_favorite ? (
                        <Bookmark className="h-4 w-4 fill-current" />
                      ) : (
                        <BookmarkPlus className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => handleShareResource(resource, e)}
                      type="button"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    {(resource.type === 'document' || resource.type === 'video' || resource.type === 'podcast') && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={(e) => handleDownloadResource(resource, e)}
                        type="button"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <p className="text-slate-600 mb-3">{resource.description}</p>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {resource.tags?.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    {resource.author_avatar ? (
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarImage 
                          src={resource.author_avatar} 
                          alt={resource.author}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <AvatarFallback>{resource.author.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ) : (
                      <Avatar className="h-6 w-6 mr-2">
                        <AvatarFallback>{resource.author.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                    <div>
                      <span className="text-sm font-medium">{resource.author}</span>
                      <span className="text-xs text-slate-500 block">{resource.author_role}</span>
                    </div>
                  </div>
                  <Button 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(resource.url);
                    }}
                    type="button"
                  >
                    View Resource
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const FeaturedResourceCard = ({ resource }: { resource: Resource }) => (
    <Card 
      key={resource.id} 
      className="overflow-hidden hover:shadow-md transition cursor-pointer"
      onClick={() => handleResourceClick(resource.url)}
    >
      <div className="aspect-video w-full relative">
        <img
          src={resource.thumbnail_url || "https://placehold.co/400x300?text=Resource+Image"}
          alt={resource.title}
          className="object-cover w-full h-full"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = "https://placehold.co/400x300?text=Resource+Image";
          }}
          loading="lazy"
        />
        <div className="absolute top-3 right-3">
          <Badge className={getCategoryColor(resource.type)}>
            <div className="flex items-center gap-1">
              {getResourceIcon(resource.type)}
              <span>{resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}</span>
            </div>
          </Badge>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="absolute top-3 left-3 h-8 w-8 bg-white/80 hover:bg-white"
          onClick={(e) => handleSaveResource(resource.id, e)}
          type="button"
        >
          {resource.is_favorite ? (
            <Bookmark className="h-4 w-4 fill-current" />
          ) : (
            <BookmarkPlus className="h-4 w-4" />
          )}
        </Button>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{resource.title}</CardTitle>
        <CardDescription>
          {resource.type === 'article' || resource.type === 'document' ? `${resource.read_time} • ` : 
          resource.type === 'video' || resource.type === 'podcast' || resource.type === 'workshop' ? `${resource.duration} • ` : 
          ''}
          {resource.date}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 line-clamp-2">{resource.description}</p>
        <div className="flex flex-wrap gap-1 mt-3">
          {resource.tags?.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-3 flex justify-between">
        <div className="flex items-center text-sm text-slate-500">
          {resource.author_avatar ? (
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage 
                src={resource.author_avatar} 
                alt={resource.author}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <AvatarFallback>{resource.author.charAt(0)}</AvatarFallback>
            </Avatar>
          ) : (
            <Avatar className="h-6 w-6 mr-2">
              <AvatarFallback>{resource.author.charAt(0)}</AvatarFallback>
            </Avatar>
          )}
          <span className="line-clamp-1">{resource.author}</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(resource.url);
          }}
          type="button"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <DashboardLayout>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#0078FF] via-[#20c0f3] to-[#00D2FF] text-white pt-20 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 w-96 h-96 rounded-full bg-white"></div>
          <div className="absolute right-0 bottom-0 w-80 h-80 rounded-full bg-white"></div>
          <div className="absolute left-1/3 top-1/3 w-64 h-64 rounded-full bg-white"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">Resources</h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto text-blue-50 mb-8">
              Access educational content and tools to support your mental health journey
            </p>
            <div className="relative max-w-xl mx-auto">
              <Input 
                type="search"
                placeholder="Search resources..."
                className="pl-10 pr-14 py-3 w-full rounded-full border-0 text-gray-800 shadow-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
        
        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-white" style={{ 
          clipPath: "ellipse(75% 100% at 50% 100%)" 
        }}></div>
      </div>

      <div className="py-8 container mx-auto px-4">
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Resources</TabsTrigger>
            <TabsTrigger value="articles">Articles</TabsTrigger>
            <TabsTrigger value="videos">Videos</TabsTrigger>
            <TabsTrigger value="podcasts">Podcasts</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="groups">Support Groups</TabsTrigger>
            <TabsTrigger value="workshops">Workshops</TabsTrigger>
            <TabsTrigger value="saved">Saved</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-8">
            {featuredResources.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-medium mb-4">Featured Resources</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-6">
                  {featuredResources.map(resource => (
                    <FeaturedResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-medium mb-4">
                All Resources
              </h2>
              <ResourceList />
            </div>
          </TabsContent>
          
          <TabsContent value="articles" className="space-y-8">
            <ResourceList />
          </TabsContent>
          
          <TabsContent value="videos" className="space-y-8">
            <ResourceList />
          </TabsContent>
          
          <TabsContent value="podcasts" className="space-y-8">
            <ResourceList />
          </TabsContent>
          
          <TabsContent value="documents" className="space-y-8">
            <ResourceList />
          </TabsContent>
          
          <TabsContent value="groups" className="space-y-8">
            <ResourceList />
          </TabsContent>
          
          <TabsContent value="workshops" className="space-y-8">
            <ResourceList />
          </TabsContent>
          
          <TabsContent value="saved" className="space-y-8">
            {savedResources.length === 0 ? (
              <Card className="p-6 text-center">
                <Bookmark className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium mb-1">No saved resources</h3>
                <p className="text-slate-500 mb-4">
                  Save resources to access them later
                </p>
              </Card>
            ) : (
              <ResourceList />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 