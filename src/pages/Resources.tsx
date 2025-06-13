import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/authContext';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BookOpen, 
  Wrench, 
  Phone, 
  Video, 
  Users, 
  Smartphone,
  Search,
  Download,
  Play,
  ExternalLink,
  Heart,
  Share2,
  Clock,
  FileText,
  FileImage,
  Link as LinkIcon,
  Headphones,
  Calendar,
  Plus
} from "lucide-react";

// Resource type definition
type Resource = {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  url: string;
  file_url?: string;
  thumbnail_url?: string;
  tags?: string[];
  author?: string;
  author_role?: string;
  author_avatar?: string;
  read_time?: string;
  duration?: string;
  featured?: boolean;
  downloads?: number;
  shares?: number;
  mood_mentor_id?: string;
  created_at: string;
  updated_at?: string;
};

// Default images for resource types
const defaultImages: Record<string, string> = {
  document: "https://images.unsplash.com/photo-1551847677-dc82d764e1eb?q=80&w=500&auto=format&fit=crop",
  video: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=500&auto=format&fit=crop",
  image: "https://images.unsplash.com/photo-1599420186946-7b6fb4e297f0?q=80&w=500&auto=format&fit=crop",
  link: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=500&auto=format&fit=crop",
  article: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=500&auto=format&fit=crop",
  podcast: "https://images.unsplash.com/photo-1589903308904-1010c2294adc?q=80&w=500&auto=format&fit=crop",
  group: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=500&auto=format&fit=crop",
  workshop: "https://images.unsplash.com/photo-1558403194-611308249627?q=80&w=500&auto=format&fit=crop"
};

const Resources = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const { user } = useAuth();
  
  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };
  
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  // Fetch resources from the database
  useEffect(() => {
    const fetchResources = async () => {
      try {
        setIsLoading(true);
        
        const { data, error } = await supabase
          .from('resources')
          .select('*');
        
        if (error) {
          console.error('Error fetching resources:', error);
          toast.error('Failed to load resources');
          return;
        }
        
        setResources(data || []);
      } catch (error) {
        console.error('Error fetching resources:', error);
        toast.error('Failed to load resources');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResources();
  }, []);

  // Process resources for UI display
  const processedResources = resources.map(resource => {
    // Since we're now using the same categories as the public page,
    // we don't need to map between different category systems
    const uiCategories = [resource.category];
    
    // Add video category if it's a video type
    if (resource.type === 'video' && !uiCategories.includes('video')) {
      uiCategories.push('video');
    }
    
    // Check if resource is new (less than 7 days old)
    const isNew = resource.created_at ? 
      new Date(resource.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : 
      false;
    
    // Is popular if it has more than 50 downloads or shares
    const isPopular = (resource.downloads || 0) + (resource.shares || 0) > 50;
    
    // Get the appropriate image
    const image = resource.thumbnail_url || defaultImages[resource.type] || defaultImages.document;
    
    return {
      ...resource,
      uiCategories,
      isNew,
      isPopular,
      image
    };
  });
  
  // Filter resources based on search and category
  const filteredResources = processedResources.filter(resource => {
    const matchesSearch = !searchQuery || 
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = activeCategory === "all" || 
      resource.uiCategories.includes(activeCategory);
      
    return matchesSearch && matchesCategory;
  });
  
  // Get featured resources
  const featuredResources = processedResources.filter(r => r.featured || r.isPopular);
  
  // Handle resource access/download
  const handleResourceAccess = async (resource: Resource) => {
    try {
      // Determine the URL to open
      const accessUrl = resource.file_url || resource.url;
      
      if (!accessUrl) {
        toast.error("No access URL available for this resource");
        return;
      }
      
      // Update download count if we have a resource ID
      if (resource.id) {
        const currentDownloads = resource.downloads || 0;
        await supabase
          .from('resources')
          .update({ downloads: currentDownloads + 1 })
          .eq('id', resource.id);
      }
      
      // Open the URL
      window.open(accessUrl, "_blank");
    } catch (error) {
      console.error('Error accessing resource:', error);
      toast.error("Failed to access resource");
    }
  };
  
  // Handle resource sharing
  const handleResourceShare = async (resource: Resource) => {
    try {
      const shareUrl = resource.url || resource.file_url;
      
      if (!shareUrl) {
        toast.error("No URL available to share");
        return;
      }
      
      // Update share count if we have a resource ID
      if (resource.id) {
        const currentShares = resource.shares || 0;
        await supabase
          .from('resources')
          .update({ shares: currentShares + 1 })
          .eq('id', resource.id);
      }
      
      // Try to use the native share API if available
      if (navigator.share) {
        await navigator.share({
          title: resource.title,
          text: resource.description,
          url: shareUrl
        });
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
      }
    } catch (error) {
      console.error('Error sharing resource:', error);
      toast.error("Failed to share resource");
    }
  };

  // Get icon for resource type
  const getResourceTypeIcon = (type: string) => {
    switch(type) {
      case "video": return <Video className="w-4 h-4" />;
      case "article": return <BookOpen className="w-4 h-4" />;
      case "podcast": return <Headphones className="w-4 h-4" />;
      case "document": return <FileText className="w-4 h-4" />;
      case "image": return <FileImage className="w-4 h-4" />;
      case "link": return <LinkIcon className="w-4 h-4" />;
      case "group": return <Users className="w-4 h-4" />;
      case "workshop": return <Calendar className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };
  
  // Get label for resource type
  const getResourceTypeLabel = (type: string) => {
    switch(type) {
      case "video": return "Video";
      case "article": return "Article";
      case "podcast": return "Podcast";
      case "document": return "Document";
      case "image": return "Image";
      case "link": return "Link";
      case "group": return "Support Group";
      case "workshop": return "Workshop";
      default: return type;
    }
  };
  
  // Get appropriate action button based on resource type
  const getResourceActionButton = (resource: Resource) => {
    if (resource.file_url) {
      return (
        <Button 
          className="rounded-full bg-[#00D2FF] hover:bg-[#00bfe8] text-white" 
          onClick={() => handleResourceAccess(resource)}
        >
          <Download className="mr-2 h-4 w-4" /> Download
        </Button>
      );
    } else if (resource.type === "video") {
      return (
        <Button 
          className="rounded-full bg-[#0078FF] hover:bg-blue-600 text-white"
          onClick={() => handleResourceAccess(resource)}
        >
          <Play className="mr-2 h-4 w-4" /> Watch Now
        </Button>
      );
    } else if (resource.type === "podcast") {
      return (
        <Button 
          className="rounded-full bg-[#0078FF] hover:bg-blue-600 text-white"
          onClick={() => handleResourceAccess(resource)}
        >
          <Play className="mr-2 h-4 w-4" /> Listen Now
        </Button>
      );
    } else {
      return (
        <Button 
          className="rounded-full bg-[#0078FF] hover:bg-blue-600 text-white"
          onClick={() => handleResourceAccess(resource)}
        >
          <ExternalLink className="mr-2 h-4 w-4" /> Access
        </Button>
      );
    }
  };

  // Category definitions
  const categories = [
    {
      id: "educational",
      icon: <BookOpen className="w-5 h-5" />,
      title: "Educational Materials",
      description: "Articles, guides, and research about mental health conditions and treatments."
    },
    {
      id: "self-help",
      icon: <Wrench className="w-5 h-5" />,
      title: "Self-Help Tools",
      description: "Worksheets, exercises, and activities for personal mental health management."
    },
    {
      id: "crisis",
      icon: <Phone className="w-5 h-5" />,
      title: "Crisis Support",
      description: "Hotlines, text services, and emergency resources for immediate support."
    },
    {
      id: "video",
      icon: <Video className="w-5 h-5" />,
      title: "Video Resources",
      description: "Talks, guided exercises, and informational videos about mental health."
    },
    {
      id: "community",
      icon: <Users className="w-5 h-5" />,
      title: "Community Support",
      description: "Forums, online communities, and support groups for connection and shared experiences."
    },
    {
      id: "digital",
      icon: <Smartphone className="w-5 h-5" />,
      title: "Digital Tools",
      description: "Apps, websites, and digital resources for mental health support on the go."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#0078FF] via-[#20c0f3] to-[#00D2FF] text-white pt-20 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -left-20 -top-20 w-96 h-96 rounded-full bg-white"></div>
          <div className="absolute right-0 bottom-0 w-80 h-80 rounded-full bg-white"></div>
          <div className="absolute left-1/3 top-1/3 w-64 h-64 rounded-full bg-white"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">Mental Health Resources</h1>
            <p className="text-lg md:text-xl max-w-2xl mx-auto text-blue-50 mb-8">
              Access a wide range of materials to support your mental wellbeing, from educational content to interactive tools.
            </p>
            <div className="relative max-w-xl mx-auto">
              <Input 
                type="text"
                placeholder="Search for resources..."
                className="pl-10 pr-14 py-3 w-full rounded-full border-0 text-gray-800 shadow-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            </div>
          </motion.div>
        </div>
        
        {/* Curved bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gray-50" style={{ 
          clipPath: "ellipse(75% 100% at 50% 100%)" 
        }}></div>
      </div>
      
      {/* Categories */}
      <div className="container mx-auto px-4">
        <section className="mb-16 mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <motion.div
                key={category.id}
                className="cursor-pointer"
                onClick={() => setActiveCategory(category.id)}
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={`h-full transition-colors ${activeCategory === category.id ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                        {category.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{category.title}</h3>
                        <p className="text-gray-600 text-sm mb-4">{category.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
        
        {/* Featured Resources */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured Resources</h2>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading resources...</p>
            </div>
          ) : featuredResources.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {featuredResources.map((resource) => (
                <motion.div
                  key={resource.id}
                  variants={fadeInUp}
                >
                  <Card className="overflow-hidden bg-white border-none shadow-md h-full">
                    <div className="relative aspect-[4/3] h-52">
                      <img 
                        src={resource.image} 
                        alt={resource.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-5">
                        <div className="flex items-center mb-2">
                          <Badge className="bg-[#00D2FF] text-white border-0">
                            {getResourceTypeIcon(resource.type)}
                            <span className="ml-1">{getResourceTypeLabel(resource.type)}</span>
                          </Badge>
                          {resource.isNew && (
                            <Badge className="ml-2 bg-amber-500 text-white border-0">New</Badge>
                          )}
                          {resource.isPopular && (
                            <Badge className="ml-2 bg-pink-500 text-white border-0">Popular</Badge>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-white text-left">{resource.title}</h3>
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <p className="text-gray-600 mb-4 line-clamp-2">{resource.description}</p>
                      {resource.author && (
                        <div className="flex items-center mb-4">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={resource.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(resource.author)}&background=random`} alt={resource.author} />
                            <AvatarFallback>{resource.author.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{resource.author}</p>
                            <p className="text-xs text-gray-500">{resource.author_role || "Contributor"}</p>
                          </div>
                        </div>
                      )}
                      {(resource.read_time || resource.duration) && (
                        <div className="flex items-center text-sm text-gray-500 mb-4">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>{resource.read_time || resource.duration}</span>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-5 pt-0 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {getResourceActionButton(resource)}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-gray-500 hover:text-blue-500"
                          onClick={() => handleResourceShare(resource)}
                        >
                          <Share2 className="h-5 w-5" />
                        </Button>
                      </div>
                      <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-500">
                        <Heart className="h-5 w-5" />
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No featured resources available
            </div>
          )}
        </section>
        
        {/* All Resources */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              All Resources 
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({resources.length} total)
              </span>
            </h2>
            <div className="flex items-center">
              <Button variant="ghost" className="text-sm flex items-center" onClick={() => setActiveCategory("all")}>
                <span className={activeCategory === "all" ? "text-blue-600 font-medium" : ""}>All</span>
              </Button>
              {categories.map((cat) => (
                <Button 
                  key={cat.id} 
                  variant="ghost" 
                  className="text-sm flex items-center"
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <span className={activeCategory === cat.id ? "text-blue-600 font-medium" : ""}>{cat.title}</span>
                </Button>
              ))}
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading resources...</p>
            </div>
          ) : filteredResources.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6"
            >
              {filteredResources.map((resource) => (
                <motion.div
                  key={resource.id}
                  variants={fadeInUp}
                  className="h-full"
                >
                  <Card className="overflow-hidden border hover:shadow-lg transition-shadow h-full flex flex-col">
                    <div className="relative aspect-video">
                      <img 
                        src={resource.image} 
                        alt={resource.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-gray-800/70 text-white hover:bg-gray-800">
                          {getResourceTypeIcon(resource.type)}
                          <span className="ml-1">{getResourceTypeLabel(resource.type)}</span>
                        </Badge>
                      </div>
                      {resource.isNew && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-amber-500 text-white">New</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 flex-grow">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">{resource.title}</h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{resource.description}</p>
                      {resource.author && (
                        <div className="flex items-center text-xs text-gray-500 mb-2">
                          <span className="font-medium">{resource.author}</span>
                          <span className="mx-1">•</span>
                          <span>{resource.author_role || "Contributor"}</span>
                        </div>
                      )}
                      {(resource.read_time || resource.duration) && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{resource.read_time || resource.duration}</span>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="p-4 pt-0 border-t">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          {getResourceActionButton(resource)}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-gray-500 hover:text-blue-500"
                            onClick={() => handleResourceShare(resource)}
                          >
                            <Share2 className="h-5 w-5" />
                          </Button>
                        </div>
                        
                        {/* Show download/share counts if they exist */}
                        {(resource.downloads || resource.shares) && (
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {resource.downloads && (
                              <div className="flex items-center">
                                <Download className="h-3 w-3 mr-1" />
                                <span>{resource.downloads}</span>
                              </div>
                            )}
                            {resource.shares && (
                              <div className="flex items-center">
                                <Share2 className="h-3 w-3 mr-1" />
                                <span>{resource.shares}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No resources found</h3>
              <p className="text-gray-500">
                {searchQuery ? 
                  `No resources matching "${searchQuery}" in the selected category.` : 
                  "No resources available in the selected category."}
              </p>
              {searchQuery && (
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              )}
              {user?.user_metadata?.role === "mood_mentor" && (
                <Button 
                  className="mt-4"
                  onClick={() => window.location.href = "/mood-mentors/resources"}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Resources
                </Button>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Resources;


