import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../../../components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  List,
  X,
  ArrowLeft
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
  
  // Resource viewer state
  const [viewingResource, setViewingResource] = useState<Resource | null>(null);
  const [showResourceViewer, setShowResourceViewer] = useState(false);

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
      
      // Extract saved resource IDs
      const saved = (data || [])
        .filter((res: Resource) => res.is_favorite)
        .map((res: Resource) => res.id);
      setSavedResources(saved);
      
    } catch (error) {
      console.error('Unexpected error loading resources:', error);
      toast.error('Unexpected error loading resources');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter resources based on active tab and search query
  const filteredResources = resources.filter(resource => {
    const matchesTab = 
      activeTab === "all" ? true :
      activeTab === "saved" ? resource.is_favorite :
      activeTab === resource.type;
    
    const matchesSearch = searchQuery === "" || 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.author.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  const handleBookmark = useCallback(async (resourceId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!user) {
      toast.error("Please sign in to save resources");
      return;
    }

    try {
      const isCurrentlySaved = savedResources.includes(resourceId);
      
      if (isCurrentlySaved) {
        await resourceService.removeFromFavorites(resourceId, user.id);
        setSavedResources(prev => prev.filter(id => id !== resourceId));
        setResources(prev => prev.map(res => 
          res.id === resourceId ? { ...res, is_favorite: false } : res
        ));
        toast.success("Removed from saved resources");
      } else {
        await resourceService.addToFavorites(resourceId, user.id);
        setSavedResources(prev => [...prev, resourceId]);
        setResources(prev => prev.map(res => 
          res.id === resourceId ? { ...res, is_favorite: true } : res
        ));
        toast.success("Added to saved resources");
      }
    } catch (error) {
      console.error("Failed to toggle bookmark", error);
      toast.error("Failed to update saved resources");
    }
  }, [savedResources, user]);

  const handleShare = useCallback(async (resource: Resource, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      // Track share analytics
      await resourceService.trackShare(
        resource.id,
        user?.id,
        window.location.hostname,
        navigator.userAgent
      );

      if (navigator.share) {
        await navigator.share({
          title: resource.title,
          text: resource.description,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Resource link copied to clipboard");
      }
    } catch (error) {
      console.error("Failed to share resource", error);
      toast.error("Failed to share resource");
    }
  }, [user]);

  const handleDownload = useCallback(async (resource: Resource, event: React.MouseEvent) => {
    event.stopPropagation();
    
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

  // Convert YouTube/Vimeo URLs to embeddable format
  const getEmbedUrl = (url: string): string => {
    // YouTube
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Vimeo
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    
    return url;
  };

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

      // Open in-app viewer instead of external navigation
      setViewingResource(resource);
      setShowResourceViewer(true);
    } catch (error) {
      console.error("Failed to access resource", error);
      toast.error("Failed to access resource");
    }
  }, [user]);

  const handleCloseViewer = () => {
    setShowResourceViewer(false);
    setViewingResource(null);
  };

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

  // Resource grid component - FIXED RESPONSIVENESS
  const ResourceGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
            <p className="text-gray-600 text-sm line-clamp-3 mb-3">
              {resource.description}
            </p>
            
            <div className="flex items-center gap-2 mb-3">
              <Avatar className="h-6 w-6">
                <AvatarImage src={resource.author_avatar} />
                <AvatarFallback className="text-xs">
                  {resource.author.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{resource.author}</p>
                <p className="text-xs text-gray-500 truncate">{resource.author_role || 'Mood Mentor'}</p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="pt-0">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleBookmark(resource.id, e)}
                  className="h-8 w-8 p-0"
                >
                  {savedResources.includes(resource.id) ? (
                    <Bookmark className="h-4 w-4 fill-current text-blue-600" />
                  ) : (
                    <BookmarkPlus className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleShare(resource, e)}
                  className="h-8 w-8 p-0"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                {(resource.file_url || resource.type === 'document') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDownload(resource, e)}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 p-0 h-8"
              >
                View <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Resources</h1>
            <p className="text-gray-600 mt-1">
              Discover helpful content to support your mental health journey
            </p>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-full sm:w-[250px] md:w-[300px]"
              />
            </div>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="hidden sm:flex"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="hidden sm:flex"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs - FIXED RESPONSIVENESS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 w-full max-w-full overflow-x-auto">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All</TabsTrigger>
            <TabsTrigger value="saved" className="text-xs sm:text-sm">Saved</TabsTrigger>
            <TabsTrigger value="article" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Articles</span>
              <span className="sm:hidden">Art</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Videos</span>
              <span className="sm:hidden">Vid</span>
            </TabsTrigger>
            <TabsTrigger value="podcast" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Podcasts</span>
              <span className="sm:hidden">Pod</span>
            </TabsTrigger>
            <TabsTrigger value="document" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Doc</span>
            </TabsTrigger>
            <TabsTrigger value="workshop" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Workshops</span>
              <span className="sm:hidden">Work</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="overflow-hidden">
                    <div className="h-48 bg-gray-200 animate-pulse" />
                    <CardHeader className="pb-2">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded animate-pulse" />
                        <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredResources.length > 0 ? (
              <ResourceGrid />
            ) : (
              <EmptyState />
            )}
          </TabsContent>
        </Tabs>

        {/* Resource Viewer Modal */}
        <Dialog open={showResourceViewer} onOpenChange={setShowResourceViewer}>
          <DialogContent className="max-w-4xl w-full h-[90vh] p-0">
            <DialogHeader className="p-4 pb-2 border-b">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg font-semibold truncate pr-4">
                  {viewingResource?.title}
                </DialogTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseViewer}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCloseViewer}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-hidden">
              {viewingResource && (
                <div className="h-full w-full">
                  {viewingResource.type === 'video' || viewingResource.url.includes('youtube') || viewingResource.url.includes('vimeo') ? (
                    <iframe
                      src={getEmbedUrl(viewingResource.file_url || viewingResource.url)}
                      className="w-full h-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : viewingResource.type === 'document' || viewingResource.url.includes('.pdf') ? (
                    <iframe
                      src={viewingResource.file_url || viewingResource.url}
                      className="w-full h-full"
                      frameBorder="0"
                    />
                  ) : viewingResource.type === 'article' && (viewingResource.url.includes('.jpg') || viewingResource.url.includes('.png') || viewingResource.url.includes('.gif')) ? (
                    <div className="flex items-center justify-center h-full p-4">
                      <img
                        src={viewingResource.file_url || viewingResource.url}
                        alt={viewingResource.title}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  ) : (
                    <iframe
                      src={viewingResource.file_url || viewingResource.url}
                      className="w-full h-full"
                      frameBorder="0"
                    />
                  )}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Badge className={getCategoryColor(viewingResource?.type || '')}>
                    {viewingResource?.type?.charAt(0).toUpperCase()}{viewingResource?.type?.slice(1)}
                  </Badge>
                  <span className="text-sm text-gray-600 truncate">
                    {viewingResource?.author} • {viewingResource?.read_time || viewingResource?.duration}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => viewingResource && handleShare(viewingResource, e)}
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => viewingResource && handleBookmark(viewingResource.id, e)}
                  >
                    {viewingResource && savedResources.includes(viewingResource.id) ? (
                      <Bookmark className="h-4 w-4 mr-1 fill-current" />
                    ) : (
                      <BookmarkPlus className="h-4 w-4 mr-1" />
                    )}
                    Save
                  </Button>
                  {viewingResource?.file_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => viewingResource && handleDownload(viewingResource, e)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 