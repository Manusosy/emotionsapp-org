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
  Loader2,
  Filter,
  Grid3x3,
  List
} from "lucide-react";
import { useAuth } from "@/contexts/authContext";
import { dataService } from "@/services";
import { resourceService } from "@/services/resource/resource.service";
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  const handleShareResource = useCallback(async (resource: Resource, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering parent click events
    }
    
    try {
      // Track share analytics
      await resourceService.trackShare(
        resource.id,
        'link',
        user?.id,
        window.location.hostname
      );

      const shareUrl = resource.file_url || resource.url;
      
      // Try to use the native share API if available
      if (navigator.share) {
        await navigator.share({
          title: resource.title,
          text: resource.description,
          url: shareUrl
        });
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(`Check out this resource: ${resource.title} - ${shareUrl}`);
        toast("Resource link copied to clipboard");
      }
    } catch (error) {
      console.error("Failed to share resource", error);
      toast.error("Failed to share resource");
    }
  }, [user]);

  const handleDownloadResource = useCallback(async (resource: Resource, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent triggering parent click events
    }
    
    try {
      const downloadUrl = resource.file_url || resource.url;
      
      if (!downloadUrl) {
        toast.error("No download URL available for this resource");
        return;
      }

      // Track download analytics
      await resourceService.trackDownload(
        resource.id,
        user?.id,
        window.location.hostname,
        navigator.userAgent
      );

      // Open the download URL
      window.open(downloadUrl, "_blank");
      toast(`Downloading ${resource.title}`);
    } catch (error) {
      console.error("Failed to download resource", error);
      toast.error("Failed to download resource");
    }
  }, [user]);

  const handleResourceClick = useCallback(async (resource: Resource) => {
    try {
      const accessUrl = resource.file_url || resource.url;
      
      if (!accessUrl) {
        toast.error("No access URL available for this resource");
        return;
      }

      // Track view analytics
      await resourceService.trackView(
        resource.id,
        user?.id,
        window.location.hostname,
        navigator.userAgent,
        0
      );

      // Navigate to the resource
      if (accessUrl.startsWith('http')) {
        window.open(accessUrl, "_blank");
      } else {
        navigate(accessUrl);
      }
    } catch (error) {
      console.error("Failed to access resource", error);
      toast.error("Failed to access resource");
    }
  }, [navigate, user]);

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

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-12">
      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <BookOpen className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No resources available</h3>
      <p className="text-gray-500 max-w-sm mx-auto">
        {activeTab === "saved" 
          ? "You haven't saved any resources yet. Browse available resources and save the ones you find helpful."
          : searchQuery 
            ? "No resources match your search criteria. Try adjusting your search terms or browse different categories."
            : "Mood mentors haven't added any resources yet. Check back later for helpful content and tools."
        }
      </p>
    </div>
  );

  // Resource grid component
  const ResourceGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredResources.map(resource => (
        <Card 
          key={resource.id} 
          className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleResourceClick(resource)}
        >
          <div className="relative h-48">
            <img
              src={resource.thumbnail_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop"}
              alt={resource.title}
              className="object-cover h-full w-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop";
              }}
            />
            <div className="absolute top-3 left-3">
              <Badge className={getCategoryColor(resource.type)}>
                <div className="flex items-center gap-1">
                  {getResourceIcon(resource.type)}
                  <span className="text-xs">{resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}</span>
                </div>
              </Badge>
            </div>
            {resource.featured && (
              <div className="absolute top-3 right-3">
                <Badge className="bg-yellow-500 text-white">Featured</Badge>
              </div>
            )}
          </div>
          
          <CardHeader className="pb-2">
            <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
            <CardDescription className="text-sm">
              {resource.read_time || resource.duration} • {resource.date || 'Recently added'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pb-2">
            <p className="text-gray-600 text-sm line-clamp-3 mb-3">{resource.description}</p>
            
            {resource.tags && resource.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {resource.tags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {resource.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{resource.tags.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="border-t pt-3 flex justify-between items-center">
            <div className="flex items-center text-sm text-gray-500">
              {resource.author_avatar ? (
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={resource.author_avatar} alt={resource.author} />
                  <AvatarFallback>{resource.author.charAt(0)}</AvatarFallback>
                </Avatar>
              ) : (
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarFallback>{resource.author.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <span className="truncate">{resource.author}</span>
            </div>
            
            <div className="flex gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={(e) => handleSaveResource(resource.id, e)}
              >
                {resource.is_favorite ? (
                  <Bookmark className="h-4 w-4 fill-current text-blue-600" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" />
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={(e) => handleShareResource(resource, e)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              {resource.file_url && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => handleDownloadResource(resource, e)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  // Resource list component
  const ResourceList = () => (
    <div className="space-y-4">
      {filteredResources.map(resource => (
        <Card 
          key={resource.id} 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleResourceClick(resource)}
        >
          <div className="flex">
            <div className="w-32 h-24 flex-shrink-0">
              <img
                src={resource.thumbnail_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=150&fit=crop"}
                alt={resource.title}
                className="object-cover h-full w-full rounded-l-lg"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=150&fit=crop";
                }}
              />
            </div>
            
            <div className="flex-1 p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getCategoryColor(resource.type)}>
                      <div className="flex items-center gap-1">
                        {getResourceIcon(resource.type)}
                        <span className="text-xs">{resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}</span>
                      </div>
                    </Badge>
                    {resource.featured && (
                      <Badge className="bg-yellow-500 text-white text-xs">Featured</Badge>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-lg mb-1 line-clamp-1">{resource.title}</h3>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-2">{resource.description}</p>
                  
                  <div className="flex items-center text-xs text-gray-500 gap-4">
                    <div className="flex items-center">
                      <Avatar className="h-4 w-4 mr-1">
                        <AvatarImage src={resource.author_avatar} alt={resource.author} />
                        <AvatarFallback className="text-xs">{resource.author.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{resource.author}</span>
                    </div>
                    <span>{resource.read_time || resource.duration}</span>
                    <span>{resource.date || 'Recently added'}</span>
                  </div>
                </div>
                
                <div className="flex gap-1 ml-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={(e) => handleSaveResource(resource.id, e)}
                  >
                    {resource.is_favorite ? (
                      <Bookmark className="h-4 w-4 fill-current text-blue-600" />
                    ) : (
                      <BookmarkPlus className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={(e) => handleShareResource(resource, e)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  {resource.file_url && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={(e) => handleDownloadResource(resource, e)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Resources</h1>
              <p className="text-gray-600">
                Access educational content and tools to support your mental health journey
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="search"
              placeholder="Search resources..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Content */}
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
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredResources.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Featured Resources */}
              {activeTab === "all" && featuredResources.length > 0 && (
                <div className="mb-8">
                  <h2 className="text-lg font-semibold mb-4">Featured Resources</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {featuredResources.slice(0, 3).map(resource => (
                      <Card 
                        key={resource.id} 
                        className="overflow-hidden border-blue-200 bg-blue-50/50 hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleResourceClick(resource)}
                      >
                        <div className="relative h-32">
                          <img
                            src={resource.thumbnail_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop"}
                            alt={resource.title}
                            className="object-cover h-full w-full"
                          />
                          <Badge className="absolute top-2 left-2 bg-yellow-500 text-white">
                            Featured
                          </Badge>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-medium mb-1 line-clamp-1">{resource.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{resource.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {/* All Resources */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">
                    {activeTab === "all" ? "All Resources" : 
                     activeTab === "saved" ? "Saved Resources" :
                     activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                  </h2>
                  <span className="text-sm text-gray-500">
                    {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''}
                  </span>
                </div>
                
                {viewMode === 'grid' ? <ResourceGrid /> : <ResourceList />}
              </div>
            </>
          )}
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 